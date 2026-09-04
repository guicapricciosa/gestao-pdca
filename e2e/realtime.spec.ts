import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  adminClient,
  login,
  openSheet,
  password,
  pickRestaurantA,
  profiles,
  submitAction,
} from "./support";

/**
 * Two people, two browsers, one meeting. Every assertion on the *other*
 * browser relies on Realtime signals followed by an authorized re-render:
 * no reload() calls, no fixed sleeps — only auto-waiting expectations.
 */
test.describe.serial("Realtime meeting between two participants", () => {
  let chair: Page;
  let guest: Page;
  let guestContext: BrowserContext;
  let meetingId = "";
  const privateTitle = "RT · PDCA privado do CEO";

  test.beforeAll(async ({ browser }) => {
    chair = await (await browser.newContext()).newPage();
    guestContext = await browser.newContext();
    guest = await guestContext.newPage();
  });

  test("the chair marks a meeting, adds a participant and opens it", async () => {
    await login(chair);
    await chair.goto("/meetings/new");
    await chair.locator('input[name="title"]').fill("RT · Reunião partilhada");
    await pickRestaurantA(chair);
    await chair.getByRole("button", { name: "Marcar reunião" }).click();
    await chair.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    meetingId = chair.url().split("/").at(-2)!;

    await chair.goto(`/meetings/${meetingId}`);
    await chair
      .getByLabel("Novo participante")
      .selectOption({ label: "Restaurant Manager A" });
    await submitAction(
      chair,
      chair
        .locator("form")
        .filter({ has: chair.getByLabel("Novo participante") })
        .getByRole("button", { name: "Adicionar" }),
    );
    await chair.goto(`/meetings/${meetingId}/run`);
    await submitAction(
      chair,
      chair.getByRole("button", { name: "Abrir reunião" }),
    );
    await expect(chair.getByTestId("presence")).toHaveAttribute(
      "data-state",
      "live",
    );
  });

  test("a participant follows the shared link, logs in and lands in the meeting", async () => {
    await guest.goto(`/meetings/${meetingId}/run`);
    await expect(guest).toHaveURL(/\/login\?next=/);
    await guest.getByLabel("Email").fill("manager.a@example.test");
    await guest.getByLabel("Palavra-passe").fill(password);
    await guest.getByRole("button", { name: "Entrar" }).click();
    await guest.waitForURL(`**/meetings/${meetingId}/run`);
    await expect(guest.getByTestId("meeting-title")).toHaveText(
      "RT · Reunião partilhada",
    );
    await expect(guest.getByTestId("presence")).toHaveAttribute(
      "data-state",
      "live",
    );
  });

  test("both see who is in the meeting", async () => {
    await expect(chair.getByTestId("presence")).toContainText(
      "Restaurant Manager A",
    );
    await expect(guest.getByTestId("presence")).toContainText("CEO");
    await expect(chair.getByTestId("presence")).not.toContainText("websocket");
  });

  test("a task created by the participant appears for the chair without refresh", async () => {
    const sheet = await openSheet(guest, "open-task-sheet");
    await sheet
      .getByLabel("O que é preciso fazer?")
      .fill("RT · Preparar campanha de Natal");
    await sheet
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await pickRestaurantA(sheet);
    await submitAction(
      guest,
      sheet.getByRole("button", { name: "Adicionar tarefa" }),
    );
    await expect(
      chair
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: "RT · Preparar campanha de Natal" }),
    ).toBeVisible();
  });

  test("a PDCA and a decision created by the chair appear for the participant", async () => {
    let sheet = await openSheet(chair, "open-pdca-sheet");
    await sheet
      .getByLabel("Qual é o problema?")
      .fill("RT · Quebras no fim-de-semana");
    await sheet.getByLabel("O que queremos atingir?").fill("Zero quebras.");
    await sheet
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await sheet
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(sheet);
    await submitAction(
      chair,
      sheet.getByRole("button", { name: "Adicionar PDCA" }),
    );
    await expect(
      guest
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: /Quebras no fim-de-semana/ }),
    ).toBeVisible();

    sheet = await openSheet(chair, "open-decision-sheet");
    await sheet
      .getByLabel("O que ficou decidido?")
      .fill("RT · Esplanada fecha às 23h");
    await pickRestaurantA(sheet);
    await submitAction(
      chair,
      sheet.getByRole("button", { name: "Registar decisão" }),
    );
    await expect(
      guest
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: /Esplanada fecha/ }),
    ).toBeVisible();
  });

  test("agenda changes by the chair reach the participant", async () => {
    const agendaForm = chair
      .locator("form")
      .filter({ hasText: "Adicionar à agenda" });
    await agendaForm
      .locator('input[name="title"]')
      .fill("RT · Tema partilhado");
    await submitAction(
      chair,
      agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
    );
    await expect(
      guest.getByRole("listitem").filter({ hasText: "RT · Tema partilhado" }),
    ).toBeVisible();
    await submitAction(
      chair,
      chair.getByRole("button", { name: /Discutido/ }).first(),
    );
    await expect(
      guest
        .getByRole("listitem")
        .filter({ hasText: "RT · Tema partilhado" })
        .getByText("Discutido", { exact: true }),
    ).toBeVisible();
  });

  test("a new participant added by the chair updates the participant's view", async () => {
    await expect(guest.getByText("2 pessoas")).toBeVisible();
    const detail = await chair.context().newPage();
    await detail.goto(`/meetings/${meetingId}`);
    await detail
      .getByLabel("Novo participante")
      .selectOption({ label: "Kitchen Manager A" });
    await submitAction(
      detail,
      detail
        .locator("form")
        .filter({ has: detail.getByLabel("Novo participante") })
        .getByRole("button", { name: "Adicionar" }),
    );
    await detail.close();
    await expect(guest.getByText("3 pessoas")).toBeVisible();
  });

  test("a PRIVATE object linked to the meeting stays invisible to the other participant", async () => {
    const detail = await chair.context().newPage();
    await detail.goto("/pdcas/new");
    await detail.getByLabel("Qual é o problema?").fill(privateTitle);
    await detail.getByLabel("O que queremos atingir?").fill("Reservado.");
    await detail
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await detail
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await detail.getByText("Opções avançadas").click();
    await detail.locator('select[name="visibility"]').selectOption("PRIVATE");
    await pickRestaurantA(detail);
    await detail.getByRole("button", { name: "Adicionar PDCA" }).click();
    await detail.waitForURL(/\/pdcas\/[0-9a-f-]+$/);
    await detail.close();

    await chair.reload();
    await chair.getByText("Ligar um assunto já existente").click();
    const link = chair
      .locator("form")
      .filter({ has: chair.locator('select[name="securityObjectId"]') });
    await link
      .locator('select[name="securityObjectId"]')
      .selectOption({ label: `PDCA · ${privateTitle}` });
    await link.locator('select[name="relationType"]').selectOption("DISCUSSED");
    await submitAction(chair, link.getByRole("button"));
    await expect(
      chair
        .locator("section")
        .filter({ hasText: "Assuntos ligados" })
        .getByText(privateTitle),
    ).toBeVisible();

    // Force a fresh authorized render on the guest and make sure nothing leaks.
    const agendaForm = chair
      .locator("form")
      .filter({ hasText: "Adicionar à agenda" });
    await agendaForm
      .locator('input[name="title"]')
      .fill("RT · Tema depois do privado");
    await submitAction(
      chair,
      agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
    );
    await expect(
      guest
        .getByRole("listitem")
        .filter({ hasText: "RT · Tema depois do privado" }),
    ).toBeVisible();
    await expect(guest.getByText(privateTitle)).toHaveCount(0);
    expect(await guest.content()).not.toContain(privateTitle);
  });

  test("after a connection drop the participant converges with what happened meanwhile", async () => {
    await guestContext.setOffline(true);
    await expect(guest.getByTestId("presence")).toHaveAttribute(
      "data-state",
      "offline",
      { timeout: 20_000 },
    );
    const sheet = await openSheet(chair, "open-task-sheet");
    await sheet
      .getByLabel("O que é preciso fazer?")
      .fill("RT · Criada durante a quebra");
    await sheet
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(sheet);
    await submitAction(
      chair,
      sheet.getByRole("button", { name: "Adicionar tarefa" }),
    );
    await guestContext.setOffline(false);
    await expect(guest.getByTestId("presence")).toHaveAttribute(
      "data-state",
      "live",
      { timeout: 30_000 },
    );
    await expect(
      guest
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: "RT · Criada durante a quebra" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("losing organizational scope during the meeting removes access on the next update", async () => {
    const admin = adminClient();
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    await admin
      .from("organizational_assignments")
      .update({ valid_to: yesterday })
      .eq("profile_id", profiles.managerA);
    const { data: assignments } = await admin
      .from("organizational_assignments")
      .select("id")
      .eq("profile_id", profiles.managerA);
    await admin
      .from("restaurant_assignments")
      .update({ valid_to: yesterday })
      .in(
        "organizational_assignment_id",
        (assignments ?? []).map((row) => row.id),
      );

    const agendaForm = chair
      .locator("form")
      .filter({ hasText: "Adicionar à agenda" });
    await agendaForm
      .locator('input[name="title"]')
      .fill("RT · Tema após perda de acesso");
    await submitAction(
      chair,
      agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
    );
    await expect(
      guest.getByRole("heading", { name: "Não tens acesso a este conteúdo" }),
    ).toBeVisible({ timeout: 15_000 });
    await guest.goto(`/meetings/${meetingId}/run`);
    await expect(
      guest.getByRole("heading", { name: "Não tens acesso a este conteúdo" }),
    ).toBeVisible();

    // Leave the seed as we found it for the specs that follow.
    await admin
      .from("restaurant_assignments")
      .update({ valid_to: null })
      .in(
        "organizational_assignment_id",
        (assignments ?? []).map((row) => row.id),
      );
    await admin
      .from("organizational_assignments")
      .update({ valid_to: null })
      .eq("profile_id", profiles.managerA);
  });
});

test.describe
  .serial("Note versions across two sessions of the same person", () => {
  let first: Page;
  let second: Page;
  let secondContext: BrowserContext;
  let meetingId = "";

  test.beforeAll(async ({ browser }) => {
    first = await (await browser.newContext()).newPage();
    secondContext = await browser.newContext();
    second = await secondContext.newPage();
  });

  test("a newer version arriving while typing is signalled, never silently lost", async () => {
    await login(first);
    await first.goto("/meetings/new");
    await first
      .locator('input[name="title"]')
      .fill("RT · Notas em dois dispositivos");
    await pickRestaurantA(first);
    await first.getByRole("button", { name: "Marcar reunião" }).click();
    await first.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    meetingId = first.url().split("/").at(-2)!;
    await submitAction(
      first,
      first.getByRole("button", { name: "Abrir reunião" }),
    );
    await first.getByLabel("Nova nota").fill("Nota inicial");
    await first.getByRole("button", { name: "Adicionar nota" }).click();
    await expect(
      first.getByTestId("meeting-note").filter({ hasText: "Nota inicial" }),
    ).toBeVisible();

    await login(second);
    await second.goto(`/meetings/${meetingId}/run`);
    const noteOnSecond = second
      .getByTestId("meeting-note")
      .filter({ hasText: "Nota inicial" });
    await expect(noteOnSecond).toBeVisible();
    await expect(second.getByTestId("presence")).toHaveAttribute(
      "data-state",
      "live",
    );

    // The second device types while offline, so its autosave cannot win.
    await secondContext.setOffline(true);
    await noteOnSecond
      .locator("textarea")
      .fill("Nota inicial, editada no telemóvel");

    const noteOnFirst = first
      .getByTestId("meeting-note")
      .filter({ hasText: "Nota inicial" });
    await noteOnFirst
      .locator("textarea")
      .fill("Nota inicial, editada no portátil");
    await noteOnFirst.locator("textarea").blur();
    await expect(noteOnFirst.getByTestId("note-save-state")).toHaveText(
      "Guardado",
    );

    await secondContext.setOffline(false);
    const stale = second
      .getByTestId("meeting-note")
      .filter({ hasText: "editada no telemóvel" });
    await expect(stale.getByTestId("note-save-state")).toHaveText(
      "Versão mais recente — rever",
      { timeout: 30_000 },
    );
    await expect(stale.getByTestId("note-stale")).toContainText(
      "editada no portátil",
    );
    await expect(stale.locator("textarea")).toHaveValue(
      "Nota inicial, editada no telemóvel",
    );

    await stale.getByRole("button", { name: "Manter o meu texto" }).click();
    await expect(stale.getByTestId("note-save-state")).toHaveText("Guardado");
    await expect(
      first
        .getByTestId("meeting-note")
        .filter({ hasText: "editada no telemóvel" })
        .locator("textarea"),
    ).toHaveValue("Nota inicial, editada no telemóvel");
  });

  test("a stale save is rejected as a conflict, not overwritten", async () => {
    const admin = adminClient();
    const { data: note } = await admin
      .from("meeting_notes")
      .select("id,version")
      .eq("meeting_session_id", meetingId)
      .single();
    // Bump the version behind the second device's back (simulates a lost signal).
    await admin
      .from("meeting_notes")
      .update({
        content: "Nota alterada noutro sítio",
        version: note!.version + 1,
      })
      .eq("id", note!.id);
    await secondContext.setOffline(true);
    const box = second.getByTestId("meeting-note").locator("textarea");
    await box.fill("Nota escrita sem ver a alteração");
    await secondContext.setOffline(false);
    await box.blur();
    const state = second
      .getByTestId("meeting-note")
      .getByTestId("note-save-state");
    await expect(state).toHaveText(
      /Conflito — rever|Versão mais recente — rever/,
      { timeout: 15_000 },
    );
    await expect(box).toHaveValue("Nota escrita sem ver a alteração");
  });
});
