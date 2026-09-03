import { getBranding } from "@/platform/pwa/branding";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { InstallApp } from "@/ui/components/install-app";
import { PushSettings } from "@/ui/components/push-settings";
import { NotificationPreferences } from "@/ui/patterns/notification-preferences";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const branding = getBranding();
  const client = await createSupabaseServerClient();
  const { data: preferences } = await client.rpc(
    "get_notification_preferences",
  );
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">A tua conta</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Definições
        </h1>
      </header>
      <NotificationPreferences
        preferences={
          preferences ?? {
            tasks: true,
            pdcas: true,
            collaboration: true,
            meeting_participation: true,
            meeting_changes: true,
            meeting_reminders: true,
            deadline_days: 1,
            push_enabled: true,
          }
        }
        push={
          <PushSettings
            publicKey={process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? ""}
          />
        }
      />
      <InstallApp appName={branding.name} />
    </div>
  );
}
