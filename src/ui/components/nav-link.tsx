"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  exact = false,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-white/12 font-medium text-white"
          : "text-white/65 hover:bg-white/8 hover:text-white"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}
