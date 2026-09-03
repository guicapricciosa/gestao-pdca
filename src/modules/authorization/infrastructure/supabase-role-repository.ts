import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ProfileId } from "@/shared/types/branded";
import type { Database } from "@/platform/supabase/database.types";

import type {
  CreateRoleCommand,
  RoleAdministrationRepository,
} from "../application/role-service";
import type { PermissionKey } from "../domain/types";

export class SupabaseRoleAdministrationRepository implements RoleAdministrationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createRole(
    command: CreateRoleCommand,
  ): Promise<{ readonly id: string }> {
    const response = await this.client
      .from("roles")
      .insert({
        company_id: command.companyId,
        code: command.code,
        name: command.name,
        description: command.description ?? null,
      })
      .select("id")
      .single();
    if (response.error !== null) throw new Error(response.error.message);
    return z.object({ id: z.string() }).parse(response.data);
  }

  async assignPermission(
    roleId: string,
    permissionKey: PermissionKey,
    actorProfileId: ProfileId,
  ): Promise<void> {
    const permissionResponse = await this.client
      .from("permissions")
      .select("id")
      .eq("permission_key", permissionKey)
      .eq("is_active", true)
      .single();
    if (permissionResponse.error !== null)
      throw new Error(permissionResponse.error.message);
    const permission = z
      .object({ id: z.string() })
      .parse(permissionResponse.data);
    const response = await this.client.from("role_permissions").insert({
      role_id: roleId,
      permission_id: permission.id,
      created_by_profile_id: actorProfileId,
    });
    if (response.error !== null) throw new Error(response.error.message);
  }
}
