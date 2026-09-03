// Captures full-page screenshots of the main screens for a demo user.
// Usage: node scripts/screenshots.mjs [--base http://127.0.0.1:3000] [--out docs/screenshots] [--user ceo@example.test]
// Development only: relies on the seeded development credentials.
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((value, index, all) =>
      value.startsWith("--") ? [value.slice(2), all[index + 1]] : null,
    )
    .filter(Boolean),
);
const base = args.base ?? "http://127.0.0.1:3000";
const out = args.out ?? "docs/screenshots";
const user = args.user ?? "ceo@example.test";
const password = "DevelopmentOnly123!";

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

async function shot(name, url, options = {}) {
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  if (options.after) await options.after();
  await page.screenshot({
    path: path.join(out, `${name}.png`),
    fullPage: options.fullPage ?? true,
  });
  console.log(`captured ${name} (${page.url().replace(base, "")})`);
}

async function firstLink(prefix) {
  const hrefs = await page
    .locator(`a[href^="${prefix}/"]`)
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
  return (
    hrefs.find((href) =>
      new RegExp(`^${prefix}/[0-9a-f-]{36}$`).test(href ?? ""),
    ) ?? null
  );
}

await shot("01-login", "/login", { fullPage: false });
await page.getByLabel("Email").fill(user);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/my-work");

await shot("02-my-work", "/my-work");
await shot("03-tasks", "/tasks");
await page.goto(`${base}/tasks`);
const task = await firstLink("/tasks");
if (task) await shot("04-task-detail", task);
await shot("05-pdcas", "/pdcas");
await page.goto(`${base}/pdcas`);
const pdca = await firstLink("/pdcas");
if (pdca) await shot("06-pdca-detail", pdca);
await shot("07-decisions", "/decisions");
await shot("08-meetings", "/meetings?period=all");
await shot("09-meeting-series", "/meeting-series");
await page.goto(`${base}/meetings?period=all&status=IN_PROGRESS`);
const live = await firstLink("/meetings");
if (live) {
  await shot("10-meeting-detail", live);
  await shot("11-meeting-mode", `${live}/run`);
}
await page.goto(`${base}/meetings?period=all&status=REVIEW`);
const review = await firstLink("/meetings");
if (review) await shot("12-review-meeting", `${review}/review`);
await shot("13-new-task", "/tasks/new");
await shot("14-new-pdca", "/pdcas/new");
await shot("15-new-meeting", "/meetings/new");
await page.setViewportSize({ width: 390, height: 844 });
await shot("16-my-work-mobile", "/my-work");

await browser.close();
