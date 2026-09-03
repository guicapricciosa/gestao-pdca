import Link from "next/link";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  openNotificationAction,
} from "@/app/actions/notifications";
import {
  notificationAction,
  notificationContext,
  notificationLabel,
  type NotificationView,
} from "@/modules/notifications/application/copy";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { SubmitButton } from "@/ui/components/submit-button";
import { formatDateTime } from "@/ui/labels";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const unreadOnly = tab !== "all";
  const client = await createSupabaseServerClient();
  let query = client
    .from("notifications")
    .select(
      "id,type,category,title,metadata,target_kind,href,sensitive,created_at,read_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (unreadOnly) query = query.is("read_at", null);
  const [{ data }, { data: unread }] = await Promise.all([
    query,
    client.rpc("unread_notification_count"),
  ]);
  const items = (data ?? []) as unknown as NotificationView[];
  const path = `/notificacoes${unreadOnly ? "" : "?tab=all"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-sm font-medium">A tua conta</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Notificações
          </h1>
        </div>
        {(unread ?? 0) > 0 && (
          <form action={markAllNotificationsReadAction}>
            <input type="hidden" name="returnPath" value={path} />
            <SubmitButton variant="secondary" pendingLabel="…">
              Marcar todas como lidas
            </SubmitButton>
          </form>
        )}
      </header>
      <nav aria-label="Filtro" className="flex gap-2 text-sm">
        <Link
          aria-current={unreadOnly ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 ${unreadOnly ? "bg-black text-white" : "border bg-white"}`}
          href="/notificacoes"
        >
          Não lidas{(unread ?? 0) > 0 ? ` (${unread})` : ""}
        </Link>
        <Link
          aria-current={!unreadOnly ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 ${!unreadOnly ? "bg-black text-white" : "border bg-white"}`}
          href="/notificacoes?tab=all"
        >
          Todas
        </Link>
      </nav>
      <section
        className="rounded-2xl border bg-white"
        data-testid="notification-list"
      >
        {items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {unreadOnly
              ? "Nada por ler. Bom sinal."
              : "Ainda não tens notificações."}
          </p>
        ) : (
          <ul>
            {items.map((notification) => (
              <li
                className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-0 ${notification.read_at ? "opacity-70" : ""}`}
                data-testid="notification"
                data-read={notification.read_at ? "true" : "false"}
                key={notification.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {notification.read_at === null && (
                      <span
                        aria-label="Não lida"
                        className="mr-2 inline-block size-2 rounded-full bg-[#d9481f] align-middle"
                      />
                    )}
                    {notificationLabel(notification.type)}
                  </p>
                  <p className="text-sm">{notification.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      notificationContext(notification),
                      formatDateTime(notification.created_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={openNotificationAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <input
                      type="hidden"
                      name="href"
                      value={notification.href}
                    />
                    <SubmitButton pendingLabel="…">
                      {notificationAction(notification)}
                    </SubmitButton>
                  </form>
                  {notification.read_at === null && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <input type="hidden" name="returnPath" value={path} />
                      <SubmitButton variant="secondary" pendingLabel="…">
                        Marcar como lida
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
