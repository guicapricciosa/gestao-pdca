import Link from "next/link";
import { createExecutionService } from "@/modules/execution/application/factory";
import { loadListOptions } from "@/modules/execution/application/creation-options";
import { ExecutionList } from "@/ui/patterns/execution-list";
import { ListFilters } from "@/ui/patterns/list-filters";
import {
  listHref,
  parseListSearch,
  singleParam,
} from "@/ui/patterns/list-query";
import { PdcaPanel } from "@/ui/patterns/pdca-panel";
import { Pagination } from "@/ui/patterns/pagination";
import { pdcaStatusLabel, statusOrder } from "@/ui/labels";
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
      (await createExecutionService()).listPdcas(parseListSearch(search)),
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
  const openId = singleParam(search, "open");
  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 lg:mb-10">
        <div>
          <p className="text-accent text-sm font-medium">Execução</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            PDCAs
          </h1>
          <p className="text-muted-foreground mt-3">
            Problemas estruturados de Plan até Act.
          </p>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm whitespace-nowrap text-white"
          href="/pdcas/new"
        >
          Novo PDCA
        </Link>
      </header>
      <ListFilters
        basePath="/pdcas"
        values={search}
        options={options}
        statuses={statusOrder.task}
        statusLabel={pdcaStatusLabel}
      />
      <ExecutionList
        items={result.items.map((item) => ({
          ...item,
          responsible:
            item.responsibleName ?? nameOf(item.responsibleProfileId),
          warnings: [
            ...(!item.dueDate &&
            !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(item.status)
              ? ["Sem prazo"]
              : []),
            ...(!item.ownerProfileId &&
            !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(item.status)
              ? ["Sem Owner"]
              : []),
          ],
        }))}
        badgeKind="pdca"
        basePath="/pdcas"
        values={search}
        openInPanel
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
      {openId !== "" && (
        <PdcaPanel
          id={openId}
          returnPath={listHref("/pdcas", search, { open: openId })}
          closeHref={listHref("/pdcas", search, { open: null })}
        />
      )}
    </>
  );
}
