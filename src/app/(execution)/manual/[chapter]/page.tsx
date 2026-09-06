import Link from "next/link";
import { notFound } from "next/navigation";

import { listChapters, renderChapter } from "@/modules/manual/chapters";

export const dynamic = "force-dynamic";

export default async function ManualChapterPage({
  params,
}: {
  readonly params: Promise<{ chapter: string }>;
}) {
  const { chapter: slug } = await params;
  const [chapter, chapters] = await Promise.all([
    renderChapter(slug),
    listChapters(),
  ]);
  if (chapter === null) notFound();
  const index = chapters.findIndex((item) => item.slug === slug);
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const next = chapters[index + 1];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-accent text-sm font-medium">
        <Link className="hover:underline" href="/manual">
          Manual
        </Link>
        {" › "}
        {chapter.title}
      </p>
      <article
        className="manual rounded-2xl border bg-white p-6 sm:p-8"
        dangerouslySetInnerHTML={{ __html: chapter.html }}
        data-testid="manual-chapter"
      />
      <nav className="flex justify-between gap-4 text-sm">
        {previous ? (
          <Link
            className="rounded-full border bg-white px-4 py-2"
            href={`/manual/${previous.slug}`}
          >
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            className="rounded-full border bg-white px-4 py-2"
            href={`/manual/${next.slug}`}
          >
            {next.title} →
          </Link>
        )}
      </nav>
    </div>
  );
}
