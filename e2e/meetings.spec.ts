import { expect, test } from "@playwright/test";

import { adminClient, login, logout } from "./support";

test.describe.serial("Meeting to execution and follow-up", () => {
  let seriesId = "";
  let firstSessionId = "";
  let pdcaId = "";

  test("creates Series and Session, runs, reviews, publishes and closes a meeting", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meeting-series/new");
    await page.getByLabel("Título").fill("E2E Weekly Direction");
    await page.getByLabel("Descrição").fill("Authenticated end-to-end meeting");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar série" }).click();
    await page.waitForURL(/\/meeting-series\/[0-9a-f-]+$/);
    seriesId = page.url().split("/").at(-1)!;

    await page.getByRole("link", { name: "Criar próxima sessão" }).click();
    await page.getByLabel("Título").fill("E2E Weekly Direction · Session 1");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar sessão" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
    firstSessionId = page.url().split("/").at(-1)!;

    await page
      .getByLabel("Novo participante")
      .selectOption({ label: "Restaurant Manager A" });
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Novo participante") })
      .getByRole("button", { name: "Adicionar" })
      .click();
    await expect(
      page.getByText("Restaurant Manager A · PARTICIPANT"),
    ).toBeVisible();

    await page.getByRole("link", { name: "Meeting Mode" }).click();
    const agendaForm = page
      .locator("form")
      .filter({ hasText: "Adicionar à agenda" });
    await agendaForm.locator('input[name="title"]').fill("Execution review");
    await agendaForm
      .locator('textarea[name="description"]')
      .fill("Review responsibilities and deadlines");
    await agendaForm
      .getByRole("button", { name: "Adicionar à agenda" })
      .click();
    await expect(
      page.getByText("Execution review", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Detalhe" }).click();
    const lifecycle = page.locator("form").filter({ hasText: "Lifecycle" });
    await lifecycle.locator('select[name="status"]').selectOption("SCHEDULED");
    await lifecycle.getByRole("button", { name: "Aplicar transição" }).click();
    await page.getByRole("link", { name: "Meeting Mode" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Meeting Mode · IN_PROGRESS")).toBeVisible();

    const noteForm = page.locator("form").filter({ hasText: "Adicionar nota" });
    await noteForm
      .locator('textarea[name="content"]')
      .fill("Execution risks reviewed with the team.");
    await noteForm.getByRole("button", { name: "Adicionar nota" }).click();
    await expect(
      page.locator('textarea[name="content"]').filter({
        hasText: "Execution risks reviewed with the team.",
      }),
    ).toBeVisible();

    const agendaOutcome = page
      .locator("article")
      .filter({ hasText: "Execution review" })
      .locator("form");
    await agendaOutcome
      .locator('select[name="status"]')
      .selectOption("DISCUSSED");
    await agendaOutcome
      .getByRole("button", { name: "Guardar outcome" })
      .click();

    const decision = page.locator("form").filter({ hasText: "Quick Decision" });
    await decision.locator('input[name="title"]').fill("E2E Meeting Decision");
    await decision
      .locator('textarea[name="description"]')
      .fill("Proceed with controlled rollout");
    await decision
      .getByRole("button", { name: "Criar Decision draft" })
      .click();
    await expect(
      page.getByText("E2E Meeting Decision", { exact: true }).first(),
    ).toBeVisible();

    const task = page.locator("form").filter({ hasText: "Quick Task" });
    await task.locator('input[name="title"]').fill("E2E Meeting Task");
    await task
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await task
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await task.locator('input[name="dueDate"]').fill("2026-09-30");
    await task.getByRole("button", { name: "Criar Task draft" }).click();
    await expect(
      page.getByText("E2E Meeting Task", { exact: true }).first(),
    ).toBeVisible();

    const pdca = page.locator("form").filter({ hasText: "Quick PDCA" });
    await pdca.locator('input[name="title"]').fill("E2E Meeting PDCA");
    await pdca
      .locator('textarea[name="description"]')
      .fill("Repeated operational incident");
    await pdca
      .locator('textarea[name="objective"]')
      .fill("Eliminate recurrence");
    await pdca
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await pdca
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await pdca.locator('input[name="dueDate"]').fill("2026-10-15");
    await pdca.getByRole("button", { name: "Criar PDCA draft" }).click();
    await expect(
      page.getByText("E2E Meeting PDCA", { exact: true }).first(),
    ).toBeVisible();

    const admin = adminClient();
    const { data: pdcaRecord } = await admin
      .from("pdcas")
      .select("id")
      .eq("title", "E2E Meeting PDCA")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    pdcaId = pdcaRecord!.id;

    await page.getByRole("button", { name: "Review" }).click();
    await page.goto(`/meetings/${firstSessionId}/review`);
    await expect(page.getByText("E2E Meeting Task")).toBeVisible();
    await page.getByRole("button", { name: "Publish Meeting" }).click();
    await page.goto(`/meetings/${firstSessionId}`);
    await expect(
      page.getByText("PUBLISHED", { exact: true }).first(),
    ).toBeVisible();
    const close = page.locator("form").filter({ hasText: "Lifecycle" });
    await close.locator('select[name="status"]').selectOption("CLOSED");
    await close.getByRole("button", { name: "Aplicar transição" }).click();
    await expect(
      page.getByText("CLOSED", { exact: true }).first(),
    ).toBeVisible();

    await page.goto("/my-work");
    await expect(page.getByText("E2E Meeting Task").first()).toBeVisible();
    await expect(page.getByText("E2E Meeting PDCA").first()).toBeVisible();
  });

  test("reuses one PDCA in a second session without duplication", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/meetings/new?seriesId=${seriesId}`);
    await page.getByLabel("Título").fill("E2E Weekly Direction · Session 2");
    await page.getByLabel("Início").fill("2026-10-01T10:00");
    await page.getByLabel("Fim").fill("2026-10-01T11:00");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar sessão" }).click();
    await page.getByRole("link", { name: "Meeting Mode" }).click();
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Pending anterior" })
        .locator("p.font-medium")
        .filter({ hasText: "E2E Meeting PDCA" }),
    ).toBeVisible();

    const link = page.locator("form").filter({ hasText: "Associar existente" });
    const admin = adminClient();
    const { data: pdcaRecord } = await admin
      .from("pdcas")
      .select("security_object_id")
      .eq("id", pdcaId)
      .single();
    await link
      .locator('select[name="securityObjectId"]')
      .selectOption(pdcaRecord!.security_object_id);
    await link.locator('select[name="relationType"]').selectOption("FOLLOW_UP");
    await link.getByRole("button", { name: "Associar sem duplicar" }).click();
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Objetos ligados" })
        .getByText("E2E Meeting PDCA", { exact: true }),
    ).toBeVisible();

    const { count } = await admin
      .from("pdcas")
      .select("id", { count: "exact", head: true })
      .eq("id", pdcaId);
    expect(count).toBe(1);
    const { count: linkCount } = await admin
      .from("meeting_object_links")
      .select("id", { count: "exact", head: true })
      .eq("security_object_id", pdcaRecord!.security_object_id);
    expect(linkCount).toBe(2);
  });

  test("a participant who loses organizational scope loses browser access", async ({
    page,
  }) => {
    await login(page, "manager.a@example.test");
    await page.goto(`/meetings/${firstSessionId}`);
    await expect(
      page.getByRole("heading", { name: "E2E Weekly Direction · Session 1" }),
    ).toBeVisible();
    await logout(page);

    const admin = adminClient();
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    await admin
      .from("organizational_assignments")
      .update({ valid_to: yesterday })
      .eq("profile_id", "21000000-0000-0000-0000-000000000017");
    const { data: assignments } = await admin
      .from("organizational_assignments")
      .select("id")
      .eq("profile_id", "21000000-0000-0000-0000-000000000017");
    await admin
      .from("restaurant_assignments")
      .update({ valid_to: yesterday })
      .in(
        "organizational_assignment_id",
        (assignments ?? []).map((assignment) => assignment.id),
      );

    await login(page, "manager.a@example.test");
    await page.goto(`/meetings/${firstSessionId}`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
