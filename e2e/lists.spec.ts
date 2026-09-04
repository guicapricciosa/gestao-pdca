import { expect, test } from "@playwright/test";

import { login } from "./support";

test.describe("execution lists", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sorts by column from the URL and by clicking headers", async ({
    page,
  }) => {
    await page.goto("/pdcas?sort=title&dir=asc");
    const titles = await page.getByTestId("list-item").allInnerTexts();
    expect(titles.length).toBeGreaterThan(1);
    for (let index = 1; index < titles.length; index += 1)
      expect(
        titles[index - 1]!.localeCompare(titles[index]!, "pt", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    await expect(page.getByTestId("sort-title")).toHaveText(/▲/);

    await page.getByTestId("sort-title").click();
    await page.waitForURL(/sort=title&dir=desc/);
    const reversed = await page.getByTestId("list-item").allInnerTexts();
    expect(
      titles[0]!.localeCompare(reversed[0]!, "pt", { sensitivity: "base" }),
    ).toBeLessThanOrEqual(0);
    await expect(page.getByTestId("sort-title")).toHaveText(/▼/);

    await page.getByTestId("sort-due_date").click();
    await page.waitForURL(/sort=due_date&dir=asc/);
    await expect(page.getByTestId("sort-due_date")).toHaveText(/▲/);
  });

  test("filters accept several values and show removable chips", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.getByTestId("filter-status").click();
    await page.getByRole("checkbox", { name: "Aberta" }).check();
    await page.getByRole("checkbox", { name: "Em curso" }).check();
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page.waitForURL(/status=OPEN&status=IN_PROGRESS/);

    await expect(page.getByTestId("filter-status")).toContainText("Estado · 2");
    const chips = page.getByTestId("filter-chips");
    await expect(chips).toContainText("Estado: Aberta");
    await expect(chips).toContainText("Estado: Em curso");
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    const badges = await rows.locator("td:last-child").allInnerTexts();
    for (const badge of badges)
      expect(["Aberta", "Em curso"]).toContain(badge.trim());

    await chips.getByRole("link", { name: "Retirar Estado: Aberta" }).click();
    await page.waitForURL((url) => {
      const statuses = url.searchParams.getAll("status");
      return statuses.length === 1 && statuses[0] === "IN_PROGRESS";
    });
    await expect(page.getByTestId("filter-status")).toContainText("Em curso");
    await page.getByRole("link", { name: /Limpar filtros/ }).click();
    await page.waitForURL("**/tasks");
  });

  test("keeps sort while filtering and paging", async ({ page }) => {
    await page.goto("/pdcas?sort=due_date&dir=desc");
    await page.getByLabel("Pesquisar").fill("a");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page.waitForURL(/query=a/);
    expect(page.url()).toContain("sort=due_date");
    expect(page.url()).toContain("dir=desc");
  });

  test("opens a PDCA in the side panel without leaving the list", async ({
    page,
  }) => {
    await page.goto("/pdcas?sort=title&dir=asc");
    const first = page.getByTestId("list-item").first();
    const title = (await first.innerText()).trim();
    await first.click();
    await page.waitForURL(/open=/);
    const panel = page.getByTestId("record-panel");
    await expect(panel.locator("#record-panel-title")).toHaveText(title);
    await expect(panel.getByText("Responsável", { exact: true })).toBeVisible();
    await expect(panel.getByTestId("record-actions")).toBeVisible();
    expect(page.url()).toContain("sort=title");

    const note = `Nota do painel ${Date.now()}`;
    await panel.getByRole("textbox", { name: "Actualização" }).fill(note);
    await panel.getByRole("button", { name: "Publicar actualização" }).click();
    await page.waitForURL(/saved=1/);
    await expect(page.getByTestId("record-panel")).toContainText(note);
    expect(page.url()).toContain("open=");

    await page.keyboard.press("Escape");
    await page.waitForURL((url) => !url.searchParams.has("open"));
    await expect(page.getByTestId("record-panel")).toHaveCount(0);
    expect(page.url()).toContain("sort=title");

    await page.getByTestId("list-item").first().click();
    await page.waitForURL(/open=/);
    await page.getByTestId("open-full-page").click();
    await page.waitForURL(/\/pdcas\/[0-9a-f-]+\?back=/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.getByTestId("back-link").click();
    await page.waitForURL(/\/pdcas\?sort=title/);
  });

  test("shows a clear message for a PDCA outside the scope", async ({
    page,
  }) => {
    await page.goto("/pdcas?open=00000000-0000-4000-8000-000000000000");
    await expect(page.getByTestId("record-panel")).toContainText(
      "fora do teu âmbito",
    );
    await page.getByTestId("close-panel").click();
    await page.waitForURL("**/pdcas");
  });
});
