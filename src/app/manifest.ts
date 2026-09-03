import type { MetadataRoute } from "next";

import { buildManifest, getBranding } from "@/platform/pwa/branding";

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest(getBranding());
}
