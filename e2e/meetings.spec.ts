import { expect, test } from "@playwright/test";

import {
  adminClient,
  login,
  logout,
  openSheet,
  pickRestaurantA,
  profiles,
  submitAction,
} from "./support";

test.describe
  .serial("Recurring meetings: pending topics and shared subjects", () => {
  let firstId = "";
  let secondId = "";
  let pdcaSecurityObjectId = "";

  test("a weekly meeting leaves a pending topic and a PDCA for the next one", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meetings/new");
    await page.getByLabel("Assunto da reunião").fill("E2E Direcção semanal");
    await page.locator('select[name="repeat"]').selectOption("WEEKLY");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Marcar reunião" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    firstId = page.url().split("/").at(-2)!;

    // Participants live in "Mais" (the meeting page), not in the meeting flow.
    await page.goto(`/meetings/${firstId}`);
    await page
      .getByLabel("Novo participante")
      .selectOption({ label: "Restaurant Manager A" });
    await submitAction(
      page,
      page
        .locator("form")
        .filter({ has: page.getByLabel("Novo participante") })
        .getByRole("button", { name: "Adicionar" }),
    );
    await expect(page.getByText("Restaurant Manager A").first()).toBeVisible();
    await page.getByRole("link", { name: "Entrar na reunião" }).click();
    await page.waitForURL(`**/meetings/${firstId}/run`);

    await submitAction(
      page,
      page.getByRole("button", { name: "Abrir reunião" }),
    );
    const agendaForm = page
      .locator("form")
      .filter({ hasText: "Adicionar à agenda" });
    await agendaForm
      .locator('input[name="title"]')
      .fill("E2E Tema que fica pendente");
    await submitAction(
      page,
      agendaForm.getByRole("button", { name: "Adicionar à agenda" }),
    );

    const sheet = await openSheet(page, "open-pdca-sheet");
    await sheet
      .getByLabel("Qual é o problema?")
      .fill("E2E Incidente operacional repetido");
    await sheet
      .getByLabel("O que queremos atingir?")
      .fill("Eliminar a recorrência.");
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
      page
        .getByTestId("created-in-meeting")
        .getByRole("link", { name: /Incidente operacional/ }),
    ).toBeVisible();

    const admin = adminClient();
    const { data: session } = await admin
      .from("meeting_sessions")
      .select("meeting_series_id")
      .eq("id", firstId)
      .single();
    const { data: pdca } = await admin
      .from("pdcas")
      .select("security_object_id")
      .ilike("title", "E2E Incidente operacional%")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    pdcaSecurityObjectId = pdca!.security_object_id;

    // Next meeting of the same series, marked before the first one ends.
    await page.goto(`/meetings/new?seriesId=${session!.meeting_series_id}`);
    await page
      .getByLabel("Assunto da reunião")
      .fill("E2E Direcção semanal · 2");
    await page.getByLabel("Início").fill("2026-10-01T10:00");
    await page.getByLabel("Fim").fill("2026-10-01T11:00");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Marcar reunião" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    secondId = page.url().split("/").at(-2)!;
    expect(secondId).not.toBe(firstId);

    // Finish the first: the pending topic is explicitly carried forward.
    await page.goto(`/meetings/${firstId}/finish`);
    await expect(page.getByTestId("finish-blocking")).toHaveCount(0);
    const agenda = page.getByTestId("finish-agenda");
    await expect(
      agenda.getByLabel("Levar para a próxima reunião"),
    ).toBeChecked();
    await submitAction(
      page,
      page.getByRole("button", { name: "Terminar e distribuir" }),
    );
    await page.waitForURL(`**/meetings/${firstId}?finished=1`);
    await expect(page.getByTestId("meeting-finished")).toBeVisible();
    await expect(
      page.getByText("Terminada", { exact: true }).first(),
    ).toBeVisible();
  });

  test("the next meeting shows the pending topic and links the PDCA without duplicating it", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/meetings/${secondId}/run`);
    const pending = page.getByTestId("previous-pending");
    await expect(pending).toContainText("E2E Tema que fica pendente");
    await submitAction(
      page,
      pending.getByRole("button", { name: "Trazer para hoje" }).first(),
    );
    await expect(
      page.getByTestId("previous-pending").getByRole("button", {
        name: "Trazer para hoje",
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("E2E Tema que fica pendente").first(),
    ).toBeVisible();

    const link = page
      .locator("form")
      .filter({ has: page.locator('select[name="securityObjectId"]') });
    await page.getByText("Ligar um assunto já existente").click();
    await link
      .locator('select[name="securityObjectId"]')
      .selectOption(pdcaSecurityObjectId);
    await link.locator('select[name="relationType"]').selectOption("FOLLOW_UP");
    await submitAction(page, link.getByRole("button"));
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Assuntos ligados" })
        .getByText(/Incidente operacional/)
        .first(),
    ).toBeVisible();

    const admin = adminClient();
    const { count } = await admin
      .from("pdcas")
      .select("id", { count: "exact", head: true })
      .eq("security_object_id", pdcaSecurityObjectId);
    expect(count).toBe(1);
    const { count: links } = await admin
      .from("meeting_object_links")
      .select("id", { count: "exact", head: true })
      .eq("security_object_id", pdcaSecurityObjectId);
    expect(links).toBe(2);
  });

  test("a participant who loses organizational scope loses browser access", async ({
    page,
  }) => {
    await login(page, "manager.a@example.test");
    await page.goto(`/meetings/${firstId}`);
    await expect(
      page.getByRole("heading", { name: "E2E Direcção semanal" }),
    ).toBeVisible();
    await logout(page);

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

    await login(page, "manager.a@example.test");
    await page.goto(`/meetings/${firstId}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
