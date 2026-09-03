import { expect, test } from "@playwright/test";

import { login, logout } from "./support";

test("authentication, persisted session, logout and protected redirect", async ({
  page,
}) => {
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login\?next=%2Ftasks$/);

  await login(page);
  await expect(
    page.getByRole("heading", { name: "O meu trabalho" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "O meu trabalho" }),
  ).toBeVisible();

  await logout(page);
  await page.goto("/pdcas");
  await expect(page).toHaveURL(/\/login\?next=%2Fpdcas$/);
});

test("a deep link survives login and unsafe targets are ignored", async ({
  page,
}) => {
  await page.goto("/tasks?status=OPEN");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill("ceo@example.test");
  await page.getByLabel("Palavra-passe").fill("DevelopmentOnly123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/tasks?status=OPEN");

  await logout(page);
  await page.goto("/login?next=https://example.com/evil");
  await page.getByLabel("Email").fill("ceo@example.test");
  await page.getByLabel("Palavra-passe").fill("DevelopmentOnly123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/my-work");
});

test("the health probe answers without authentication and without secrets", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({
    status: "ok",
    checks: { app: "ok", supabase: "ok" },
  });
  expect(JSON.stringify(body)).not.toMatch(/key|54321|supabase\.co/i);
});
