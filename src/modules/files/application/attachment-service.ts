import { z } from "zod";

const attachmentIdSchema = z.uuid();

export interface AttachmentAccess {
  createDownloadUrl(
    attachmentId: string,
    expiresInSeconds: number,
  ): Promise<string>;
}

export class AttachmentService {
  constructor(private readonly access: AttachmentAccess) {}

  async download(attachmentId: unknown) {
    return await this.access.createDownloadUrl(
      attachmentIdSchema.parse(attachmentId),
      60,
    );
  }
}
