import type { ExecutionRecordSnapshot, Finding } from "./types";

export interface ValidationOptions {
  readonly today: Date;
  /** Days without activity after which an open item is stale. */
  readonly staleDays?: number;
  /** Days an overdue item may go without an update before it is critical. */
  readonly overdueSilenceDays?: number;
  /** Days a blocker may stay active before it is flagged. */
  readonly blockedDays?: number;
  /** Number of deadline changes that counts as repeated postponement. */
  readonly postponementThreshold?: number;
}

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "ARCHIVED"]);
const EXECUTING = new Set([
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "UNDER_REVIEW",
]);

function daysBetween(from: string | Date, to: Date) {
  return (to.getTime() - new Date(from).getTime()) / 86_400_000;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function finding(
  code: string,
  severity: Finding["severity"],
  message: string,
  evidence: readonly string[] = [],
): Finding {
  return {
    code,
    severity,
    message,
    source: "DETERMINISTIC",
    confidence: null,
    evidence,
  };
}

/**
 * Deterministic Execution Validator. Every rule is explainable, needs no
 * model and runs only over a record the caller was already authorized to
 * read. Findings are recommendations, never automatic changes.
 */
export function validateExecutionRecord(
  record: ExecutionRecordSnapshot,
  options: ValidationOptions,
): Finding[] {
  const staleDays = options.staleDays ?? 15;
  const overdueSilenceDays = options.overdueSilenceDays ?? 3;
  const blockedDays = options.blockedDays ?? 7;
  const postponementThreshold = options.postponementThreshold ?? 2;
  const findings: Finding[] = [];
  const today = isoDate(options.today);
  const isDraft = record.status === "DRAFT";
  const isTerminal = TERMINAL.has(record.status);
  const requiredSeverity = isDraft ? "WARNING" : "CRITICAL";
  const label = record.kind === "PDCA" ? "PDCA" : "Task";

  if (!isTerminal) {
    if (record.ownerProfileId === null)
      findings.push(
        finding(
          "MISSING_OWNER",
          requiredSeverity,
          `${label} sem Owner: ninguém responde pela resolução.`,
        ),
      );
    if (record.responsibleProfileId === null)
      findings.push(
        finding(
          "MISSING_RESPONSIBLE",
          requiredSeverity,
          `${label} sem Responsible: ninguém executa.`,
        ),
      );
    if (record.dueDate === null)
      findings.push(
        finding(
          "MISSING_DUE_DATE",
          requiredSeverity,
          `${label} sem prazo: não entra em nenhum indicador de atraso.`,
        ),
      );
    if (record.kind === "PDCA") {
      if (!record.problemStatement?.trim())
        findings.push(
          finding(
            "PDCA_MISSING_PROBLEM",
            requiredSeverity,
            "PDCA sem problem statement: o Plan não está definido.",
          ),
        );
      if (!record.objective?.trim())
        findings.push(
          finding(
            "PDCA_MISSING_OBJECTIVE",
            requiredSeverity,
            "PDCA sem objetivo claro: não é possível verificar o resultado.",
          ),
        );
      if (EXECUTING.has(record.status) && !record.expectedResult?.trim())
        findings.push(
          finding(
            "PDCA_MISSING_EXPECTED_RESULT",
            "WARNING",
            "PDCA em execução sem resultado esperado: o Check não terá referência.",
          ),
        );
    }
  }

  if (!isTerminal && !isDraft && record.dueDate !== null) {
    if (record.dueDate < today) {
      const silentDays = daysBetween(record.lastActivityAt, options.today);
      if (silentDays > overdueSilenceDays)
        findings.push(
          finding(
            "OVERDUE_WITHOUT_UPDATE",
            "CRITICAL",
            `Prazo ${record.dueDate} ultrapassado e sem atividade há ${Math.floor(silentDays)} dias.`,
            [
              `due_date=${record.dueDate}`,
              `last_activity_at=${record.lastActivityAt}`,
            ],
          ),
        );
      else
        findings.push(
          finding(
            "OVERDUE",
            "WARNING",
            `Prazo ${record.dueDate} ultrapassado.`,
            [`due_date=${record.dueDate}`],
          ),
        );
    }
  }

  if (!isTerminal && !isDraft) {
    const silentDays = daysBetween(record.lastActivityAt, options.today);
    if (silentDays > staleDays)
      findings.push(
        finding(
          "STALE",
          "WARNING",
          `Sem atividade há ${Math.floor(silentDays)} dias (limite ${staleDays}).`,
          [`last_activity_at=${record.lastActivityAt}`],
        ),
      );
    if (record.dueDateChangeCount >= postponementThreshold)
      findings.push(
        finding(
          "REPEATED_POSTPONEMENT",
          "WARNING",
          `Prazo alterado ${record.dueDateChangeCount} vezes.`,
          [`due_date_changes=${record.dueDateChangeCount}`],
        ),
      );
    if (
      record.activeBlockerSince !== null &&
      daysBetween(record.activeBlockerSince, options.today) > blockedDays
    )
      findings.push(
        finding(
          "LONG_BLOCKED",
          "WARNING",
          `Bloqueado desde ${record.activeBlockerSince.slice(0, 10)}.`,
          [`blocked_since=${record.activeBlockerSince}`],
        ),
      );
  }

  if (
    record.kind === "PDCA" &&
    record.status === "COMPLETED" &&
    !record.actualResult?.trim() &&
    record.attachmentCount === 0
  )
    findings.push(
      finding(
        "COMPLETED_WITHOUT_EVIDENCE",
        "WARNING",
        "PDCA concluído sem resultado real nem anexos: não há evidência do Check.",
      ),
    );

  return findings;
}

const STOP_WORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "por",
  "com",
  "um",
  "uma",
  "the",
  "of",
  "to",
  "and",
  "in",
  "on",
  "for",
]);

function tokens(title: string) {
  return new Set(
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

export interface OpenItemCandidate {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

/**
 * Potential duplicates among items the viewer can already see. Uses token
 * overlap (Jaccard) so it stays explainable; the threshold is a suggestion,
 * never an automatic merge.
 */
export function findSimilarOpenItems(
  title: string,
  candidates: readonly OpenItemCandidate[],
  selfId?: string,
  threshold = 0.6,
): OpenItemCandidate[] {
  const reference = tokens(title);
  if (reference.size === 0) return [];
  return candidates.filter((candidate) => {
    if (candidate.id === selfId || TERMINAL.has(candidate.status)) return false;
    const other = tokens(candidate.title);
    if (other.size === 0) return false;
    let intersection = 0;
    for (const token of reference) if (other.has(token)) intersection += 1;
    const union = reference.size + other.size - intersection;
    return intersection / union >= threshold;
  });
}
