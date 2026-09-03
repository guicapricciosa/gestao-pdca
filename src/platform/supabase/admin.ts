import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/platform/env/public";
import { getServerEnvironment } from "@/platform/env/server";
import type { Database } from "@/platform/supabase/database.types";

export function createSupabaseAdminClient() {
  const publicEnvironment = getPublicEnvironment();
  const serverEnvironment = getServerEnvironment();

  return createClient<Database>(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    serverEnvironment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
