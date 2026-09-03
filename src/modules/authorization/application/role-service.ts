import { z } from "zod";

import type { CompanyId, ProfileId } from "@/shared/types/branded";

import type { PermissionKey } from "../domain/types";

const roleCode = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/);

export interface CreateRoleCommand {
  readonly actorProfileId: ProfileId;
  readonly companyId: CompanyId;
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
}

export interface RoleAdministrationRepository {
  createRole(command: CreateRoleCommand): Promise<{ readonly id: string }>;
  assignPermission(
    roleId: string,
    permissionKey: PermissionKey,
    actorProfileId: ProfileId,
  ): Promise<void>;
}

export class RoleService {
  constructor(private readonly repository: RoleAdministrationRepository) {}

  createRole(command: CreateRoleCommand) {
    return this.repository.createRole({
      ...command,
      code: roleCode.parse(command.code),
      name: z.string().trim().min(2).max(160).parse(command.name),
      description:
        z
          .string()
          .trim()
          .max(500)
          .nullable()
          .optional()
          .parse(command.description) ?? null,
    });
  }

  assignPermission(
    roleId: string,
    permissionKey: PermissionKey,
    actorProfileId: ProfileId,
  ) {
    return this.repository.assignPermission(
      roleId,
      permissionKey,
      actorProfileId,
    );
  }
}
