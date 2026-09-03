import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/platform/supabase/server";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(200),
  }),
});

/** Registers this browser's push subscription for the signed-in person. */
export async function POST(request: NextRequest) {
  const parsed = subscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid subscription" },
      { status: 400 },
    );
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("register_push_subscription", {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    ...(request.headers.get("user-agent")
      ? { user_agent: request.headers.get("user-agent") as string }
      : {}),
  });
  if (error)
    return NextResponse.json({ error: "not registered" }, { status: 401 });
  return NextResponse.json({ id: data });
}

/** Revokes the subscription for this endpoint (or by id). */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
    id?: string;
  };
  const client = await createSupabaseServerClient();
  const { data, error } = body.id
    ? await client.rpc("revoke_push_subscription_by_id", {
        subscription_id: body.id,
      })
    : await client.rpc("revoke_push_subscription", {
        endpoint: String(body.endpoint ?? ""),
      });
  if (error)
    return NextResponse.json({ error: "not revoked" }, { status: 401 });
  return NextResponse.json({ revoked: data === true });
}

/** Lists this person's devices. */
export async function GET() {
  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("push_subscriptions")
    .select("id,user_agent,created_at,last_seen_at,revoked_at,endpoint")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return NextResponse.json({
    devices: (data ?? []).map((row) => ({
      id: row.id,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      endpointHash: row.endpoint.slice(-12),
    })),
  });
}
