import Link from "next/link";

import { FilePicker } from "@/ui/components/file-picker";

import { addCommentAction } from "@/app/actions/execution";
import {
  DueDate,
  StatusBadge,
  type BadgeKind,
} from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import { activityLabel, formatDateTime } from "@/ui/labels";

const input = "rounded-lg border bg-white px-3 py-2 text-sm";

export function RecordHeader({
  kindLabel,
  backHref,
  backLabel,
  from,
  title,
  status,
  badgeKind,
  facts,
  alerts = [],
}: {
  readonly kindLabel: string;
  readonly backHref: string;
  readonly backLabel: string;
  readonly from?: string | undefined;
  readonly title: string;
  readonly status: string;
  readonly badgeKind: BadgeKind;
  readonly facts: readonly { label: string; value: React.ReactNode }[];
  readonly alerts?: readonly string[];
}) {
  return (
    <header>
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href={backHref}>
          {backLabel}
        </Link>
        {" › "}
        {kindLabel}
        {from && (
          <>
            {" · "}
            <Link
              className="underline underline-offset-4"
              href={`/meetings/${from}/finish`}
            >
              Voltar a Terminar reunião
            </Link>
          </>
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
        <StatusBadge value={status} kind={badgeKind} />
      </div>
      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {facts.map((fact) => (
          <div className="flex gap-1.5" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd className="text-foreground font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {alerts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" data-testid="record-alerts">
          {alerts.map((alert) => (
            <li
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900"
              key={alert}
            >
              {alert}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

export function DescriptionSection({
  title = "Descrição",
  text,
}: {
  readonly title?: string;
  readonly text: string | null | undefined;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
        {title}
      </h2>
      <p className="text-muted-foreground mt-3 leading-7 whitespace-pre-wrap">
        {text?.trim() ? text : "Sem descrição."}
      </p>
    </section>
  );
}

export function ProgressSection({
  securityObjectId,
  returnPath,
  comments,
  attachments,
}: {
  readonly securityObjectId: string;
  readonly returnPath: string;
  readonly comments: readonly {
    id: string;
    body: string;
    created_at: string;
  }[];
  readonly attachments: readonly {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
  }[];
}) {
  return (
    <section className="rounded-2xl border bg-white">
      <h2 className="border-b p-5 text-lg font-semibold">Progresso</h2>
      {comments.length === 0 && attachments.length === 0 && (
        <p className="text-muted-foreground p-5 text-sm">
          Ainda sem actualizações. Escreve o ponto de situação abaixo.
        </p>
      )}
      {comments.map((comment) => (
        <article className="border-b p-5 last:border-0" key={comment.id}>
          <p className="whitespace-pre-wrap">{comment.body}</p>
          <time className="text-muted-foreground mt-2 block text-xs">
            {formatDateTime(comment.created_at)}
          </time>
        </article>
      ))}
      {attachments.length > 0 && (
        <ul className="border-b p-5 text-sm">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <a
                className="font-medium underline-offset-4 hover:underline"
                href={`/api/attachments/${attachment.id}`}
              >
                📎 {attachment.filename}
              </a>
              <span className="text-muted-foreground ml-2 text-xs">
                {Math.ceil(attachment.size_bytes / 1024)} KB
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 p-5">
        <form action={addCommentAction} className="grid gap-2">
          <input
            type="hidden"
            name="securityObjectId"
            value={securityObjectId}
          />
          <input type="hidden" name="returnPath" value={returnPath} />
          <textarea
            aria-label="Actualização"
            className={`${input} min-h-20`}
            name="body"
            required
            maxLength={10000}
            placeholder="Ponto de situação, decisão tomada, pedido a alguém…"
          />
          <div>
            <SubmitButton variant="secondary" pendingLabel="A publicar…">
              Publicar actualização
            </SubmitButton>
          </div>
        </form>
        <form
          action="/api/attachments"
          method="post"
          encType="multipart/form-data"
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="hidden"
            name="securityObjectId"
            value={securityObjectId}
          />
          <input type="hidden" name="returnPath" value={returnPath} />
          <FilePicker />
        </form>
      </div>
    </section>
  );
}

export function HistorySection({
  activity,
  dueDateHistory = [],
}: {
  readonly activity: readonly {
    id: string | null;
    action: string | null;
    occurred_at: string | null;
    reason: string | null;
  }[];
  readonly dueDateHistory?: readonly {
    id: string;
    old_due_date: string | null;
    new_due_date: string | null;
    reason: string;
    changed_at: string;
  }[];
}) {
  return (
    <details className="rounded-2xl border bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold">
        Histórico ({activity.length})
      </summary>
      {dueDateHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-[0.08em] uppercase">
            Prazo
          </h3>
          <ul className="mt-2 divide-y text-sm">
            {dueDateHistory.map((change) => (
              <li className="py-2" key={change.id}>
                <DueDate value={change.old_due_date} /> →{" "}
                <DueDate value={change.new_due_date} />
                <span className="text-muted-foreground ml-2 text-xs">
                  {change.reason} · {formatDateTime(change.changed_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mt-4 divide-y text-sm">
        {activity.map((event, index) => (
          <li
            className="flex justify-between gap-4 py-2"
            key={event.id ?? index}
          >
            <span>
              {activityLabel(event.action)}
              {event.reason ? ` — ${event.reason}` : ""}
              <span
                className="text-muted-foreground ml-2 text-xs"
                title="código interno"
              >
                {event.action}
              </span>
            </span>
            <time className="text-muted-foreground whitespace-nowrap">
              {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
            </time>
          </li>
        ))}
      </ul>
    </details>
  );
}
