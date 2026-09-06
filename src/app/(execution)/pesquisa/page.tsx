import Link from "next/link";

import { createSupabaseServerClient } from "@/platform/supabase/server";
import { StatusBadge, type BadgeKind } from "@/ui/components/status-badge";
import { formatDate } from "@/ui/labels";

export const dynamic = "force-dynamic";

const kinds: Record<
  string,
  {
    label: string;
    plural: string;
    badge: BadgeKind;
    href: (id: string) => string;
  }
> = {
  TASK: {
    label: "Tarefa",
    plural: "Tarefas",
    badge: "task",
    href: (id) => `/tasks/${id}`,
  },
  PDCA: {
    label: "PDCA",
    plural: "PDCAs",
    badge: "pdca",
    href: (id) => `/pdcas?open=${id}`,
  },
  DECISION: {
    label: "Decisão",
    plural: "Decisões",
    badge: "decision",
    href: (id) => `/decisions/${id}`,
  },
  MEETING: {
    label: "Reunião",
    plural: "Reuniões",
    badge: "meeting",
    href: (id) => `/meetings/${id}`,
  },
};

/**
 * Global search. Results come from `search_everything`, which runs under the
 * caller's own read policies: what is not readable is not searched at all.
 */
export default async function SearchPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const client = await createSupabaseServerClient();
  const { data } =
    query.length >= 2
      ? await client.rpc("search_everything", { p_query: query, p_limit: 60 })
      : { data: [] };
  const results = data ?? [];
  const groups = Object.entries(kinds)
    .map(([kind, meta]) => ({
      kind,
      meta,
      items: results.filter((row) => row.kind === kind),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">Pesquisa</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {query ? `“${query}”` : "Pesquisar"}
        </h1>
        <form action="/pesquisa" className="mt-4 flex gap-2" role="search">
          <input
            aria-label="Pesquisar"
            autoFocus
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            defaultValue={query}
            minLength={2}
            name="q"
            placeholder="Título, problema, objectivo, reunião…"
            type="search"
          />
          <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
            Pesquisar
          </button>
        </form>
        <p className="text-muted-foreground mt-2 text-xs">
          Só encontras o que podes abrir. Duas letras no mínimo.
        </p>
      </header>
      {query.length >= 2 && results.length === 0 && (
        <div
          className="rounded-2xl border border-dashed bg-white/60 p-10 text-center"
          data-testid="search-empty"
        >
          <p className="font-medium">Sem resultados para “{query}”</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Experimenta outra palavra ou confirma se o assunto está no teu
            âmbito.
          </p>
        </div>
      )}
      {groups.map((group) => (
        <section
          className="rounded-2xl border bg-white"
          data-testid={`search-${group.kind.toLowerCase()}`}
          key={group.kind}
        >
          <h2 className="border-b px-5 py-3 text-sm font-semibold">
            {group.meta.plural} ({group.items.length})
          </h2>
          <ul>
            {group.items.map((row) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                key={`${row.kind}-${row.id}`}
              >
                <div className="min-w-0">
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    data-testid="search-hit"
                    href={group.meta.href(row.id ?? "")}
                  >
                    {row.title}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                    {row.snippet ||
                      (row.occurred_on ? formatDate(row.occurred_on) : "")}
                  </p>
                </div>
                <StatusBadge value={row.status ?? ""} kind={group.meta.badge} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
