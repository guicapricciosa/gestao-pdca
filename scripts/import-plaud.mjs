// Imports one Plaud recording (already turned into the import JSON) straight
// into the database, as the app's Definições › Importar Plaud would, but
// without anyone pasting anything. Used by the assistant after reading the
// recording through the Plaud connector. Same rules: PRIVATE PDCAs of the
// importer, subtasks linked, recording key blocks re-imports.
//
//   node scripts/import-plaud.mjs <payload.json> --restaurant <uuid> [--unit <uuid>] [--linked]
//   Requires SUPABASE_URL / SERVICE_ROLE_KEY (production) or defaults to local.
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!file || !flag("restaurant")) {
  console.error(
    "usage: node scripts/import-plaud.mjs <payload.json> --restaurant <uuid> [--unit <uuid>]",
  );
  process.exit(2);
}
const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SERVICE_ROLE_KEY;
if (!key) throw new Error("SERVICE_ROLE_KEY is required");
const importerEmail = process.env.IMPORTER_EMAIL ?? "gui.rainho@grupocpa.pt";
const company =
  process.env.COMPANY_ID ?? "10000000-0000-0000-0000-000000000001";

const { parsePlaudPayload, planImport } =
  await import("../src/modules/plaud/domain/schema.ts");
const items = planImport(parsePlaudPayload(readFileSync(file, "utf8")));

// Act as the importer: every write goes through the domain commands under
// their own permissions (service key only to open the door).
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const user = users.users.find((u) => u.email?.toLowerCase() === importerEmail);
if (!user) throw new Error(`no auth user for ${importerEmail}`);
const { data: profile } = await admin
  .from("profiles")
  .select("id")
  .eq("auth_user_id", user.id)
  .single();
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: importerEmail,
});
const { data: session, error: sessionError } = await admin.auth.verifyOtp({
  type: "magiclink",
  token_hash: link.properties.hashed_token,
});
if (sessionError || !session.session)
  throw new Error(
    `could not act as ${importerEmail}: ${sessionError?.message}`,
  );
const me = createClient(url, process.env.ANON_KEY ?? key, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    headers: { Authorization: `Bearer ${session.session.access_token}` },
  },
});

const { data: existing } = await me
  .from("pdcas")
  .select("problem_statement")
  .ilike("problem_statement", "%plaud:%");
const known = new Set(
  (existing ?? []).flatMap((r) =>
    [...(r.problem_statement ?? "").matchAll(/plaud:[^\s]+/g)].map((m) => m[0]),
  ),
);

const rpc = async (name, params) => {
  const { data, error } = await me.rpc(name, params);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
};
// Without an explicit area, the importer's own department keeps the objects
// inside their scope (support directors only cover their department).
let unitId = flag("unit");
if (!unitId) {
  const { data: assignment } = await me
    .from("organizational_assignments")
    .select("organizational_unit_id")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .not("organizational_unit_id", "is", null)
    .limit(1)
    .maybeSingle();
  unitId = assignment?.organizational_unit_id ?? undefined;
}
const scope = {
  visibility: "PRIVATE",
  unit_ids: unitId ? [unitId] : [],
  restaurant_ids: [flag("restaurant")],
};
let created = 0,
  skipped = 0;
for (const item of items) {
  if (known.has(item.key)) {
    skipped += 1;
    continue;
  }
  const pdcaId = await rpc("create_pdca", {
    company_id: company,
    title: item.title,
    problem_statement: item.problem,
    objective: item.objective,
    priority: item.priority,
    owner_profile_id: profile.id,
    responsible_profile_id: profile.id,
    start_date: item.startDate,
    due_date: item.dueDate,
    ...scope,
  });
  for (const title of item.tasks)
    await rpc("create_task", {
      company_id: company,
      title,
      description: `${item.sourceText}\nPDCA: ${item.title}`,
      priority: item.priority,
      owner_profile_id: profile.id,
      responsible_profile_id: profile.id,
      start_date: item.startDate,
      due_date: item.dueDate,
      pdca_id: pdcaId,
      ...scope,
    });
  let version = 1;
  if (item.phase !== "PLAN") {
    const moved = await rpc("change_pdca_phase", {
      pdca_id: pdcaId,
      expected_version: version,
      new_phase: item.phase,
      reason: "Fase registada na gravação",
    });
    version = moved.version;
  }
  if (item.done) {
    const withResult = await rpc("update_pdca", {
      pdca_id: pdcaId,
      expected_version: version,
      title: item.title,
      problem_statement: item.problem,
      objective: item.objective,
      root_cause_or_hypothesis: null,
      expected_result: null,
      actual_result: item.closureNote,
      check_notes: null,
      corrective_action: null,
      outcome_notes: null,
      priority: item.priority,
      impact: "MEDIUM",
      risk: "MEDIUM",
      owner_profile_id: profile.id,
      responsible_profile_id: profile.id,
      start_date: item.startDate,
    });
    version = withResult.version;
    for (const status of ["OPEN", "IN_PROGRESS", "COMPLETED"]) {
      const step = await rpc("transition_pdca", {
        pdca_id: pdcaId,
        expected_version: version,
        new_status: status,
        ...(status === "COMPLETED" ? { closure_notes: item.closureNote } : {}),
      });
      version = step.version;
    }
  }
  created += 1;
  console.log(`+ ${item.title} (${item.tasks.length} subtarefas)`);
}
console.log(`criados=${created} ignorados=${skipped}`);
