"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight side panel for quick actions: the page behind stays in place,
 * the form inside posts to a Server Action and the panel closes on navigation.
 */
export function SideSheet({
  label,
  title,
  description,
  children,
  variant = "primary",
  openByDefault = false,
  testId,
}: {
  readonly label: string;
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
  readonly variant?: "primary" | "secondary";
  readonly openByDefault?: boolean;
  readonly testId?: string;
}) {
  const [open, setOpen] = useState(openByDefault);
  const [submitted, setSubmitted] = useState(false);
  // After a Server Action redirects, the page re-renders and hands this
  // component fresh children; that is the signal the action settled.
  const [seenChildren, setSeenChildren] = useState(children);
  if (seenChildren !== children) {
    setSeenChildren(children);
    if (submitted) {
      setSubmitted(false);
      setOpen(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={testId}
        className={
          variant === "primary"
            ? "rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800"
            : "rounded-full border bg-white px-4 py-2 text-sm hover:bg-neutral-50"
        }
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${testId ?? "sheet"}-title`}
            className="relative z-50 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-[#f7f6f2] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b bg-white px-6 py-5">
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  id={`${testId ?? "sheet"}-title`}
                >
                  {title}
                </h2>
                {description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {description}
                  </p>
                )}
              </div>
              <button
                aria-label="Fechar"
                className="rounded-full border px-3 py-1 text-sm"
                onClick={() => setOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </header>
            <div className="p-6" onSubmitCapture={() => setSubmitted(true)}>
              {children}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
