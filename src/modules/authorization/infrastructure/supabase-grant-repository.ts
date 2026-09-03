import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ProfileId, SecurityObjectId } from "@/shared/types/branded";
import type { Database } from "@/platform/supabase/database.types";

import type {
  CreateExplicitGrantCommand,
  ExplicitGrantRepository,
  PersistedExplicitGrant,
} from "../application/grant-service";
import type { PermissionKey } from "../domain/types";

const permissionRow = z.object({ id: z.string() });
const grantRow = z.object({
  id: z.string(),
  security_object_id: z.string(),
  grantee_profile_id: z.string(),
  permissions: z.object({ permission_key: z.string() }),
});

export class SupabaseExplicitGrantRepository implements ExplicitGrantRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(
    command: CreateExplicitGrantCommand,
  ): Promise<PersistedExplicitGrant> {
    const permissionResponse = await this.client
      .from("permissions")
      .select("id")
      .eq("permission_key", command.permissionKey)
      .eq("is_active", true)
      .single();
    if (permissionResponse.error !== null)
      throw new Error(permissionResponse.error.message);
    const permission = permissionRow.parse(permissionResponse.data);

    const response = await this.client
      .from("explicit_access_grants")
      .insert({
        security_object_id: command.object.id,
        grantee_profile_id: command.granteeProfileId,
        permission_id: permission.id,
        granted_by_profile_id: command.actorProfileId,
        reason: command.reason,
        valid_to: command.validTo?.toISOString() ?? null,
      })
      .select(
        "id, security_object_id, grantee_profile_id, permissions!inner(permission_key)",
      )
      .single();
    if (response.error !== null) throw new Error(response.error.message);
    const grant = grantRow.parse(response.data);
    return {
      id: grant.id,
      objectId: grant.security_object_id as SecurityObjectId,
      granteeProfileId: grant.grantee_profile_id as ProfileId,
      permissionKey: grant.permissions.permission_key as PermissionKey,
    };
  }
}
