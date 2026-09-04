import Link from "next/link";

import { requestPasswordResetAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function RecoverPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-accent text-sm font-medium">
          Grupo Capricciosa · Execution
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
          Recuperar palavra-passe
        </h1>
        {enviado ? (
          <div data-testid="recovery-sent">
            <p className="mt-3 text-sm">
              Se esse email tiver conta, enviámos um link para definir uma
              palavra-passe nova. O link é válido durante uma hora.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              Não chegou? Verifica a pasta de spam ou pede a quem gere a
              plataforma para reenviar o convite.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full border px-4 py-2 text-sm"
              href="/login"
            >
              Voltar a Entrar
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mt-3 text-sm">
              Escreve o teu email da empresa. Enviamos um link para definires
              uma palavra-passe nova.
            </p>
            <form
              action={requestPasswordResetAction}
              className="mt-8 grid gap-4"
            >
              <label className="text-sm font-medium">
                Email
                <input
                  className="mt-2 w-full rounded-lg border px-3 py-2"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <button className="mt-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">
                Enviar link
              </button>
              <Link
                className="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
                href="/login"
              >
                Voltar a Entrar
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
