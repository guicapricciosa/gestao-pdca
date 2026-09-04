import { createClient } from "@supabase/supabase-js";
import type { Locator, Page } from "@playwright/test";

import type { Database } from "@/platform/supabase/database.types";

export const password = "DevelopmentOnly123!";
export const restaurantA = "40000000-0000-0000-0000-000000000001";
export const profiles = {
  ceo: "21000000-0000-0000-0000-000000000001",
  managerA: "21000000-0000-0000-0000-000000000017",
} as const;

export async function login(page: Page, email = "ceo@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Palavra-passe").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/my-work");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.waitForURL("**/login");
}

export function adminClient() {
  const url = process.env.API_URL;
  const key = process.env.SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Local Supabase environment is unavailable");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Picks "only Restaurant A" in the scope picker inside `scope`. */
export async function pickRestaurantA(scope: Locator | Page) {
  await scope.getByTestId("scope-picker").selectOption(`one:${restaurantA}`);
}

/**
 * Clicks a Server Action submit button and resolves only after the action
 * response has arrived. Server Actions commit their RPC before responding, so
 * a test may navigate elsewhere immediately afterwards without racing the
 * mutation. This never depends on compile speed or arbitrary timeouts.
 */
export async function submitAction(page: Page, button: Locator) {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.request().headers()["next-action"] !== undefined &&
        response.status() < 400,
    ),
    // Every Server Action here ends in a redirect, which the router applies
    // as a client navigation slightly after the response. Waiting for it
    // keeps the test from touching a page that is about to re-render.
    page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame(),
    }),
    button.click(),
  ]);
  await page.waitForLoadState("networkidle");
}

/** Opens a side sheet by its trigger test id and returns the dialog. */
export async function openSheet(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  return dialog;
}

/** Sets "Quando" on the meeting form: date plus start/end in 10-minute steps. */
export async function setMeetingWhen(
  page: Page,
  date: string,
  start: string,
  end?: string,
) {
  await page.getByLabel("Data").fill(date);
  await page.getByLabel("Início").selectOption(start);
  if (end) await page.getByLabel("Fim").selectOption(end);
}
