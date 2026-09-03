import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-accent text-sm font-medium">Execution Platform</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
          Entrar
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          A sessão é validada pelo Supabase e todas as páginas operacionais
          voltam a aplicar autorização no servidor.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            Não foi possível iniciar sessão.
          </p>
        )}
        <form action={loginAction} className="mt-8 grid gap-4">
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
            Password
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
        </form>
      </section>
    </main>
  );
}
