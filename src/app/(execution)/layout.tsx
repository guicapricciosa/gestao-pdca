import {
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  Gauge,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { NavLink } from "@/ui/components/nav-link";
import { NotificationBell } from "@/ui/components/notification-bell";
import { Notice } from "@/ui/components/notice";
import { SubmitButton } from "@/ui/components/submit-button";

const groups = [
  {
    label: "Trabalho",
    items: [{ href: "/my-work", label: "O meu trabalho", icon: Gauge }],
  },
  {
    label: "Reuniões",
    items: [{ href: "/meetings", label: "Reuniões", icon: CalendarDays }],
  },
  {
    label: "Execução",
    items: [
      { href: "/pdcas", label: "PDCAs", icon: ClipboardCheck },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare2 },
      { href: "/decisions", label: "Decisões", icon: Scale },
    ],
  },
] as const;

async function loadViewer() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user === null) return null;
  const { data: profile } = await client
    .from("profiles")
    .select(
      "id,display_name,assignments:organizational_assignments!organizational_assignments_profile_id_fkey(title,unit_scope_mode,restaurant_scope_mode,valid_to,unit:organizational_units!organizational_assignments_organizational_unit_id_fkey(name),restaurants:restaurant_assignments!restaurant_assignments_organizational_assignment_id_fkey(valid_to,restaurant:restaurants!restaurant_assignments_restaurant_id_fkey(name)))",
    )
    .eq("auth_user_id", user.id)
    .single();
  const { data: unread } = await client.rpc("unread_notification_count");
  return { email: user.email ?? "", profile, unread: unread ?? 0 };
}

export default async function ExecutionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await loadViewer();
  if (viewer === null) redirect("/login");
  const assignments = (viewer.profile?.assignments ?? []).filter(
    (assignment) => assignment.valid_to === null,
  );
  const restaurants = [
    ...new Set(
      assignments.flatMap((assignment) =>
        assignment.restaurant_scope_mode === "COMPANY_WIDE"
          ? ["todos os restaurantes"]
          : assignment.restaurants
              .filter((row) => row.valid_to === null)
              .map((row) => row.restaurant.name),
      ),
    ),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col border-b bg-[#151714] text-white lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="px-6 pt-6">
          <Link
            href="/my-work"
            className="text-sm font-semibold tracking-[0.18em] uppercase"
          >
            Execution
          </Link>
          <p className="mt-1 text-xs text-white/40">Grupo Capricciosa</p>
        </div>
        <nav
          aria-label="Principal"
          className="mt-6 flex gap-4 overflow-x-auto px-4 pb-4 lg:mt-8 lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-visible lg:pb-0"
        >
          {groups.map((group) => (
            <div className="min-w-max lg:min-w-0" key={group.label}>
              <p className="px-3 text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
                {group.label}
              </p>
              <ul className="mt-1.5 flex gap-1 lg:grid">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <NavLink href={href}>
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-6 py-5 lg:block">
          <p className="truncate text-sm font-medium" data-testid="viewer-name">
            {viewer.profile?.display_name ?? viewer.email}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-white/55">
            {assignments.length === 0 && <li>Sem função activa</li>}
            {assignments.map((assignment, index) => (
              <li className="truncate" key={index}>
                {assignment.title ?? "Função"}
                {assignment.unit ? ` · ${assignment.unit.name}` : ""}
              </li>
            ))}
          </ul>
          {restaurants.length > 0 && (
            <p className="mt-2 truncate text-xs text-white/40">
              Cobre {restaurants.join(", ")}
            </p>
          )}
          <div className="mb-3">
            <NotificationBell
              profileId={viewer.profile?.id ?? null}
              initialCount={viewer.unread}
            />
          </div>
          <Link
            className="mb-2 block text-xs text-white/70 hover:text-white"
            href="/definicoes"
          >
            Definições
          </Link>
          <form action={logoutAction} className="mt-4">
            <SubmitButton
              className="!px-0 !py-0 !text-xs !font-normal !text-white/50 hover:!text-white"
              variant="secondary"
              pendingLabel="A sair…"
              style={{ background: "transparent", border: 0 }}
            >
              Terminar sessão
            </SubmitButton>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl p-5 sm:p-8 lg:p-12">
        <Notice />
        {children}
      </main>
    </div>
  );
}
