import {
  agendaStatusLabel,
  decisionStatusLabel,
  formatDate,
  meetingStatusLabel,
  pdcaStatusLabel,
  phaseLabel,
  priorityLabel,
  relativeDue,
  taskStatusLabel,
} from "@/ui/labels";

const tones = {
  neutral: "border-neutral-300 bg-white text-neutral-700",
  muted: "border-neutral-200 bg-neutral-100 text-neutral-600",
  progress: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  danger: "border-red-300 bg-red-50 text-red-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  dark: "border-black bg-black text-white",
} as const;

type Tone = keyof typeof tones;

const statusTone: Record<string, Tone> = {
  DRAFT: "muted",
  OPEN: "neutral",
  PLANNED: "neutral",
  SCHEDULED: "neutral",
  IN_PROGRESS: "progress",
  UNDER_REVIEW: "progress",
  REVIEW: "warning",
  WAITING: "warning",
  POSTPONED: "warning",
  BLOCKED: "danger",
  COMPLETED: "success",
  PUBLISHED: "success",
  DISCUSSED: "success",
  ACTIVE: "success",
  CLOSED: "dark",
  CANCELLED: "muted",
  ARCHIVED: "muted",
  PENDING: "neutral",
  CONFIRMED: "success",
  REJECTED: "muted",
};

const priorityTone: Record<string, Tone> = {
  LOW: "muted",
  MEDIUM: "neutral",
  HIGH: "warning",
  CRITICAL: "danger",
};

export type BadgeKind =
  | "task"
  | "pdca"
  | "meeting"
  | "decision"
  | "agenda"
  | "priority"
  | "phase"
  | "plain";

function textFor(kind: BadgeKind, value: string) {
  switch (kind) {
    case "task":
      return taskStatusLabel(value);
    case "pdca":
      return pdcaStatusLabel(value);
    case "meeting":
      return meetingStatusLabel(value);
    case "decision":
      return decisionStatusLabel(value);
    case "agenda":
      return agendaStatusLabel(value);
    case "priority":
      return priorityLabel(value);
    case "phase":
      return phaseLabel(value);
    default:
      return value;
  }
}

export function StatusBadge({
  value,
  kind = "task",
  className = "",
}: {
  readonly value: string;
  readonly kind?: BadgeKind;
  readonly className?: string;
}) {
  const tone =
    kind === "priority"
      ? (priorityTone[value] ?? "neutral")
      : kind === "phase"
        ? "dark"
        : kind === "plain"
          ? "neutral"
          : (statusTone[value] ?? "neutral");
  return (
    <span
      data-code={value}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${tones[tone]} ${className}`}
    >
      {textFor(kind, value)}
    </span>
  );
}

export function DueDate({
  value,
  status,
  className = "",
  relative = false,
}: {
  readonly value: string | null | undefined;
  readonly status?: string;
  readonly className?: string;
  readonly relative?: boolean;
}) {
  if (!value)
    return (
      <span className={`text-muted-foreground ${className}`}>Sem prazo</span>
    );
  const today = new Date().toISOString().slice(0, 10);
  const terminal = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(
    status ?? "",
  );
  const overdue = !terminal && value < today;
  const dueToday = !terminal && value === today;
  return (
    <span
      className={`tabular-nums ${overdue ? "font-semibold text-red-700" : dueToday ? "font-semibold text-amber-800" : ""} ${className}`}
      title={formatDate(value)}
    >
      {relative
        ? relativeDue(value)
        : `${formatDate(value)}${overdue ? " · atrasado" : dueToday ? " · hoje" : ""}`}
    </span>
  );
}
