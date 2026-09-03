import { createTaskAction } from "@/app/actions/execution";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionForm } from "@/ui/patterns/execution-form";
export const dynamic = "force-dynamic";
export default async function NewTaskPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ pdcaId?: string }>;
}) {
  const { pdcaId } = await searchParams;
  const options = await loadCreationOptions("task.create");
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">Nova Task</h1>
      <ExecutionForm
        kind="Task"
        options={options}
        action={createTaskAction}
        pdcaId={pdcaId}
      />
    </section>
  );
}
