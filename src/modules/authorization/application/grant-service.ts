import type { ProfileId, SecurityObjectId } from "@/shared/types/branded";

import type { PermissionKey, SecurableObject } from "../domain/types";
import type { PermissionEngine } from "./engine";

export interface CreateExplicitGrantCommand {
  readonly actorProfileId: ProfileId;
  readonly granteeProfileId: ProfileId;
  readonly object: SecurableObject;
  readonly permissionKey: PermissionKey;
  readonly reason: string;
  readonly validTo: Date | null;
}

export interface PersistedExplicitGrant {
  readonly id: string;
  readonly objectId: SecurityObjectId;
  readonly granteeProfileId: ProfileId;
  readonly permissionKey: PermissionKey;
}

export interface ExplicitGrantRepository {
  create(command: CreateExplicitGrantCommand): Promise<PersistedExplicitGrant>;
}

export class ExplicitGrantService {
  constructor(
    private readonly permissionEngine: PermissionEngine,
    private readonly repository: ExplicitGrantRepository,
  ) {}

  async create(command: CreateExplicitGrantCommand) {
    if (command.reason.trim().length < 3)
      throw new Error("A grant reason is required.");
    const canGrant = await this.permissionEngine.canIssueGrant(
      command.actorProfileId,
      command.permissionKey,
      command.object,
    );
    if (!canGrant)
      throw new Error(
        "The actor cannot issue this grant over the complete object scope.",
      );
    return this.repository.create({
      ...command,
      reason: command.reason.trim(),
    });
  }
}
