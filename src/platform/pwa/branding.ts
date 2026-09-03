/**
 * Installable-app identity. Everything here is configurable through public
 * environment variables so a name or colour change never touches code.
 */
export interface Branding {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly themeColor: string;
  readonly backgroundColor: string;
}

export function getBranding(
  env: Record<string, string | undefined> = process.env,
): Branding {
  const name = env.NEXT_PUBLIC_APP_NAME?.trim() || "Execution";
  return {
    name,
    shortName: env.NEXT_PUBLIC_APP_SHORT_NAME?.trim() || name.slice(0, 12),
    description:
      env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
      "Reuniões, tarefas, PDCAs e decisões num só sítio.",
    themeColor: env.NEXT_PUBLIC_APP_THEME_COLOR?.trim() || "#151714",
    backgroundColor: env.NEXT_PUBLIC_APP_BACKGROUND_COLOR?.trim() || "#f7f6f2",
  };
}

export function buildManifest(branding: Branding) {
  return {
    name: branding.name,
    short_name: branding.shortName,
    description: branding.description,
    lang: "pt-PT",
    dir: "ltr" as const,
    id: "/",
    start_url: "/my-work",
    scope: "/",
    display: "standalone" as const,
    orientation: "any" as const,
    theme_color: branding.themeColor,
    background_color: branding.backgroundColor,
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable" as const,
      },
    ],
  };
}
