"use server";

import { redirect } from "next/navigation";

import { errorOf, finish } from "@/app/actions/finish";

import { createExecutionService } from "@/modules/execution/application/factory";
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

export async function createDecisionAction(formData: FormData) {
  const service = await createExecutionService();
  let id = "";
  let failure: Error | null = null;
  try {
    id = await service.createDecision({
      companyId: String(formData.get("companyId")),
      title: String(formData.get("title")).trim().slice(0, 240),
      description: optional(formData, "description"),
      decisionDate:
        optional(formData, "decisionDate") ??
        new Date().toISOString().slice(0, 10),
      decidedByProfileId: null,
      visibility: String(formData.get("visibility")),
      unitIds: values(formData, "unitIds"),
      restaurantIds: values(formData, "restaurantIds"),
    });
  } catch (error) {
    failure = errorOf(error);
  }
  if (failure !== null) finish("/decisions/new", failure);
  redirect(`/decisions/${id}`);
}

export async function createTaskAction(formData: FormData) {
  const service = await createExecutionService();
  let id = "";
  let failure: Error | null = null;
  try {
    id = await service.createTask({
      companyId: String(formData.get("companyId")),
      title: String(formData.get("title")),
      description: optional(formData, "description") as never,
      priority: optional(formData, "priority") ?? "MEDIUM",
      ownerProfileId: optional(formData, "ownerProfileId"),
      responsibleProfileId: optional(formData, "responsibleProfileId"),
      startDate: optional(formData, "startDate"),
      dueDate: optional(formData, "dueDate"),
      pdcaId: optional(formData, "pdcaId"),
      originatingDecisionId: null,
      visibility: String(formData.get("visibility")),
      unitIds: values(formData, "unitIds"),
      restaurantIds: values(formData, "restaurantIds"),
    });
  } catch (error) {
    failure = errorOf(error);
  }
  if (failure !== null) finish("/tasks/new", failure);
  redirect(`/tasks/${id}`);
}

export async function createPdcaAction(formData: FormData) {
  const service = await createExecutionService();
  let id = "";
  let failure: Error | null = null;
  try {
    const problem =
      optional(formData, "problemStatement") ??
      optional(formData, "description") ??
      "";
    id = await service.createPdca({
      companyId: String(formData.get("companyId")),
      title:
        optional(formData, "title") ??
        (problem.split(/[.\n]/)[0]?.trim().slice(0, 240) ||
          problem.slice(0, 240)),
      problemStatement: problem || null,
      objective: optional(formData, "objective"),
      rootCauseOrHypothesis: optional(formData, "rootCauseOrHypothesis"),
      priority: optional(formData, "priority") ?? "MEDIUM",
      impact: optional(formData, "impact") ?? "MEDIUM",
      risk: optional(formData, "risk") ?? "MEDIUM",
      ownerProfileId: optional(formData, "ownerProfileId"),
      responsibleProfileId: optional(formData, "responsibleProfileId"),
      startDate: optional(formData, "startDate"),
      dueDate: optional(formData, "dueDate"),
      originatingDecisionId: null,
      visibility: String(formData.get("visibility")),
      unitIds: values(formData, "unitIds"),
      restaurantIds: values(formData, "restaurantIds"),
    });
  } catch (error) {
    failure = errorOf(error);
  }
  if (failure !== null) finish("/pdcas/new", failure);
  redirect(`/pdcas/${id}`);
}

export async function transitionTaskAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const reason = optional(formData, "reason");
  const completionNotes = optional(formData, "completionNotes");
  const { error } = await client.rpc("transition_task", {
    task_id: id,
    expected_version: Number(formData.get("version")),
    new_status: String(formData.get("status")) as never,
    ...(reason === null ? {} : { reason }),
    ...(completionNotes === null ? {} : { completion_notes: completionNotes }),
  });
  finish(`/tasks/${id}`, error);
}

export async function transitionPdcaAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const reason = optional(formData, "reason");
  const closureNotes = optional(formData, "completionNotes");
  const { error } = await client.rpc("transition_pdca", {
    pdca_id: id,
    expected_version: Number(formData.get("version")),
    new_status: String(formData.get("status")) as never,
    ...(reason === null ? {} : { reason }),
    ...(closureNotes === null ? {} : { closure_notes: closureNotes }),
  });
  finish(`/pdcas/${id}`, error);
}

export async function changePdcaPhaseAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const reason = optional(formData, "reason");
  const { error } = await client.rpc("change_pdca_phase", {
    pdca_id: id,
    expected_version: Number(formData.get("version")),
    new_phase: String(formData.get("phase")) as never,
    ...(reason === null ? {} : { reason }),
  });
  finish(`/pdcas/${id}`, error);
}

export async function addCommentAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const objectId = String(formData.get("securityObjectId"));
  const returnPath = String(formData.get("returnPath"));
  const { error } = await client.rpc("add_comment", {
    security_object_id: objectId,
    body: String(formData.get("body")),
  });
  finish(returnPath, error);
}

export async function assignExecutionPeopleAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const returnPath = String(formData.get("returnPath"));
  const { error } = await client.rpc("assign_execution_people", {
    security_object_id: String(formData.get("securityObjectId")),
    expected_version: Number(formData.get("version")),
    owner_profile_id: optional(formData, "ownerProfileId") as never,
    responsible_profile_id: optional(formData, "responsibleProfileId") as never,
  });
  finish(returnPath, error);
}

export async function updateDecisionAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const { error } = await client.rpc("update_decision", {
    decision_id: id,
    expected_version: Number(formData.get("version")),
    title: String(formData.get("title")),
    description: optional(formData, "description") as never,
    decision_date: String(formData.get("decisionDate")),
    decided_by_profile_id: optional(formData, "decidedByProfileId") as never,
  });
  finish(`/decisions/${id}`, error);
}

export async function updateTaskAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const { error } = await client.rpc("update_task", {
    task_id: id,
    expected_version: Number(formData.get("version")),
    title: String(formData.get("title")),
    description: optional(formData, "description") as never,
    priority: String(formData.get("priority")),
    owner_profile_id: optional(formData, "ownerProfileId") as never,
    responsible_profile_id: optional(formData, "responsibleProfileId") as never,
    start_date: optional(formData, "startDate") as never,
  });
  finish(`/tasks/${id}`, error);
}

export async function updatePdcaAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const { error } = await client.rpc("update_pdca", {
    pdca_id: id,
    expected_version: Number(formData.get("version")),
    title: String(formData.get("title")),
    problem_statement: optional(formData, "problemStatement") as never,
    objective: optional(formData, "objective") as never,
    root_cause_or_hypothesis: optional(
      formData,
      "rootCauseOrHypothesis",
    ) as never,
    expected_result: optional(formData, "expectedResult") as never,
    actual_result: optional(formData, "actualResult") as never,
    check_notes: optional(formData, "checkNotes") as never,
    corrective_action: optional(formData, "correctiveAction") as never,
    outcome_notes: optional(formData, "outcomeNotes") as never,
    priority: String(formData.get("priority")),
    impact: String(formData.get("impact")),
    risk: String(formData.get("risk")),
    owner_profile_id: optional(formData, "ownerProfileId") as never,
    responsible_profile_id: optional(formData, "responsibleProfileId") as never,
    start_date: optional(formData, "startDate") as never,
  });
  finish(`/pdcas/${id}`, error);
}

export async function changeDueDateAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  const kind = String(formData.get("kind"));
  const version = Number(formData.get("version"));
  const newDueDate = String(formData.get("newDueDate"));
  const reason = String(formData.get("reason"));
  const result =
    kind === "Task"
      ? await client.rpc("change_task_due_date", {
          task_id: id,
          expected_version: version,
          new_due_date: newDueDate,
          reason,
        })
      : await client.rpc("change_pdca_due_date", {
          pdca_id: id,
          expected_version: version,
          new_due_date: newDueDate,
          reason,
        });
  finish(`/${kind === "Task" ? "tasks" : "pdcas"}/${id}`, result.error);
}

export async function replaceScopeAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const returnPath = String(formData.get("returnPath"));
  const { error } = await client.rpc("replace_object_scope", {
    security_object_id: String(formData.get("securityObjectId")),
    expected_version: Number(formData.get("securityVersion")),
    unit_ids: values(formData, "unitIds"),
    restaurant_ids: values(formData, "restaurantIds"),
    reason: String(formData.get("reason")),
  });
  finish(returnPath, error);
}

export async function addObjectMemberAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const returnPath = String(formData.get("returnPath"));
  const { error } = await client.rpc("add_object_member", {
    security_object_id: String(formData.get("securityObjectId")),
    profile_id: String(formData.get("profileId")),
    membership_role: String(formData.get("membershipRole")) as never,
  });
  finish(returnPath, error);
}

export async function removeObjectMemberAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const returnPath = String(formData.get("returnPath"));
  const { error } = await client.rpc("remove_object_member", {
    membership_id: String(formData.get("membershipId")),
    reason: optional(formData, "reason") as never,
  });
  finish(returnPath, error);
}

/** Marcar concluída: transição para COMPLETED com notas de conclusão. */
export async function completeAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const path = `/${kind === "Task" ? "tasks" : "pdcas"}/${id}`;
  const notes = optional(formData, "completionNotes") ?? "Concluído";
  const result =
    kind === "Task"
      ? await client.rpc("transition_task", {
          task_id: id,
          expected_version: Number(formData.get("version")),
          new_status: "COMPLETED",
          completion_notes: notes,
        })
      : await client.rpc("transition_pdca", {
          pdca_id: id,
          expected_version: Number(formData.get("version")),
          new_status: "COMPLETED",
          closure_notes: notes,
        });
  finish(path, result.error, ["/my-work"]);
}

/** Bloquear: regista o bloqueio e muda o estado numa só acção. */
export async function blockAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const path = `/${kind === "Task" ? "tasks" : "pdcas"}/${id}`;
  const reason = String(formData.get("reason"));
  const blocker =
    kind === "Task"
      ? await client.rpc("add_task_blocker", { task_id: id, reason })
      : await client.rpc("add_pdca_blocker", { pdca_id: id, reason });
  if (blocker.error !== null) finish(path, blocker.error);
  const current =
    kind === "Task"
      ? await client.from("tasks").select("version").eq("id", id).single()
      : await client.from("pdcas").select("version").eq("id", id).single();
  const version = Number(current.data?.version ?? formData.get("version"));
  const result =
    kind === "Task"
      ? await client.rpc("transition_task", {
          task_id: id,
          expected_version: version,
          new_status: "BLOCKED",
        })
      : await client.rpc("transition_pdca", {
          pdca_id: id,
          expected_version: version,
          new_status: "BLOCKED",
        });
  finish(path, result.error, ["/my-work"]);
}

/** Desbloquear: resolve o bloqueio activo e retoma. */
export async function unblockAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const path = `/${kind === "Task" ? "tasks" : "pdcas"}/${id}`;
  const blockerId = String(formData.get("blockerId"));
  const notes = optional(formData, "resolutionNotes") as never;
  const resolved =
    kind === "Task"
      ? await client.rpc("resolve_task_blocker", {
          blocker_id: blockerId,
          resolution_notes: notes,
        })
      : await client.rpc("resolve_pdca_blocker", {
          blocker_id: blockerId,
          resolution_notes: notes,
        });
  if (resolved.error !== null) finish(path, resolved.error);
  const current =
    kind === "Task"
      ? await client.from("tasks").select("version").eq("id", id).single()
      : await client.from("pdcas").select("version").eq("id", id).single();
  const version = Number(current.data?.version ?? formData.get("version"));
  const result =
    kind === "Task"
      ? await client.rpc("transition_task", {
          task_id: id,
          expected_version: version,
          new_status: "IN_PROGRESS",
        })
      : await client.rpc("transition_pdca", {
          pdca_id: id,
          expected_version: version,
          new_status: "IN_PROGRESS",
        });
  finish(path, result.error, ["/my-work"]);
}
