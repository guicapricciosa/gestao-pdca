import { createPdcaAction } from "@/app/actions/execution";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionForm } from "@/ui/patterns/execution-form";
export const dynamic = "force-dynamic";
export default async function NewPdcaPage() {
  const options = await loadCreationOptions("pdca.create");
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">Novo PDCA</h1>
      <ExecutionForm kind="PDCA" options={options} action={createPdcaAction} />
    </section>
  );
}
