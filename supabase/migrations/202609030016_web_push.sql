-- Web Push: subscriptions per device and delivery attempts per notification.
--
-- A push never authorizes anything: it carries a relative deep link and, for
-- reserved subjects, a generic text. Sending happens outside the database
-- (the job route with the configured provider); the database owns the queue,
-- the retries and the subscription lifecycle.

create table public.push_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  failure_count integer not null default 0,
  constraint push_subscriptions_endpoint_https check (endpoint ~ '^https://'),
  constraint push_subscriptions_failure_count check (failure_count >= 0)
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id) where revoked_at is null;

create table public.notification_deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  channel text not null default 'push',
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  provider_status integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, subscription_id),
  constraint notification_deliveries_status check (status in ('pending', 'sending', 'sent', 'failed', 'skipped'))
);
create index notification_deliveries_pending_idx on public.notification_deliveries (available_at) where status = 'pending';

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
create policy "own push subscriptions" on public.push_subscriptions
  for select to authenticated using (profile_id = private.current_profile_id());
-- deliveries are operational data: service role only.

-- ---------------------------------------------------------------- devices
create or replace function public.register_push_subscription(endpoint text, p256dh text, auth text, user_agent text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
#variable_conflict use_column
declare
  me uuid := private.current_profile_id();
  saved uuid;
begin
  if me is null then raise exception 'profile not found'; end if;
  insert into public.push_subscriptions as ps (profile_id, endpoint, p256dh, auth, user_agent)
  values (me, register_push_subscription.endpoint, register_push_subscription.p256dh,
          register_push_subscription.auth, left(register_push_subscription.user_agent, 300))
  on conflict (endpoint) do update set
    -- An endpoint that changes hands (shared device, new login) follows the
    -- person who registers it now; the previous owner stops receiving.
    profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth,
    user_agent = excluded.user_agent, last_seen_at = now(), revoked_at = null, revoked_reason = null, failure_count = 0
  returning id into saved;
  return saved;
end;
$$;

create or replace function public.revoke_push_subscription(endpoint text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
#variable_conflict use_column
declare
  me uuid := private.current_profile_id();
begin
  update public.push_subscriptions set revoked_at = now(), revoked_reason = 'user'
  where push_subscriptions.endpoint = revoke_push_subscription.endpoint and profile_id = me and revoked_at is null;
  return found;
end;
$$;

create or replace function public.revoke_push_subscription_by_id(subscription_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  me uuid := private.current_profile_id();
begin
  update public.push_subscriptions set revoked_at = now(), revoked_reason = 'user'
  where id = subscription_id and profile_id = me and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public;
revoke all on function public.revoke_push_subscription(text) from public;
revoke all on function public.revoke_push_subscription_by_id(uuid) from public;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.revoke_push_subscription(text) to authenticated;
grant execute on function public.revoke_push_subscription_by_id(uuid) to authenticated;

-- ------------------------------------------------- queue: one row per device
create or replace function private.queue_push_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefs public.notification_preferences;
begin
  prefs := private.preferences_for(new.recipient_profile_id);
  if not prefs.push_enabled then return null; end if;
  insert into public.notification_deliveries (notification_id, subscription_id)
  select new.id, ps.id
  from public.push_subscriptions ps
  where ps.profile_id = new.recipient_profile_id and ps.revoked_at is null
  on conflict do nothing;
  return null;
end;
$$;
create trigger notifications_queue_push
  after insert on public.notifications
  for each row execute function private.queue_push_deliveries();

-- Claim a batch for sending. Returns everything the sender needs; the
-- payload policy (generic text for reserved subjects) is applied by the sender
-- from `sensitive`, never by exposing more than the notification holds.
create or replace function public.claim_push_deliveries(p_limit integer default 100)
returns table(
  delivery_id uuid, subscription_id uuid, endpoint text, p256dh text, auth text,
  notification_id uuid, type text, title text, metadata jsonb, href text, sensitive boolean,
  attempt_count integer, read_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  return query
  with claimed as (
    update public.notification_deliveries d
    set status = 'sending', attempt_count = d.attempt_count + 1, updated_at = now()
    where d.id in (
      select x.id from public.notification_deliveries x
      where x.status = 'pending' and x.available_at <= now()
      order by x.created_at
      limit greatest(1, least(p_limit, 500))
      for update skip locked
    )
    returning d.*
  )
  select c.id, c.subscription_id, ps.endpoint, ps.p256dh, ps.auth,
         n.id, n.type, n.title, n.metadata, n.href, n.sensitive, c.attempt_count, n.read_at
  from claimed c
  join public.push_subscriptions ps on ps.id = c.subscription_id
  join public.notifications n on n.id = c.notification_id;
end;
$$;

create or replace function public.complete_push_delivery(
  p_delivery_id uuid, p_status text, p_error text default null, p_provider_status integer default null,
  p_retry_in_seconds integer default null, p_subscription_gone boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  sub uuid;
begin
  update public.notification_deliveries
  set status = case when p_retry_in_seconds is not null then 'pending' else p_status end,
      available_at = case when p_retry_in_seconds is not null then now() + make_interval(secs => p_retry_in_seconds) else available_at end,
      last_error = left(p_error, 500), provider_status = p_provider_status, updated_at = now()
  where id = p_delivery_id
  returning subscription_id into sub;
  if p_subscription_gone then
    update public.push_subscriptions set revoked_at = now(), revoked_reason = 'gone', failure_count = failure_count + 1
    where id = sub and revoked_at is null;
  elsif p_status = 'failed' then
    update public.push_subscriptions set failure_count = failure_count + 1 where id = sub;
  elsif p_status = 'sent' then
    update public.push_subscriptions set failure_count = 0, last_seen_at = now() where id = sub;
  end if;
end;
$$;

revoke all on function public.claim_push_deliveries(integer) from public, anon, authenticated;
revoke all on function public.complete_push_delivery(uuid, text, text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;
grant execute on function public.complete_push_delivery(uuid, text, text, integer, integer, boolean) to service_role;
