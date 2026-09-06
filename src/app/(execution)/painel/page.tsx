import Link from "next/link";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { createExecutionService } from "@/modules/execution/application/factory";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { DueDate } from "@/ui/components/status-badge";
import { phaseLabel, taskStatusLabel } from "@/ui/labels";
import {
  BarChart,
  LineChart,
  type BreakdownRow,
} from "@/ui/patterns/dashboard-charts";
import { listHref } from "@/ui/patterns/list-query";

export const dynamic = "force-dynamic";

const openStatuses = [
  "DRAFT",
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "UNDER_REVIEW",
];

/**
 * Painel operacional: the same lists, counted. Every card links to the list
 * with exactly the filters that produced the number, so totals always match.
 */
export default async function DashboardPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ restaurante?: string; area?: string }>;
}) {
  const { restaurante = "", area = "" } = await searchParams;
  const client = await createSupabaseServerClient();
  const options = await loadCreationOptions("task.read");
  const restaurant = options.restaurants.find((row) => row.id === restaurante);
  const unit = options.units.find((row) => row.id === area);
  const [{ data: metrics }, { data: breakdowns }, overdueTasks, overduePdcas] =
    await Promise.all([
      client.rpc("operational_dashboard", {
        p_restaurant_id: (restaurant?.id ?? null) as never,
        p_unit_id: (unit?.id ?? null) as never,
      }),
      client.rpc("dashboard_breakdowns", {
        p_restaurant_id: (restaurant?.id ?? null) as never,
        p_unit_id: (unit?.id ?? null) as never,
      }),
      (await createExecutionService()).listTasks({
        restaurantId: restaurant ? [restaurant.id] : undefined,
        unitId: unit ? [unit.id] : undefined,
        overdue: true,
        sort: "due_date",
        direction: "asc",
        pageSize: 5,
      }),
      (await createExecutionService()).listPdcas({
        restaurantId: restaurant ? [restaurant.id] : undefined,
        unitId: unit ? [unit.id] : undefined,
        overdue: true,
        sort: "due_date",
        direction: "asc",
        pageSize: 5,
      }),
    ]);
  const value = (metric: string) =>
    (metrics ?? []).find((row) => row.metric === metric)?.value ?? 0;
  const chart = (name: string): BreakdownRow[] =>
    (breakdowns ?? []).filter((row) => row.chart === name);
  const scopeParams = {
    ...(restaurant ? { restaurantId: restaurant.id } : {}),
    ...(unit ? { unitId: unit.id } : {}),
  };
  const cards = [
    {
      label: "Tarefas em aberto",
      value: value("tasks_open"),
      href: listHref("/tasks", {}, { ...scopeParams, status: openStatuses }),
    },
    {
      label: "Tarefas atrasadas",
      value: value("tasks_overdue"),
      href: listHref("/tasks", {}, { ...scopeParams, overdue: "true" }),
      tone: "red",
    },
    {
      label: "Tarefas bloqueadas",
      value: value("tasks_blocked"),
      href: listHref("/tasks", {}, { ...scopeParams, status: ["BLOCKED"] }),
      tone: "amber",
    },
    {
      label: "Tarefas sem responsável",
      value: value("tasks_unassigned"),
      href: listHref("/tasks", {}, { ...scopeParams, unassigned: "true" }),
      tone: "amber",
    },
    {
      label: "PDCAs em curso",
      value: value("pdcas_active"),
      href: listHref("/pdcas", {}, { ...scopeParams, status: openStatuses }),
    },
    {
      label: "PDCAs atrasados",
      value: value("pdcas_overdue"),
      href: listHref("/pdcas", {}, { ...scopeParams, overdue: "true" }),
      tone: "red",
    },
    {
      label: "PDCAs concluídos",
      value: value("pdcas_completed"),
      href: listHref("/pdcas", {}, { ...scopeParams, status: ["COMPLETED"] }),
      tone: "green",
    },
    {
      label: "Reuniões nos próximos 7 dias",
      value: value("meetings_7d"),
      href: restaurant ? `/meetings?restaurant=${restaurant.id}` : "/meetings",
    },
  ] as const;
  const scopeLabel = restaurant
    ? restaurant.name
    : unit
      ? unit.name
      : "Tudo o que vês";
  const tone = (kind?: string) =>
    kind === "red"
      ? "text-red-700"
      : kind === "amber"
        ? "text-amber-800"
        : kind === "green"
          ? "text-emerald-800"
          : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-sm font-medium">Execução</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Dashboard geral
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {scopeLabel}. Cada número abre a lista que o produziu.
          </p>
        </div>
        <form action="/painel" className="flex flex-wrap gap-2">
          <select
            aria-label="Restaurante"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            defaultValue={restaurant?.id ?? ""}
            name="restaurante"
          >
            <option value="">Todos os restaurantes</option>
            {options.restaurants.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Área"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            defaultValue={unit?.id ?? ""}
            name="area"
          >
            <option value="">Todas as áreas</option>
            {options.units.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <button className="rounded-full border bg-white px-4 py-2 text-sm">
            Ver
          </button>
        </form>
      </header>

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="dashboard-cards"
      >
        {cards.map((card) => (
          <Link
            className="rounded-2xl border bg-white p-5 transition-colors hover:bg-neutral-50"
            data-testid={`card-${card.label}`}
            href={card.href}
            key={card.label}
          >
            <p
              className={`text-4xl font-semibold tracking-tight tabular-nums ${tone(
                "tone" in card ? card.tone : undefined,
              )}`}
            >
              {card.value}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{card.label}</p>
          </Link>
        ))}
      </section>

      <section
        className="grid gap-6 lg:grid-cols-2"
        data-testid="dashboard-charts"
      >
        <BarChart
          labelHeading="Estado"
          labelOf={taskStatusLabel}
          rows={chart("tasks_by_status")}
          testId="chart-tasks_by_status"
          title="Tarefas por estado"
        />
        <BarChart
          labelHeading="Fase"
          labelOf={phaseLabel}
          rows={chart("pdcas_by_phase")}
          testId="chart-pdcas_by_phase"
          title="PDCAs em curso por fase"
        />
        <BarChart
          labelHeading="Restaurante"
          rows={chart("overdue_by_restaurant")}
          testId="chart-overdue_by_restaurant"
          title="Atrasados por restaurante"
        />
        <LineChart
          labelHeading="Semana"
          rows={chart("completed_by_week")}
          testId="chart-completed_by_week"
          title="Concluídos por semana (últimas 8)"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl border bg-white"
          data-testid="overdue-tasks"
        >
          <h2 className="border-b p-5 text-lg font-semibold">
            Tarefas mais atrasadas
          </h2>
          {overdueTasks.items.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Nenhuma. Bom sinal.
            </p>
          ) : (
            <ul>
              {overdueTasks.items.map((item) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                  key={item.id}
                >
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/tasks/${item.id}`}
                  >
                    {item.title}
                  </Link>
                  <span className="text-xs">
                    <DueDate
                      value={item.dueDate}
                      status={item.status}
                      relative
                    />
                    {item.responsibleName
                      ? ` · ${item.responsibleName}`
                      : " · sem responsável"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="rounded-2xl border bg-white"
          data-testid="overdue-pdcas"
        >
          <h2 className="border-b p-5 text-lg font-semibold">
            PDCAs mais atrasados
          </h2>
          {overduePdcas.items.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Nenhum. Bom sinal.
            </p>
          ) : (
            <ul>
              {overduePdcas.items.map((item) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                  key={item.id}
                >
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/pdcas?open=${item.id}`}
                  >
                    {item.title}
                  </Link>
                  <span className="text-xs">
                    <DueDate
                      value={item.dueDate}
                      status={item.status}
                      relative
                    />
                    {item.responsibleName
                      ? ` · ${item.responsibleName}`
                      : " · sem responsável"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
