import Link from "next/link";

interface Item {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority?: string;
  readonly phase?: string;
  readonly dueDate?: string | null;
  readonly updatedAt: string;
}

export function ExecutionList({
  items,
  basePath,
}: {
  readonly items: readonly Item[];
  readonly basePath: string;
}) {
  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="font-medium">Sem resultados autorizados</p>
        <p className="text-muted-foreground mt-2 text-sm">
          A lista já considera scope, visibilidade e grants válidos.
        </p>
      </div>
    );
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      {items.map((item) => (
        <Link
          className="grid gap-2 border-b p-5 transition-colors last:border-b-0 hover:bg-black/[0.025] sm:grid-cols-[1fr_auto_auto] sm:items-center"
          href={`${basePath}/${item.id}`}
          key={item.id}
        >
          <div>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Atualizado {new Date(item.updatedAt).toLocaleDateString("pt-PT")}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs">
            {item.phase ?? item.priority ?? "Decision"}
          </span>
          <span className="rounded-full border px-3 py-1 text-xs">
            {item.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
