import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnvironment } from "@/platform/env/public";
import type { Database } from "@/platform/supabase/database.types";

export async function createSupabaseServerClient() {
  const environment = getPublicEnvironment();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies. Session-refresh entry points
            // must call this adapter from a writable request context.
          }
        },
      },
    },
  );
}

/**
 * Who is signed in, from the JWT already validated by the proxy — no round
 * trip to the Auth server. Use this on every request path; keep `getUser()`
 * for the few places that must re-check the session against the server.
 */
export async function currentAuthUser(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ readonly id: string; readonly email: string } | null> {
  const { data } = await client.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.sub !== "string") return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
  };
}
