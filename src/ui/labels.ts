/**
 * Camada única de rótulos em português de Portugal.
 * Os códigos internos (IN_PROGRESS, RESTRICTED, …) nunca aparecem na UI
 * normal; todos os componentes passam por aqui.
 */

type Gender = "f" | "m";

const executionStatus: Record<Gender, Record<string, string>> = {
  f: {
    DRAFT: "Rascunho",
    OPEN: "Aberta",
    PLANNED: "Planeada",
    IN_PROGRESS: "Em curso",
    BLOCKED: "Bloqueada",
    WAITING: "Em espera",
    UNDER_REVIEW: "Em validação",
    COMPLETED: "Concluída",
    CANCELLED: "Cancelada",
    ARCHIVED: "Arquivada",
  },
  m: {
    DRAFT: "Rascunho",
    OPEN: "Aberto",
    PLANNED: "Planeado",
    IN_PROGRESS: "Em curso",
    BLOCKED: "Bloqueado",
    WAITING: "Em espera",
    UNDER_REVIEW: "Em validação",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    ARCHIVED: "Arquivado",
  },
};

const meetingStatus: Record<string, string> = {
  DRAFT: "Agendada",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "A decorrer",
  REVIEW: "A validar",
  PUBLISHED: "Terminada",
  CLOSED: "Terminada",
  CANCELLED: "Cancelada",
};

const decisionStatus: Record<string, string> = {
  DRAFT: "Por confirmar",
  ACTIVE: "Activa",
  ARCHIVED: "Arquivada",
};

const agendaStatus: Record<string, string> = {
  PENDING: "Por discutir",
  DISCUSSED: "Discutido",
  POSTPONED: "Adiado",
  CLOSED: "Encerrado",
};

const linkRelation: Record<string, string> = {
  CREATED: "Criado nesta reunião",
  DISCUSSED: "Discutido",
  REVIEWED: "Revisto",
  FOLLOW_UP: "Acompanhamento",
  CLOSED_IN_MEETING: "Encerrado nesta reunião",
};

const priority: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const phase: Record<string, string> = {
  PLAN: "Planear",
  DO: "Fazer",
  CHECK: "Verificar",
  ACT: "Actuar",
};

export const visibility = {
  NORMAL: {
    label: "Normal",
    hint: "Visível às pessoas com acesso a esta área/restaurante.",
  },
  RESTRICTED: {
    label: "Restrita",
    hint: "Apenas pessoas autorizadas a consultar informação restrita nesta área.",
  },
  PRIVATE: {
    label: "Privada",
    hint: "Apenas tu e as pessoas que escolheres.",
  },
} as const;

const role: Record<string, string> = {
  OWNER: "Owner",
  RESPONSIBLE: "Responsável",
  COLLABORATOR: "Colaborador",
  WATCHER: "Seguidor",
  CHAIR: "Chair",
  PARTICIPANT: "Participante",
  ACCESS: "Com acesso",
};

const objectType: Record<string, string> = {
  TASK: "Tarefa",
  PDCA: "PDCA",
  DECISION: "Decisão",
  MEETING_SESSION: "Reunião",
  MEETING_SERIES: "Reunião recorrente",
  AGENDA: "Tema",
};

const meetingType: Record<string, string> = {
  OPERATIONS: "Operações",
  MANAGEMENT: "Direcção",
  SUPPORT: "Departamento",
  ONE_TO_ONE: "One-to-one",
  AD_HOC: "Pontual",
};

const activity: Record<string, string> = {
  created: "Criado",
  "status.changed": "Estado alterado",
  "due_date.changed": "Prazo alterado",
  "people.assigned": "Owner e Responsável atribuídos",
  "scope.changed": "Âmbito alterado",
  "comment.created": "Comentário",
  "attachment.created": "Anexo adicionado",
  "member.added": "Pessoa adicionada",
  "member.removed": "Pessoa removida",
  reopened: "Reaberto",
  completed: "Concluído",
  "phase.changed": "Fase alterada",
  "blocker.added": "Bloqueio registado",
  "blocker.resolved": "Bloqueio resolvido",
  updated: "Editado",
  scheduled: "Agendada",
  in_progress: "Aberta",
  review: "Em validação",
  published: "Distribuída",
  closed: "Terminada",
  cancelled: "Cancelada",
  finished: "Terminada e distribuída",
  "schedule.changed": "Horário alterado",
  "agenda.reordered": "Agenda reordenada",
  "agenda.carried_forward": "Tema trazido da reunião anterior",
  "object.linked": "Assunto ligado",
  "object.unlinked": "Assunto desligado",
  "participant.added": "Participante adicionado",
  "participant.removed": "Participante removido",
  "chair.changed": "Chair alterado",
  "agenda.created": "Tema adicionado",
  "agenda.status.changed": "Resultado do tema registado",
  "note.created": "Nota",
  "note.updated": "Nota editada",
  "link.created": "Assunto ligado",
  "link.removed": "Assunto desligado",
  "run.started": "Assistente iniciado",
  "run.completed": "Assistente terminado",
  "proposal.created": "Proposta do assistente",
  "proposal.confirmed": "Proposta confirmada",
  "proposal.rejected": "Proposta rejeitada",
};

export const findingText: Record<string, string> = {
  MISSING_OWNER: "Sem Owner",
  MISSING_RESPONSIBLE: "Sem responsável",
  MISSING_DUE_DATE: "Sem prazo",
  PDCA_MISSING_PROBLEM: "Sem problema definido",
  PDCA_MISSING_OBJECTIVE: "Sem objectivo definido",
  PDCA_MISSING_EXPECTED_RESULT: "Sem resultado esperado",
  OVERDUE: "Prazo ultrapassado",
  OVERDUE_WITHOUT_UPDATE: "Atrasado e sem novidades",
  STALE: "Sem actividade há demasiado tempo",
  REPEATED_POSTPONEMENT: "Prazo adiado várias vezes",
  LONG_BLOCKED: "Bloqueado há demasiado tempo",
  COMPLETED_WITHOUT_EVIDENCE: "Concluído sem evidência",
  POSSIBLE_DUPLICATE: "Possível duplicado",
  OBJECTIVE_UNCLEAR: "Objectivo pouco claro",
  WEAK_EVIDENCE: "Evidência fraca",
  CONTRADICTORY_NARRATIVE: "Narrativa contraditória",
  ASSIGNEE_MISMATCH: "Responsável fora do contexto",
  SCOPE_TOO_BROAD: "Âmbito demasiado largo",
  AI_OBSERVATION: "Observação",
};

export function taskStatusLabel(code: string) {
  return executionStatus.f[code] ?? code;
}

export function pdcaStatusLabel(code: string) {
  return executionStatus.m[code] ?? code;
}

export function meetingStatusLabel(code: string) {
  return meetingStatus[code] ?? code;
}

export function decisionStatusLabel(code: string) {
  return decisionStatus[code] ?? code;
}

export function agendaStatusLabel(code: string) {
  return agendaStatus[code] ?? code;
}

export function linkRelationLabel(code: string) {
  return linkRelation[code] ?? code;
}

export function priorityLabel(code: string) {
  return priority[code] ?? code;
}

export function phaseLabel(code: string) {
  return phase[code] ?? code;
}

export function visibilityLabel(code: string) {
  return (visibility as Record<string, { label: string }>)[code]?.label ?? code;
}

export function roleLabel(code: string) {
  return role[code] ?? code;
}

export function objectTypeLabel(code: string) {
  return objectType[code] ?? code;
}

export function meetingTypeLabel(code: string) {
  return meetingType[code] ?? code;
}

/** Estado de um item de execução, escolhendo o género pelo tipo. */
export function executionStatusLabel(code: string, type: string) {
  return type === "PDCA" ? pdcaStatusLabel(code) : taskStatusLabel(code);
}

/** "task.status.changed" → "Estado alterado". */
export function activityLabel(action: string | null | undefined) {
  if (!action) return "";
  const parts = action.split(".");
  for (let start = 1; start < parts.length; start += 1) {
    const key = parts.slice(start).join(".");
    if (activity[key]) return activity[key];
  }
  return activity[action] ?? action.replaceAll(".", " · ");
}

export function findingLabel(code: string) {
  return findingText[code] ?? code;
}

export const statusOrder = {
  task: Object.keys(executionStatus.f),
  meeting: ["SCHEDULED", "IN_PROGRESS", "REVIEW", "CLOSED", "CANCELLED"],
  decision: Object.keys(decisionStatus),
  priority: Object.keys(priority),
} as const;

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(
    value.length === 10 ? `${value}T00:00:00` : value,
  ).toLocaleDateString("pt-PT");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function relativeDue(value: string | null | undefined) {
  if (!value) return "sem prazo";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "para hoje";
  if (days === 1) return "para amanhã";
  if (days === -1) return "atrasado 1 dia";
  if (days < 0) return `atrasado ${-days} dias`;
  if (days <= 7) return `em ${days} dias`;
  return formatDate(value);
}
