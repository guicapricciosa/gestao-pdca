import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/platform/supabase/server";

export const dynamic = "force-dynamic";

/** The root is a router: signed-in people land on My Work, everyone else on login. */
export default async function HomePage() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  redirect(user === null ? "/login" : "/my-work");
}
