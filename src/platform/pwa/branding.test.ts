import { describe, expect, it } from "vitest";

import { buildManifest, getBranding } from "./branding";

describe("branding", () => {
  it("defaults to a neutral identity", () => {
    const branding = getBranding({});
    expect(branding.name).toBe("Execution");
    expect(branding.shortName).toBe("Execution");
    expect(branding.themeColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("is fully configurable from the environment", () => {
    const branding = getBranding({
      NEXT_PUBLIC_APP_NAME: "GCPAi Execution",
      NEXT_PUBLIC_APP_SHORT_NAME: "GCPAi",
      NEXT_PUBLIC_APP_THEME_COLOR: "#123456",
    });
    expect(branding.shortName).toBe("GCPAi");
    expect(buildManifest(branding)).toMatchObject({
      name: "GCPAi Execution",
      short_name: "GCPAi",
      display: "standalone",
      start_url: "/my-work",
      theme_color: "#123456",
      lang: "pt-PT",
    });
  });
  it("declares regular and maskable icons", () => {
    const icons = buildManifest(getBranding({})).icons;
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    expect(icons.every((icon) => icon.src.startsWith("/icons/"))).toBe(true);
  });
});
