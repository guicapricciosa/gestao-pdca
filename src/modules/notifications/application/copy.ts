import { formatDate, formatDateTime } from "@/ui/labels";

export interface NotificationView {
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly title: string;
  readonly metadata: Record<string, unknown>;
  readonly target_kind: string;
  readonly href: string;
  readonly sensitive: boolean;
  readonly created_at: string;
  readonly read_at: string | null;
}

const labels: Record<string, string> = {
  "task.assigned": "Nova tarefa atribuída",
  "task.owner_assigned": "Ficaste Owner de uma tarefa",
  "task.due_date_changed": "Prazo alterado",
  "task.blocked": "Tarefa bloqueada",
  "task.completed": "Tarefa concluída",
  "task.reopened": "Tarefa reaberta",
  "task.due_soon": "Prazo próximo",
  "task.overdue": "Tarefa em atraso",
  "pdca.assigned": "Novo PDCA atribuído",
  "pdca.owner_assigned": "Ficaste Owner de um PDCA",
  "pdca.due_date_changed": "Prazo do PDCA alterado",
  "pdca.phase_changed": "PDCA mudou de fase",
  "pdca.blocked": "PDCA bloqueado",
  "pdca.completed": "PDCA concluído",
  "pdca.reopened": "PDCA reaberto",
  "pdca.due_soon": "Prazo do PDCA próximo",
  "pdca.overdue": "PDCA em atraso",
  "meeting.invited": "Foste adicionado a uma reunião",
  "meeting.rescheduled": "Reunião alterada",
  "meeting.started": "A reunião começou",
  "meeting.cancelled": "Reunião cancelada",
  "meeting.awaiting_validation": "Reunião a aguardar a tua validação",
  "meeting.reminder": "Reunião em breve",
  mention: "Mencionaram-te",
  comment: "Novo comentário",
};

/** Short heading for a notification type (PT-PT). */
export function notificationLabel(type: string): string {
  return labels[type] ?? "Actualização";
}

/** Generic wording for pushes about reserved subjects. */
export const sensitiveNotificationText = {
  title: "Assunto reservado",
  body: "Tem uma nova actualização num assunto reservado.",
} as const;

/** One line of context under the title, built from minimal metadata. */
export function notificationContext(notification: NotificationView): string {
  const meta = notification.metadata;
  const parts: string[] = [];
  const actor = typeof meta.actor === "string" ? meta.actor : null;
  const due = typeof meta.due_date === "string" ? meta.due_date : null;
  const start =
    typeof meta.scheduled_start_at === "string"
      ? meta.scheduled_start_at
      : null;
  if (start) parts.push(formatDateTime(start));
  if (due) parts.push(`Prazo: ${formatDate(due)}`);
  if (typeof meta.phase === "string") parts.push(`Fase: ${meta.phase}`);
  if (actor) parts.push(`por ${actor}`);
  return parts.join(" · ");
}

/** What the button says: where the deep link goes. */
export function notificationAction(notification: NotificationView): string {
  switch (notification.target_kind) {
    case "MEETING":
      return notification.href.endsWith("/finish")
        ? "Terminar reunião"
        : "Abrir reunião";
    case "TASK":
      return "Abrir tarefa";
    case "PDCA":
      return "Abrir PDCA";
    case "DECISION":
      return "Abrir decisão";
    default:
      return "Abrir";
  }
}

/** Push payload policy: reserved subjects never reveal titles or names. */
export function pushPayloadFor(notification: NotificationView): {
  title: string;
  body: string;
  href: string;
} {
  if (notification.sensitive)
    return { ...sensitiveNotificationText, href: notification.href };
  const context = notificationContext(notification);
  return {
    title: notificationLabel(notification.type),
    body: context ? `${notification.title} · ${context}` : notification.title,
    href: notification.href,
  };
}
