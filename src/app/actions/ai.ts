"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AiRunFailure } from "@/modules/ai/application/run-use-case";
import {
  runExecutionValidatorAi,
  runMeetingAssistant,
  runMeetingSummary,
} from "@/modules/ai/application/services";
import { createSupabaseServerClient } from "@/platform/supabase/server";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function failureMessage(error: unknown) {
  if (error instanceof AiRunFailure)
    return `${error.category}: ${error.message}`;
  return error instanceof Error ? error.message : "Unexpected AI failure";
}

function backTo(path: string, error?: unknown) {
  if (error === undefined) redirect(path);
  redirect(`${path}?ai_error=${encodeURIComponent(failureMessage(error))}`);
}

function meetingPaths(sessionId: string) {
  return [
    `/meetings/${sessionId}`,
    `/meetings/${sessionId}/run`,
    `/meetings/${sessionId}/review`,
    `/meetings/${sessionId}/assistant`,
  ];
}

export async function runMeetingAssistantAction(formData: FormData) {
  const sessionId = String(formData.get("meetingSessionId"));
  const path = `/meetings/${sessionId}/assistant`;
  let failure: unknown;
  try {
    await runMeetingAssistant(sessionId, text(formData, "extraInput"));
  } catch (error) {
    failure = error;
  }
  meetingPaths(sessionId).forEach((route) => revalidatePath(route));
  backTo(path, failure);
}

export async function runMeetingSummaryAction(formData: FormData) {
  const sessionId = String(formData.get("meetingSessionId"));
  const path = `/meetings/${sessionId}/assistant`;
  let failure: unknown;
  try {
    await runMeetingSummary(sessionId);
  } catch (error) {
    failure = error;
  }
  meetingPaths(sessionId).forEach((route) => revalidatePath(route));
  backTo(path, failure);
}

export async function confirmAiProposalAction(formData: FormData) {
  const sessionId = String(formData.get("meetingSessionId"));
  const path = `/meetings/${sessionId}/assistant`;
  const type = String(formData.get("proposalType"));
  const payload: Record<string, unknown> =
    type === "SUMMARY"
      ? { summary: text(formData, "summary") ?? "" }
      : {
          title: text(formData, "title") ?? "",
          description: text(formData, "description") ?? "",
          objective: text(formData, "objective"),
          priority: text(formData, "priority") ?? "MEDIUM",
          ownerProfileId: text(formData, "ownerProfileId"),
          responsibleProfileId: text(formData, "responsibleProfileId"),
          dueDate: text(formData, "dueDate"),
          agendaItemId: text(formData, "agendaItemId"),
          decisionDate: text(formData, "decisionDate"),
        };
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("confirm_ai_proposal", {
    proposal_id: String(formData.get("proposalId")),
    expected_version: Number(formData.get("version")),
    payload: payload as never,
  });
  meetingPaths(sessionId).forEach((route) => revalidatePath(route));
  backTo(path, error === null ? undefined : new Error(error.message));
}

export async function rejectAiProposalAction(formData: FormData) {
  const returnPath = String(formData.get("returnPath"));
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("reject_ai_proposal", {
    proposal_id: String(formData.get("proposalId")),
    expected_version: Number(formData.get("version")),
    reason: text(formData, "reason") ?? "",
  });
  revalidatePath(returnPath);
  backTo(returnPath, error === null ? undefined : new Error(error.message));
}

export async function runExecutionValidatorAction(formData: FormData) {
  const kind = String(formData.get("kind")) === "PDCA" ? "PDCA" : "TASK";
  const id = String(formData.get("recordId"));
  const path = `/${kind === "TASK" ? "tasks" : "pdcas"}/${id}`;
  let failure: unknown;
  try {
    await runExecutionValidatorAi(kind, id);
  } catch (error) {
    failure = error;
  }
  revalidatePath(path);
  backTo(path, failure);
}
