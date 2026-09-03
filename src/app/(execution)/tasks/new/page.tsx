import Link from "next/link";

import { createTaskAction } from "@/app/actions/execution";
import {
  loadCreationOptions,
  loadListOptions,
  loadViewerContext,
} from "@/modules/execution/application/creation-options";
import { QuickTaskForm } from "@/ui/patterns/quick-forms";

export const dynamic = "force-dynamic";
export default async function NewTaskPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ pdcaId?: string }>;
}) {
  const { pdcaId } = await searchParams;
  const [options, list, viewer] = await Promise.all([
    loadCreationOptions("task.create"),
    loadListOptions("task.create"),
    loadViewerContext("task.create"),
  ]);
  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href="/tasks">
          Tarefas
        </Link>
        {" › "}Nova
      </p>
      <h1 className="mt-2 mb-6 text-4xl font-semibold tracking-tight">
        Nova tarefa
      </h1>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <QuickTaskForm
          action={createTaskAction}
          pdcaId={pdcaId}
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
