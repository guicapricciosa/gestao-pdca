import { expect, test } from "@playwright/test";

import { login } from "./support";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test("on a phone the shell is a slim top bar plus bottom navigation", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByTestId("mobile-top-bar")).toBeVisible();
  await expect(page.getByTestId("bottom-nav")).toBeVisible();
  await expect(page.getByTestId("viewer-name")).toBeHidden();

  // Content starts right under the bar: the title is in the first quarter.
  const title = page.getByRole("heading", { level: 1, name: "O meu trabalho" });
  const box = await title.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(220);

  // Five entries, the current one marked.
  const nav = page.getByTestId("bottom-nav");
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("link", { name: "Trabalho" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "PDCAs" }).click();
  await page.waitForURL("**/pdcas");
  await expect(nav.getByRole("link", { name: "PDCAs" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Bell and account live in the top bar; the menu holds the session actions.
  await expect(page.getByTestId("notification-bell-mobile")).toBeVisible();
  await page.getByTestId("account-menu").click();
  await expect(page.getByTestId("viewer-name-mobile")).toHaveText("CEO");
  await expect(
    page.getByRole("menuitem", { name: "Definições" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.waitForURL("**/login");
});

test("on a phone the attention block does not repeat the task list", async ({
  page,
}) => {
  await login(page);
  const attention = page.getByTestId("attention");
  const overdue = attention.locator("li", { hasText: "atrasado" });
  // Desktop-only rows stay in the DOM but are not shown on a phone.
  for (const row of await overdue.all()) await expect(row).toBeHidden();
  await expect(page.getByTestId("to-do")).toBeVisible();
});
