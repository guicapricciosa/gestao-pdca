import Link from "next/link";

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
}: {
  readonly basePath: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      aria-label="Paginação"
      className="mt-6 flex items-center justify-between text-sm"
    >
      <span className="text-muted-foreground">
        Página {page} de {pages} · {total} resultados
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            className="rounded-full border px-4 py-2"
            href={`${basePath}?page=${page - 1}`}
          >
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link
            className="rounded-full border px-4 py-2"
            href={`${basePath}?page=${page + 1}`}
          >
            Seguinte
          </Link>
        )}
      </div>
    </nav>
  );
}
