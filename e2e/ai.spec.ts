import { expect, test } from "@playwright/test";

import {
  login,
  pickRestaurantA,
  submitAction,
  setMeetingWhen,
} from "./support";

test.describe.serial("Assistant proposals, summary and alerts", () => {
  let sessionId = "";

  test("proposes from meeting material and only a human confirmation creates records", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meetings/new");
    await page
      .locator('input[name="title"]')
      .fill("E2E Reunião com assistente");
    await setMeetingWhen(page, "2026-10-05", "10:00", "11:00");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Marcar reunião" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    sessionId = page.url().split("/").at(-2)!;

    await page.goto(`/meetings/${sessionId}`);
    await page.getByRole("link", { name: "Assistente" }).click();
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
    const finish = await page.request.get(`/meetings/${sessionId}/finish`);
    expect(await finish.text()).not.toContain("E2E AI Task");

    const taskProposal = page
      .getByTestId("ai-proposal")
      .filter({ hasText: "E2E AI Task" });
    await expect(
      taskProposal.locator('select[name="responsibleProfileId"]'),
    ).toHaveValue(/[0-9a-f-]{36}/);
    await taskProposal
      .locator('input[name="title"]')
      .fill("E2E AI Task confirmed");
    await submitAction(
      page,
      taskProposal.getByRole("button", { name: /Confirmar/ }),
    );
    await expect(page.getByTestId("ai-proposal")).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: "E2E AI Task confirmed" }),
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

    await page.goto(`/meetings/${sessionId}/run`);
    await expect(
      page
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: "E2E AI Task confirmed" }),
    ).toBeVisible();
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
      summary.getByRole("button", { name: /Confirmar/ }),
    );

    await page.goto(`/meetings/${sessionId}/run`);
    await expect(
      page
        .getByTestId("meeting-note")
        .filter({ hasText: "Resumo revisto pelo Chair" }),
    ).toBeVisible();
  });

  test("alerts are deterministic everywhere and assistant findings only on demand", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page
      .getByLabel("O que é preciso fazer?")
      .fill("E2E Tarefa sem prazo");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const bareTaskUrl = page.url();

    await expect(page.getByTestId("record-alerts")).toContainText("Sem prazo");
    const panel = page.getByTestId("validation-panel");
    await expect(panel).toContainText("Sem prazo");
    await expect(panel).not.toContainText("MISSING_DUE_DATE");
    await expect(panel.getByTestId("ai-finding")).toHaveCount(0);

    await submitAction(
      page,
      panel.getByRole("button", { name: "Pedir análise ao assistente" }),
    );
    await expect(page.getByTestId("ai-finding")).toHaveCount(1);
    await expect(page.getByTestId("ai-finding")).toContainText(
      "Objectivo pouco claro",
    );
    await expect(page.getByText(/Última análise do assistente/)).toBeVisible();
    await submitAction(
      page,
      page.getByTestId("ai-finding").getByRole("button", { name: "Dispensar" }),
    );
    await expect(page.getByTestId("ai-finding")).toHaveCount(0);

    await page.goto("/my-work");
    const todo = page.getByTestId("to-do");
    const entry = todo
      .locator("li")
      .filter({ hasText: "E2E Tarefa sem prazo" });
    await expect(entry).toContainText("sem prazo");
    await expect(
      entry.getByRole("link", { name: "E2E Tarefa sem prazo" }),
    ).toHaveAttribute("href", bareTaskUrl.replace(/^https?:\/\/[^/]+/, ""));
  });
});
