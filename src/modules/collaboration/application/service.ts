import { z } from "zod";
import { databaseUuidSchema } from "@/shared/validation/database";

const commentSchema = z.object({
  securityObjectId: databaseUuidSchema,
  body: z.string().trim().min(1).max(10_000),
});

const memberSchema = z.object({
  securityObjectId: databaseUuidSchema,
  profileId: databaseUuidSchema,
  role: z.enum(["COLLABORATOR", "WATCHER"]),
});

export interface CollaborationRepository {
  addComment(command: z.infer<typeof commentSchema>): Promise<string>;
  addMember(command: z.infer<typeof memberSchema>): Promise<string>;
}

export class CollaborationService {
  constructor(private readonly repository: CollaborationRepository) {}

  addComment(input: unknown) {
    return this.repository.addComment(commentSchema.parse(input));
  }

  addMember(input: unknown) {
    return this.repository.addMember(memberSchema.parse(input));
  }
}
