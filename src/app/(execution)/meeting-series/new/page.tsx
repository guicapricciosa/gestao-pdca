import { redirect } from "next/navigation";

/** Recurrence is chosen while marking a meeting ("Repetir"). */
export default function NewMeetingSeriesPage() {
  redirect("/meetings/new");
}
