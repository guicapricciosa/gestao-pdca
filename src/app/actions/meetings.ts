"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { finish } from "@/app/actions/finish";
import {
  describeRecurrence,
  parseRecurrence,
} from "@/modules/meetings/domain/recurrence";
import { describeCommandError } from "@/shared/errors/describe";

import {
  createMeetingSeriesSchema,
  createMeetingSessionSchema,
} from "@/modules/meetings/domain/validation";
import { createSupabaseServerClient } from "@/platform/supabase/server";

function optional(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function values(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter(
      (value): value is string => typeof value === "string" && value !== "",
    );
}

function iso(formData: FormData, name: string) {
  return new Date(String(formData.get(name))).toISOString();
}

export async function createMeetingSeriesAction(formData: FormData) {
  const parsed = createMeetingSeriesSchema.safeParse({
    companyId: String(formData.get("companyId")),
    title: String(formData.get("title")),
    description: optional(formData, "description"),
    meetingType: String(formData.get("meetingType")),
    defaultChairProfileId: optional(formData, "defaultChairProfileId"),
    recurrenceRule: optional(formData, "recurrenceRule"),
    visibility: String(formData.get("visibility")),
    unitIds: values(formData, "unitIds"),
    restaurantIds: values(formData, "restaurantIds"),
  });
  if (!parsed.success)
    finish("/meeting-series/new", new Error(parsed.error.issues[0]?.message));
  const command = parsed.data;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("create_meeting_series", {
    company_id: command.companyId,
    title: command.title,
    description: command.description as never,
    meeting_type: command.meetingType,
    default_chair_profile_id: command.defaultChairProfileId as never,
    recurrence_rule: command.recurrenceRule as never,
    visibility: command.visibility,
    unit_ids: command.unitIds,
    restaurant_ids: command.restaurantIds,
  });
  if (error !== null) finish("/meeting-series/new", error);
  redirect(`/meeting-series/${data}`);
}

export async function createMeetingSessionAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const companyId = String(formData.get("companyId"));
  const title = String(formData.get("title"));
  const unitIds = values(formData, "unitIds");
  const restaurantIds = values(formData, "restaurantIds");
  const visibility = optional(formData, "visibility") ?? "NORMAL";
  const chairProfileId = String(formData.get("chairProfileId"));
  let seriesId =
    optional(formData, "meetingSeriesId") ??
    optional(formData, "existingSeriesId");
  const recurrence = parseRecurrence(formData.get("recurrence"));
  if (seriesId === null && recurrence.freq !== "NONE") {
    const label = describeRecurrence(recurrence);
    const seriesTitle = title.split(" · ")[0]?.trim() || title;
    const { data, error } = await client.rpc("create_meeting_series", {
      company_id: companyId,
      title: seriesTitle,
      description: null as never,
      meeting_type: "OPERATIONS",
      default_chair_profile_id: chairProfileId as never,
      recurrence_rule: label as never,
      recurrence_metadata: JSON.parse(JSON.stringify({ recurrence })),
      visibility: visibility as never,
      unit_ids: unitIds,
      restaurant_ids: restaurantIds,
    });
    if (error !== null) finish("/meetings/new", error);
    seriesId = data;
    await client.rpc("set_meeting_series_recurrence", {
      meeting_series_id: data,
      expected_version: 1,
      recurrence: recurrence as never,
      recurrence_rule: label,
    });
  }
  const parsed = createMeetingSessionSchema.safeParse({
    companyId,
    title,
    meetingSeriesId: seriesId,
    chairProfileId,
    scheduledStartAt: iso(formData, "scheduledStartAt"),
    scheduledEndAt: iso(formData, "scheduledEndAt"),
    visibility,
    unitIds,
    restaurantIds,
  });
  if (!parsed.success)
    finish("/meetings/new", new Error(parsed.error.issues[0]?.message));
  const command = parsed.data;
  const { data, error } = await client.rpc("create_meeting_session", {
    company_id: command.companyId,
    title: command.title,
    meeting_series_id: command.meetingSeriesId as never,
    chair_profile_id: command.chairProfileId,
    scheduled_start_at: command.scheduledStartAt,
    scheduled_end_at: command.scheduledEndAt,
    visibility: command.visibility,
    unit_ids: command.unitIds,
    restaurant_ids: command.restaurantIds,
  });
  if (error !== null) finish("/meetings/new", error);
  // Base agenda from the template, in order.
  for (const line of (optional(formData, "agendaItems") ?? "").split("\n")) {
    const itemTitle = line.trim().slice(0, 240);
    if (itemTitle.length < 2) continue;
    await client.rpc("add_meeting_agenda_item", {
      meeting_session_id: data,
      title: itemTitle,
    });
  }
  const skipped: string[] = [];
  for (const profileId of values(formData, "participantIds")) {
    if (profileId === chairProfileId) continue;
    const participant = await client.rpc("add_meeting_participant", {
      meeting_session_id: data,
      profile_id: profileId,
      participant_role: "PARTICIPANT",
    });
    if (participant.error !== null) skipped.push(profileId);
  }
  revalidatePath("/meetings");
  if (skipped.length > 0)
    redirect(
      `/meetings/${data}/run?error=${encodeURIComponent(
        `${skipped.length} pessoa(s) não foram adicionadas porque não têm acesso ao âmbito desta reunião. Ajusta o âmbito e volta a adicioná-las.`,
      )}`,
    );
  redirect(`/meetings/${data}/run`);
}

export async function updateMeetingSeriesAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSeriesId"));
  const { error } = await client.rpc("update_meeting_series", {
    meeting_series_id: id,
    expected_version: Number(formData.get("version")),
    title: String(formData.get("title")),
    description: optional(formData, "description") as never,
    meeting_type: String(formData.get("meetingType")),
    default_chair_profile_id: optional(
      formData,
      "defaultChairProfileId",
    ) as never,
    recurrence_rule: optional(formData, "recurrenceRule") as never,
    recurrence_metadata: {},
  });
  finish(`/meeting-series/${id}`, error);
}

export async function deactivateMeetingSeriesAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSeriesId"));
  const { error } = await client.rpc("deactivate_meeting_series", {
    meeting_series_id: id,
    expected_version: Number(formData.get("version")),
    reason: String(formData.get("reason")),
  });
  finish(`/meeting-series/${id}`, error);
}

export async function updateMeetingSessionAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("update_meeting_session", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    title: String(formData.get("title")),
    scheduled_start_at: iso(formData, "scheduledStartAt"),
    scheduled_end_at: iso(formData, "scheduledEndAt"),
  });
  finish(`/meetings/${id}`, error);
}

export async function transitionMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("transition_meeting_session", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    new_status: String(formData.get("status")),
    reason: optional(formData, "reason") as never,
  });
  finish(optional(formData, "returnPath") ?? `/meetings/${id}`, error, [
    `/meetings/${id}/run`,
    `/meetings/${id}/review`,
  ]);
}

/** Marks a meeting deleted (snapshot kept in the audit trail). */
export async function deleteMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("delete_meeting_session", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    reason: String(formData.get("reason")),
  });
  if (error !== null) finish(`/meetings/${id}`, error);
  finish("/meetings", null, ["/my-work", "/painel"]);
}

export async function reopenMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("reopen_meeting_session", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    reason: String(formData.get("reason")),
  });
  finish(`/meetings/${id}`, error);
}

export async function addMeetingParticipantAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("add_meeting_participant", {
    meeting_session_id: id,
    profile_id: String(formData.get("profileId")),
    participant_role: "PARTICIPANT",
  });
  finish(`/meetings/${id}`, error, [`/meetings/${id}/run`]);
}

export async function removeMeetingParticipantAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("remove_meeting_participant", {
    participant_id: String(formData.get("participantId")),
    reason: optional(formData, "reason") as never,
  });
  finish(`/meetings/${id}`, error);
}

export async function changeMeetingChairAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("change_meeting_chair", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    new_chair_profile_id: String(formData.get("profileId")),
  });
  finish(`/meetings/${id}`, error, [`/meetings/${id}/run`]);
}

export async function addMeetingAgendaItemAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const estimatedMinutes = optional(formData, "estimatedMinutes");
  const { error } = await client.rpc("add_meeting_agenda_item", {
    meeting_session_id: id,
    title: String(formData.get("title")),
    description: optional(formData, "description") as never,
    presenter_profile_id: optional(formData, "presenterProfileId") as never,
    ...(estimatedMinutes === null
      ? {}
      : { estimated_minutes: Number(estimatedMinutes) }),
    carried_forward_from_id: optional(
      formData,
      "carriedForwardFromId",
    ) as never,
  });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${id}/run`,
    error,
    [`/meetings/${id}`, `/meetings/${id}/review`],
    { silent: true },
  );
}

export async function setMeetingAgendaStatusAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("set_meeting_agenda_status", {
    agenda_item_id: String(formData.get("agendaItemId")),
    expected_version: Number(formData.get("version")),
    new_status: String(formData.get("status")),
    reason: optional(formData, "reason") as never,
  });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${meetingId}/run`,
    error,
    [`/meetings/${meetingId}`, `/meetings/${meetingId}/review`],
    { silent: true },
  );
}

export async function reorderMeetingAgendaItemAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("reorder_meeting_agenda_item", {
    agenda_item_id: String(formData.get("agendaItemId")),
    expected_version: Number(formData.get("version")),
    new_position: Number(formData.get("position")),
  });
  finish(`/meetings/${meetingId}`, error, [`/meetings/${meetingId}/run`]);
}

export async function addMeetingNoteAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("add_meeting_note", {
    meeting_session_id: id,
    meeting_agenda_item_id: optional(formData, "agendaItemId") as never,
    content: String(formData.get("content")),
  });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${id}/run`,
    error,
    [`/meetings/${id}`, `/meetings/${id}/review`],
    { silent: true },
  );
}

export async function updateMeetingNoteAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("update_meeting_note", {
    note_id: String(formData.get("noteId")),
    expected_version: Number(formData.get("version")),
    content: String(formData.get("content")),
  });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${meetingId}/run`,
    error,
    [`/meetings/${meetingId}`, `/meetings/${meetingId}/review`],
    { silent: true },
  );
}

export async function linkMeetingObjectAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("link_meeting_object", {
    meeting_session_id: id,
    security_object_id: String(formData.get("securityObjectId")),
    relation_type: String(formData.get("relationType")) as never,
    meeting_agenda_item_id: optional(formData, "agendaItemId") as never,
    outcome_notes: optional(formData, "outcomeNotes") as never,
  });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${id}/run`,
    error,
    [`/meetings/${id}`, `/meetings/${id}/review`],
    { silent: true },
  );
}

export async function createMeetingObjectAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const common = {
    meeting_session_id: meetingId,
    company_id: String(formData.get("companyId")),
    title: optional(formData, "title") ?? "",
    visibility: String(formData.get("visibility")) as never,
    unit_ids: values(formData, "unitIds"),
    restaurant_ids: values(formData, "restaurantIds"),
    meeting_agenda_item_id: optional(formData, "agendaItemId") as never,
  };
  const kind = String(formData.get("kind"));
  const problem = optional(formData, "description") ?? "";
  const result =
    kind === "DECISION"
      ? await client.rpc("create_meeting_decision", {
          ...common,
          description: optional(formData, "description") ?? "",
          decision_date:
            optional(formData, "decisionDate") ??
            new Date().toISOString().slice(0, 10),
        })
      : kind === "TASK"
        ? await client.rpc("create_meeting_task", {
            ...common,
            description: optional(formData, "description") ?? "",
            priority: optional(formData, "priority") ?? "MEDIUM",
            owner_profile_id: optional(formData, "ownerProfileId") as never,
            responsible_profile_id: String(
              formData.get("responsibleProfileId"),
            ),
            due_date: optional(formData, "dueDate") as never,
          })
        : await client.rpc("create_meeting_pdca", {
            ...common,
            title:
              optional(formData, "title") ??
              problem.split(/[.\n]/)[0]?.trim().slice(0, 240) ??
              problem.slice(0, 240),
            problem_statement: problem,
            objective: String(formData.get("objective")),
            priority: optional(formData, "priority") ?? "MEDIUM",
            owner_profile_id: String(formData.get("ownerProfileId")),
            responsible_profile_id: String(
              formData.get("responsibleProfileId"),
            ),
            due_date: optional(formData, "dueDate") as never,
          });
  finish(
    optional(formData, "returnPath") ?? `/meetings/${meetingId}/run`,
    result.error,
    [`/meetings/${meetingId}`, `/meetings/${meetingId}/review`],
  );
}

// ---------------------------------------------------------------------------
// Meeting Mode helpers that return results instead of redirecting: used by
// client components (autosaved notes, terminar e distribuir).

export async function saveMeetingNoteAction(input: {
  noteId: string;
  version: number;
  content: string;
}): Promise<
  | { ok: true; version: number }
  | { ok: false; reason: "conflict" | "error"; message: string }
> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("update_meeting_note", {
    note_id: input.noteId,
    expected_version: input.version,
    content: input.content,
  });
  if (error !== null) {
    const conflict = /optimistic concurrency conflict/i.test(error.message);
    return {
      ok: false,
      reason: conflict ? "conflict" : "error",
      message: describeCommandError(error.message),
    };
  }
  return { ok: true, version: Number(data.version) };
}

export async function createMeetingNoteAction(input: {
  meetingId: string;
  content: string;
  agendaItemId: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("add_meeting_note", {
    meeting_session_id: input.meetingId,
    content: input.content,
    meeting_agenda_item_id: input.agendaItemId as never,
  });
  if (error !== null)
    return { ok: false, message: describeCommandError(error.message) };
  revalidatePath(`/meetings/${input.meetingId}/run`);
  return { ok: true, id: data };
}

/** Abrir reunião: agenda (se ainda em rascunho) e começa, numa só acção. */
export async function openMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  let version = Number(formData.get("version"));
  let status = String(formData.get("status"));
  const path = `/meetings/${id}/run`;
  if (status === "DRAFT") {
    const { data, error } = await client.rpc("transition_meeting_session", {
      meeting_session_id: id,
      expected_version: version,
      new_status: "SCHEDULED",
    });
    if (error !== null) finish(path, error, [`/meetings/${id}`]);
    version = Number(data.version);
    status = "SCHEDULED";
  }
  if (status === "SCHEDULED") {
    const { error } = await client.rpc("transition_meeting_session", {
      meeting_session_id: id,
      expected_version: version,
      new_status: "IN_PROGRESS",
    });
    if (error !== null) finish(path, error, [`/meetings/${id}`]);
  }
  finish(path, null, [`/meetings/${id}`, "/my-work"]);
}

/** Terminar e distribuir: uma operação transaccional no servidor. */
export async function finishMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const outcomes = [] as { agenda_item_id: string; outcome: string }[];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("agenda:") && typeof value === "string")
      outcomes.push({ agenda_item_id: key.slice(7), outcome: value });
  }
  const { error } = await client.rpc("finish_meeting", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    agenda_outcomes: outcomes as never,
  });
  if (error !== null) finish(`/meetings/${id}/finish`, error);
  for (const route of [`/meetings/${id}`, `/meetings/${id}/run`, "/my-work"])
    revalidatePath(route);
  redirect(`/meetings/${id}?finished=1`);
}

function uuidList(formData: FormData, name: string) {
  return values(formData, name).filter((value) =>
    /^[0-9a-f-]{36}$/i.test(value),
  );
}

export async function saveMeetingTemplateAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const templateId = optional(formData, "templateId");
  const agenda = (optional(formData, "agenda") ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((line) => line.length >= 2)
    .slice(0, 30);
  const recurrence = parseRecurrence(formData.get("recurrence"));
  const { data, error } = await client.rpc("save_meeting_template", {
    template_id: templateId as never,
    expected_version: Number(formData.get("version") ?? 1),
    company_id: String(formData.get("companyId")),
    name: String(formData.get("name")),
    default_duration_minutes: Number(formData.get("durationMinutes") ?? 60),
    meeting_type: optional(formData, "meetingType") ?? "OPERATIONS",
    visibility: (optional(formData, "visibility") ?? "NORMAL") as never,
    participant_profile_ids: uuidList(formData, "participantIds"),
    unit_ids: uuidList(formData, "unitIds"),
    restaurant_ids:
      formData.get("scopeMode") === "all"
        ? []
        : uuidList(formData, "restaurantIds"),
    all_restaurants: formData.get("scopeMode") === "all",
    agenda: agenda as never,
    recurrence: recurrence as never,
  });
  if (error !== null)
    finish(
      templateId
        ? `/definicoes/modelos-de-reuniao/${templateId}`
        : "/definicoes/modelos-de-reuniao/novo",
      error,
    );
  revalidatePath("/definicoes/modelos-de-reuniao");
  revalidatePath("/meetings/new");
  redirect(`/definicoes/modelos-de-reuniao?saved=1`);
  void data;
}

export async function deactivateMeetingTemplateAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("deactivate_meeting_template", {
    template_id: String(formData.get("templateId")),
    expected_version: Number(formData.get("version")),
  });
  finish("/definicoes/modelos-de-reuniao", error, ["/meetings/new"]);
}
