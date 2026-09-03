import Link from "next/link";

import { createDecisionAction } from "@/app/actions/execution";
import {
  loadCreationOptions,
  loadViewerContext,
} from "@/modules/execution/application/creation-options";
import { QuickDecisionForm } from "@/ui/patterns/quick-forms";

export const dynamic = "force-dynamic";
export default async function NewDecisionPage() {
  const [options, viewer] = await Promise.all([
    loadCreationOptions("decision.create"),
    loadViewerContext("decision.create"),
  ]);
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href="/decisions">
          Decisões
        </Link>
        {" › "}Nova
      </p>
      <h1 className="mt-2 mb-6 text-4xl font-semibold tracking-tight">
        Nova decisão
      </h1>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <QuickDecisionForm
          action={createDecisionAction}
          context={{
            companyId: options.companies[0]?.id ?? "",
            options,
            contextRestaurantIds: viewer.restaurantIds,
            contextUnitIds: viewer.unitIds,
            contextLabel: "que cobres",
            companyWide: viewer.companyWide,
            people: [],
            currentProfileId: viewer.profileId,
          }}
        />
      </div>
    </section>
  );
}
