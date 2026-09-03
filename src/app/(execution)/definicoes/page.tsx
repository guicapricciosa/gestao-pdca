import { getBranding } from "@/platform/pwa/branding";
import { InstallApp } from "@/ui/components/install-app";

export const dynamic = "force-dynamic";
export default function SettingsPage() {
  const branding = getBranding();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">A tua conta</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Definições
        </h1>
      </header>
      <InstallApp appName={branding.name} />
    </div>
  );
}
