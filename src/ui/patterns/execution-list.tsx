import Link from "next/link";

import { DueDate, StatusBadge } from "@/ui/components/status-badge";

export interface ExecutionListItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority?: string;
  readonly phase?: string;
  readonly dueDate?: string | null;
  readonly owner?: string | null;
  readonly responsible?: string | null;
  readonly secondary?: string | null;
  readonly updatedAt: string;
}

export function ExecutionList({
  items,
  basePath,
  emptyTitle = "Nada para mostrar",
  emptyHint = "Não há registos acessíveis com estes filtros. Limpa os filtros ou cria um novo.",
  createHref,
  createLabel,
}: {
  readonly items: readonly ExecutionListItem[];
  readonly basePath: string;
  readonly emptyTitle?: string;
  readonly emptyHint?: string;
  readonly createHref?: string;
  readonly createLabel?: string;
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
  const showPeople = items.some(
    (item) => item.owner !== undefined || item.responsible !== undefined,
  );
  const showDue = items.some((item) => item.dueDate !== undefined);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-muted-foreground border-b text-[11px] tracking-[0.12em] uppercase">
          <tr>
            <th className="px-5 py-3 font-medium">Título</th>
            {showPeople && (
              <th className="px-3 py-3 font-medium">Owner · Responsible</th>
            )}
            <th className="px-3 py-3 font-medium">
              {items[0]?.phase !== undefined
                ? "Fase · Prioridade"
                : "Prioridade"}
            </th>
            {showDue && <th className="px-3 py-3 font-medium">Prazo</th>}
            <th className="px-5 py-3 text-right font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className="border-b transition-colors last:border-b-0 hover:bg-black/[0.025]"
              key={item.id}
            >
              <td className="px-5 py-3.5">
                <Link
                  className="font-medium underline-offset-4 hover:underline"
                  href={`${basePath}/${item.id}`}
                >
                  {item.title}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.secondary ??
                    `Actualizado ${new Date(item.updatedAt).toLocaleDateString("pt-PT")}`}
                </p>
              </td>
              {showPeople && (
                <td className="text-muted-foreground px-3 py-3.5 text-xs">
                  <span className="text-foreground">
                    {item.owner ?? "Sem Owner"}
                  </span>
                  <br />
                  {item.responsible ?? "Sem Responsible"}
                </td>
              )}
              <td className="px-3 py-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.phase && (
                    <StatusBadge value={item.phase} kind="plain" />
                  )}
                  {item.priority && (
                    <StatusBadge value={item.priority} kind="priority" />
                  )}
                </div>
              </td>
              {showDue && (
                <td className="px-3 py-3.5 text-xs">
                  <DueDate value={item.dueDate} status={item.status} />
                </td>
              )}
              <td className="px-5 py-3.5 text-right">
                <StatusBadge value={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
