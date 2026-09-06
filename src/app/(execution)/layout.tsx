import {
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  Scale,
  Search,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/login/actions";
import {
  createSupabaseServerClient,
  currentAuthUser,
} from "@/platform/supabase/server";
import { AccountMenu } from "@/ui/components/account-menu";
import { BottomNav } from "@/ui/components/bottom-nav";
import { NavLink } from "@/ui/components/nav-link";
import { NotificationBell } from "@/ui/components/notification-bell";
import { Notice } from "@/ui/components/notice";
import { SubmitButton } from "@/ui/components/submit-button";

// Everything inside the shell depends on the session: never prerender it.
export const dynamic = "force-dynamic";

const groups = [
  {
    label: "Trabalho",
    items: [
      { href: "/my-work", label: "O meu trabalho", icon: Gauge },
      { href: "/painel", label: "Dashboard geral", icon: LayoutDashboard },
    ],
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
  const user = await currentAuthUser(client);
  if (user === null) return null;
  // Profile and badge in parallel: one network round trip, not two.
  const [{ data: profile }, { data: unread }] = await Promise.all([
    client
      .from("profiles")
      .select(
        "id,display_name,last_seen_at,assignments:organizational_assignments!organizational_assignments_profile_id_fkey(title,unit_scope_mode,restaurant_scope_mode,valid_to,unit:organizational_units!organizational_assignments_organizational_unit_id_fkey(name),restaurants:restaurant_assignments!restaurant_assignments_organizational_assignment_id_fkey(valid_to,restaurant:restaurants!restaurant_assignments_restaurant_id_fkey(name)))",
      )
      .eq("auth_user_id", user.id)
      .single(),
    client.rpc("unread_notification_count"),
  ]);
  const lastSeen = profile?.last_seen_at ? Date.parse(profile.last_seen_at) : 0;
  if (Date.now() - lastSeen > 60 * 60 * 1000)
    await client.rpc("touch_profile_last_seen");
  return { email: user.email, profile, unread: unread ?? 0 };
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

  const viewerName = viewer.profile?.display_name ?? viewer.email;
  const functions = assignments.map(
    (assignment) =>
      `${assignment.title ?? "Função"}${assignment.unit ? ` · ${assignment.unit.name}` : ""}`,
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Phone: one slim bar on top, navigation at the bottom. */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-[#151714] px-4 py-2.5 text-white lg:hidden"
        data-testid="mobile-top-bar"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
      >
        <Link
          href="/my-work"
          className="text-sm font-semibold tracking-[0.18em] uppercase"
        >
          Execution
        </Link>
        <div className="flex items-center gap-2">
          <Link
            aria-label="Pesquisar"
            className="grid size-9 place-items-center rounded-full text-white/85 hover:bg-white/10"
            data-testid="search-link-mobile"
            href="/pesquisa"
          >
            <Search aria-hidden className="size-5" />
          </Link>
          <NotificationBell
            profileId={viewer.profile?.id ?? null}
            initialCount={viewer.unread}
            variant="compact"
            testId="notification-bell-mobile"
          />
          <AccountMenu
            name={viewerName}
            functions={functions}
            restaurants={restaurants}
            logout={logoutAction}
          />
        </div>
      </header>
      <aside className="hidden flex-col border-b bg-[#151714] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:border-r lg:border-b-0">
        <div className="px-6 pt-6">
          <Link
            href="/my-work"
            className="text-sm font-semibold tracking-[0.18em] uppercase"
          >
            Execution
          </Link>
          <p className="mt-1 text-xs text-white/40">Grupo Capricciosa</p>
          <form action="/pesquisa" className="mt-4" role="search">
            <label className="relative block">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-white/45"
              />
              <input
                aria-label="Pesquisar"
                className="w-full rounded-lg border border-white/15 bg-white/8 py-2 pr-3 pl-9 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                data-testid="search-box"
                minLength={2}
                name="q"
                placeholder="Pesquisar…"
                type="search"
              />
            </label>
          </form>
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-4 py-3 lg:block lg:px-6 lg:py-5">
          <p className="truncate text-sm font-medium" data-testid="viewer-name">
            {viewerName}
          </p>
          <ul className="mt-2 hidden space-y-1 text-xs text-white/55 lg:block">
            {assignments.length === 0 && <li>Sem função activa</li>}
            {assignments.map((assignment, index) => (
              <li className="truncate" key={index}>
                {assignment.title ?? "Função"}
                {assignment.unit ? ` · ${assignment.unit.name}` : ""}
              </li>
            ))}
          </ul>
          {restaurants.length > 0 && (
            <p className="mt-2 hidden truncate text-xs text-white/40 lg:block">
              Cobre {restaurants.join(", ")}
            </p>
          )}
          <div className="lg:mb-3">
            <NotificationBell
              profileId={viewer.profile?.id ?? null}
              initialCount={viewer.unread}
            />
          </div>
          <Link
            className="text-xs text-white/70 hover:text-white lg:mb-2 lg:block"
            href="/definicoes"
          >
            Definições
          </Link>
          <form action={logoutAction} className="lg:mt-4">
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
      <main className="mx-auto w-full max-w-7xl p-5 pb-28 sm:p-8 sm:pb-28 lg:p-12">
        <Notice />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
