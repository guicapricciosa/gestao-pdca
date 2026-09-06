import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { screenshotsDir } from "@/modules/manual/chapters";

/** Screenshots of the manual, served from docs/screenshots (behind login). */
export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.png$/.test(file))
    return new NextResponse(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(screenshotsDir, file));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
