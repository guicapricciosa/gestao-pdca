import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { SecurityObjectId } from "@/shared/types/branded";
import type { Database } from "@/platform/supabase/database.types";

import type { PermissionKey } from "../domain/types";

const accessibleScopeRow = z.object({
  assignment_id: z.string(),
  company_id: z.string(),
  permission_key: z.string(),
  organizational_unit_id: z.string().nullable(),
  unit_scope: z.enum(["ASSIGNED", "COMPANY_WIDE"]),
  restaurant_scope: z.enum(["NONE", "ASSIGNED", "INHERITED", "COMPANY_WIDE"]),
  restaurant_id: z.string().nullable(),
});

export type AccessibleScopeRow = z.infer<typeof accessibleScopeRow>;

export class SupabaseAuthorizationQueryRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getAccessibleScope(): Promise<AccessibleScopeRow[]> {
    const response = await this.client.rpc("get_accessible_scope");
    if (response.error !== null) throw new Error(response.error.message);
    return z.array(accessibleScopeRow).parse(response.data);
  }

  async filterAccessibleObjectIds(
    permissionKey: PermissionKey,
  ): Promise<SecurityObjectId[]> {
    const response = await this.client.rpc(
      "filter_accessible_security_objects",
      {
        requested_permission: permissionKey,
      },
    );
    if (response.error !== null) throw new Error(response.error.message);
    return z
      .array(z.string())
      .parse(response.data)
      .map((id) => id as SecurityObjectId);
  }

  async can(
    objectId: SecurityObjectId,
    permissionKey: PermissionKey,
  ): Promise<boolean> {
    const response = await this.client.rpc("authorize_security_object", {
      target_object_id: objectId,
      requested_permission: permissionKey,
    });
    if (response.error !== null) throw new Error(response.error.message);
    return z.boolean().parse(response.data);
  }
}
