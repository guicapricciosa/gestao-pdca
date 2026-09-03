import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateDecision,
  DecisionSummary,
} from "@/modules/decisions/domain/decision";
import { decisionStatusSchema } from "@/modules/decisions/domain/decision";
import type { ListFilters, Page } from "@/modules/execution/domain/types";
import type { ExecutionRepository } from "@/modules/execution/application/repository";
import type { CreatePdca, PdcaSummary } from "@/modules/pdca/domain/pdca";
import type { CreateTask, TaskSummary } from "@/modules/tasks/domain/task";
import type { Database } from "@/platform/supabase/database.types";

type Client = SupabaseClient<Database>;

function pageBounds(filters: ListFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  };
}

function throwIfError(error: { message: string } | null) {
  if (error !== null) throw new Error(error.message);
}

function required<T>(value: T | null, field: string): T {
  if (value === null) throw new Error(`List projection returned null ${field}`);
  return value;
}

export class SupabaseExecutionRepository implements ExecutionRepository {
  constructor(private readonly client: Client) {}

  async createDecision(command: CreateDecision) {
    const { data, error } = await this.client.rpc("create_decision", {
      company_id: command.companyId,
      title: command.title,
      decision_date: command.decisionDate,
      visibility: command.visibility,
      unit_ids: [...command.unitIds],
      restaurant_ids: [...command.restaurantIds],
      ...(command.description === null
        ? {}
        : { description: command.description }),
      ...(command.decidedByProfileId === null
        ? {}
        : { decided_by_profile_id: command.decidedByProfileId }),
    });
    throwIfError(error);
    if (data === null)
      throw new Error("Decision creation returned no identifier");
    return data;
  }

  async createTask(command: CreateTask) {
    const { data, error } = await this.client.rpc("create_task", {
      company_id: command.companyId,
      title: command.title,
      priority: command.priority,
      visibility: command.visibility,
      unit_ids: [...command.unitIds],
      restaurant_ids: [...command.restaurantIds],
      ...(command.description === null
        ? {}
        : { description: command.description }),
      ...(command.ownerProfileId === null
        ? {}
        : { owner_profile_id: command.ownerProfileId }),
      ...(command.responsibleProfileId === null
        ? {}
        : { responsible_profile_id: command.responsibleProfileId }),
      ...(command.startDate === null ? {} : { start_date: command.startDate }),
      ...(command.dueDate === null ? {} : { due_date: command.dueDate }),
      ...(command.pdcaId === null ? {} : { pdca_id: command.pdcaId }),
      ...(command.originatingDecisionId === null
        ? {}
        : { originating_decision_id: command.originatingDecisionId }),
    });
    throwIfError(error);
    if (data === null) throw new Error("Task creation returned no identifier");
    return data;
  }

  async createPdca(command: CreatePdca) {
    const { data, error } = await this.client.rpc("create_pdca", {
      company_id: command.companyId,
      title: command.title,
      priority: command.priority,
      impact: command.impact,
      risk: command.risk,
      visibility: command.visibility,
      unit_ids: [...command.unitIds],
      restaurant_ids: [...command.restaurantIds],
      ...(command.problemStatement === null
        ? {}
        : { problem_statement: command.problemStatement }),
      ...(command.objective === null ? {} : { objective: command.objective }),
      ...(command.rootCauseOrHypothesis === null
        ? {}
        : { root_cause_or_hypothesis: command.rootCauseOrHypothesis }),
      ...(command.ownerProfileId === null
        ? {}
        : { owner_profile_id: command.ownerProfileId }),
      ...(command.responsibleProfileId === null
        ? {}
        : { responsible_profile_id: command.responsibleProfileId }),
      ...(command.startDate === null ? {} : { start_date: command.startDate }),
      ...(command.dueDate === null ? {} : { due_date: command.dueDate }),
      ...(command.originatingDecisionId === null
        ? {}
        : { originating_decision_id: command.originatingDecisionId }),
    });
    throwIfError(error);
    if (data === null) throw new Error("PDCA creation returned no identifier");
    return data;
  }

  async listDecisions(filters: ListFilters): Promise<Page<DecisionSummary>> {
    const { page, pageSize, from, to } = pageBounds(filters);
    let query = this.client
      .from("decision_list_items")
      .select(
        "id,security_object_id,title,description,decision_date,status,decided_by_profile_id,created_by_profile_id,version,updated_at,unit_ids,restaurant_ids",
        { count: "exact" },
      )
      .order("decision_date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (filters.query !== undefined)
      query = query.or(
        `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
      );
    if (
      filters.status !== undefined &&
      ["DRAFT", "ACTIVE", "ARCHIVED"].includes(filters.status)
    )
      query = query.eq(
        "status",
        filters.status as "DRAFT" | "ACTIVE" | "ARCHIVED",
      );
    else query = query.neq("status", "ARCHIVED");
    if (filters.unitId !== undefined)
      query = query.contains("unit_ids", [filters.unitId]);
    if (filters.restaurantId !== undefined)
      query = query.contains("restaurant_ids", [filters.restaurantId]);
    const { data, error, count } = await query;
    throwIfError(error);
    return {
      items: (data ?? []).map((row) => ({
        id: required(row.id, "id"),
        securityObjectId: required(
          row.security_object_id,
          "security_object_id",
        ),
        title: required(row.title, "title"),
        description: row.description,
        decisionDate: required(row.decision_date, "decision_date"),
        status: decisionStatusSchema.parse(required(row.status, "status")),
        decidedByProfileId: row.decided_by_profile_id,
        createdByProfileId: required(
          row.created_by_profile_id,
          "created_by_profile_id",
        ),
        version: required(row.version, "version"),
        updatedAt: required(row.updated_at, "updated_at"),
      })),
      page,
      pageSize,
      total: count ?? 0,
    };
  }

  async listTasks(filters: ListFilters): Promise<Page<TaskSummary>> {
    const { page, pageSize, from, to } = pageBounds(filters);
    let query = this.client
      .from("task_list_items")
      .select(
        "id,security_object_id,title,description,status,priority,owner_profile_id,responsible_profile_id,due_date,completed_at,version,updated_at,unit_ids,restaurant_ids",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (filters.query !== undefined)
      query = query.or(
        `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
      );
    if (filters.status !== undefined && filters.status !== "ACTIVE")
      query = query.eq("status", filters.status);
    else query = query.neq("status", "ARCHIVED");
    if (filters.priority !== undefined)
      query = query.eq("priority", filters.priority);
    if (filters.ownerId !== undefined)
      query = query.eq("owner_profile_id", filters.ownerId);
    if (filters.responsibleId !== undefined)
      query = query.eq("responsible_profile_id", filters.responsibleId);
    if (filters.unitId !== undefined)
      query = query.contains("unit_ids", [filters.unitId]);
    if (filters.restaurantId !== undefined)
      query = query.contains("restaurant_ids", [filters.restaurantId]);
    if (filters.overdue === true)
      query = query
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .not("status", "in", "(COMPLETED,CANCELLED,ARCHIVED)");
    const { data, error, count } = await query;
    throwIfError(error);
    return {
      items: (data ?? []).map((row) => ({
        id: required(row.id, "id"),
        securityObjectId: required(
          row.security_object_id,
          "security_object_id",
        ),
        title: required(row.title, "title"),
        description: row.description,
        status: required(row.status, "status"),
        priority: required(row.priority, "priority"),
        ownerProfileId: row.owner_profile_id,
        responsibleProfileId: row.responsible_profile_id,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        version: required(row.version, "version"),
        updatedAt: required(row.updated_at, "updated_at"),
      })),
      page,
      pageSize,
      total: count ?? 0,
    };
  }

  async listPdcas(filters: ListFilters): Promise<Page<PdcaSummary>> {
    const { page, pageSize, from, to } = pageBounds(filters);
    let query = this.client
      .from("pdca_list_items")
      .select(
        "id,security_object_id,title,problem_statement,objective,status,phase,priority,impact,risk,owner_profile_id,responsible_profile_id,due_date,version,updated_at,unit_ids,restaurant_ids",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (filters.query !== undefined)
      query = query.or(
        `title.ilike.%${filters.query}%,problem_statement.ilike.%${filters.query}%,objective.ilike.%${filters.query}%`,
      );
    if (filters.status !== undefined && filters.status !== "ACTIVE")
      query = query.eq("status", filters.status);
    else query = query.neq("status", "ARCHIVED");
    if (filters.priority !== undefined)
      query = query.eq("priority", filters.priority);
    if (filters.ownerId !== undefined)
      query = query.eq("owner_profile_id", filters.ownerId);
    if (filters.responsibleId !== undefined)
      query = query.eq("responsible_profile_id", filters.responsibleId);
    if (filters.unitId !== undefined)
      query = query.contains("unit_ids", [filters.unitId]);
    if (filters.restaurantId !== undefined)
      query = query.contains("restaurant_ids", [filters.restaurantId]);
    if (filters.overdue === true)
      query = query
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .not("status", "in", "(COMPLETED,CANCELLED,ARCHIVED)");
    const { data, error, count } = await query;
    throwIfError(error);
    return {
      items: (data ?? []).map((row) => ({
        id: required(row.id, "id"),
        securityObjectId: required(
          row.security_object_id,
          "security_object_id",
        ),
        title: required(row.title, "title"),
        problemStatement: row.problem_statement,
        objective: row.objective,
        status: required(row.status, "status"),
        phase: required(row.phase, "phase"),
        priority: required(row.priority, "priority"),
        impact: required(row.impact, "impact"),
        risk: required(row.risk, "risk"),
        ownerProfileId: row.owner_profile_id,
        responsibleProfileId: row.responsible_profile_id,
        dueDate: row.due_date,
        version: required(row.version, "version"),
        updatedAt: required(row.updated_at, "updated_at"),
      })),
      page,
      pageSize,
      total: count ?? 0,
    };
  }
}
