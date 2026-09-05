import Link from "next/link";

import { getBranding } from "@/platform/pwa/branding";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { InstallApp } from "@/ui/components/install-app";
import { PushSettings } from "@/ui/components/push-settings";
import { NotificationPreferences } from "@/ui/patterns/notification-preferences";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const branding = getBranding();
  const client = await createSupabaseServerClient();
  const [{ data: preferences }, { data: scope }] = await Promise.all([
    client.rpc("get_notification_preferences"),
    client.rpc("get_accessible_scope"),
  ]);
  const canManageTemplates = (scope ?? []).some(
    (path) => path.permission_key === "meeting.template.manage",
  );
  const canManagePeople = (scope ?? []).some(
    (path) => path.permission_key === "organization.manage",
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
      {canManagePeople && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Pessoas</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Convida quem entra na plataforma, com papel, departamento e
            restaurantes. Reenvia convites a quem ainda não definiu
            palavra-passe.
          </p>
          <Link
            className="mt-3 inline-flex rounded-full border bg-white px-4 py-2 text-sm"
            href="/definicoes/pessoas"
          >
            Gerir pessoas
          </Link>
        </section>
      )}
      {canManagePeople && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Organização</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Restaurantes, departamentos e serviços partilhados: criar, renomear,
            desactivar.
          </p>
          <Link
            className="mt-3 inline-flex rounded-full border bg-white px-4 py-2 text-sm"
            href="/definicoes/organizacao"
          >
            Gerir organização
          </Link>
        </section>
      )}
      {canManageTemplates && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Modelos de reunião</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Reunião de Direção, DOL, visita técnica… Um modelo preenche assunto,
            duração, pessoas, âmbito, agenda e repetição ao marcar uma reunião.
          </p>
          <Link
            className="mt-3 inline-flex rounded-full border bg-white px-4 py-2 text-sm"
            href="/definicoes/modelos-de-reuniao"
          >
            Gerir modelos
          </Link>
        </section>
      )}
    </div>
  );
}
