import Link from "next/link";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-accent text-sm font-medium">
          Grupo Capricciosa · Execution
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
          Entrar
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Entra com o teu email da empresa. Só vês o que está no teu âmbito.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error === "service_unavailable"
              ? "O serviço de autenticação não respondeu. Não é um problema das credenciais; tenta novamente dentro de instantes."
              : error === "link_invalid"
                ? "Esse link já não é válido. Pede um novo em «Esqueci-me da palavra-passe»."
                : "Não foi possível iniciar sessão. Verifica o email e a palavra-passe."}
          </p>
        )}
        <form action={loginAction} className="mt-8 grid gap-4">
          {next && <input type="hidden" name="next" value={next} />}
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
          <label className="text-sm font-medium">
            Palavra-passe
            <input
              className="mt-2 w-full rounded-lg border px-3 py-2"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="mt-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">
            Entrar
          </button>
          <Link
            className="text-muted-foreground text-center text-sm underline-offset-4 hover:underline"
            href="/recuperar-palavra-passe"
          >
            Esqueci-me da palavra-passe
          </Link>
        </form>
      </section>
    </main>
  );
}
