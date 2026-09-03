import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/platform/supabase/database.types";

import type { AttachmentAccess } from "../application/attachment-service";

export class SupabaseAttachmentAccess implements AttachmentAccess {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createDownloadUrl(attachmentId: string, expiresInSeconds: number) {
    const { data: attachment, error } = await this.client
      .from("attachments")
      .select("security_object_id,storage_bucket,storage_path")
      .eq("id", attachmentId)
      .single();
    if (error !== null || attachment === null)
      throw new Error("Attachment not found");

    const { data: allowed, error: authorizationError } = await this.client.rpc(
      "authorize_security_object",
      {
        target_object_id: attachment.security_object_id,
        requested_permission: "attachment.read",
      },
    );
    if (authorizationError !== null || allowed !== true)
      throw new Error("Attachment not found");

    const { data, error: signingError } = await this.client.storage
      .from(attachment.storage_bucket)
      .createSignedUrl(attachment.storage_path, expiresInSeconds);
    if (signingError !== null) throw new Error(signingError.message);
    return data.signedUrl;
  }
}
