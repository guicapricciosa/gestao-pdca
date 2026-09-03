"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function NoticeContent() {
  const params = useSearchParams();
  const pathname = usePathname();
  const error = params.get("error") ?? params.get("ai_error");
  const saved = params.get("saved");
  if (!error && !saved) return null;
  const clean = new URLSearchParams(params.toString());
  clean.delete("error");
  clean.delete("ai_error");
  clean.delete("saved");
  const href = clean.size > 0 ? `${pathname}?${clean.toString()}` : pathname;
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
      <Link
        className="shrink-0 text-xs underline underline-offset-4"
        href={href}
      >
        Fechar
      </Link>
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
