import { createMeetingSessionAction } from "@/app/actions/meetings";
import { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import { MeetingForm } from "@/ui/patterns/meeting-form";

export const dynamic = "force-dynamic";
export default async function NewMeetingPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ seriesId?: string }>;
}) {
  const { seriesId } = await searchParams;
  const options = await loadMeetingCreationOptions();
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">
        Nova Meeting Session
      </h1>
      <MeetingForm
        kind="Session"
        options={options}
        action={createMeetingSessionAction}
        selectedSeriesId={seriesId}
      />
    </section>
  );
}
