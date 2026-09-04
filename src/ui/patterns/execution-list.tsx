import Link from "next/link";

import type { ListSortKey } from "@/modules/execution/domain/types";
import {
  DueDate,
  StatusBadge,
  type BadgeKind,
} from "@/ui/components/status-badge";
import { formatDate } from "@/ui/labels";
import {
  listHref,
  sortHref,
  sortOf,
  type SearchValues,
} from "@/ui/patterns/list-query";

export interface ExecutionListItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority?: string;
  readonly phase?: string;
  readonly dueDate?: string | null;
  readonly responsible?: string | null;
  readonly secondary?: string | null;
  readonly updatedAt: string;
  /** Quality hints such as "Sem prazo" — discreet, never errors. */
  readonly warnings?: readonly string[];
}

function SortableHeader({
  label,
  sortKey,
  basePath,
  values,
  align = "left",
  first = false,
}: {
  readonly label: string;
  readonly sortKey: ListSortKey;
  readonly basePath: string;
  readonly values: SearchValues;
  readonly align?: "left" | "right";
  readonly first?: boolean;
}) {
  const current = sortOf(values);
  const active = current.sort === sortKey;
  return (
    <th
      aria-sort={
        active
          ? current.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={`${first || align === "right" ? "px-5" : "px-3"} py-3 font-medium ${align === "right" ? "text-right" : ""}`}
      scope="col"
    >
      <Link
        className={`inline-flex items-center gap-1 underline-offset-4 hover:underline ${
          active ? "text-foreground" : ""
        }`}
        data-testid={`sort-${sortKey}`}
        href={sortHref(basePath, values, sortKey)}
        title={`Ordenar por ${label.toLowerCase()}`}
      >
        {label}
        <span aria-hidden className="w-2 text-[10px]">
          {active ? (current.direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </Link>
    </th>
  );
}

export function ExecutionList({
  items,
  basePath,
  badgeKind,
  emptyTitle = "Nada para mostrar aqui",
  emptyHint = "Não há registos no teu âmbito com estes filtros.",
  createHref,
  createLabel,
  values = {},
  openInPanel = false,
}: {
  readonly items: readonly ExecutionListItem[];
  readonly basePath: string;
  readonly badgeKind: BadgeKind;
  readonly emptyTitle?: string;
  readonly emptyHint?: string;
  readonly createHref?: string;
  readonly createLabel?: string;
  /** Current URL state, so sorting keeps filters and pagination. */
  readonly values?: SearchValues;
  /** Open records in the side panel (`?open=id`) instead of their page. */
  readonly openInPanel?: boolean;
}) {
  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed bg-white/60 p-12 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          {emptyHint}
        </p>
        {createHref && (
          <Link
            className="mt-5 inline-flex rounded-full bg-black px-4 py-2 text-sm text-white"
            href={createHref}
          >
            {createLabel ?? "Criar"}
          </Link>
        )}
      </div>
    );
  const showPeople = items.some((item) => item.responsible !== undefined);
  const showDue = items.some((item) => item.dueDate !== undefined);
  const showPhase = items.some((item) => item.phase !== undefined);
  const header = { basePath, values };
  const hrefOf = (item: ExecutionListItem) =>
    openInPanel
      ? listHref(basePath, values, { open: item.id })
      : `${basePath}/${item.id}`;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-muted-foreground border-b text-[11px] tracking-[0.12em] uppercase">
          <tr>
            <SortableHeader
              {...header}
              first
              label={
                badgeKind === "decision"
                  ? "Decisão"
                  : badgeKind === "pdca"
                    ? "PDCA"
                    : "Tarefa"
              }
              sortKey="title"
            />
            {showPeople && (
              <SortableHeader
                {...header}
                label="Responsável"
                sortKey="responsible"
              />
            )}
            {showPhase && (
              <SortableHeader {...header} label="Fase" sortKey="phase" />
            )}
            {showDue && (
              <SortableHeader {...header} label="Prazo" sortKey="due_date" />
            )}
            <SortableHeader
              {...header}
              align="right"
              label="Estado"
              sortKey="status"
            />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className="border-b transition-colors last:border-b-0 hover:bg-black/[0.025]"
              key={item.id}
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {(item.priority === "HIGH" ||
                    item.priority === "CRITICAL") && (
                    <span
                      aria-label={
                        item.priority === "CRITICAL" ? "Crítica" : "Alta"
                      }
                      className={`size-2 shrink-0 rounded-full ${item.priority === "CRITICAL" ? "bg-red-600" : "bg-amber-500"}`}
                      title={
                        item.priority === "CRITICAL"
                          ? "Prioridade crítica"
                          : "Prioridade alta"
                      }
                    />
                  )}
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    data-testid="list-item"
                    href={hrefOf(item)}
                    scroll={!openInPanel}
                  >
                    {item.title}
                  </Link>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.secondary ??
                    `Actualizado ${formatDate(item.updatedAt.slice(0, 10))}`}
                  {(item.warnings ?? []).map((warning) => (
                    <span
                      className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900"
                      data-testid="list-warning"
                      key={warning}
                    >
                      {warning}
                    </span>
                  ))}
                </p>
              </td>
              {showPeople && (
                <td className="px-3 py-3.5 text-xs">
                  {item.responsible ?? (
                    <span className="text-red-700">sem responsável</span>
                  )}
                </td>
              )}
              {showPhase && (
                <td className="px-3 py-3.5">
                  {item.phase && (
                    <StatusBadge value={item.phase} kind="phase" />
                  )}
                </td>
              )}
              {showDue && (
                <td className="px-3 py-3.5 text-xs">
                  <DueDate value={item.dueDate} status={item.status} />
                </td>
              )}
              <td className="px-5 py-3.5 text-right">
                <StatusBadge value={item.status} kind={badgeKind} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
