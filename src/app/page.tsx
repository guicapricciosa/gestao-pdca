import { Building2, LockKeyhole, Network } from "lucide-react";
import Link from "next/link";

const foundations = [
  {
    title: "Organização configurável",
    description: "Empresas, unidades, restaurantes e atribuições temporais.",
    icon: Building2,
  },
  {
    title: "Autorização determinística",
    description: "Permissões funcionais combinadas com âmbito e visibilidade.",
    icon: LockKeyhole,
  },
  {
    title: "Monólito modular",
    description: "Domínios explícitos sobre uma base operacional simples.",
    icon: Network,
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between border-b pb-6">
        <p className="text-sm font-semibold tracking-[0.18em] uppercase">
          Execution Platform
        </p>
        <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
          Foundation
        </span>
      </header>

      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-accent mb-5 text-sm font-medium">
            Accountability · Visibility · Execution
          </p>
          <h1 className="max-w-4xl text-5xl leading-[0.95] font-semibold tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Uma base segura para transformar decisões em execução.
          </h1>
          <p className="text-muted-foreground mt-8 max-w-2xl text-lg leading-8">
            A fundação técnica e organizacional está preparada para crescer por
            incrementos, sem comprometer permissões, histórico ou clareza
            operacional.
          </p>
          <Link
            href="/my-work"
            className="mt-8 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
          >
            Abrir Execution Core
          </Link>
        </div>

        <div className="divide-y border-y">
          {foundations.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="grid grid-cols-[auto_1fr] gap-4 py-6"
            >
              <Icon aria-hidden="true" className="text-accent mt-1 size-5" />
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
