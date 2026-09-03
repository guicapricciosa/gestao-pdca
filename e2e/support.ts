import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

import type { Database } from "@/platform/supabase/database.types";

export const password = "DevelopmentOnly123!";

export async function login(page: Page, email = "ceo@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
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

export async function submitForm(page: Page, label: string) {
  const form = page.locator("form").filter({ hasText: label });
  await Promise.all([
    page.waitForLoadState("networkidle"),
    form.getByRole("button", { name: label }).click(),
  ]);
}
