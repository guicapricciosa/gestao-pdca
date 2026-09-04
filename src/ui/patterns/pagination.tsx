import Link from "next/link";

import { listHref, type SearchValues } from "@/ui/patterns/list-query";

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  values = {},
}: {
  readonly basePath: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly values?: SearchValues;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (target: number) =>
    listHref(basePath, values, { page: String(target), open: null });
  return (
    <nav
      aria-label="Paginação"
      className="mt-6 flex items-center justify-between text-sm"
    >
      <span className="text-muted-foreground tabular-nums">
        {total === 0
          ? "Sem resultados"
          : `${total} resultado${total === 1 ? "" : "s"} · página ${page} de ${pages}`}
      </span>
      {pages > 1 && (
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="rounded-full border px-4 py-2"
              href={href(page - 1)}
            >
              Anterior
            </Link>
          )}
          {page < pages && (
            <Link
              className="rounded-full border px-4 py-2"
              href={href(page + 1)}
            >
              Seguinte
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
