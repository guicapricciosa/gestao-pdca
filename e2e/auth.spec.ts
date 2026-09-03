import { expect, test } from "@playwright/test";

import { login, logout } from "./support";

test("authentication, persisted session, logout and protected redirect", async ({
  page,
}) => {
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/login$/);

  await login(page);
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();

  await logout(page);
  await page.goto("/pdcas");
  await expect(page).toHaveURL(/\/login$/);
});
