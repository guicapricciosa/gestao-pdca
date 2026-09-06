-- Breakdowns for the general dashboard charts, on the same list views and
-- predicates as the cards (security invoker: only readable rows count).
create or replace function public.dashboard_breakdowns(
  p_restaurant_id uuid default null,
  p_unit_id uuid default null
)
returns table (chart text, label text, series text, value integer, sort integer)
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
  statuses as (
    select unnest(array['DRAFT','OPEN','PLANNED','IN_PROGRESS','BLOCKED','WAITING','UNDER_REVIEW','COMPLETED','CANCELLED']) as code,
           generate_series(1, 9) as ord
  ),
  phases as (
    select unnest(array['PLAN','DO','CHECK','ACT']) as code, generate_series(1, 4) as ord
  ),
  weeks as (
    select date_trunc('week', current_date)::date - (n * 7) as week_start, 8 - n as ord
    from generate_series(0, 7) n
  )
  -- Tasks by status
  select 'tasks_by_status', s.code, 'Tarefas', (select count(*)::integer from t where t.status = s.code), s.ord
  from statuses s
  union all
  -- Active PDCAs by phase
  select 'pdcas_by_phase', ph.code, 'PDCAs', (select count(*)::integer from p where p.phase::text = ph.code and p.status not in ('COMPLETED','CANCELLED','ARCHIVED')), ph.ord
  from phases ph
  union all
  -- Overdue by restaurant (tasks and PDCAs), top 8 restaurants by total
  select 'overdue_by_restaurant', r.name, kind, cnt, rank
  from (
    select r.id, sum(cnt) total, dense_rank() over (order by sum(cnt) desc, max(r.name)) rank
    from (
      select unnest(t.restaurant_ids) rid, 'Tarefas' kind, 1 cnt from t where t.due_date < current_date and t.status not in ('COMPLETED','CANCELLED','ARCHIVED')
      union all
      select unnest(p.restaurant_ids), 'PDCAs', 1 from p where p.due_date < current_date and p.status not in ('COMPLETED','CANCELLED','ARCHIVED')
    ) x join public.restaurants r on r.id = x.rid
    group by r.id
  ) top
  join public.restaurants r on r.id = top.id
  cross join lateral (
    select kind, count(*)::integer cnt from (
      select 'Tarefas' kind from t where r.id = any (t.restaurant_ids) and t.due_date < current_date and t.status not in ('COMPLETED','CANCELLED','ARCHIVED')
      union all
      select 'PDCAs' from p where r.id = any (p.restaurant_ids) and p.due_date < current_date and p.status not in ('COMPLETED','CANCELLED','ARCHIVED')
    ) y group by kind
  ) c(kind, cnt)
  where top.rank <= 8
  union all
  -- Completions per week, last 8 weeks
  select 'completed_by_week', to_char(w.week_start, 'DD/MM'), 'Tarefas',
    (select count(*)::integer from t where t.completed_at >= w.week_start and t.completed_at < w.week_start + 7), w.ord
  from weeks w
  union all
  select 'completed_by_week', to_char(w.week_start, 'DD/MM'), 'PDCAs',
    (select count(*)::integer from p join public.pdcas full_row on full_row.id = p.id
      where full_row.completed_at >= w.week_start and full_row.completed_at < w.week_start + 7), w.ord
  from weeks w
$$;

revoke all on function public.dashboard_breakdowns(uuid, uuid) from public, anon;
grant execute on function public.dashboard_breakdowns(uuid, uuid) to authenticated;
