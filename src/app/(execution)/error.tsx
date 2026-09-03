"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ExecutionError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("page failed", error.digest ?? error.message);
  }, [error]);
  return (
    <section
      role="alert"
      className="mx-auto max-w-xl rounded-2xl border bg-white p-8"
    >
      <p className="text-accent text-sm font-medium">Algo correu mal</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Não foi possível mostrar esta página.
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        O servidor não conseguiu concluir o pedido. Os teus dados não foram
        alterados. Tenta de novo; se persistir, contacta o Support & IT
        {error.digest ? ` e indica a referência ${error.digest}` : ""}.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          className="rounded-full bg-black px-4 py-2 text-sm text-white"
          onClick={reset}
          type="button"
        >
          Tentar de novo
        </button>
        <Link className="rounded-full border px-4 py-2 text-sm" href="/my-work">
          Ir para My Work
        </Link>
      </div>
    </section>
  );
}
