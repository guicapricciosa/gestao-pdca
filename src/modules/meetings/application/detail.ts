import "server-only";

import { createSupabaseServerClient } from "@/platform/supabase/server";

export type MeetingLinkedRecord =
  | {
      id: string;
      security_object_id: string;
      title: string;
      status: string;
      kind: "DECISION";
    }
  | {
      id: string;
      security_object_id: string;
      title: string;
      status: string;
      owner_profile_id: string | null;
      responsible_profile_id: string | null;
      due_date: string | null;
      kind: "TASK";
    }
  | {
      id: string;
      security_object_id: string;
      title: string;
      status: string;
      problem_statement: string | null;
      objective: string | null;
      owner_profile_id: string | null;
      responsible_profile_id: string | null;
      due_date: string | null;
      kind: "PDCA";
    };

export async function loadMeetingDetail(id: string) {
  const client = await createSupabaseServerClient();
  const sessionResult = await client
    .from("meeting_sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (sessionResult.data === null) return null;
  const session = sessionResult.data;
  const [participants, agenda, notes, links, activity, followups, people] =
    await Promise.all([
      client
        .from("meeting_participants")
        .select(
          "id,profile_id,participant_role,invitation_status,attended,profile:profiles!meeting_participants_profile_id_fkey(display_name)",
        )
        .eq("meeting_session_id", id)
        .is("removed_at", null),
      client
        .from("meeting_agenda_items")
        .select("*")
        .eq("meeting_session_id", id)
        .order("position"),
      client
        .from("meeting_notes")
        .select(
          "id,meeting_agenda_item_id,content,version,created_at,author:profiles!meeting_notes_author_profile_id_fkey(display_name)",
        )
        .eq("meeting_session_id", id)
        .order("created_at"),
      client
        .from("meeting_object_links")
        .select(
          "id,security_object_id,meeting_agenda_item_id,relation_type,outcome_notes,linked_at",
        )
        .eq("meeting_session_id", id)
        .is("unlinked_at", null),
      client
        .from("meeting_activity")
        .select("id,action,reason,occurred_at")
        .eq("security_object_id", session.security_object_id)
        .order("occurred_at", { ascending: false })
        .limit(50),
      client.rpc("meeting_previous_followups", { current_session_id: id }),
      client.rpc("get_meeting_accessible_profiles", {
        meeting_security_object_id: session.security_object_id,
      }),
    ]);
  const rawLinks = links.data ?? [];
  const objectIds = rawLinks.map((link) => link.security_object_id);
  const objects =
    objectIds.length === 0
      ? { data: [] }
      : await client
          .from("security_objects")
          .select("id,object_type")
          .in("id", objectIds);
  const [decisions, tasks, pdcas] = await Promise.all([
    objectIds.length === 0
      ? Promise.resolve({ data: [] })
      : client
          .from("decisions")
          .select("id,security_object_id,title,status")
          .in("security_object_id", objectIds),
    objectIds.length === 0
      ? Promise.resolve({ data: [] })
      : client
          .from("tasks")
          .select(
            "id,security_object_id,title,status,owner_profile_id,responsible_profile_id,due_date",
          )
          .in("security_object_id", objectIds),
    objectIds.length === 0
      ? Promise.resolve({ data: [] })
      : client
          .from("pdcas")
          .select(
            "id,security_object_id,title,status,problem_statement,objective,owner_profile_id,responsible_profile_id,due_date",
          )
          .in("security_object_id", objectIds),
  ]);
  const records: MeetingLinkedRecord[] = [
    ...(decisions.data ?? []).map((record) => ({
      ...record,
      kind: "DECISION" as const,
    })),
    ...(tasks.data ?? []).map((record) => ({
      ...record,
      kind: "TASK" as const,
    })),
    ...(pdcas.data ?? []).map((record) => ({
      ...record,
      kind: "PDCA" as const,
    })),
  ];
  return {
    client,
    session,
    participants: participants.data ?? [],
    agenda: agenda.data ?? [],
    notes: notes.data ?? [],
    links: rawLinks.flatMap((link) => {
      const object = (objects.data ?? []).find(
        (candidate) => candidate.id === link.security_object_id,
      );
      const record = records.find(
        (candidate) => candidate.security_object_id === link.security_object_id,
      );
      return object && record
        ? [{ ...link, objectType: record.kind, record }]
        : [];
    }),
    activity: activity.data ?? [],
    followups: followups.data ?? [],
    people: people.data ?? [],
  };
}
