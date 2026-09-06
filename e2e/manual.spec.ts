import { expect, test } from "@playwright/test";

import { login } from "./support";

test("the manual is readable inside the app with its screenshots", async ({
  page,
}) => {
  await login(page);
  await page.goto("/definicoes");
  await page.getByRole("link", { name: "Abrir o manual" }).click();
  await page.waitForURL("**/manual");
  const chapters = page.getByTestId("manual-chapters").getByRole("link");
  expect(await chapters.count()).toBeGreaterThanOrEqual(12);
  await chapters.first().click();
  await page.waitForURL(/\/manual\/01-primeiros-passos$/);
  const article = page.getByTestId("manual-chapter");
  await expect(article.getByRole("heading", { level: 1 })).toContainText(
    "Primeiros passos",
  );
  const image = article.locator("img").first();
  await expect(image).toBeVisible();
  const src = await image.getAttribute("src");
  const response = await page.request.get(src!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  await page.getByRole("link", { name: /→$/ }).click();
  await page.waitForURL(/\/manual\/02-/);
});

test("the manual needs a session", async ({ page }) => {
  await page.goto("/manual");
  await expect(page).toHaveURL(/\/login\?next=/);
});
