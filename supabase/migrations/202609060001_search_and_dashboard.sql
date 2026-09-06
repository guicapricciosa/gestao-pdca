-- Increment 10 (approved 2026-09-06 without Projects): permission-aware
-- global search and operational dashboard counts.
--
-- Both functions run as the caller (security invoker): every row comes
-- through the same read policies as the lists, so nothing can be found or
-- counted that the person could not open. No snippets of hidden rows exist
-- because hidden rows never enter the query.

create or replace function public.search_everything(p_query text, p_limit integer default 30)
returns table (
  kind text,
  id uuid,
  title text,
  snippet text,
  status text,
  occurred_on date,
  updated_at timestamptz,
  rank real
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select btrim(p_query) as text,
           websearch_to_tsquery('simple', btrim(p_query)) as tsq,
           '%' || btrim(p_query) || '%' as pattern
  ),
  hits as (
    select 'TASK'::text kind, t.id, t.title, left(coalesce(t.description, ''), 160) snippet, t.status::text, t.due_date occurred_on, t.updated_at,
      ts_rank(to_tsvector('simple', t.title || ' ' || coalesce(t.description, '')), q.tsq) + (case when t.title ilike q.pattern then 1 else 0 end) rank
    from public.tasks t, q
    where t.status <> 'ARCHIVED'
      and (to_tsvector('simple', t.title || ' ' || coalesce(t.description, '')) @@ q.tsq or t.title ilike q.pattern)
    union all
    select 'PDCA', p.id, p.title, left(coalesce(p.problem_statement, p.objective, ''), 160), p.status::text, p.due_date, p.updated_at,
      ts_rank(to_tsvector('simple', p.title || ' ' || coalesce(p.problem_statement, '') || ' ' || coalesce(p.objective, '')), q.tsq) + (case when p.title ilike q.pattern then 1 else 0 end)
    from public.pdcas p, q
    where p.status <> 'ARCHIVED'
      and (to_tsvector('simple', p.title || ' ' || coalesce(p.problem_statement, '') || ' ' || coalesce(p.objective, '')) @@ q.tsq or p.title ilike q.pattern)
    union all
    select 'DECISION', d.id, d.title, left(coalesce(d.description, ''), 160), d.status::text, d.decision_date, d.updated_at,
      ts_rank(to_tsvector('simple', d.title || ' ' || coalesce(d.description, '')), q.tsq) + (case when d.title ilike q.pattern then 1 else 0 end)
    from public.decisions d, q
    where d.status <> 'ARCHIVED'
      and (to_tsvector('simple', d.title || ' ' || coalesce(d.description, '')) @@ q.tsq or d.title ilike q.pattern)
    union all
    select 'MEETING', m.id, m.title, to_char(m.scheduled_start_at at time zone 'Europe/Lisbon', 'DD/MM/YYYY HH24:MI'), m.status::text, (m.scheduled_start_at at time zone 'Europe/Lisbon')::date, m.updated_at,
      ts_rank(to_tsvector('simple', m.title), q.tsq) + (case when m.title ilike q.pattern then 1 else 0 end)
    from public.meeting_sessions m, q
    where m.status <> 'CANCELLED'
      and (to_tsvector('simple', m.title) @@ q.tsq or m.title ilike q.pattern)
  )
  select kind, id, title, snippet, status, occurred_on, updated_at, rank
  from hits, q
  where char_length(q.text) >= 2
  order by rank desc, updated_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
$$;

revoke all on function public.search_everything(text, integer) from public, anon;
grant execute on function public.search_everything(text, integer) to authenticated;

-- Counts with exactly the list semantics (same views, same predicates), so a
-- card total always equals the rows of the list it links to.
create or replace function public.operational_dashboard(
  p_restaurant_id uuid default null,
  p_unit_id uuid default null
)
returns table (metric text, value integer)
language sql
stable
set search_path = ''
as $$
  with t as (
    select * from public.task_list_items
    where (p_restaurant_id is null or p_restaurant_id = any (restaurant_ids))
      and (p_unit_id is null or p_unit_id = any (unit_ids))
  ),
  p as (
    select * from public.pdca_list_items
    where (p_restaurant_id is null or p_restaurant_id = any (restaurant_ids))
      and (p_unit_id is null or p_unit_id = any (unit_ids))
  ),
  m as (
    select ms.id
    from public.meeting_sessions ms
    where ms.status in ('SCHEDULED', 'IN_PROGRESS')
      and ms.scheduled_start_at >= now()
      and ms.scheduled_start_at < now() + interval '7 days'
      and (p_restaurant_id is null or exists (
        select 1 from public.object_scope_restaurants s where s.security_object_id = ms.security_object_id and s.restaurant_id = p_restaurant_id))
      and (p_unit_id is null or exists (
        select 1 from public.object_scope_organizational_units s where s.security_object_id = ms.security_object_id and s.organizational_unit_id = p_unit_id))
  )
  select 'tasks_open', count(*)::integer from t where status in ('DRAFT','OPEN','PLANNED','IN_PROGRESS','BLOCKED','WAITING','UNDER_REVIEW')
  union all select 'tasks_overdue', count(*)::integer from t where due_date < current_date and status not in ('COMPLETED','CANCELLED','ARCHIVED')
  union all select 'tasks_blocked', count(*)::integer from t where status = 'BLOCKED'
  union all select 'tasks_unassigned', count(*)::integer from t where responsible_profile_id is null and status not in ('COMPLETED','CANCELLED','ARCHIVED')
  union all select 'pdcas_active', count(*)::integer from p where status in ('DRAFT','OPEN','PLANNED','IN_PROGRESS','BLOCKED','WAITING','UNDER_REVIEW')
  union all select 'pdcas_overdue', count(*)::integer from p where due_date < current_date and status not in ('COMPLETED','CANCELLED','ARCHIVED')
  union all select 'pdcas_completed', count(*)::integer from p where status = 'COMPLETED'
  union all select 'meetings_7d', count(*)::integer from m
$$;

revoke all on function public.operational_dashboard(uuid, uuid) from public, anon;
grant execute on function public.operational_dashboard(uuid, uuid) to authenticated;
