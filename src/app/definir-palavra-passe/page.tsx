import { redirect } from "next/navigation";

import { setPasswordAction } from "@/app/login/actions";
import {
  createSupabaseServerClient,
  currentAuthUser,
} from "@/platform/supabase/server";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  curta: "A palavra-passe tem de ter pelo menos 10 caracteres.",
  diferentes: "As duas palavras-passe não coincidem.",
  igual: "Essa é a palavra-passe actual. Escolhe uma diferente.",
  falhou: "Não foi possível guardar. O link pode ter expirado; pede um novo.",
};

/** Lands here from an invite or recovery e-mail, already signed in. */
export default async function SetPasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const client = await createSupabaseServerClient();
  const user = await currentAuthUser(client);
  if (user === null) redirect("/login?next=%2Fdefinir-palavra-passe");
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-accent text-sm font-medium">
          Grupo Capricciosa · Execution
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
          Definir palavra-passe
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Conta {user.email}. Escolhe uma palavra-passe com pelo menos 10
          caracteres.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {messages[error] ?? messages.falhou}
          </p>
        )}
        <form action={setPasswordAction} className="mt-8 grid gap-4">
          <label className="text-sm font-medium">
            Nova palavra-passe
            <input
              className="mt-2 w-full rounded-lg border px-3 py-2"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              autoFocus
            />
          </label>
          <label className="text-sm font-medium">
            Repete a palavra-passe
            <input
              className="mt-2 w-full rounded-lg border px-3 py-2"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
          <button className="mt-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">
            Guardar e entrar
          </button>
        </form>
      </section>
    </main>
  );
}
