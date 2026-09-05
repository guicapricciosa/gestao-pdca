"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { unreadCountAction } from "@/app/actions/notifications";
import { createSupabaseBrowserClient } from "@/platform/supabase/browser";

/** Discreet bell with the unread count; refreshed by the person's own channel. */
export function NotificationBell({
  profileId,
  initialCount,
  variant = "full",
  testId = "notification-bell",
}: {
  readonly profileId: string | null;
  readonly initialCount: number;
  /** `compact`: icon and badge only, for the phone top bar. */
  readonly variant?: "full" | "compact";
  readonly testId?: string;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (profileId === null) return;
    const client = createSupabaseBrowserClient();
    let cancelled = false;
    const refresh = () => {
      void unreadCountAction().then((value) => {
        if (!cancelled) setCount(value);
      });
    };
    const channel = client
      .channel(`profile:${profileId}`, { config: { private: true } })
      .on("broadcast", { event: "changed" }, (message) => {
        const area = (message.payload as { area?: string } | undefined)?.area;
        if (area === "notifications") refresh();
      });
    void client.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      void client.realtime.setAuth(data.session.access_token).then(() => {
        channel.subscribe();
      });
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [profileId]);

  const label =
    count === 0
      ? "Notificações"
      : `Notificações, ${count} ${count === 1 ? "não lida" : "não lidas"}`;
  if (variant === "compact")
    return (
      <Link
        aria-label={label}
        className="relative grid size-9 place-items-center rounded-full text-white/85 hover:bg-white/10"
        data-testid={testId}
        href="/notificacoes"
        title={label}
      >
        <Bell aria-hidden className="size-5" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-[#d9481f] px-1 text-center text-[10px] leading-[18px] font-semibold text-white"
            data-testid={`${testId}-count`}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  return (
    <Link
      aria-label={label}
      className="relative inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
      data-testid={testId}
      href="/notificacoes"
      title={label}
    >
      <Bell aria-hidden className="size-4" />
      <span>Notificações</span>
      {count > 0 && (
        <span
          className="rounded-full bg-[#d9481f] px-1.5 text-[11px] font-semibold text-white"
          data-testid="notification-count"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
