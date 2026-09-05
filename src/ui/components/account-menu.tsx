"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SubmitButton } from "@/ui/components/submit-button";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/**
 * Mobile account control: an avatar with the person's initials that opens
 * who they are, what they cover, Definições and Terminar sessão. The menu
 * is only in the DOM while open, so there is one "Terminar sessão" on the page.
 */
export function AccountMenu({
  name,
  functions,
  restaurants,
  logout,
}: {
  readonly name: string;
  readonly functions: readonly string[];
  readonly restaurants: readonly string[];
  readonly logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={root}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Conta de ${name}`}
        className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-semibold tracking-wide text-white"
        data-testid="account-menu"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {initialsOf(name)}
      </button>
      {open && (
        <div
          className="text-foreground absolute right-0 z-50 mt-2 w-72 rounded-2xl border bg-white p-4 shadow-xl"
          role="menu"
        >
          <p className="font-semibold" data-testid="viewer-name-mobile">
            {name}
          </p>
          <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
            {functions.length === 0 && <li>Sem função activa</li>}
            {functions.map((item) => (
              <li className="truncate" key={item}>
                {item}
              </li>
            ))}
          </ul>
          {restaurants.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              Cobre {restaurants.join(", ")}
            </p>
          )}
          <div className="mt-4 grid gap-2 border-t pt-3">
            <Link
              className="rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.04]"
              href="/definicoes"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              Definições
            </Link>
            <form action={logout}>
              <SubmitButton
                className="w-full !justify-start !border-0 !bg-transparent !px-2 !py-1.5 !text-sm !font-normal hover:!bg-black/[0.04]"
                variant="secondary"
                pendingLabel="A sair…"
              >
                Terminar sessão
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
