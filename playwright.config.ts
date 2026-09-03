import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

const localEnvironment = execFileSync("supabase", ["status", "-o", "env"], {
  encoding: "utf8",
});
for (const line of localEnvironment.split("\n")) {
  const match = /^(\w+)=(.*)$/.exec(line.trim());
  if (match === null) continue;
  const [, key, value] = match;
  if (key !== undefined && value !== undefined)
    process.env[key] = value.replace(/^"|"$/g, "");
}
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.API_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
// End-to-end runs use the deterministic provider so nothing leaves the machine.
process.env.AI_PROVIDER = "fake";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    env: {
      ...process.env,
      AI_PROVIDER: "fake",
      PUSH_PROVIDER: "fake",
      PUSH_LOG_FILE: `${process.cwd()}/test-results/push-log.jsonl`,
      CRON_SECRET: "e2e-secret",
    },
    command:
      'sh -c \'until curl -sf -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/permissions?select=id&limit=1" >/dev/null; do sleep 1; done; npm run dev -- --hostname 127.0.0.1 --port 3100\'',
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
