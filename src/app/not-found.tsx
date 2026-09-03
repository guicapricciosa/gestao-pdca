import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
        <p className="text-accent text-sm font-medium">Execution</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Não tens acesso a este conteúdo
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          A ligação pode estar errada, o conteúdo pode já não existir, ou não
          está no teu âmbito. Se te enviaram esta ligação, pede a quem a enviou
          para confirmar o acesso.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/my-work"
        >
          Ir para O meu trabalho
        </Link>
      </section>
    </main>
  );
}
