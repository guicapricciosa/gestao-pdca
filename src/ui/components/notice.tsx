"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function NoticeContent() {
  const params = useSearchParams();
  const pathname = usePathname();
  const error = params.get("error") ?? params.get("ai_error");
  const saved = params.get("saved");
  const [dismissed, setDismissed] = useState(false);
  // Show the feedback once. The flag leaves the address bar right away, so a
  // reload, a bookmark or the Back button do not bring an old notice back.
  useEffect(() => {
    if (!error && !saved) return;
    const clean = new URLSearchParams(window.location.search);
    clean.delete("error");
    clean.delete("ai_error");
    clean.delete("saved");
    const next = clean.size > 0 ? `${pathname}?${clean.toString()}` : pathname;
    // A short delay keeps the flag visible to whatever observed the redirect.
    const timer = window.setTimeout(
      () => window.history.replaceState(window.history.state, "", next),
      2000,
    );
    return () => window.clearTimeout(timer);
  }, [error, saved, pathname]);
  if ((!error && !saved) || dismissed) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      data-testid="notice"
      className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      <p>
        <span className="mr-2 font-semibold">
          {error ? "Não guardado." : "Guardado."}
        </span>
        {error ?? "As alterações ficaram registadas no histórico."}
      </p>
      <button
        className="shrink-0 text-xs underline underline-offset-4"
        onClick={() => setDismissed(true)}
        type="button"
      >
        Fechar
      </button>
    </div>
  );
}

export function Notice() {
  return (
    <Suspense fallback={null}>
      <NoticeContent />
    </Suspense>
  );
}
