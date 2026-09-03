import { redirect } from "next/navigation";

/** The review step is now part of "Terminar reunião". */
export default async function ReviewMeetingPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/meetings/${id}/finish`);
}
