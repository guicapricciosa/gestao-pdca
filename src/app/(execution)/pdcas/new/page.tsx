import Link from "next/link";

import { createPdcaAction } from "@/app/actions/execution";
import {
  loadCreationOptions,
  loadListOptions,
  loadViewerContext,
} from "@/modules/execution/application/creation-options";
import { QuickPdcaForm } from "@/ui/patterns/quick-forms";

export const dynamic = "force-dynamic";
export default async function NewPdcaPage() {
  const [options, list, viewer] = await Promise.all([
    loadCreationOptions("pdca.create"),
    loadListOptions("pdca.create"),
    loadViewerContext("pdca.create"),
  ]);
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href="/pdcas">
          PDCAs
        </Link>
        {" › "}Novo
      </p>
      <h1 className="mt-2 mb-6 text-4xl font-semibold tracking-tight">
        Novo PDCA
      </h1>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <QuickPdcaForm
          action={createPdcaAction}
          context={{
            companyId: options.companies[0]?.id ?? "",
            options,
            contextRestaurantIds: viewer.restaurantIds,
            contextUnitIds: viewer.unitIds,
            contextLabel: "que cobres",
            companyWide: viewer.companyWide,
            people: list.people.map((person) => ({
              profile_id: person.id,
              display_name: person.name,
            })),
            currentProfileId: viewer.profileId,
          }}
        />
      </div>
    </section>
  );
}
