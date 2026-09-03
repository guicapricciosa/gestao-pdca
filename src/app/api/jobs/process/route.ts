import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/platform/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * External dispatcher entry point (e.g. Vercel Cron) for hosts without
 * pg_cron. Secured by a shared secret; runs the same database functions the
 * in-database schedule runs. Idempotent: safe to call at any time.
 */
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });
  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`)
    return new NextResponse(null, { status: 401 });
  const admin = createSupabaseAdminClient();
  const [outbox, reminders, deadlines] = await Promise.all([
    admin.rpc("process_outbox", { p_limit: 500 }),
    admin.rpc("generate_meeting_reminders", { p_minutes: 30 }),
    admin.rpc("generate_deadline_notifications"),
  ]);
  const summary = Array.isArray(outbox.data) ? outbox.data[0] : null;
  return NextResponse.json({
    outbox: summary ?? null,
    reminders: reminders.data ?? 0,
    deadlines: deadlines.data ?? 0,
    errors: [outbox.error, reminders.error, deadlines.error]
      .filter((error) => error !== null)
      .map((error) => error?.message),
  });
}

export const GET = run;
export const POST = run;
