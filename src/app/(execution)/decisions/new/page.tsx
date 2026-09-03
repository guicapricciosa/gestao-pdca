import { createDecisionAction } from "@/app/actions/execution";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionForm } from "@/ui/patterns/execution-form";
export const dynamic = "force-dynamic";
export default async function NewDecisionPage() {
  const options = await loadCreationOptions("decision.create");
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">
        Nova Decision
      </h1>
      <ExecutionForm
        kind="Decision"
        options={options}
        action={createDecisionAction}
      />
    </section>
  );
}
