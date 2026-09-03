import "server-only";

import { createSupabaseServerClient } from "@/platform/supabase/server";

import { ExecutionService } from "./service";
import { SupabaseExecutionRepository } from "../infrastructure/supabase-execution-repository";

export async function createExecutionService() {
  const client = await createSupabaseServerClient();
  return new ExecutionService(new SupabaseExecutionRepository(client));
}
