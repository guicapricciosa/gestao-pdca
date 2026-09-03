create table public.outbox_events (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid references public.security_objects(id) on delete restrict,
  event_type text not null,
  payload_version smallint not null default 1,
  payload jsonb not null,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  constraint outbox_events_type_format check (event_type ~ '^[a-z][a-z0-9_.]{2,127}$'),
  constraint outbox_events_payload_version_positive check (payload_version > 0),
  constraint outbox_events_attempt_count_nonnegative check (attempt_count >= 0)
);
create index outbox_events_pending_idx
  on public.outbox_events (available_at, occurred_at)
  where processed_at is null;
create index outbox_events_object_idx
  on public.outbox_events (security_object_id, occurred_at desc);

alter table public.outbox_events enable row level security;

-- No authenticated policy is intentional. Domain transactions will append
-- through reviewed server/database commands; a future scoped job capability
-- will claim and process events without exposing the outbox to browsers.
