import { expect, test } from "@playwright/test";

import { login, submitAction } from "./support";

/**
 * Demo smoke flow, in the order a person would use the product:
 * login → My Work → create Task → create PDCA → open a meeting → start it →
 * create an action inside it → review → publish → see the action in My Work.
 * Runs against the seeded demo data as the CEO.
 */
test("demo smoke flow from login to a published action in My Work", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await expect(page.getByTestId("my-work-summary")).toContainText(
    "Assigned to me",
  );
  await expect(page.getByTestId("viewer-name")).toHaveText("CEO");

  // Task
  await page.goto("/tasks/new");
  await page.getByLabel("Título").fill("Smoke · Task criada no fluxo demo");
  await page.getByLabel("Prazo").fill("2026-12-15");
  await page.getByText("Operations and Logistics", { exact: true }).click();
  await page.getByText("Restaurant A", { exact: true }).click();
  await page.getByRole("button", { name: "Criar Task" }).click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Smoke · Task criada no fluxo demo" }),
  ).toBeVisible();
  await expect(page.getByTestId("validation-panel")).toBeVisible();

  // PDCA
  await page.goto("/pdcas/new");
  await page.getByLabel("Título").fill("Smoke · PDCA do fluxo demo");
  await page.getByLabel("Descrição").fill("Problema observado no fluxo demo.");
  await page.getByLabel("Objetivo").fill("Objectivo mensurável do fluxo demo.");
  await page.getByLabel("Prazo").fill("2026-12-20");
  await page.getByText("Operations and Logistics", { exact: true }).click();
  await page.getByText("Restaurant A", { exact: true }).click();
  await page.getByRole("button", { name: "Criar PDCA" }).click();
  await page.waitForURL(/\/pdcas\/[0-9a-f-]+$/);
  await expect(page.getByText("PLAN", { exact: true }).first()).toBeVisible();

  // Meeting: create, schedule, start
  await page.goto("/meetings/new");
  await page.getByLabel("Título").fill("Smoke · Reunião do fluxo demo");
  await page.getByText("Operations and Logistics", { exact: true }).click();
  await page.getByText("Restaurant A", { exact: true }).click();
  await page.getByRole("button", { name: "Criar sessão" }).click();
  await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
  const meetingId = page.url().split("/").at(-1)!;
  await expect(page.getByTestId("notice")).toHaveCount(0);

  await page.goto(`/meetings/${meetingId}/run`);
  await expect(page.getByText("Meeting Mode · DRAFT")).toBeVisible();
  await submitAction(page, page.getByRole("button", { name: "Agendar" }));
  await expect(page.getByText("Meeting Mode · SCHEDULED")).toBeVisible();
  await submitAction(page, page.getByRole("button", { name: "Start" }));
  await expect(page.getByText("Meeting Mode · IN_PROGRESS")).toBeVisible();
  await expect(page.getByTestId("notice")).toContainText("Guardado");

  // Agenda + action created inside the meeting
  const agendaForm = page
    .locator("form")
    .filter({ hasText: "Adicionar à agenda" });
  await agendaForm.locator('input[name="title"]').fill("Smoke · tema único");
  await submitAction(
    page,
    agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
  );
  await expect(
    page.getByRole("heading", { name: "Smoke · tema único" }),
  ).toBeVisible();

  const quickTask = page.locator("form").filter({ hasText: "Quick Task" });
  await quickTask
    .locator('input[name="title"]')
    .fill("Smoke · ação da reunião");
  await quickTask
    .locator('select[name="ownerProfileId"]')
    .selectOption({ label: "CEO" });
  await quickTask
    .locator('select[name="responsibleProfileId"]')
    .selectOption({ label: "CEO" });
  await quickTask.locator('input[name="dueDate"]').fill("2026-12-30");
  await submitAction(
    page,
    quickTask.getByRole("button", { name: "Criar Task draft" }),
  );
  await expect(
    page.getByRole("link", { name: "Smoke · ação da reunião" }),
  ).toBeVisible();

  const outcome = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Guardar outcome" }) })
    .first();
  await outcome.locator('select[name="status"]').selectOption("DISCUSSED");
  await submitAction(
    page,
    outcome.getByRole("button", { name: "Guardar outcome" }),
  );

  // Review and publish
  await submitAction(page, page.getByRole("button", { name: "Review" }));
  await expect(page.getByText("Meeting Mode · REVIEW")).toBeVisible();
  await page.getByRole("link", { name: "Rever e publicar" }).click();
  await page.waitForURL(`**/meetings/${meetingId}/review`);
  const row = page.locator("tr").filter({ hasText: "Smoke · ação da reunião" });
  await expect(row).toContainText("CEO");
  await expect(row).toContainText("DRAFT");
  await submitAction(
    page,
    page.getByRole("button", { name: "Publish Meeting" }),
  );
  await expect(
    page.getByRole("button", { name: "Publish Meeting" }),
  ).toBeHidden();
  await expect(page.getByTestId("notice")).toContainText("Guardado");

  // The published action is now live work for the CEO
  await page.goto("/my-work");
  const assigned = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Assigned to me" }) });
  await expect(
    assigned.getByRole("link", { name: "Smoke · ação da reunião" }).first(),
  ).toBeVisible();
  await expect(assigned).toContainText("OPEN");
});
