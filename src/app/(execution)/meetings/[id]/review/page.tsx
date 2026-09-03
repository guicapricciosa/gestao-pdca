import Link from "next/link";
import { notFound } from "next/navigation";

import { transitionMeetingAction } from "@/app/actions/meetings";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { meetingPublishIssues } from "@/modules/meetings/domain/lifecycle";

export const dynamic = "force-dynamic";
export default async function ReviewMeetingPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const { data: profiles } = await detail.client
    .from("profiles")
    .select("id,display_name");
  const nameOf = (profileId: string | null) =>
    profileId === null
      ? "—"
      : (profiles?.find((profile) => profile.id === profileId)?.display_name ??
        "Sem acesso ao perfil");
  const created = detail.links.filter(
    (link) => link.relation_type === "CREATED",
  );
  const issues = meetingPublishIssues({
    agendaStatuses: detail.agenda.map((item) => item.status),
    createdObjects: created.map((link) => {
      const record = link.record;
      const complete =
        record.kind === "DECISION" ||
        (record.owner_profile_id !== null &&
          record.responsible_profile_id !== null &&
          record.due_date !== null &&
          (record.kind !== "PDCA" ||
            (record.problem_statement !== null && record.objective !== null)));
      return {
        type: link.objectType as "DECISION" | "TASK" | "PDCA",
        complete,
        accessible: true,
      };
    }),
  });
  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">Review Meeting</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {detail.session.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          Validar ações antes da publicação.
        </p>
        <Link
          className="mt-4 inline-block rounded-full border px-4 py-2 text-sm"
          href={`/meetings/${id}/assistant`}
        >
          AI Assistant
        </Link>
      </header>
      {issues.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold">Requer atenção</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-4">TYPE</th>
              <th className="p-4">TITLE</th>
              <th className="p-4">OWNER</th>
              <th className="p-4">RESPONSIBLE</th>
              <th className="p-4">DUE DATE</th>
              <th className="p-4">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {detail.links.map((link) => {
              const record = link.record;
              const accountable =
                record.kind === "TASK" || record.kind === "PDCA";
              return (
                <tr className="border-b last:border-0" key={link.id}>
                  <td className="p-4">{link.objectType}</td>
                  <td className="p-4">
                    <Link
                      className="hover:underline"
                      href={`/${link.objectType === "TASK" ? "tasks" : link.objectType === "PDCA" ? "pdcas" : "decisions"}/${record.id}`}
                    >
                      {record.title}
                    </Link>
                  </td>
                  <td className="p-4">
                    {accountable ? nameOf(record.owner_profile_id) : "—"}
                  </td>
                  <td className="p-4">
                    {accountable ? nameOf(record.responsible_profile_id) : "—"}
                  </td>
                  <td className="p-4">
                    {accountable ? (record.due_date ?? "—") : "—"}
                  </td>
                  <td className="p-4">{record.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Agenda outcomes</h2>
        {detail.agenda.map((item) => (
          <div
            className="mt-3 flex justify-between border-t pt-3 text-sm"
            key={item.id}
          >
            <span>{item.title}</span>
            <span>{item.status}</span>
          </div>
        ))}
      </section>
      {detail.session.status === "REVIEW" && (
        <form action={transitionMeetingAction}>
          <input type="hidden" name="meetingSessionId" value={id} />
          <input type="hidden" name="version" value={detail.session.version} />
          <input type="hidden" name="status" value="PUBLISHED" />
          <input
            type="hidden"
            name="returnPath"
            value={`/meetings/${id}/review`}
          />
          <button className="rounded-full bg-black px-5 py-2.5 text-sm text-white">
            Publish Meeting
          </button>
        </form>
      )}
    </div>
  );
}
