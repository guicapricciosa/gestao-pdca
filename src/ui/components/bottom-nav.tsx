"use client";

import {
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  Gauge,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/my-work", label: "Trabalho", icon: Gauge },
  { href: "/meetings", label: "Reuniões", icon: CalendarDays },
  { href: "/pdcas", label: "PDCAs", icon: ClipboardCheck },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare2 },
  { href: "/decisions", label: "Decisões", icon: Scale },
] as const;

/** Phone navigation: five thumb-reachable entries, safe-area aware. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-white lg:hidden"
      data-testid="bottom-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/meetings" && pathname.startsWith("/meeting-series"));
          return (
            <li key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[11px] leading-none ${
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
                href={href}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
