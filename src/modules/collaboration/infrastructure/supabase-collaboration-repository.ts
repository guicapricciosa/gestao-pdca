import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/platform/supabase/database.types";

import type { CollaborationRepository } from "../application/service";

export class SupabaseCollaborationRepository implements CollaborationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async addComment(
    command: Parameters<CollaborationRepository["addComment"]>[0],
  ) {
    const { data, error } = await this.client.rpc("add_comment", {
      security_object_id: command.securityObjectId,
      body: command.body,
    });
    if (error !== null) throw new Error(error.message);
    if (data === null)
      throw new Error("Comment creation returned no identifier");
    return data;
  }

  async addMember(
    command: Parameters<CollaborationRepository["addMember"]>[0],
  ) {
    const { data, error } = await this.client.rpc("add_object_member", {
      security_object_id: command.securityObjectId,
      profile_id: command.profileId,
      membership_role: command.role,
    });
    if (error !== null) throw new Error(error.message);
    if (data === null)
      throw new Error("Membership creation returned no identifier");
    return data;
  }
}
