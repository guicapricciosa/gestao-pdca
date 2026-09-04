import Link from "next/link";

import { createMeetingSessionAction } from "@/app/actions/meetings";
import { loadViewerContext } from "@/modules/execution/application/creation-options";
import { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import { MeetingForm } from "@/ui/patterns/meeting-form";

export const dynamic = "force-dynamic";
export default async function NewMeetingPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ seriesId?: string; start?: string }>;
}) {
  const { seriesId, start } = await searchParams;
  const [options, viewer] = await Promise.all([
    loadMeetingCreationOptions(),
    loadViewerContext("meeting.create"),
  ]);
  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href="/meetings">
          Reuniões
        </Link>
        {" › "}Nova
      </p>
      <h1 className="mt-2 mb-8 text-4xl font-semibold tracking-tight">
        Marcar reunião
      </h1>
      <MeetingForm
        options={options}
        action={createMeetingSessionAction}
        selectedSeriesId={seriesId}
        contextRestaurantIds={viewer.restaurantIds}
        contextUnitIds={viewer.unitIds}
        companyWide={viewer.companyWide}
        initialStart={
          start && !Number.isNaN(new Date(start).getTime()) ? start : undefined
        }
      />
    </section>
  );
}
