import Link from "next/link";

import { importPlaudAction } from "@/app/actions/plaud";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { PlaudImportForm } from "@/ui/patterns/plaud-import-form";

export const dynamic = "force-dynamic";

/**
 * Definições › Importar Plaud. Paste the JSON prepared from a recording,
 * check the preview, choose the restaurant, import. Everything created is
 * PRIVATE and belongs to the person importing.
 */
export default async function PlaudImportPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ criados?: string; ignorados?: string }>;
}) {
  const { criados, ignorados } = await searchParams;
  const options = await loadCreationOptions("pdca.create");
  const company = options.companies[0];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link className="hover:underline" href="/definicoes">
            Definições
          </Link>
          {" › "}Importar Plaud
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Importar gravação Plaud
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cola o bloco JSON preparado a partir da gravação. Cada acção entra
          como PDCA <strong>privado</strong> teu, com as subtarefas ligadas e a
          referência à gravação; o que já tiver sido importado dessa gravação é
          ignorado.
        </p>
      </header>
      {(criados !== undefined || ignorados !== undefined) && (
        <p
          className="rounded-2xl border bg-white p-4 text-sm"
          data-testid="plaud-result"
        >
          Importados <strong>{criados ?? 0}</strong> · ignorados por já
          existirem <strong>{ignorados ?? 0}</strong>.{" "}
          <Link
            className="underline underline-offset-4"
            href="/pdcas?sort=updated_at&dir=desc"
          >
            Ver PDCAs
          </Link>
        </p>
      )}
      {company ? (
        <PlaudImportForm
          action={importPlaudAction}
          companyId={company.id}
          restaurants={options.restaurants}
          units={options.units}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Sem autorização para criar PDCAs.
        </p>
      )}
    </div>
  );
}
