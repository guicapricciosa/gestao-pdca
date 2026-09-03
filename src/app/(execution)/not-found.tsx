import Link from "next/link";

export default function ExecutionNotFound() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-white p-8">
      <p className="text-accent text-sm font-medium">
        Sem acesso ou inexistente
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        This page could not be found.
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        Este registo não existe ou não está dentro do teu âmbito (departamento,
        serviço, restaurante ou visibilidade). Se precisas dele, pede a quem o
        gere que ajuste o âmbito ou conceda um acesso explícito.
      </p>
      <Link
        className="mt-6 inline-flex rounded-full border px-4 py-2 text-sm"
        href="/my-work"
      >
        Voltar a My Work
      </Link>
    </section>
  );
}
