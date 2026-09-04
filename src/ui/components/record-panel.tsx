"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Side panel driven by the URL (`?open=<id>`): the list behind keeps its
 * filters and scroll position, Escape and the overlay go back to the list,
 * and the browser's Back button closes it too.
 */
export function RecordPanel({
  closeHref,
  title,
  eyebrow,
  children,
}: {
  readonly closeHref: string;
  readonly title: string;
  readonly eyebrow?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [closeHref, router]);
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      data-testid="record-panel"
    >
      <Link
        aria-label="Fechar painel"
        className="absolute inset-0 bg-black/30"
        href={closeHref}
        scroll={false}
      />
      <aside
        aria-labelledby="record-panel-title"
        aria-modal="true"
        className="relative z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#f7f6f2] shadow-2xl"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white px-6 py-5">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-muted-foreground mb-1 text-xs">
                {eyebrow}
              </div>
            )}
            <h2
              className="text-xl font-semibold tracking-tight"
              id="record-panel-title"
            >
              {title}
            </h2>
          </div>
          <Link
            aria-label="Fechar"
            className="shrink-0 rounded-full border px-3 py-1 text-sm"
            data-testid="close-panel"
            href={closeHref}
            scroll={false}
          >
            Fechar
          </Link>
        </header>
        <div className="space-y-5 p-6">{children}</div>
      </aside>
    </div>
  );
}
