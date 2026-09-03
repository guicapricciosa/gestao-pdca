import { createMeetingSeriesAction } from "@/app/actions/meetings";
import { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import { MeetingForm } from "@/ui/patterns/meeting-form";

export const dynamic = "force-dynamic";
export default async function NewMeetingSeriesPage() {
  const options = await loadMeetingCreationOptions();
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">
        Nova Meeting Series
      </h1>
      <MeetingForm
        kind="Series"
        options={options}
        action={createMeetingSeriesAction}
      />
    </section>
  );
}
