import Link from "next/link";

import { listChapters } from "@/modules/manual/chapters";

export const dynamic = "force-dynamic";

export default async function ManualIndexPage() {
  const chapters = await listChapters();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">Ajuda</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Manual</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Como usar a plataforma, capítulo a capítulo, com imagens de cada ecrã.
          Começa pelos primeiros passos; o resto lê-se quando fizer falta.
        </p>
      </header>
      <ol className="rounded-2xl border bg-white" data-testid="manual-chapters">
        {chapters.map((chapter) => (
          <li className="border-b last:border-0" key={chapter.slug}>
            <Link
              className="flex items-center gap-4 px-5 py-3.5 text-sm hover:bg-black/[0.025]"
              href={`/manual/${chapter.slug}`}
            >
              <span className="text-muted-foreground w-6 tabular-nums">
                {chapter.number}
              </span>
              <span className="font-medium">{chapter.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
