import { expect, test } from "@playwright/test";

import { login, submitAction } from "./support";

test.describe
  .serial("AI Foundation, Meeting Assistant and Execution Validator", () => {
  let sessionId = "";
  let bareTaskUrl = "";

  test("proposes from meeting material and only a human confirmation creates records", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meetings/new");
    await page.getByLabel("Título").fill("E2E AI Session");
    await page.getByLabel("Início").fill("2026-10-05T10:00");
    await page.getByLabel("Fim").fill("2026-10-05T11:00");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar sessão" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
    sessionId = page.url().split("/").at(-1)!;

    await page.getByRole("link", { name: "AI Assistant" }).click();
    await page.waitForURL(`**/meetings/${sessionId}/assistant`);
    await expect(page.getByTestId("ai-availability")).toHaveText(
      "AI: fake/fake",
    );

    await page
      .locator('textarea[name="extraInput"]')
      .fill(
        [
          "Tarefa: E2E AI Task | responsável: Restaurant Manager A | prazo: 2026-12-01",
          "Decisão: E2E AI Decision | descrição: Fechar a esplanada às 23h",
          "Tarefa: E2E Unresolved | responsável: Pessoa Inexistente",
        ].join("\n"),
      );
    await submitAction(
      page,
      page.getByRole("button", { name: "Gerar propostas" }),
    );
    await expect(page.getByTestId("ai-proposal")).toHaveCount(3);

    // Nothing exists until confirmation.
    const review = await page.request.get(`/meetings/${sessionId}/review`);
    expect(await review.text()).not.toContain("E2E AI Task");

    const taskProposal = page
      .getByTestId("ai-proposal")
      .filter({ hasText: "E2E AI Task" });
    await expect(
      taskProposal.locator('select[name="responsibleProfileId"]'),
    ).toHaveValue(/[0-9a-f-]{36}/);
    await taskProposal
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await taskProposal
      .locator('input[name="title"]')
      .fill("E2E AI Task confirmed");
    await submitAction(
      page,
      taskProposal.getByRole("button", {
        name: "Confirmar e criar TASK draft",
      }),
    );
    await expect(page.getByTestId("ai-proposal")).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: "E2E AI Task confirmed" }),
    ).toBeVisible();
    await expect(
      page.getByText("CONFIRMED", { exact: false }).first(),
    ).toBeVisible();

    const unresolved = page
      .getByTestId("ai-proposal")
      .filter({ hasText: "E2E Unresolved" });
    await expect(unresolved.getByText("Pessoa Inexistente")).toBeVisible();
    await unresolved
      .locator('input[name="reason"]')
      .fill("Pessoa não pertence à organização");
    await submitAction(
      page,
      unresolved.getByRole("button", { name: "Rejeitar proposta" }),
    );
    await expect(page.getByTestId("ai-proposal")).toHaveCount(1);
    await expect(
      page.getByText("REJECTED · Pessoa não pertence à organização"),
    ).toBeVisible();

    await page.goto(`/meetings/${sessionId}/review`);
    const row = page.locator("tr").filter({ hasText: "E2E AI Task confirmed" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("DRAFT");
  });

  test("summarizes the meeting and stores the reviewed text as an attributed note", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/meetings/${sessionId}/assistant`);
    await submitAction(
      page,
      page.getByRole("button", { name: "Gerar resumo" }),
    );
    const summary = page
      .getByTestId("ai-proposal")
      .filter({ hasText: "Resumo" });
    await expect(summary.locator('textarea[name="summary"]')).toHaveValue(
      /Reunião com/,
    );
    await summary
      .locator('textarea[name="summary"]')
      .fill("Resumo revisto pelo Chair: decisões e tarefas alinhadas.");
    await submitAction(
      page,
      summary.getByRole("button", {
        name: "Confirmar e guardar como nota da reunião",
      }),
    );
    await expect(
      page.getByText("Resumo da reunião", { exact: true }),
    ).toBeVisible();

    await page.goto(`/meetings/${sessionId}/run`);
    await expect(
      page
        .locator('textarea[name="content"]')
        .filter({ hasText: "Resumo revisto pelo Chair" }),
    ).toBeVisible();
  });

  test("runs deterministic validation everywhere and AI findings only on demand", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("Título").fill("E2E Bare Task");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar Task" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    bareTaskUrl = page.url();

    const panel = page.getByTestId("validation-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("WARNING · MISSING_RESPONSIBLE");
    await expect(panel).toContainText("WARNING · MISSING_OWNER");
    await expect(panel).toContainText("WARNING · MISSING_DUE_DATE");
    await expect(panel.getByTestId("ai-finding")).toHaveCount(0);

    await submitAction(
      page,
      panel.getByRole("button", { name: "Pedir análise AI" }),
    );
    await expect(page.getByTestId("ai-finding")).toHaveCount(1);
    await expect(page.getByTestId("ai-finding")).toContainText(
      "OBJECTIVE_UNCLEAR",
    );
    await expect(page.getByText("Última análise AI: SUCCEEDED")).toBeVisible();
    await submitAction(
      page,
      page.getByTestId("ai-finding").getByRole("button", { name: "Dispensar" }),
    );
    await expect(page.getByTestId("ai-finding")).toHaveCount(0);

    const assignments = page
      .locator("form")
      .filter({ hasText: "Owner e Responsible" });
    await assignments
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await assignments
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await submitAction(
      page,
      assignments.getByRole("button", { name: "Guardar atribuições" }),
    );

    await page.goto("/my-work");
    const myWork = page.getByTestId("my-work-validation");
    await expect(myWork).toBeVisible();
    const entry = myWork
      .locator("div")
      .filter({ hasText: "TASK · E2E Bare Task" });
    await expect(entry.first()).toContainText("MISSING_DUE_DATE");
    await expect(
      page.getByRole("link", { name: "TASK · E2E Bare Task" }),
    ).toHaveAttribute("href", bareTaskUrl.replace(/^https?:\/\/[^/]+/, ""));
  });
});
