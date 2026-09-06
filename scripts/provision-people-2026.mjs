// One-off provisioning of the first people in production (2026-09-05).
// Source of truth for who is who: CONTEXT.md §5–9 and the previous PDCA app
// (org tree of 2026-09-02). Creates the Auth users WITHOUT sending e-mail
// (invite links are written to a private file for hand delivery, because the
// default Supabase sender is rate-limited) and prints the SQL that creates the
// profiles, assignments and the DOL hierarchy through `invite_person`.
//
//   SUPABASE_URL=… SERVICE_ROLE_KEY=… APP_ORIGIN=https://pdca.gcpai.pt \
//     node scripts/provision-people-2026.mjs > /tmp/people.sql
import { createClient } from "@supabase/supabase-js";
import { appendFileSync, writeFileSync } from "node:fs";

const company = "10000000-0000-0000-0000-000000000001";
const roles = {
  GLOBAL_EXECUTIVE: "60000000-0000-0000-0000-000000000001",
  SUPPORT_DIRECTOR: "60000000-0000-0000-0000-000000000002",
  DOL_DIRECTOR: "60000000-0000-0000-0000-000000000003",
  DOL_SUBDIRECTOR: "60000000-0000-0000-0000-000000000004",
  OPS_SUPERVISOR: "60000000-0000-0000-0000-000000000005",
  SHARED_SERVICE: "60000000-0000-0000-0000-000000000009",
};
const units = {
  EXECUTIVE: "30000000-0000-0000-0000-000000000001",
  EXPANSION: "30000000-0000-0000-0000-000000000002",
  DOL: "30000000-0000-0000-0000-000000000007",
  MARKETING: "30000000-0000-0000-0000-000000000004",
  HAPPY_PEOPLE: "30000000-0000-0000-0000-000000000005",
  CONTROL_PURCHASING: "30000000-0000-0000-0000-000000000012",
  HACCP: "30000000-0000-0000-0000-000000000011",
  MAINTENANCE: "30000000-0000-0000-0000-000000000013",
  DAF: "30000000-0000-0000-0000-000000000014",
};
const r = (n) =>
  `40000000-0000-0000-0000-0000000001${String(n).padStart(2, "0")}`;
// 01 Carcavelos 02 Expo 03 Cascais 04 Cais 05 Docas 06 Doca de Santo 07 Lat.a
// 08 Sophia Pizoteca 09 Sophia Natural 10 Irish 11 Jangal Allo 12 Jangal Cascais
// 13 Selva CO 14 Selva MZ 15 Selva Lx
export const people = [
  {
    name: "André Março",
    email: "andre.marco@grupocpa.pt",
    role: "GLOBAL_EXECUTIVE",
    unit: "EXPANSION",
    title: "Expansion and Management Support",
    unitScope: "COMPANY_WIDE",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "Mafalda Zuzarte",
    email: "mafalda.zuzarte@grupocpa.pt",
    role: "SUPPORT_DIRECTOR",
    unit: "MARKETING",
    title: "Marketing Director",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "Sara Barradas",
    email: "sara.barradas@grupocpa.pt",
    role: "SUPPORT_DIRECTOR",
    unit: "HAPPY_PEOPLE",
    title: "Happy People Director",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "Ana Serrano",
    email: "ana.serrano@joseavillez.pt",
    role: "SHARED_SERVICE",
    unit: "CONTROL_PURCHASING",
    title: "Management Control & Purchasing",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "João Novo",
    email: "joao.novo@grupocpa.pt",
    role: "DOL_DIRECTOR",
    unit: "DOL",
    title: "DOL Director",
    unitScope: "COMPANY_WIDE",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "Tiago Carvalho",
    email: "tiago.carvalho@grupocpa.pt",
    role: "DOL_SUBDIRECTOR",
    unit: "DOL",
    title: "DOL Subdirector",
    unitScope: "COMPANY_WIDE",
    restScope: "INHERITED",
    restaurants: [],
    reports: ["Tiago Jonas", "João Sobrinho", "Ricardo Ferreira"],
  },
  {
    name: "Tiago Jonas",
    email: "tiago.jonas@grupocpa.pt",
    role: "OPS_SUPERVISOR",
    unit: "DOL",
    title: "Operations Supervisor",
    unitScope: "COMPANY_WIDE",
    restScope: "ASSIGNED",
    restaurants: [r(4), r(2), r(10)],
  },
  {
    name: "João Sobrinho",
    email: "joao.sobrinho@grupocpa.pt",
    role: "OPS_SUPERVISOR",
    unit: "DOL",
    title: "Operations Supervisor",
    unitScope: "COMPANY_WIDE",
    restScope: "ASSIGNED",
    restaurants: [r(1), r(3)],
  },
  {
    name: "Ricardo Ferreira",
    email: "ricardo.ferreira@grupocpa.pt",
    role: "OPS_SUPERVISOR",
    unit: "DOL",
    title: "Operations Supervisor",
    unitScope: "COMPANY_WIDE",
    restScope: "ASSIGNED",
    restaurants: [r(5), r(9), r(8)],
  },
  {
    name: "Mariana Seabra",
    email: "mariana.seabra@grupocpa.pt",
    role: "DOL_SUBDIRECTOR",
    unit: "DOL",
    title: "DOL Subdirector",
    unitScope: "COMPANY_WIDE",
    restScope: "ASSIGNED",
    restaurants: [r(6), r(7)],
  },
  {
    name: "Mónica Gomes",
    email: "monica.gomes@grupocpa.pt",
    role: "DOL_SUBDIRECTOR",
    unit: "DOL",
    title: "DOL Subdirector",
    unitScope: "COMPANY_WIDE",
    restScope: "ASSIGNED",
    restaurants: [r(11), r(15), r(14)],
  },
  // Shared services of the holding (added 2026-09-06, no e-mail sent).
  {
    name: "Ricardo Torrão",
    email: "ricardo.torrao@cb2020.pt",
    role: "SHARED_SERVICE",
    unit: "HACCP",
    title: "HACCP",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "André Stoffel",
    email: "andre.stoffel@cb2020.pt",
    role: "SHARED_SERVICE",
    unit: "MAINTENANCE",
    title: "Manutenção",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
  {
    name: "Bruno Henriques",
    email: "bruno.henriques@cb2020.pt",
    role: "SHARED_SERVICE",
    unit: "DAF",
    title: "DAF",
    unitScope: "ASSIGNED",
    restScope: "COMPANY_WIDE",
    restaurants: [],
  },
];

const q = (v) =>
  v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY;
const origin = process.env.APP_ORIGIN ?? "https://pdca.gcpai.pt";
const linksFile =
  process.env.LINKS_FILE ?? `${process.env.HOME}/Desktop/pdca-convites.txt`;
if (!url || !key)
  throw new Error("SUPABASE_URL and SERVICE_ROLE_KEY are required");
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/definir-palavra-passe")}`;
writeFileSync(
  linksFile,
  `Convites pdca.gcpai.pt — gerados ${new Date().toISOString()}\nCada link define a palavra-passe dessa pessoa: entrega-o só a ela.\n\n`,
  { mode: 0o600 },
);

const out = [
  "do $p$",
  "declare v uuid; begin",
  'perform set_config(\'request.jwt.claims\', \'{"sub":"9146104e-89a5-407b-8fb2-7842b2c7e8e4","role":"authenticated"}\', true);',
  "execute 'set local role authenticated';",
];
const ids = {};
for (const person of people) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: person.email,
    options: { redirectTo, data: { display_name: person.name } },
  });
  if (error) {
    // Already exists: keep going with the existing user, no new link.
    const list = await admin.auth.admin.listUsers({ perPage: 200 });
    const existing = list.data.users.find(
      (u) => u.email?.toLowerCase() === person.email,
    );
    if (!existing) throw new Error(`${person.email}: ${error.message}`);
    ids[person.name] = existing.id;
    appendFileSync(
      linksFile,
      `${person.name} <${person.email}>: conta já existia; usar «Esqueci-me da palavra-passe»\n`,
    );
  } else {
    ids[person.name] = data.user.id;
    appendFileSync(
      linksFile,
      `${person.name} <${person.email}>\n${data.properties.action_link}\n\n`,
    );
  }
  out.push(
    `if not exists (select 1 from public.profiles where auth_user_id = ${q(ids[person.name])}) then ` +
      `v := public.invite_person(${q(ids[person.name])}, ${q(person.name)}, ${q(person.email)}, ${q(company)}, ${q(roles[person.role])}, ${q(units[person.unit])}, ${q(person.title)}, ${q(person.unitScope)}, ${q(person.restScope)}, ` +
      `${person.restaurants.length === 0 ? "'{}'::uuid[]" : `array[${person.restaurants.map(q).join(",")}]::uuid[]`}); raise notice '% %', ${q(person.name)}, v; end if;`,
  );
}
// DOL hierarchy: subdirector ← supervisors (restaurants inherited upwards).
for (const person of people.filter((p) => p.reports))
  for (const child of person.reports)
    out.push(
      `insert into public.hierarchy_relationships (parent_assignment_id, child_assignment_id, relationship_type, created_by_profile_id) ` +
        `select parent.id, child.id, 'REPORTS_TO', private.current_profile_id() from public.organizational_assignments parent ` +
        `join public.profiles pp on pp.id = parent.profile_id and pp.display_name = ${q(person.name)}, ` +
        `public.organizational_assignments child join public.profiles cp on cp.id = child.profile_id and cp.display_name = ${q(child)} ` +
        `where parent.is_active and child.is_active and not exists (select 1 from public.hierarchy_relationships h where h.parent_assignment_id = parent.id and h.child_assignment_id = child.id and h.is_active);`,
    );
out.push("end $p$;");
process.stdout.write(out.join("\n") + "\n");
process.stderr.write(`links written to ${linksFile}\n`);
