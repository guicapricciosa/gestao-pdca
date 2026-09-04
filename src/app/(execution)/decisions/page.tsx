import Link from "next/link";

import { createExecutionService } from "@/modules/execution/application/factory";
import { loadListOptions } from "@/modules/execution/application/creation-options";
import { ExecutionList } from "@/ui/patterns/execution-list";
import { ListFilters } from "@/ui/patterns/list-filters";
import { parseListSearch } from "@/ui/patterns/list-query";
import { Pagination } from "@/ui/patterns/pagination";
import { decisionStatusLabel, formatDate } from "@/ui/labels";

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
      (await createExecutionService()).listDecisions(parseListSearch(search)),
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
          <p className="text-accent text-sm font-medium">Execução</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            Decisões
          </h1>
          <p className="text-muted-foreground mt-3">
            O que ficou decidido, onde se aplica e o que gerou.
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
        basePath="/decisions"
        values={search}
        showPriority={false}
        showPeople={false}
        statuses={["DRAFT", "ACTIVE", "ARCHIVED"]}
        statusLabel={decisionStatusLabel}
        options={options}
      />
      <ExecutionList
        items={result.items.map((item) => ({
          ...item,
          secondary: `Decidida a ${formatDate(item.decisionDate)}`,
        }))}
        badgeKind="decision"
        basePath="/decisions"
        values={search}
        createHref="/decisions/new"
        createLabel="Nova decisão"
      />
      <Pagination
        basePath="/decisions"
        values={search}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </>
  );
}
