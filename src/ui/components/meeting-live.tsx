"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/platform/supabase/browser";

type LinkState = "connecting" | "live" | "offline";

interface Presence {
  readonly profileId: string;
  readonly name: string;
}

/**
 * Keeps Meeting Mode in step with the other participants.
 *
 * The database broadcasts *signals* (which area changed) on a private channel
 * that Realtime only lets meeting readers join. On a signal this component asks
 * Next to re-render the page for this viewer — every byte shown still comes
 * from the viewer's own authorized server render. Presence tracks display
 * names only. Nothing technical is shown: names of who is here and a quiet
 * notice while the connection is being restored.
 */
export function MeetingLive({
  meetingId,
  profileId,
  displayName,
}: {
  readonly meetingId: string;
  readonly profileId: string | null;
  readonly displayName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<LinkState>("connecting");
  const [people, setPeople] = useState<readonly Presence[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profileId === null) return;
    const client = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let access: RealtimeChannel | null = null;
    let cancelled = false;
    let everLive = false;
    let joining = false;

    const refresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 250);
    };

    const join = async () => {
      if (cancelled || joining) return;
      joining = true;
      try {
        if (channel) {
          await client.removeChannel(channel);
          channel = null;
        }
        if (access) {
          await client.removeChannel(access);
          access = null;
        }
        const {
          data: { session },
        } = await client.auth.getSession();
        if (cancelled || !session) return;
        await client.realtime.setAuth(session.access_token);
        // Access changes (scope, grants) arrive on the person's own channel,
        // because the meeting channel stops delivering to someone who lost it.
        access = client
          .channel(`profile:${profileId}`, { config: { private: true } })
          .on("broadcast", { event: "changed" }, () => refresh())
          .subscribe();
        const next = client.channel(`meeting:${meetingId}`, {
          config: { private: true, presence: { key: profileId } },
        });
        channel = next;
        next
          .on("broadcast", { event: "changed" }, () => refresh())
          .on("presence", { event: "sync" }, () => {
            const state = next.presenceState<Presence>();
            const seen = new Map<string, Presence>();
            for (const entries of Object.values(state))
              for (const entry of entries)
                if (!seen.has(entry.profileId))
                  seen.set(entry.profileId, entry);
            setPeople(
              [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)),
            );
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setState("live");
              // After a reconnect the page may have missed signals: converge.
              if (everLive) refresh();
              everLive = true;
              void next.track({ profileId, name: displayName });
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setState("offline");
            }
          });
      } finally {
        joining = false;
      }
    };

    // While the live link is down: converge slowly and try to rejoin when the
    // browser says it is online. No polling while the channel is healthy.
    const catchUp = setInterval(() => {
      if (channel?.state === "joined") return;
      if (navigator.onLine) void join();
      refresh();
    }, 10_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // The socket only notices a dropped link at the next heartbeat; the
    // browser knows sooner. Rejoin right away and converge with the server.
    const onOffline = () => setState("offline");
    const onOnline = () => {
      void join();
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    void join();

    return () => {
      cancelled = true;
      clearInterval(catchUp);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (channel) void client.removeChannel(channel);
      if (access) void client.removeChannel(access);
    };
  }, [meetingId, profileId, displayName, router]);

  if (profileId === null) return null;
  return (
    <div
      className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
      data-testid="presence"
      data-state={state}
    >
      {people.length > 0 && (
        <span>
          <span className="font-medium">Na reunião</span>
          {" · "}
          {people.map((person) => person.name).join(" · ")}
        </span>
      )}
      {state === "offline" && (
        <span className="text-amber-800" role="status">
          Sem ligação em tempo real — a tentar ligar…
        </span>
      )}
    </div>
  );
}
