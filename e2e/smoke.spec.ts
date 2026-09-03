import { expect, test } from "@playwright/test";

import {
  adminClient,
  login,
  openSheet,
  pickRestaurantA,
  submitAction,
} from "./support";

/**
 * The principal human flow, in the order a Chair lives it:
 * login → marcar reunião → abrir → nota → + Tarefa → + PDCA → + Decisão →
 * Terminar reunião → corrigir um bloqueio → Terminar e distribuir →
 * confirmar em O meu trabalho.
 */
test("a meeting from opening to distribution, as a person runs it", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "O meu trabalho" }),
  ).toBeVisible();
  await expect(page.getByTestId("my-work-summary")).toContainText(/Tens|Nada/);
  await expect(page.getByTestId("attention")).toBeVisible();
  await expect(page.getByTestId("viewer-name")).toHaveText("CEO");

  // Marcar reunião
  await page.goto("/meetings/new");
  await page
    .getByLabel("Assunto da reunião")
    .fill("Smoke · Reunião de operações");
  await pickRestaurantA(page);
  await expect(page.getByTestId("scope-summary")).toContainText("Restaurant A");
  await page.getByRole("button", { name: "Marcar reunião" }).click();
  await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
  const meetingId = page.url().split("/").at(-2)!;
  await expect(page.getByTestId("meeting-title")).toHaveText(
    "Smoke · Reunião de operações",
  );

  // Abrir reunião: the lifecycle happens behind one button.
  await submitAction(page, page.getByRole("button", { name: "Abrir reunião" }));
  await expect(page.getByTestId("finish-meeting")).toBeVisible();
  await expect(page.getByText(/A decorrer/).first()).toBeVisible();

  // Agenda + nota com autosave
  const agendaForm = page
    .locator("form")
    .filter({ hasText: "Adicionar à agenda" });
  await agendaForm.locator('input[name="title"]').fill("Smoke · Tema um");
  await submitAction(
    page,
    agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
  );
  await agendaForm.locator('input[name="title"]').fill("Smoke · Tema dois");
  await submitAction(
    page,
    agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
  );
  await expect(
    page.getByRole("listitem").filter({ hasText: "Smoke · Tema dois" }),
  ).toBeVisible();

  await page.getByLabel("Nova nota").fill("Smoke · primeira nota da reunião");
  await page.getByRole("button", { name: "Adicionar nota" }).click();
  const note = page
    .getByTestId("meeting-note")
    .filter({ hasText: "primeira nota" });
  await expect(note).toBeVisible();
  await note
    .locator("textarea")
    .fill("Smoke · primeira nota da reunião, revista");
  await note.locator("textarea").blur();
  await expect(note.getByTestId("note-save-state")).toHaveText("Guardado");

  // Tema actual: discutido
  await submitAction(
    page,
    page.getByRole("button", { name: /Discutido/ }).first(),
  );

  // + Tarefa (side sheet)
  let sheet = await openSheet(page, "open-task-sheet");
  await sheet
    .getByLabel("O que é preciso fazer?")
    .fill("Smoke · Contactar fornecedor");
  await sheet
    .locator('select[name="responsibleProfileId"]')
    .selectOption({ label: "CEO" });
  await sheet.locator('input[name="dueDate"]').fill("2026-12-15");
  await pickRestaurantA(sheet);
  await submitAction(
    page,
    sheet.getByRole("button", { name: "Adicionar tarefa" }),
  );
  const created = page.getByTestId("created-in-meeting");
  await expect(
    created.getByRole("link", { name: "Smoke · Contactar fornecedor" }),
  ).toBeVisible();
  await expect(created).toContainText("CEO");

  // + PDCA
  sheet = await openSheet(page, "open-pdca-sheet");
  await sheet
    .getByLabel("Qual é o problema?")
    .fill("Smoke · Quebras de stock ao fim-de-semana");
  await sheet
    .getByLabel("O que queremos atingir?")
    .fill("Zero rupturas em Dezembro.");
  await sheet
    .locator('select[name="responsibleProfileId"]')
    .selectOption({ label: "CEO" });
  await sheet
    .locator('select[name="ownerProfileId"]')
    .selectOption({ label: "CEO" });
  await pickRestaurantA(sheet);
  await submitAction(
    page,
    sheet.getByRole("button", { name: "Adicionar PDCA" }),
  );
  await expect(
    created.getByRole("link", { name: /Quebras de stock/ }),
  ).toBeVisible();

  // + Decisão
  sheet = await openSheet(page, "open-decision-sheet");
  await sheet
    .getByLabel("O que ficou decidido?")
    .fill("Smoke · Fechar esplanada às 23h");
  await pickRestaurantA(sheet);
  await submitAction(
    page,
    sheet.getByRole("button", { name: "Registar decisão" }),
  );
  await expect(
    created.getByRole("link", { name: /Fechar esplanada/ }),
  ).toBeVisible();

  // Simulate a task that lost its responsible before the meeting ends.
  const admin = adminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id")
    .eq("title", "Smoke · Contactar fornecedor")
    .single();
  await admin
    .from("tasks")
    .update({ responsible_profile_id: null })
    .eq("id", task!.id);

  // Terminar reunião: blocking issue shown, button disabled, fix it, come back.
  await page.getByTestId("finish-meeting").click();
  await page.waitForURL(`**/meetings/${meetingId}/finish`);
  await expect(page.getByTestId("finish-summary")).toBeVisible();
  const blocking = page.getByTestId("finish-blocking");
  await expect(blocking).toContainText("Smoke · Contactar fornecedor");
  await expect(
    page.getByRole("button", { name: "Terminar e distribuir" }),
  ).toBeDisabled();
  await blocking.getByRole("link", { name: "Corrigir" }).first().click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]+\?from=/);
  await expect(
    page.getByRole("link", { name: "Voltar a Terminar reunião" }),
  ).toBeVisible();
  await page.getByTestId("advanced-options").locator("summary").click();
  const assignments = page
    .locator("form")
    .filter({ hasText: "Owner e Responsável" });
  await assignments
    .locator('select[name="responsibleProfileId"]')
    .selectOption({ label: "CEO" });
  await submitAction(
    page,
    assignments.getByRole("button", { name: "Guardar atribuições" }),
  );

  await page.goto(`/meetings/${meetingId}/finish`);
  await expect(page.getByTestId("finish-blocking")).toHaveCount(0);
  const agenda = page.getByTestId("finish-agenda");
  await expect(agenda).toContainText("Smoke · Tema dois");
  await agenda.getByLabel("Dar como discutido").check();
  await submitAction(
    page,
    page.getByRole("button", { name: "Terminar e distribuir" }),
  );
  await page.waitForURL(`**/meetings/${meetingId}?finished=1`);
  await expect(page.getByTestId("meeting-finished")).toBeVisible();

  // Distributed work is now live for the responsible person.
  await page.goto("/my-work");
  const todo = page.getByTestId("to-do");
  await expect(
    todo.getByRole("link", { name: "Smoke · Contactar fornecedor" }),
  ).toBeVisible();
  await expect(
    todo.getByRole("link", { name: /Quebras de stock/ }),
  ).toBeVisible();
  const { data: finished } = await admin
    .from("meeting_sessions")
    .select("status")
    .eq("id", meetingId)
    .single();
  expect(finished!.status).toBe("CLOSED");
  const { data: agendaRows } = await admin
    .from("meeting_agenda_items")
    .select("title,status")
    .eq("meeting_session_id", meetingId);
  expect(agendaRows?.every((row) => row.status === "DISCUSSED")).toBe(true);
});
