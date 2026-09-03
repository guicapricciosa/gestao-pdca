"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/platform/env/public";
import type { Database } from "@/platform/supabase/database.types";

export function createSupabaseBrowserClient() {
  const environment = getPublicEnvironment();
  return createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
