/**
 * Minimal liveness/readiness probe. It never reports secrets, URLs or data:
 * only whether the app answers and whether Supabase's public health endpoint
 * is reachable from the server within a short timeout.
 */
export interface HealthReport {
  readonly status: "ok" | "degraded";
  readonly checks: {
    readonly app: "ok";
    readonly supabase: "ok" | "unavailable";
  };
  readonly time: string;
}

export async function probeSupabase(
  url: string | undefined,
  anonKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<"ok" | "unavailable"> {
  if (!url || !anonKey) return "unavailable";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${url.replace(/\/$/, "")}/auth/v1/health`,
      {
        headers: { apikey: anonKey },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    return response.ok ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

export function buildHealthReport(
  supabase: "ok" | "unavailable",
): HealthReport {
  return {
    status: supabase === "ok" ? "ok" : "degraded",
    checks: { app: "ok", supabase },
    time: new Date().toISOString(),
  };
}
