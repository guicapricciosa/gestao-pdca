import Link from "next/link";

export const dynamic = "force-static";

/**
 * Served by the service worker when a navigation fails. Public and static on
 * purpose: it carries no data and is the only page cached for offline use.
 */
export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
        <p className="text-accent text-sm font-medium">
          Sem ligação à Internet
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Não foi possível ligar ao servidor
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Volta a tentar quando tiveres ligação. Para não mostrar informação
          desactualizada, a aplicação não guarda dados no dispositivo.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/my-work"
        >
          Tentar de novo
        </Link>
      </section>
    </main>
  );
}
