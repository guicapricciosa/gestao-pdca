"use server";

import { redirect } from "next/navigation";

import { safeNextPath } from "@/app/login/next-path";
import { createSupabaseServerClient } from "@/platform/supabase/server";

import { finish } from "./finish";

export async function unreadCountAction(): Promise<number> {
  const client = await createSupabaseServerClient();
  const { data } = await client.rpc("unread_notification_count");
  return data ?? 0;
}

/** Marks one notification as read and follows its deep link (re-authorized there). */
export async function openNotificationAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  await client.rpc("mark_notifications_read", { notification_ids: [id] });
  redirect(safeNextPath(formData.get("href")));
}

export async function markNotificationReadAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("mark_notifications_read", {
    notification_ids: [String(formData.get("id"))],
  });
  finish(String(formData.get("returnPath") ?? "/notificacoes"), error, [], {
    silent: true,
  });
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("mark_all_notifications_read");
  finish(String(formData.get("returnPath") ?? "/notificacoes"), error, [], {
    silent: true,
  });
}

export async function saveNotificationPreferencesAction(formData: FormData) {
  const client = await createSupabaseServerClient();
  const flag = (name: string) => formData.get(name) === "on";
  const days = Number(formData.get("deadlineDays") ?? 1);
  const { error } = await client.rpc("save_notification_preferences", {
    tasks: flag("tasks"),
    pdcas: flag("pdcas"),
    collaboration: flag("collaboration"),
    meeting_participation: flag("meetingParticipation"),
    meeting_changes: flag("meetingChanges"),
    meeting_reminders: flag("meetingReminders"),
    deadline_days: [0, 1, 2].includes(days) ? days : 1,
    push_enabled: flag("pushEnabled"),
  });
  finish("/definicoes", error);
}
