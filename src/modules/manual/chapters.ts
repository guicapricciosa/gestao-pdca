import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { marked } from "marked";

/**
 * The user manual lives in docs/manual as Markdown (the same files that
 * ship in the repository). Read at request time so a docs change is a deploy
 * away; `outputFileTracingIncludes` in next.config keeps the folder in the
 * serverless bundle.
 */
const manualDir = path.join(process.cwd(), "docs", "manual");
export const screenshotsDir = path.join(process.cwd(), "docs", "screenshots");

export interface Chapter {
  readonly slug: string;
  readonly number: number;
  readonly title: string;
}

function titleOf(markdown: string, slug: string) {
  const line = markdown.split("\n").find((row) => row.startsWith("# "));
  return (line ?? `# ${slug}`)
    .slice(2)
    .replace(/^\d+\.\s*/, "")
    .trim();
}

export async function listChapters(): Promise<Chapter[]> {
  const files = (await readdir(manualDir))
    .filter((file) => /^\d{2}-.+\.md$/.test(file))
    .sort();
  return Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.md$/, "");
      const markdown = await readFile(path.join(manualDir, file), "utf8");
      return {
        slug,
        number: Number(slug.slice(0, 2)),
        title: titleOf(markdown, slug),
      };
    }),
  );
}

/** Renders one chapter to HTML; images and chapter links point into the app. */
export async function renderChapter(slug: string) {
  if (!/^\d{2}-[a-z0-9-]+$/.test(slug)) return null;
  let markdown: string;
  try {
    markdown = await readFile(path.join(manualDir, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
  const rewritten = markdown
    .replace(
      /\]\(\.\.\/screenshots\/([a-z0-9-]+\.png)\)/g,
      "](/manual/imagem/$1)",
    )
    .replace(/\]\((\d{2}-[a-z0-9-]+)\.md\)/g, "](/manual/$1)")
    .replace(/\]\((\d{2}-[a-z0-9-]+)\.md#([a-z0-9-]+)\)/g, "](/manual/$1#$2)");
  const html = await marked.parse(rewritten, { gfm: true });
  return { slug, title: titleOf(markdown, slug), html };
}
