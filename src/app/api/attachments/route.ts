import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/platform/env/server";
import { createSupabaseAdminClient } from "@/platform/supabase/admin";
import { createSupabaseServerClient } from "@/platform/supabase/server";

const bucket = "execution-attachments";

function safeReturnPath(value: FormDataEntryValue | null) {
  return typeof value === "string" &&
    /^\/(decisions|tasks|pdcas|meetings)\/[0-9a-f-]+$/.test(value)
    ? value
    : "/my-work";
}

export async function POST(request: Request) {
  const client = await createSupabaseServerClient();
  const { data: auth } = await client.auth.getUser();
  if (auth.user === null)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );

  const formData = await request.formData();
  const file = formData.get("file");
  const securityObjectId = formData.get("securityObjectId");
  const returnPath = safeReturnPath(formData.get("returnPath"));
  if (!(file instanceof File) || typeof securityObjectId !== "string")
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const environment = getServerEnvironment();
  const allowedTypes = new Set(
    environment.ATTACHMENT_ALLOWED_MIME_TYPES.split(",").map((value) =>
      value.trim(),
    ),
  );
  if (file.size <= 0 || file.size > environment.ATTACHMENT_MAX_BYTES)
    return NextResponse.json(
      { error: "File size is not allowed" },
      { status: 413 },
    );
  if (!allowedTypes.has(file.type))
    return NextResponse.json(
      { error: "File type is not allowed" },
      { status: 415 },
    );

  const { data: allowed } = await client.rpc("authorize_security_object", {
    target_object_id: securityObjectId,
    requested_permission: "attachment.upload",
  });
  if (allowed !== true)
    return NextResponse.json({ error: "Object not found" }, { status: 404 });

  const [{ data: objectRow }, { count }] = await Promise.all([
    client
      .from("security_objects")
      .select("company_id")
      .eq("id", securityObjectId)
      .single(),
    client
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("security_object_id", securityObjectId)
      .is("deleted_at", null),
  ]);
  if (objectRow === null)
    return NextResponse.json({ error: "Object not found" }, { status: 404 });
  if ((count ?? 0) >= environment.ATTACHMENT_MAX_PER_OBJECT)
    return NextResponse.json(
      { error: "Attachment limit reached" },
      { status: 409 },
    );

  const extension = file.name.includes(".")
    ? `.${file.name
        .split(".")
        .pop()!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}`
    : "";
  const storagePath = `${objectRow.company_id}/${securityObjectId}/${randomUUID()}${extension}`;
  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError !== null)
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });

  const { error: metadataError } = await client.rpc("register_attachment", {
    security_object_id: securityObjectId,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    storage_path: storagePath,
  });
  if (metadataError !== null) {
    await admin.storage.from(bucket).remove([storagePath]);
    return NextResponse.json(
      { error: "Upload could not be registered" },
      { status: 409 },
    );
  }

  // Keep the redirect relative so reverse proxies and local E2E hosts cannot
  // accidentally change the browser origin (and therefore lose auth cookies).
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `${returnPath}?upload=success` },
  });
}
