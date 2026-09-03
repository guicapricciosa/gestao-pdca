# Analytics

## Execution Core readiness note

No advanced analytics were implemented. The schema now preserves the source facts required for later deterministic metrics: creation, first action, due date, last activity, immutable due-date changes, completion snapshots/cycles, reopening events and blocker intervals. Current Task/PDCA rows support operational filters; later analytics must continue to aggregate only after authorization.

## 1. Principle

Authoritative metrics are deterministic calculations over authorized relational data. AI may explain trends, compare periods and suggest questions, but must not invent, silently redefine or become the source of KPI values.

Every metric definition specifies:

- population and object types;
- authorization point;
- time window and timezone;
- included/excluded semantic statuses;
- event timestamp used;
- numerator and denominator;
- handling of reopened items, missing dates and current open intervals;
- freshness/as-of timestamp.

## 2. Canonical time rules

- Store instants in UTC; group calendar periods in the selected company/user reporting timezone.
- Use half-open intervals `[period_start, period_end)`.
- `created_at`, status transitions, completion/reopening events, blocker intervals and due-date changes are immutable facts.
- Current snapshots answer “now”; event facts answer historical period questions.
- Historical metrics use values captured at event time where later edits would rewrite history, especially the due-date snapshot at completion.
- Cancelled, archived and Draft objects are excluded from execution backlog unless a metric explicitly states otherwise.

## 3. Semantic populations

Define stable status categories independent of configurable labels:

- **not_started:** OPEN/PLANNED;
- **active:** IN_PROGRESS/BLOCKED/WAITING/UNDER_REVIEW and optionally OPEN/PLANNED;
- **terminal_success:** COMPLETED/CLOSED;
- **terminal_non_success:** CANCELLED;
- **non_operational:** DRAFT/ARCHIVED.

The exact mappings live in `status_definitions.semantic_category`. Reports display the mapping/version used.

## 4. Deterministic metric definitions

### Backlog

At instant `T`, count distinct authorized Tasks/PDCAs created at or before `T` that entered an execution-visible state and had no terminal-success or terminal-non-success state effective at `T`.

Current backlog can use current status. Historical backlog requires status-transition/event reconstruction or a daily snapshot. Draft and archived objects are excluded. Reopened objects re-enter backlog at `reopened_at`.

Report count and optionally weighted backlog separately; never mix the two.

### Backlog age

For each backlog item at `T`:

```text
backlog_age = T - latest_backlog_entry_at
```

`latest_backlog_entry_at` is initial execution-visible timestamp or most recent reopening after the last completion/cancellation. Report median and percentile distribution in addition to mean because long-running items skew averages.

### Overdue

At `T`, an item is overdue when:

```text
due_date is not null
AND due boundary in reporting timezone < T
AND item is in backlog at T
```

For date-only deadlines, the boundary is the end of that local calendar day. An item completed after its due boundary is historically late but is not in the current overdue backlog.

### On-time completion rate

For completion events within period `P`:

```text
numerator   = completions whose completed_at <= due_date_snapshot boundary
denominator = completions with a non-null due_date_snapshot
rate        = numerator / denominator
```

Report completions without deadlines separately. Choose latest completion events for “currently completed item” analysis; choose all completion cycles for process-cycle analysis, and label the variant.

### Resolution time

For each successful completion cycle:

```text
resolution_time = completed_at - backlog_entry_at
```

Default is elapsed wall-clock time including blocked/waiting time. Also report `active_resolution_time = resolution_time - merged_blocked_duration` where useful. Do not substitute due-date variance.

### First action time

```text
first_action_time = first_qualifying_action_at - backlog_entry_at
```

Qualifying actions are explicit and stable: transition to In Progress, first execution comment, first child Task created/started for a PDCA, first evidence upload, or first progress update. Administrative edits, watcher changes, automated reminders and AI reads do not qualify. `first_action_at` is set once per cycle; reopening may have a separate cycle event in future.

### Blocked duration

For a blocker interval at `T`:

```text
interval = [blocked_at, coalesce(resolved_at, T))
```

For total object blocked duration, merge overlapping blocker intervals before summing so simultaneous blockers are not double-counted. Period reports clip intervals to the period boundary. Report both wall-clock duration and count of blocking episodes.

### Throughput

Count successful completion events in period `P`, grouped by completion timestamp. Default operational throughput counts distinct items on their latest completion in the period; cycle throughput counts every completion event and is labeled explicitly. Tasks and PDCAs are never summed into one unlabeled number.

### Reopen rate

For items with a successful completion event in cohort period `P` and observed through cutoff `T`:

```text
reopen_rate = items with a subsequent reopening / items completed in cohort
```

The observation window must be shown (for example within 30 days) to avoid bias against recent cohorts. A separate period activity metric may count reopening events during `P`.

### Deadline extension rate

Recommended item-based metric for backlog/completion cohort:

```text
extension_rate = items with >=1 approved due-date increase / items with a due date
```

Also report `extensions_per_item` and total days extended. Moving a deadline earlier is a deadline change, not an extension. Rejected requests do not count as extensions.

### Stale items

At `T`, a backlog item is stale when:

```text
T - last_meaningful_activity_at >= configured threshold
```

Meaningful activity uses the same operational allowlist concept as first action and excludes automated/system noise. Threshold is always displayed, with defaults configurable per object type/company.

### Creation versus completion

For period `P`, report separately:

```text
created = items whose created_at is in P and became execution-visible
completed = successful completion events in P (defined throughput variant)
net_flow = created - completed
closure_ratio = completed / created
```

If `created = 0`, closure ratio is null rather than infinite. Net flow is not identical to backlog change because cancellation, reopening and boundary corrections also affect backlog.

### Meeting recurrence

For a Task/PDCA/Decision:

```text
meeting_recurrence = count(distinct published meeting sessions linked as
  DISCUSSED, REVIEWED or CARRIED_FORWARD)
```

The originating session may be reported separately. Recurrence over time uses link creation/publication date. Hidden meeting links are excluded from the viewer's metric.

### Workload

Always publish transparent components before a composite score:

- backlog count by Responsible and by Owner;
- overdue count;
- due in 7/14/30 days;
- critical/high priority, impact and risk counts;
- blocked count and duration;
- weighted age and current assignments.

If a composite workload score is later introduced:

```text
score = sum(item base weight
            * priority factor
            * impact factor
            * risk factor
            * overdue factor
            * blocked factor)
```

Weights must be company-configurable, versioned, visible and tested. The score indicates queue pressure, not employee performance, effort or productivity. No automated personnel decision should rely on it.

## 5. Permission-aware aggregation

Authorization filters the fact population **before** grouping or aggregation:

```text
authenticated actor
-> effective permission paths
-> authorized object IDs/fact rows
-> metric filters and period
-> aggregate
-> result
```

Rules:

- no global aggregate is computed then filtered by label;
- RESTRICTED/PRIVATE facts require their explicit/elevated access path;
- counts, empty groups, ranges and drill-down totals must not reveal hidden records;
- each displayed aggregate can drill down to the exact authorized source population;
- exports reuse the same query layer;
- cache keys include authorization version and effective scope, or cache only non-sensitive building blocks that cannot leak data;
- suppression thresholds may be used for sensitive people analytics even when underlying access exists.

Cross-scope items are counted once in organization totals. Breakdown allocation must be labeled:

- **distinct:** item counted once in overall total;
- **attributed:** item appears in each scoped department/restaurant and subtotals are not additive; or
- **fractional:** optional later allocation, only with an explicit business rule.

Default: distinct overall and attributed per breakdown, with a non-additive warning.

## 6. Query and read-model strategy

Start with indexed SQL/repository queries over current aggregate tables and immutable event/history tables.

Candidate ordinary views:

- current execution item projection (Tasks and PDCAs with shared semantic fields);
- meaningful activity projection;
- blocker interval projection;
- meeting recurrence projection.

Candidate materialized views only after measured need:

- daily backlog snapshots by object/scope dimensions;
- daily completion/creation facts;
- expensive hierarchy-effective-scope closure;
- daily workload components.

Materialized views must preserve `security_object_id`, company and scope dimensions or be generated only at a safe aggregation level. Refresh time is displayed. Never materialize unrestricted sensitive text for analytics convenience.

## 7. AI interpretation

The Management Assistant receives:

- metric name and version;
- exact value and unit;
- comparison value/period;
- authorized dimension breakdowns;
- freshness timestamp;
- bounded source record IDs/links.

AI may state patterns supported by these values and identify uncertainty. It cannot change formulas, calculate hidden populations or assert causality from correlation. Narrative claims link to deterministic results.

## 8. Validation and tests

- boundary dates/timezones and daylight-saving transitions;
- reopened cycles;
- changed deadlines and completion snapshots;
- overlapping blockers;
- cancelled/draft/archived exclusions;
- null deadline handling;
- distinct versus attributed breakdown totals;
- semantic status mapping changes;
- exact authorization parity with list/search/export;
- no hidden count leakage;
- AI narrative fixtures reference supplied metrics only.

## 9. Open Architectural Decisions

| Question                          | Recommended option                                                       | Alternatives                                    | Impact                                                            |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| Default reporting timezone        | Owning company timezone, with explicit user-view override                | UTC only; user timezone only                    | Changes daily/weekly boundaries and overdue calculations          |
| Historical backlog implementation | Add daily snapshot only after event-reconstruction query is measured     | Snapshot from day one; events only indefinitely | Trade-off between simplicity, performance and backfill complexity |
| Workload composite score          | Defer until management validates transparent weights and use limitations | Implement fixed score in MVP                    | Avoids misleading people-performance conclusions                  |
