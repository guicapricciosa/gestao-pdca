import Link from "next/link";
import type {
  ExecutionStatus,
  PriorityLevel,
} from "@/modules/execution/domain/types";
import { createExecutionService } from "@/modules/execution/application/factory";
import { loadListOptions } from "@/modules/execution/application/creation-options";
import { ExecutionList } from "@/ui/patterns/execution-list";
import { ListFilters } from "@/ui/patterns/list-filters";
import { Pagination } from "@/ui/patterns/pagination";
export const dynamic = "force-dynamic";
export default async function PdcasPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  let result;
  let options;
  try {
    [result, options] = await Promise.all([
      (await createExecutionService()).listPdcas({
        query:
          typeof search.query === "string" && search.query
            ? search.query
            : undefined,
        status:
          typeof search.status === "string" && search.status
            ? (search.status as ExecutionStatus)
            : undefined,
        priority:
          typeof search.priority === "string" && search.priority
            ? (search.priority as PriorityLevel)
            : undefined,
        unitId:
          typeof search.unitId === "string" && search.unitId
            ? search.unitId
            : undefined,
        restaurantId:
          typeof search.restaurantId === "string" && search.restaurantId
            ? search.restaurantId
            : undefined,
        ownerId:
          typeof search.ownerId === "string" && search.ownerId
            ? search.ownerId
            : undefined,
        responsibleId:
          typeof search.responsibleId === "string" && search.responsibleId
            ? search.responsibleId
            : undefined,
        overdue: search.overdue === "true",
        page: typeof search.page === "string" ? Number(search.page) : 1,
      }),
      loadListOptions("pdca.read"),
    ]);
  } catch {
    result = { items: [], page: 1, pageSize: 25, total: 0 };
    options = { companies: [], units: [], restaurants: [], people: [] };
  }
  const people = new Map(
    options.people.map((person) => [person.id, person.name]),
  );
  const nameOf = (id: string | null) =>
    id === null ? null : (people.get(id) ?? "—");
  return (
    <>
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-accent text-sm font-medium">Execution Core</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            PDCAs
          </h1>
          <p className="text-muted-foreground mt-3">
            Problemas estruturados de Plan até Act.
          </p>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/pdcas/new"
        >
          Novo PDCA
        </Link>
      </header>
      <ListFilters basePath="/pdcas" values={search} options={options} />
      <ExecutionList
        items={result.items.map((item) => ({
          ...item,
          owner: nameOf(item.ownerProfileId),
          responsible: nameOf(item.responsibleProfileId),
        }))}
        basePath="/pdcas"
        createHref="/pdcas/new"
        createLabel="Novo PDCA"
      />
      <Pagination
        basePath="/pdcas"
        values={search}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
      />
    </>
  );
}
