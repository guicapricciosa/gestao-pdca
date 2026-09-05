-- Retention. Operational tables grow with every event; nothing here is the
-- record of what happened (audit_events stays untouched, as do the domain
-- tables). Runs nightly; the function is idempotent and safe to call any time.
--   notifications           read > 90 days, or unread > 180 days
--   notification_deliveries older than 90 days
--   outbox_events           processed more than 30 days ago
--   push_subscriptions      revoked more than 90 days ago

create or replace function public.purge_old_records()
returns table (notifications integer, deliveries integer, outbox integer, subscriptions integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare n1 integer; n2 integer; n3 integer; n4 integer;
begin
  delete from public.notification_deliveries d
  where d.created_at < now() - interval '90 days';
  get diagnostics n2 = row_count;

  delete from public.notifications n
  where (n.read_at is not null and n.read_at < now() - interval '90 days')
     or (n.read_at is null and n.created_at < now() - interval '180 days');
  get diagnostics n1 = row_count;

  delete from public.outbox_events e
  where e.processed_at is not null and e.processed_at < now() - interval '30 days';
  get diagnostics n3 = row_count;

  delete from public.push_subscriptions s
  where s.revoked_at is not null and s.revoked_at < now() - interval '90 days';
  get diagnostics n4 = row_count;

  return query select n1, n2, n3, n4;
end;
$$;

revoke all on function public.purge_old_records() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'retention-purge-old-records';
    perform cron.schedule('retention-purge-old-records', '30 3 * * *', 'select public.purge_old_records()');
  end if;
end $$;
