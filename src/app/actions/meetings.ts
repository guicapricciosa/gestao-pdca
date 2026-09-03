"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const command = createMeetingSeriesSchema.parse({
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
  if (error !== null) throw new Error(error.message);
  redirect(`/meeting-series/${data}`);
}

export async function createMeetingSessionAction(formData: FormData) {
  const command = createMeetingSessionSchema.parse({
    companyId: String(formData.get("companyId")),
    title: String(formData.get("title")),
    meetingSeriesId: optional(formData, "meetingSeriesId"),
    chairProfileId: String(formData.get("chairProfileId")),
    scheduledStartAt: iso(formData, "scheduledStartAt"),
    scheduledEndAt: iso(formData, "scheduledEndAt"),
    visibility: String(formData.get("visibility")),
    unitIds: values(formData, "unitIds"),
    restaurantIds: values(formData, "restaurantIds"),
  });
  const client = await createSupabaseServerClient();
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
  if (error !== null) throw new Error(error.message);
  redirect(`/meetings/${data}`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meeting-series/${id}`);
}

export async function deactivateMeetingSeriesAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSeriesId"));
  const { error } = await client.rpc("deactivate_meeting_series", {
    meeting_series_id: id,
    expected_version: Number(formData.get("version")),
    reason: String(formData.get("reason")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meeting-series/${id}`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
  revalidatePath(`/meetings/${id}/run`);
  revalidatePath(`/meetings/${id}/review`);
}

export async function reopenMeetingAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("reopen_meeting_session", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    reason: String(formData.get("reason")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
}

export async function addMeetingParticipantAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("add_meeting_participant", {
    meeting_session_id: id,
    profile_id: String(formData.get("profileId")),
    participant_role: "PARTICIPANT",
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
  revalidatePath(`/meetings/${id}/run`);
}

export async function removeMeetingParticipantAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("remove_meeting_participant", {
    participant_id: String(formData.get("participantId")),
    reason: optional(formData, "reason") as never,
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
}

export async function changeMeetingChairAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("change_meeting_chair", {
    meeting_session_id: id,
    expected_version: Number(formData.get("version")),
    new_chair_profile_id: String(formData.get("profileId")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
  revalidatePath(`/meetings/${id}/run`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}`);
  revalidatePath(`/meetings/${id}/run`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${meetingId}/run`);
}

export async function reorderMeetingAgendaItemAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("reorder_meeting_agenda_item", {
    agenda_item_id: String(formData.get("agendaItemId")),
    expected_version: Number(formData.get("version")),
    new_position: Number(formData.get("position")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath(`/meetings/${meetingId}/run`);
}

export async function addMeetingNoteAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("add_meeting_note", {
    meeting_session_id: id,
    meeting_agenda_item_id: optional(formData, "agendaItemId") as never,
    content: String(formData.get("content")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}/run`);
}

export async function updateMeetingNoteAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const { error } = await client.rpc("update_meeting_note", {
    note_id: String(formData.get("noteId")),
    expected_version: Number(formData.get("version")),
    content: String(formData.get("content")),
  });
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${meetingId}/run`);
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
  if (error !== null) throw new Error(error.message);
  revalidatePath(`/meetings/${id}/run`);
}

export async function createMeetingObjectAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const meetingId = String(formData.get("meetingSessionId"));
  const common = {
    meeting_session_id: meetingId,
    company_id: String(formData.get("companyId")),
    title: String(formData.get("title")),
    visibility: String(formData.get("visibility")) as never,
    unit_ids: values(formData, "unitIds"),
    restaurant_ids: values(formData, "restaurantIds"),
    meeting_agenda_item_id: optional(formData, "agendaItemId") as never,
  };
  const kind = String(formData.get("kind"));
  const result =
    kind === "DECISION"
      ? await client.rpc("create_meeting_decision", {
          ...common,
          description: String(formData.get("description")),
          decision_date: String(formData.get("decisionDate")),
        })
      : kind === "TASK"
        ? await client.rpc("create_meeting_task", {
            ...common,
            description: String(formData.get("description")),
            priority: String(formData.get("priority")),
            owner_profile_id: String(formData.get("ownerProfileId")),
            responsible_profile_id: String(
              formData.get("responsibleProfileId"),
            ),
            due_date: String(formData.get("dueDate")),
          })
        : await client.rpc("create_meeting_pdca", {
            ...common,
            problem_statement: String(formData.get("description")),
            objective: String(formData.get("objective")),
            priority: String(formData.get("priority")),
            owner_profile_id: String(formData.get("ownerProfileId")),
            responsible_profile_id: String(
              formData.get("responsibleProfileId"),
            ),
            due_date: String(formData.get("dueDate")),
          });
  if (result.error !== null) throw new Error(result.error.message);
  revalidatePath(`/meetings/${meetingId}/run`);
  revalidatePath(`/meetings/${meetingId}/review`);
}
