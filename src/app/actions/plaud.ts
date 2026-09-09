"use server";

import { redirect } from "next/navigation";

import { errorOf, finish } from "@/app/actions/finish";
import { loadViewerContext } from "@/modules/execution/application/creation-options";
import { createExecutionService } from "@/modules/execution/application/factory";
import { parsePlaudPayload, planImport } from "@/modules/plaud/domain/schema";
import { createSupabaseServerClient } from "@/platform/supabase/server";

const page = "/definicoes/importar-plaud";

/**
 * Imports the pasted recording as PRIVATE PDCAs (and subtasks) of the person
 * importing, in the chosen restaurant and their own department. Actions
 * already imported from the same recording are skipped.
 */
export async function importPlaudAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const service = await createExecutionService();
  const viewer = await loadViewerContext("pdca.create");
  const companyId = String(formData.get("companyId"));
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  if (viewer.profileId === null) finish(page, new Error("permission denied"));
  if (restaurantId === "") finish(page, new Error("restaurant required"));

  let items;
  try {
    items = planImport(
      parsePlaudPayload(String(formData.get("payload") ?? "")),
    );
  } catch (error) {
    finish(page, errorOf(error));
  }

  const { data: existing } = await client
    .from("pdcas")
    .select("problem_statement")
    .ilike("problem_statement", "%plaud:%");
  const known = new Set(
    (existing ?? []).flatMap((row) =>
      [...(row.problem_statement ?? "").matchAll(/plaud:[^\s]+/g)].map(
        (match) => match[0],
      ),
    ),
  );

  let created = 0;
  let skipped = 0;
  let failure: Error | null = null;
  try {
    for (const item of items) {
      if (known.has(item.key)) {
        skipped += 1;
        continue;
      }
      const pdcaId = await service.createPdca({
        companyId,
        title: item.title,
        problemStatement: item.problem,
        objective: item.objective,
        rootCauseOrHypothesis: null,
        priority: item.priority,
        impact: "MEDIUM",
        risk: "MEDIUM",
        ownerProfileId: viewer.profileId,
        responsibleProfileId: viewer.profileId,
        startDate: item.startDate,
        dueDate: item.dueDate,
        originatingDecisionId: null,
        visibility: "PRIVATE",
        unitIds: unitId === "" ? [] : [unitId],
        restaurantIds: [restaurantId],
      });
      for (const title of item.tasks)
        await service.createTask({
          companyId,
          title,
          description: `${item.sourceText}\nPDCA: ${item.title}`,
          priority: item.priority,
          ownerProfileId: viewer.profileId,
          responsibleProfileId: viewer.profileId,
          startDate: item.startDate,
          dueDate: item.dueDate,
          pdcaId,
          originatingDecisionId: null,
          visibility: "PRIVATE",
          unitIds: unitId === "" ? [] : [unitId],
          restaurantIds: [restaurantId],
        });
      if (item.phase !== "PLAN" || item.done) {
        const { data: row } = await client
          .from("pdcas")
          .select("version")
          .eq("id", pdcaId)
          .single();
        let version = row?.version ?? 1;
        if (item.phase !== "PLAN") {
          const moved = await client.rpc("change_pdca_phase", {
            pdca_id: pdcaId,
            expected_version: version,
            new_phase: item.phase,
            reason: "Fase registada na gravação",
          });
          if (moved.error) throw new Error(moved.error.message);
          version = moved.data?.version ?? version + 1;
        }
        if (item.done) {
          // Closing follows the same road as in the app: result, then
          // open → in progress → completed with closure notes.
          const withResult = await client.rpc("update_pdca", {
            pdca_id: pdcaId,
            expected_version: version,
            title: item.title,
            problem_statement: item.problem,
            objective: item.objective,
            root_cause_or_hypothesis: null as never,
            expected_result: null as never,
            actual_result: item.closureNote ?? "Concluído na gravação.",
            check_notes: null as never,
            corrective_action: null as never,
            outcome_notes: null as never,
            priority: item.priority,
            impact: "MEDIUM",
            risk: "MEDIUM",
            owner_profile_id: viewer.profileId as never,
            responsible_profile_id: viewer.profileId as never,
            start_date: item.startDate as never,
          });
          if (withResult.error) throw new Error(withResult.error.message);
          version = withResult.data?.version ?? version + 1;
          for (const status of ["OPEN", "IN_PROGRESS", "COMPLETED"] as const) {
            const step = await client.rpc("transition_pdca", {
              pdca_id: pdcaId,
              expected_version: version,
              new_status: status,
              ...(status === "COMPLETED"
                ? {
                    closure_notes: item.closureNote ?? "Concluído na gravação.",
                  }
                : {}),
            });
            if (step.error) throw new Error(step.error.message);
            version = step.data?.version ?? version + 1;
          }
        }
      }
      created += 1;
    }
  } catch (error) {
    failure = errorOf(error);
  }
  if (failure !== null) {
    console.error("plaud import failed", { message: failure.message, created });
    finish(`${page}?criados=${created}&ignorados=${skipped}`, failure);
  }
  redirect(`${page}?criados=${created}&ignorados=${skipped}&saved=1`);
}
