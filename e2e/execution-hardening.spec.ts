import { expect, test } from "@playwright/test";

import { adminClient, login, logout } from "./support";

test.describe.serial("authenticated Execution Core hardening", () => {
  test("Task editing, assignments, due date, scope, lifecycle, memberships and attachment", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("Título").fill("E2E Hardened Task");
    await page
      .getByLabel("Descrição")
      .fill("Created through the authenticated browser");
    await page.getByLabel("Prazo").fill("2026-09-20");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar Task" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const taskUrl = page.url();

    const assignments = page
      .locator("form")
      .filter({ hasText: "Owner e Responsible" });
    await assignments
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await assignments
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await assignments
      .getByRole("button", { name: "Guardar atribuições" })
      .click();
    await expect(page.getByText("Versão 2")).toBeVisible();

    const edit = page.locator("form").filter({ hasText: "Editar Task" });
    await edit.locator('input[name="title"]').fill("E2E Hardened Task edited");
    await edit.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(
      page.getByRole("heading", { name: "E2E Hardened Task edited" }),
    ).toBeVisible();

    const due = page.locator("form").filter({ hasText: "Alterar prazo" });
    await due.locator('input[name="newDueDate"]').fill("2026-09-25");
    await due.locator('input[name="reason"]').fill("Planeamento revisto");
    await due.getByRole("button", { name: "Guardar prazo" }).click();
    await expect(
      page.getByRole("heading", { name: "Histórico de prazo" }),
    ).toBeVisible();
    await expect(
      page.getByText("Planeamento revisto", { exact: false }).first(),
    ).toBeVisible();

    const scope = page.locator("form").filter({ hasText: "Alterar scope" });
    await scope.locator('input[name="restaurantIds"]').evaluateAll((boxes) =>
      boxes.forEach((box) => {
        (box as HTMLInputElement).checked = true;
      }),
    );
    await scope
      .locator('input[name="reason"]')
      .fill("Cobertura multi-restaurante");
    await scope.getByRole("button", { name: "Guardar scope" }).click();
    await expect(
      page.getByText("Restaurant A, Restaurant B", { exact: false }),
    ).toBeVisible();

    const members = page
      .locator("section")
      .filter({ hasText: "Collaborators e Watchers" });
    await members
      .locator('select[name="profileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await members
      .locator('select[name="membershipRole"]')
      .selectOption("COLLABORATOR");
    await members.getByRole("button", { name: "Adicionar" }).click();
    await expect(
      members.locator("span").filter({ hasText: "Restaurant Manager A" }),
    ).toBeVisible();
    await members.getByRole("button", { name: "Remover" }).click();

    const upload = page
      .locator("form")
      .filter({ hasText: "Adicionar attachment" });
    await upload.locator('input[type="file"]').setInputFiles({
      name: "evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("authorized evidence"),
    });
    await upload.getByRole("button", { name: "Enviar ficheiro" }).click();
    await expect(
      page.getByRole("link", { name: "evidence.txt" }),
    ).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/attachments/") &&
        response.status() === 307,
    );
    await page.getByRole("link", { name: "evidence.txt" }).click();
    await responsePromise;
    await page.goto(taskUrl);

    const transition = async (status: string, reason = "") => {
      await page.reload();
      const form = page.locator("form").filter({ hasText: "Alterar estado" });
      await form.locator('select[name="status"]').selectOption(status);
      if (reason) await form.locator('input[name="reason"]').fill(reason);
      if (status === "COMPLETED")
        await form
          .locator('textarea[name="completionNotes"]')
          .fill("Validated in E2E");
      await form.getByRole("button", { name: "Guardar transição" }).click();
      await expect(
        page.getByText(status, { exact: true }).first(),
      ).toBeVisible();
    };
    await transition("OPEN");
    await transition("IN_PROGRESS");
    await transition("COMPLETED");
    await transition("OPEN", "Reabertura validada");
    await expect(
      page.getByText("task.reopened", { exact: false }),
    ).toBeVisible();

    const attachmentPath = await page
      .getByRole("link", { name: "evidence.txt" })
      .getAttribute("href");
    await logout(page);
    await login(page, "ricardo.torrao@example.test");
    const deniedDownload = await page.goto(attachmentPath!);
    expect(deniedDownload?.status()).toBe(404);
    expect(await deniedDownload?.text()).toContain("Attachment not found");
  });

  test("PDCA editing, phase, linked Task, completion and reopening", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/pdcas/new");
    await page.getByLabel("Título").fill("E2E Improvement Cycle");
    await page.getByLabel("Descrição").fill("Problem captured in E2E");
    await page.getByLabel("Objetivo").fill("Remove recurrent failure");
    await page.getByLabel("Prazo").fill("2026-10-01");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar PDCA" }).click();
    await page.waitForURL(/\/pdcas\/[0-9a-f-]+$/);

    const assignments = page
      .locator("form")
      .filter({ hasText: "Owner e Responsible" });
    await assignments
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await assignments
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await assignments
      .getByRole("button", { name: "Guardar atribuições" })
      .click();
    await expect(page.getByText("Versão 2")).toBeVisible();

    const phase = page.locator("form").filter({ hasText: "Mudar fase PDCA" });
    await phase.locator('select[name="phase"]').selectOption("DO");
    await phase.getByRole("button", { name: "Guardar fase" }).click();
    await expect(page.getByText("DO", { exact: true }).first()).toBeVisible();

    const pdcaUrl = page.url();
    await page.getByRole("link", { name: "Adicionar Task ao PDCA" }).click();
    await page.getByLabel("Título").fill("E2E PDCA child task");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar Task" }).click();
    await page.goto(pdcaUrl);
    await expect(page.getByText("E2E PDCA child task")).toBeVisible();

    for (const nextPhase of ["CHECK", "ACT"]) {
      await page.reload();
      const nextPhaseForm = page
        .locator("form")
        .filter({ hasText: "Mudar fase PDCA" });
      await nextPhaseForm
        .locator('select[name="phase"]')
        .selectOption(nextPhase);
      await nextPhaseForm.getByRole("button", { name: "Guardar fase" }).click();
      await expect(
        page.getByText(nextPhase, { exact: true }).first(),
      ).toBeVisible();
    }

    await page.reload();
    const edit = page.locator("form").filter({ hasText: "Editar PDCA" });
    await edit
      .locator('textarea[name="actualResult"]')
      .fill("Expected outcome confirmed by evidence");
    await edit.getByRole("button", { name: "Guardar alterações" }).click();

    const transition = async (status: string, reason = "") => {
      await page.reload();
      const form = page.locator("form").filter({ hasText: "Alterar estado" });
      await form.locator('select[name="status"]').selectOption(status);
      if (reason) await form.locator('input[name="reason"]').fill(reason);
      if (status === "COMPLETED")
        await form
          .locator('textarea[name="completionNotes"]')
          .fill("Cycle completed");
      await form.getByRole("button", { name: "Guardar transição" }).click();
      await expect(
        page.getByText(status, { exact: true }).first(),
      ).toBeVisible();
    };
    await transition("OPEN");
    await transition("IN_PROGRESS");
    await transition("COMPLETED");
    await transition("OPEN", "Novo ciclo necessário");
    await expect(
      page.getByText("pdca.reopened", { exact: false }),
    ).toBeVisible();
  });

  test("browser hides PRIVATE and RESTRICTED records and reflects grant revocation", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("Título").fill("E2E Private Task");
    await page.getByLabel("Visibilidade").selectOption("PRIVATE");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar Task" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const privateUrl = page.url();

    await page.goto("/tasks/new");
    await page.getByLabel("Título").fill("E2E Restricted Task");
    await page.getByLabel("Visibilidade").selectOption("RESTRICTED");
    await page.getByText("Operations and Logistics", { exact: true }).click();
    await page.getByText("Restaurant A", { exact: true }).click();
    await page.getByRole("button", { name: "Criar Task" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const restrictedUrl = page.url();

    const taskId = privateUrl.split("/").at(-1)!;
    await logout(page);
    await login(page, "manager.a@example.test");
    await page.goto(privateUrl);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await page.goto(restrictedUrl);
    await expect(page.getByText("This page could not be found.")).toBeVisible();

    const admin = adminClient();
    const { data: task } = await admin
      .from("tasks")
      .select("security_object_id")
      .eq("id", taskId)
      .single();
    const { data: permission } = await admin
      .from("permissions")
      .select("id")
      .eq("permission_key", "task.read")
      .single();
    const { data: grant, error } = await admin
      .from("explicit_access_grants")
      .insert({
        security_object_id: task!.security_object_id,
        grantee_profile_id: "21000000-0000-0000-0000-000000000017",
        permission_id: permission!.id,
        granted_by_profile_id: "21000000-0000-0000-0000-000000000001",
        reason: "E2E authorized exception",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    await page.goto(privateUrl);
    await expect(
      page.getByRole("heading", { name: "E2E Private Task" }),
    ).toBeVisible();

    await admin
      .from("explicit_access_grants")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by_profile_id: "21000000-0000-0000-0000-000000000001",
      })
      .eq("id", grant!.id);
    await page.goto(privateUrl);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
