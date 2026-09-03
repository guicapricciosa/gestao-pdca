import { describe, expect, it } from "vitest";

import { buildHealthReport, probeSupabase } from "./platform-health";

describe("health probe", () => {
  it("reports ok when Supabase's health endpoint answers", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    expect(
      await probeSupabase("https://x.supabase.co/", "anon", fetchImpl),
    ).toBe("ok");
    expect(calls[0]).toBe("https://x.supabase.co/auth/v1/health");
  });
  it("is unavailable without configuration, on errors and on non-2xx", async () => {
    expect(await probeSupabase(undefined, undefined)).toBe("unavailable");
    const failing = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    expect(await probeSupabase("https://x", "k", failing)).toBe("unavailable");
    const bad = (async () => new Response("", { status: 503 })) as typeof fetch;
    expect(await probeSupabase("https://x", "k", bad)).toBe("unavailable");
  });
  it("never includes secrets or URLs in the report", () => {
    const report = buildHealthReport("unavailable");
    expect(report.status).toBe("degraded");
    expect(JSON.stringify(report)).not.toMatch(/supabase\.co|key|http/);
  });
});
