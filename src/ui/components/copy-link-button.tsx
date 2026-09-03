"use client";

import { useState } from "react";

/** Copies a navigation link. The link never grants access by itself. */
export function CopyLinkButton({
  path,
  label = "Copiar ligação",
}: {
  readonly path: string;
  readonly label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="rounded-full border bg-white px-4 py-2 text-sm hover:bg-neutral-50"
      data-testid="copy-link"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("Copia a ligação:", url);
        }
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      }}
      type="button"
    >
      {done ? "Ligação copiada" : label}
    </button>
  );
}
