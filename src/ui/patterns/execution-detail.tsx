import Link from "next/link";

import { DueDate, StatusBadge } from "@/ui/components/status-badge";

const activityLabel: Record<string, string> = {
  created: "Criado",
  "status.changed": "Estado alterado",
  "due_date.changed": "Prazo alterado",
  "people.assigned": "Owner/Responsible atribuídos",
  "scope.changed": "Âmbito alterado",
  "comment.created": "Comentário",
  "attachment.created": "Anexo adicionado",
  "member.added": "Membro adicionado",
  "member.removed": "Membro removido",
  reopened: "Reaberto",
  completed: "Concluído",
  "phase.changed": "Fase alterada",
  "blocker.added": "Bloqueio registado",
  "blocker.resolved": "Bloqueio resolvido",
  updated: "Editado",
};

function describeActivity(action: string | null) {
  if (action === null) return "";
  const suffix = action.split(".").slice(1).join(".");
  const label = activityLabel[suffix] ?? activityLabel[action] ?? null;
  return label ?? action;
}

interface DetailProps {
  readonly kind: "Decision" | "Task" | "PDCA";
  readonly title: string;
  readonly status: string;
  readonly version: number;
  readonly description?: string | null;
  readonly phase?: string;
  readonly priority?: string;
  readonly impact?: string;
  readonly risk?: string;
  readonly owner?: string | null;
  readonly responsible?: string | null;
  readonly dueDate?: string | null;
  readonly unitScopes: readonly string[];
  readonly restaurantScopes: readonly string[];
  readonly collaborators: readonly { id: string; name: string }[];
  readonly watchers: readonly { id: string; name: string }[];
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
  readonly activity: readonly {
    id: string | null;
    action: string | null;
    occurred_at: string | null;
    reason: string | null;
  }[];
  readonly tasks?: readonly { id: string; title: string; status: string }[];
  readonly dueDateHistory?: readonly {
    id: string;
    old_due_date: string | null;
    new_due_date: string | null;
    reason: string;
    changed_at: string;
  }[];
}

export function ExecutionDetail(props: DetailProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">{props.kind}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            {props.title}
          </h1>
          <StatusBadge value={props.status} />
          {props.phase && (
            <span className="rounded-full bg-black px-3 py-1 text-xs text-white">
              {props.phase}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Versão {props.version}
        </p>
      </header>
      {props.kind === "PDCA" && (
        <div className="grid grid-cols-4 overflow-hidden rounded-2xl border bg-white">
          {["PLAN", "DO", "CHECK", "ACT"].map((phase) => (
            <div
              className={`p-4 text-center text-xs font-semibold ${phase === props.phase ? "bg-black text-white" : "border-r last:border-r-0"}`}
              key={phase}
            >
              {phase}
            </div>
          ))}
        </div>
      )}
      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 md:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            Contexto
          </h2>
          <p className="text-muted-foreground mt-4 leading-7 whitespace-pre-wrap">
            {props.description || "Sem descrição."}
          </p>
        </div>
        <dl className="space-y-4 rounded-2xl border bg-white p-6 text-sm">
          {props.priority && (
            <div>
              <dt className="text-muted-foreground">Prioridade</dt>
              <dd className="mt-1 font-medium">{props.priority}</dd>
            </div>
          )}
          {props.impact && (
            <div>
              <dt className="text-muted-foreground">Impacto</dt>
              <dd className="mt-1 font-medium">{props.impact}</dd>
            </div>
          )}
          {props.risk && (
            <div>
              <dt className="text-muted-foreground">Risco</dt>
              <dd className="mt-1 font-medium">{props.risk}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="mt-1 font-medium">
              {props.owner ?? "Por atribuir"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Responsible</dt>
            <dd className="mt-1 font-medium">
              {props.responsible ?? "Por atribuir"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd className="mt-1 font-medium">
              <DueDate value={props.dueDate} status={props.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Departamentos e serviços</dt>
            <dd className="mt-1 font-medium">
              {props.unitScopes.join(", ") || "Sem unidade"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Restaurantes</dt>
            <dd className="mt-1 font-medium">
              {props.restaurantScopes.join(", ") || "Sem restaurante"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Collaborators</dt>
            <dd className="mt-1 font-medium">
              {props.collaborators.map((person) => person.name).join(", ") ||
                "Nenhum"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Watchers</dt>
            <dd className="mt-1 font-medium">
              {props.watchers.map((person) => person.name).join(", ") ||
                "Nenhum"}
            </dd>
          </div>
        </dl>
      </section>
      {props.tasks && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">DO · Tasks</h2>
          <div className="rounded-2xl border bg-white">
            {props.tasks.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">
                Ainda não existem Tasks neste PDCA.
              </p>
            ) : (
              props.tasks.map((task) => (
                <Link
                  className="flex justify-between border-b p-4 last:border-0"
                  href={`/tasks/${task.id}`}
                  key={task.id}
                >
                  <span>{task.title}</span>
                  <span className="text-xs">{task.status}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      )}
      {props.dueDateHistory && props.dueDateHistory.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Histórico de prazo</h2>
          <div className="rounded-2xl border bg-white">
            {props.dueDateHistory.map((change) => (
              <div
                className="border-b p-4 text-sm last:border-0"
                key={change.id}
              >
                <p>
                  {change.old_due_date ?? "Sem prazo"} →{" "}
                  {change.new_due_date ?? "Sem prazo"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {change.reason} ·{" "}
                  {new Date(change.changed_at).toLocaleString("pt-PT")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Comentários</h2>
          <div className="rounded-2xl border bg-white">
            {props.comments.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">
                Sem comentários.
              </p>
            ) : (
              props.comments.map((comment) => (
                <article
                  className="border-b p-5 last:border-0"
                  key={comment.id}
                >
                  <p>{comment.body}</p>
                  <time className="text-muted-foreground mt-2 block text-xs">
                    {new Date(comment.created_at).toLocaleString("pt-PT")}
                  </time>
                </article>
              ))
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Attachments</h2>
          <div className="rounded-2xl border bg-white">
            {props.attachments.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">
                Sem ficheiros.
              </p>
            ) : (
              props.attachments.map((attachment) => (
                <div className="border-b p-5 last:border-0" key={attachment.id}>
                  <a
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/api/attachments/${attachment.id}`}
                  >
                    {attachment.filename}
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {attachment.mime_type} ·{" "}
                    {Math.ceil(attachment.size_bytes / 1024)} KB
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Activity</h2>
        <div className="rounded-2xl border bg-white">
          {props.activity.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Sem atividade visível.
            </p>
          ) : (
            props.activity.map((event, index) => (
              <div
                className="flex justify-between gap-4 border-b p-4 text-sm last:border-0"
                key={event.id ?? index}
              >
                <span>
                  {describeActivity(event.action)}
                  {event.reason ? ` — ${event.reason}` : ""}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {event.action}
                  </span>
                </span>
                <time className="text-muted-foreground whitespace-nowrap">
                  {event.occurred_at
                    ? new Date(event.occurred_at).toLocaleDateString("pt-PT")
                    : ""}
                </time>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
