import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-white p-8">
      <p className="text-accent text-sm font-medium">
        Sem acesso ou inexistente
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Não tens acesso a este conteúdo
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        A ligação pode estar errada, o conteúdo pode já não existir, ou não está
        no teu âmbito. Se te enviaram esta ligação, pede a quem a enviou para
        confirmar o acesso.
      </p>
      <Link
        className="mt-6 inline-flex rounded-full border bg-white px-4 py-2 text-sm"
        href="/my-work"
      >
        Voltar a O meu trabalho
      </Link>
    </section>
  );
}
