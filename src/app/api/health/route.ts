import { NextResponse } from "next/server";

import { buildHealthReport, probeSupabase } from "@/modules/platform-health";

export const dynamic = "force-dynamic";

/** Public, unauthenticated, data-free. 200 when the app answers; `status` says whether Supabase is reachable. */
export async function GET() {
  const supabase = await probeSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const report = buildHealthReport(supabase);
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
