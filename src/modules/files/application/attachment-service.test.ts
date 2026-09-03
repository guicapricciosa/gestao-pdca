import { describe, expect, it, vi } from "vitest";

import { AttachmentService } from "./attachment-service";

describe("AttachmentService", () => {
  it("uses a short-lived signed URL through the authorized adapter", async () => {
    const createDownloadUrl = vi.fn(async () => "signed-url");
    const service = new AttachmentService({ createDownloadUrl });
    await expect(
      service.download("10000000-0000-4000-8000-000000000001"),
    ).resolves.toBe("signed-url");
    expect(createDownloadUrl).toHaveBeenCalledWith(expect.any(String), 60);
  });

  it("rejects untrusted attachment identifiers", async () => {
    const service = new AttachmentService({ createDownloadUrl: vi.fn() });
    await expect(service.download("not-an-id")).rejects.toThrow();
  });
});
