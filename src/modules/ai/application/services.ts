import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildExecutionContext } from "@/modules/ai/application/execution-context";
import { GatewayError } from "@/modules/ai/application/gateway";
import { buildMeetingContext } from "@/modules/ai/application/meeting-context";
import { resolveModelGateway } from "@/modules/ai/application/provider";
import {
  AiRunFailure,
  runUseCase,
  type RunUseCaseResult,
} from "@/modules/ai/application/run-use-case";
import {
  validateMeetingAssistantOutput,
  validateMeetingSummaryOutput,
  validateValidatorOutput,
} from "@/modules/ai/domain/output-validation";
import type {
  ExecutionRecordSnapshot,
  Finding,
  ProposalPayload,
} from "@/modules/ai/domain/types";
import {
  findSimilarOpenItems,
  validateExecutionRecord,
  type OpenItemCandidate,
} from "@/modules/ai/domain/validators";
import { SupabaseAiRepository } from "@/modules/ai/infrastructure/supabase-ai-repository";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { getAiEnvironment } from "@/platform/env/ai";
import type { Database } from "@/platform/supabase/database.types";
import { createSupabaseServerClient } from "@/platform/supabase/server";

type Client = SupabaseClient<Database>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function gatewayOrFailure() {
  try {
    return resolveModelGateway();
  } catch (error) {
    if (error instanceof GatewayError)
      throw new AiRunFailure(error.category, error.message, null);
    throw error;
  }
}

export interface ProposalView {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly payload: ProposalPayload;
  /** The human-edited payload that was actually executed, once confirmed. */
  readonly confirmedPayload: Record<string, unknown> | null;
  readonly version: number;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
  readonly reviewReason: string | null;
  readonly executedRecordType: string | null;
  readonly executedRecordId: string | null;
  readonly run: {
    readonly id: string;
    readonly useCase: string;
    readonly provider: string;
    readonly model: string;
    readonly status: string;
    readonly errorCategory: string | null;
    readonly startedAt: string;
  };
}

export async function listProposals(
  client: Client,
  targetSecurityObjectId: string,
): Promise<ProposalView[]> {
  const { data, error } = await client
    .from("ai_proposals")
    .select(
      "id,proposal_type,status,payload,confirmed_payload,version,created_at,reviewed_at,review_reason,executed_record_type,executed_record_id,run:ai_runs!ai_proposals_ai_run_id_fkey(id,use_case,model_provider,model_name,status,error_category,started_at)",
    )
    .eq("target_security_object_id", targetSecurityObjectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error !== null) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    payload: row.payload as unknown as ProposalPayload,
    confirmedPayload: (row.confirmed_payload ?? null) as Record<
      string,
      unknown
    > | null,
    version: Number(row.version),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    executedRecordType: row.executed_record_type,
    executedRecordId: row.executed_record_id,
    run: {
      id: row.run.id,
      useCase: row.run.use_case,
      provider: row.run.model_provider,
      model: row.run.model_name,
      status: row.run.status,
      errorCategory: row.run.error_category,
      startedAt: row.run.started_at,
    },
  }));
}

export async function listRuns(
  client: Client,
  targetSecurityObjectId: string,
  limit = 10,
) {
  const { data, error } = await client
    .from("ai_runs")
    .select(
      "id,use_case,model_provider,model_name,status,error_category,started_at,finished_at,latency_ms",
    )
    .eq("target_security_object_id", targetSecurityObjectId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error !== null) throw new Error(error.message);
  return data ?? [];
}

async function meetingRun(
  sessionId: string,
  useCase: "MEETING_ASSISTANT" | "MEETING_SUMMARY",
  extraInput: string | null,
): Promise<RunUseCaseResult> {
  const detail = await loadMeetingDetail(sessionId);
  if (detail === null) throw new Error("Meeting not found or access denied");
  const gateway = gatewayOrFailure();
  const environment = getAiEnvironment();
  const context = buildMeetingContext(detail, {
    extraInput,
    today: today(),
    maxChars: environment.AI_MAX_INPUT_CHARS,
  });
  return runUseCase({
    repository: new SupabaseAiRepository(detail.client),
    gateway,
    useCase,
    companyId: detail.session.company_id,
    targetSecurityObjectId: detail.session.security_object_id,
    context,
    validate: (raw, current) => {
      const segmentIds = current.segments.map((segment) => segment.id);
      if (useCase === "MEETING_SUMMARY")
        return {
          proposals: [
            {
              type: "SUMMARY",
              payload: validateMeetingSummaryOutput(raw, segmentIds),
            },
          ],
          rejected: [],
        };
      const outcome = validateMeetingAssistantOutput(
        raw,
        current.candidates,
        segmentIds,
      );
      return {
        proposals: outcome.proposals.map((payload) => ({
          type: payload.type,
          payload,
        })),
        rejected: outcome.rejected,
      };
    },
  });
}

export function runMeetingAssistant(
  sessionId: string,
  extraInput: string | null,
) {
  return meetingRun(sessionId, "MEETING_ASSISTANT", extraInput);
}

export function runMeetingSummary(sessionId: string) {
  return meetingRun(sessionId, "MEETING_SUMMARY", null);
}

export interface ExecutionValidation {
  readonly kind: "TASK" | "PDCA";
  readonly securityObjectId: string;
  readonly snapshot: ExecutionRecordSnapshot;
  readonly description: string | null;
  readonly comments: readonly { id: string; body: string }[];
  readonly findings: readonly Finding[];
  readonly similar: readonly OpenItemCandidate[];
}

/**
 * Deterministic Execution Validator over one authorized record. Uses the
 * caller's RLS client for every read, so nothing outside the viewer's scope
 * can influence a finding.
 */
export async function loadExecutionValidation(
  client: Client,
  kind: "TASK" | "PDCA",
  id: string,
): Promise<ExecutionValidation | null> {
  const table = kind === "TASK" ? "tasks" : "pdcas";
  const { data: row } = await client
    .from(table)
    .select("*")
    .eq("id", id)
    .single();
  if (!row) return null;
  const dueDateChangeQuery =
    kind === "TASK"
      ? client
          .from("task_due_date_changes")
          .select("id", { count: "exact", head: true })
          .eq("task_id", id)
      : client
          .from("pdca_due_date_changes")
          .select("id", { count: "exact", head: true })
          .eq("pdca_id", id);
  const blockerQuery =
    kind === "TASK"
      ? client
          .from("task_blockers")
          .select("blocked_at")
          .eq("task_id", id)
          .is("resolved_at", null)
          .order("blocked_at")
          .limit(1)
      : client
          .from("pdca_blockers")
          .select("blocked_at")
          .eq("pdca_id", id)
          .is("resolved_at", null)
          .order("blocked_at")
          .limit(1);
  const [dueDateChanges, blockers, attachments, comments, candidates] =
    await Promise.all([
      dueDateChangeQuery,
      blockerQuery,
      client
        .from("attachments")
        .select("id", { count: "exact", head: true })
        .eq("security_object_id", row.security_object_id),
      client
        .from("comments")
        .select("id,body")
        .eq("security_object_id", row.security_object_id)
        .order("created_at")
        .limit(50),
      client.from(table).select("id,title,status").limit(200),
    ]);
  const pdca =
    kind === "PDCA"
      ? (row as Database["public"]["Tables"]["pdcas"]["Row"])
      : null;
  const snapshot: ExecutionRecordSnapshot = {
    kind,
    id: row.id,
    title: row.title,
    status: row.status,
    ownerProfileId: row.owner_profile_id,
    responsibleProfileId: row.responsible_profile_id,
    dueDate: row.due_date,
    objective: pdca?.objective ?? null,
    problemStatement: pdca?.problem_statement ?? null,
    expectedResult: pdca?.expected_result ?? null,
    actualResult: pdca?.actual_result ?? null,
    lastActivityAt: row.last_activity_at,
    dueDateChangeCount: dueDateChanges.count ?? 0,
    activeBlockerSince: blockers.data?.[0]?.blocked_at ?? null,
    attachmentCount: attachments.count ?? 0,
    completedAt: row.completed_at,
  };
  const findings = validateExecutionRecord(snapshot, { today: new Date() });
  const similar = findSimilarOpenItems(
    row.title,
    candidates.data ?? [],
    row.id,
  );
  if (similar.length > 0)
    findings.push({
      code: "POSSIBLE_DUPLICATE",
      severity: "WARNING",
      message: `Existem ${similar.length} item(ns) abertos com título muito semelhante.`,
      source: "DETERMINISTIC",
      confidence: null,
      evidence: similar.map((item) => item.title),
    });
  return {
    kind,
    securityObjectId: row.security_object_id,
    snapshot,
    description:
      kind === "TASK"
        ? (row as Database["public"]["Tables"]["tasks"]["Row"]).description
        : (pdca?.plan_summary ?? null),
    comments: comments.data ?? [],
    findings,
    similar,
  };
}

export async function runExecutionValidatorAi(
  kind: "TASK" | "PDCA",
  id: string,
): Promise<RunUseCaseResult> {
  const client = await createSupabaseServerClient();
  const validation = await loadExecutionValidation(client, kind, id);
  if (validation === null) throw new Error("Record not found or access denied");
  const gateway = gatewayOrFailure();
  const environment = getAiEnvironment();
  const context = buildExecutionContext(
    {
      snapshot: validation.snapshot,
      securityObjectId: validation.securityObjectId,
      description: validation.description,
      comments: validation.comments,
    },
    { today: today(), maxChars: environment.AI_MAX_INPUT_CHARS },
  );
  const { data: company } = await client
    .from("security_objects")
    .select("company_id")
    .eq("id", validation.securityObjectId)
    .single();
  if (!company) throw new Error("Record not found or access denied");
  return runUseCase({
    repository: new SupabaseAiRepository(client),
    gateway,
    useCase: "EXECUTION_VALIDATOR",
    companyId: company.company_id,
    targetSecurityObjectId: validation.securityObjectId,
    context,
    validate: (raw, current) => ({
      proposals: validateValidatorOutput(
        raw,
        current.segments.map((segment) => segment.id),
      ).map((payload) => ({ type: "FINDING" as const, payload })),
      rejected: [],
    }),
  });
}

export interface MyWorkFinding {
  readonly objectType: "TASK" | "PDCA";
  readonly objectId: string;
  readonly title: string;
  readonly findings: readonly Finding[];
}

/**
 * Deterministic validation for the personal dashboard: two RLS-filtered
 * queries instead of one round-trip per item. History-based rules
 * (postponements, blockers, evidence) are left to the detail page.
 */
export async function loadMyWorkValidation(
  client: Client,
  items: readonly {
    readonly object_type: string;
    readonly object_id: string;
  }[],
  limit = 40,
): Promise<MyWorkFinding[]> {
  const ids = (type: "TASK" | "PDCA") =>
    [
      ...new Set(
        items
          .filter((item) => item.object_type === type)
          .map((item) => item.object_id),
      ),
    ].slice(0, limit);
  const taskIds = ids("TASK");
  const pdcaIds = ids("PDCA");
  const [tasks, pdcas] = await Promise.all([
    taskIds.length === 0
      ? Promise.resolve({ data: [] as never[] })
      : client
          .from("tasks")
          .select(
            "id,title,status,owner_profile_id,responsible_profile_id,due_date,last_activity_at,completed_at",
          )
          .in("id", taskIds),
    pdcaIds.length === 0
      ? Promise.resolve({ data: [] as never[] })
      : client
          .from("pdcas")
          .select(
            "id,title,status,owner_profile_id,responsible_profile_id,due_date,last_activity_at,completed_at,objective,problem_statement,expected_result,actual_result",
          )
          .in("id", pdcaIds),
  ]);
  const now = new Date();
  const results: MyWorkFinding[] = [];
  for (const row of tasks.data ?? []) {
    const findings = validateExecutionRecord(
      {
        kind: "TASK",
        id: row.id,
        title: row.title,
        status: row.status,
        ownerProfileId: row.owner_profile_id,
        responsibleProfileId: row.responsible_profile_id,
        dueDate: row.due_date,
        objective: null,
        problemStatement: null,
        expectedResult: null,
        actualResult: null,
        lastActivityAt: row.last_activity_at,
        dueDateChangeCount: 0,
        activeBlockerSince: null,
        attachmentCount: 1,
        completedAt: row.completed_at,
      },
      { today: now },
    );
    if (findings.length > 0)
      results.push({
        objectType: "TASK",
        objectId: row.id,
        title: row.title,
        findings,
      });
  }
  for (const row of pdcas.data ?? []) {
    const findings = validateExecutionRecord(
      {
        kind: "PDCA",
        id: row.id,
        title: row.title,
        status: row.status,
        ownerProfileId: row.owner_profile_id,
        responsibleProfileId: row.responsible_profile_id,
        dueDate: row.due_date,
        objective: row.objective,
        problemStatement: row.problem_statement,
        expectedResult: row.expected_result,
        actualResult: row.actual_result,
        lastActivityAt: row.last_activity_at,
        dueDateChangeCount: 0,
        activeBlockerSince: null,
        attachmentCount: 1,
        completedAt: row.completed_at,
      },
      { today: now },
    );
    if (findings.length > 0)
      results.push({
        objectType: "PDCA",
        objectId: row.id,
        title: row.title,
        findings,
      });
  }
  return results;
}
