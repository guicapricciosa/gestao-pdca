import { expect, test } from "@playwright/test";

import { login, setMeetingWhen, submitAction } from "./support";

const stamp = Date.now();
const templateName = `Reunião de Direção ${stamp}`;

test.describe.serial("Meeting templates and repetition", () => {
  test("an executive creates a template with people, agenda, scope and repetition", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/definicoes");
    await page.getByRole("link", { name: "Gerir modelos" }).click();
    await page.waitForURL("**/definicoes/modelos-de-reuniao");
    await page.getByRole("link", { name: "Novo modelo" }).click();
    const form = page.getByTestId("template-form");
    await form.locator('input[name="name"]').fill(templateName);
    await form.getByLabel("Duração").selectOption("30");
    await form.getByRole("checkbox", { name: "Restaurant Manager A" }).check();
    await form.getByLabel("Todos os restaurantes").check();
    await form
      .getByLabel("Agenda habitual")
      .fill("Operações\nComercial\nMarketing");
    await form.locator('select[name="repeat"]').selectOption("WEEKLY");
    await expect(form.getByTestId("recurrence-summary")).toContainText(
      "Semanalmente",
    );
    await submitAction(
      page,
      form.getByRole("button", { name: "Guardar modelo" }),
    );
    await page.waitForURL("**/definicoes/modelos-de-reuniao?saved=1");
    const row = page
      .getByTestId("template-list")
      .locator("li")
      .filter({ hasText: templateName });
    await expect(row).toContainText("30 min");
    await expect(row).toContainText("1 pessoas");
    await expect(row).toContainText("todos os restaurantes");
    await expect(row).toContainText("Semanalmente");
  });

  test("choosing the template pre-fills the meeting; times move in 10-minute steps and the end follows the start", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meetings/new");
    const form = page.getByTestId("meeting-form");
    await setMeetingWhen(page, "2026-10-14", "10:00");
    await form
      .getByLabel("Modelo da reunião")
      .selectOption({ label: templateName });
    await expect(form.locator('input[name="title"]')).toHaveValue(
      `${templateName} · 14 de outubro`,
    );
    await expect(form.getByLabel("Fim")).toHaveValue("10:30");
    await expect(
      form.getByRole("checkbox", { name: "Restaurant Manager A" }),
    ).toBeChecked();
    await expect(page.getByTestId("scope-summary")).toContainText(
      "Todos os restaurantes",
    );
    await expect(form.getByTestId("recurrence-summary")).toContainText(
      "Semanalmente à quarta",
    );
    const options = await form
      .getByLabel("Início")
      .locator("option")
      .allTextContents();
    expect(options).toContain("10:10");
    expect(options).not.toContain("10:05");

    await form.getByLabel("Início").selectOption("11:20");
    await expect(form.getByLabel("Fim")).toHaveValue("11:50");
    await form.getByLabel("Fim").selectOption("12:30");
    await form.getByLabel("Início").selectOption("11:00");
    await expect(form.getByLabel("Fim")).toHaveValue("12:30");

    // Custom repetition like a calendar: every 2 weeks on Tuesday and Thursday, 6 times.
    await form.locator('select[name="repeat"]').selectOption("CUSTOM");
    const custom = form.getByTestId("recurrence-custom");
    await custom.locator('input[type="number"]').first().fill("2");
    await custom
      .getByRole("button", { name: "T", exact: true })
      .first()
      .click();
    await custom.getByRole("button", { name: "Q", exact: true }).nth(1).click();
    await custom.getByRole("radio", { name: /Após/ }).check();
    await expect(form.getByTestId("recurrence-summary")).toContainText(
      "Quinzenalmente à terça, quarta, quinta, 10 vezes",
    );

    await page.getByRole("button", { name: "Marcar reunião" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    await expect(page.getByTestId("meeting-title")).toHaveText(
      `${templateName} · 14 de outubro`,
    );
    await expect(page.getByText("2 pessoas")).toBeVisible();
    for (const topic of ["Operações", "Comercial", "Marketing"])
      await expect(
        page.getByRole("listitem").filter({ hasText: topic }).first(),
      ).toBeVisible();
    await expect(page.getByText("14/10/2026, 11:00")).toBeVisible();

    await page.goto("/meeting-series");
    const series = page.getByRole("link", { name: templateName }).first();
    await expect(series).toBeVisible();
    await series.click();
    await expect(
      page.getByText("Quinzenalmente à terça, quarta, quinta, 10 vezes"),
    ).toBeVisible();
    await expect(page.getByTestId("next-occurrence")).toContainText(
      "15/10/2026, 11:00",
    );
  });
});
