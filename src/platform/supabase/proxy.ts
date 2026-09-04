import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnvironment } from "@/platform/env/public";
import type { Database } from "@/platform/supabase/database.types";

export async function refreshSupabaseSession(request: NextRequest) {
  const environment = getPublicEnvironment();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Validates and refreshes the token before protected server components run.
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname === "/recuperar-palavra-passe" ||
    pathname.startsWith("/auth/") ||
    pathname === "/offline" ||
    pathname.startsWith("/api/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js";
  if (!data?.claims && !isPublic && pathname !== "/") {
    // Deep links (shared meeting links, notifications) come back here after
    // login. Only same-origin relative paths are ever honoured.
    const target = `${pathname}${search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
