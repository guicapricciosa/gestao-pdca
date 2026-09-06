import { expect, test } from "@playwright/test";

import { login, logout, pickRestaurantA } from "./support";

test.describe("search and operational dashboard", () => {
  test("search finds what the person can open and nothing else", async ({
    page,
  }) => {
    const secret = `Xyzzy privado ${Date.now()}`;
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("O que é preciso fazer?").fill(secret);
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await page.getByText("Opções avançadas").click();
    await page.locator('select[name="visibility"]').selectOption("PRIVATE");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);

    await page.getByTestId("search-box").fill("Xyzzy privado");
    await page.getByTestId("search-box").press("Enter");
    await page.waitForURL(/\/pesquisa\?q=/);
    await expect(page.getByTestId("search-task")).toContainText(secret);
    await logout(page);

    await login(page, "manager.a@example.test");
    await page.goto("/pesquisa?q=Xyzzy%20privado");
    await expect(page.getByTestId("search-empty")).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);
  });

  test("a one-letter query and the empty state", async ({ page }) => {
    await login(page);
    await page.goto("/pesquisa?q=x");
    await expect(page.getByTestId("search-empty")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("“x”");
  });

  test("dashboard cards match the lists they open", async ({ page }) => {
    await login(page);
    await page.goto("/painel");
    const cards = page.getByTestId("dashboard-cards");
    await expect(cards.getByRole("link")).toHaveCount(8);
    for (const label of [
      "Tarefas atrasadas",
      "PDCAs em curso",
      "Tarefas sem responsável",
    ]) {
      await page.goto("/painel");
      const card = page.getByTestId(`card-${label}`);
      const count = Number(
        (await card.locator("p").first().innerText()).trim(),
      );
      await card.click();
      await page.waitForURL(/\/(tasks|pdcas)\?/);
      const rows = page.locator("tbody tr");
      if (count === 0)
        await expect(page.getByText("Nada para mostrar aqui")).toBeVisible();
      else await expect(rows).toHaveCount(Math.min(count, 25));
    }
  });

  test("dashboard narrows to a restaurant", async ({ page }) => {
    await login(page);
    await page.goto("/painel");
    await page
      .getByLabel("Restaurante")
      .selectOption({ label: "Restaurant A" });
    await page.getByRole("button", { name: "Ver" }).click();
    await page.waitForURL(/restaurante=/);
    await expect(page.getByText("Restaurant A. Cada número")).toBeVisible();
    const card = page.getByTestId("card-Tarefas em aberto");
    await card.click();
    await page.waitForURL(/restaurantId=/);
  });
});
