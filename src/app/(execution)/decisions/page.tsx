import Link from "next/link";

import { createExecutionService } from "@/modules/execution/application/factory";
import { loadListOptions } from "@/modules/execution/application/creation-options";
import { ExecutionList } from "@/ui/patterns/execution-list";
import { ListFilters } from "@/ui/patterns/list-filters";
import { Pagination } from "@/ui/patterns/pagination";

export const dynamic = "force-dynamic";

export default async function DecisionsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  let result;
  let options;
  try {
    [result, options] = await Promise.all([
      (await createExecutionService()).listDecisions({
        query:
          typeof search.query === "string" && search.query
            ? search.query
            : undefined,
        status:
          typeof search.status === "string" && search.status
            ? (search.status as "DRAFT" | "ACTIVE" | "ARCHIVED")
            : undefined,
        unitId:
          typeof search.unitId === "string" && search.unitId
            ? search.unitId
            : undefined,
        restaurantId:
          typeof search.restaurantId === "string" && search.restaurantId
            ? search.restaurantId
            : undefined,
        page: typeof search.page === "string" ? Number(search.page) : 1,
      }),
      loadListOptions("decision.read"),
    ]);
  } catch {
    result = { items: [], page: 1, pageSize: 25, total: 0 };
    options = { companies: [], units: [], restaurants: [], people: [] };
  }
  return (
    <>
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-accent text-sm font-medium">Execution Core</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            Decisions
          </h1>
          <p className="text-muted-foreground mt-3">
            Decisões duráveis, com contexto e ações relacionadas opcionais.
          </p>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/decisions/new"
        >
          Nova decisão
        </Link>
      </header>
      <ListFilters
        showPriority={false}
        showPeople={false}
        statuses={["DRAFT", "ACTIVE", "ARCHIVED"]}
        options={options}
      />
      <ExecutionList items={result.items} basePath="/decisions" />
      <Pagination
        basePath="/decisions"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </>
  );
}
