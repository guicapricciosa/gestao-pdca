import { NextResponse } from "next/server";

import { AttachmentService } from "@/modules/files/application/attachment-service";
import { SupabaseAttachmentAccess } from "@/modules/files/infrastructure/supabase-attachment-access";
import { createSupabaseServerClient } from "@/platform/supabase/server";

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const service = new AttachmentService(
      new SupabaseAttachmentAccess(await createSupabaseServerClient()),
    );
    return NextResponse.redirect(await service.download(id));
  } catch {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }
}
