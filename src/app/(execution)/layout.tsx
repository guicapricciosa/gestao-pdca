import Link from "next/link";
import {
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  Gauge,
  Repeat2,
  Scale,
} from "lucide-react";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/platform/supabase/server";

const navigation = [
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/meeting-series", label: "Meeting Series", icon: Repeat2 },
  { href: "/decisions", label: "Decisions", icon: Scale },
  { href: "/tasks", label: "Tasks", icon: CheckSquare2 },
  { href: "/pdcas", label: "PDCAs", icon: ClipboardCheck },
  { href: "/my-work", label: "My Work", icon: Gauge },
] as const;

export default async function ExecutionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) redirect("/login");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b bg-[#151714] p-6 text-white lg:min-h-screen lg:border-r lg:border-b-0">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.18em] uppercase"
        >
          Execution
        </Link>
        <nav className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              href={href}
              key={href}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-10 hidden text-xs leading-5 text-white/40 lg:block">
          Dados filtrados no servidor por RLS e pelo motor de permissões.
        </p>
        <form action={logoutAction} className="mt-8">
          <button className="text-xs text-white/50 hover:text-white">
            Terminar sessão
          </button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-7xl p-6 sm:p-10 lg:p-14">
        {children}
      </main>
    </div>
  );
}
