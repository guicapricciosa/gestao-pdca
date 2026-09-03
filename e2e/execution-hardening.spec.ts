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

test.describe.serial("Tasks and PDCAs in the simplified UI", () => {
  test("Task: create, change due date, block, unblock, complete, reopen, advanced options and attachment", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page
      .getByLabel("O que é preciso fazer?")
      .fill("E2E Tarefa endurecida");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await page.locator('input[name="dueDate"]').fill("2026-09-20");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const taskUrl = page.url();
    await expect(
      page.getByRole("heading", { name: "E2E Tarefa endurecida" }),
    ).toBeVisible();
    await expect(
      page.getByText("Responsável", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Rascunho", { exact: true }).first(),
    ).toBeVisible();

    // Verbs, not lifecycle codes.
    await submitAction(page, page.getByRole("button", { name: "Activar" }));
    await expect(
      page.getByText("Aberta", { exact: true }).first(),
    ).toBeVisible();
    await submitAction(page, page.getByRole("button", { name: "Começar" }));
    await expect(
      page.getByText("Em curso", { exact: true }).first(),
    ).toBeVisible();

    let sheet = await openSheet(page, "open-due-sheet");
    await sheet.locator('input[name="newDueDate"]').fill("2026-09-25");
    await sheet.locator('input[name="reason"]').fill("Planeamento revisto");
    await submitAction(
      page,
      sheet.getByRole("button", { name: "Guardar prazo" }),
    );
    await page.locator("summary").filter({ hasText: "Histórico" }).click();
    await expect(page.getByText("Planeamento revisto").first()).toBeVisible();

    sheet = await openSheet(page, "open-block-sheet");
    await sheet
      .locator('textarea[name="reason"], input[name="reason"]')
      .first()
      .fill("Fornecedor sem resposta");
    await submitAction(page, sheet.getByRole("button", { name: "Bloquear" }));
    await expect(
      page.getByText("Bloqueada", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Fornecedor sem resposta").first(),
    ).toBeVisible();

    sheet = await openSheet(page, "open-unblock-sheet");
    await submitAction(
      page,
      sheet.getByRole("button", { name: "Desbloquear e retomar" }),
    );
    await expect(
      page.getByText("Em curso", { exact: true }).first(),
    ).toBeVisible();

    sheet = await openSheet(page, "open-complete-sheet");
    await sheet
      .locator('textarea[name="completionNotes"]')
      .fill("Validado em E2E");
    await submitAction(
      page,
      sheet.getByRole("button", { name: "Confirmar conclusão" }),
    );
    await expect(
      page.getByText("Concluída", { exact: true }).first(),
    ).toBeVisible();

    // Reopen lives under "Mais".
    await page.getByText("Mais ▾").click();
    const more = page
      .locator("form")
      .filter({ has: page.locator('select[name="status"]') });
    await more.locator('select[name="status"]').selectOption("OPEN");
    await more.locator('input[name="reason"]').fill("Reabertura validada");
    await submitAction(page, more.getByRole("button"));
    await expect(
      page.getByText("Aberta", { exact: true }).first(),
    ).toBeVisible();
    await page.locator("summary").filter({ hasText: "Histórico" }).click();
    await expect(page.getByText(/Reabert/).first()).toBeVisible();

    // Advanced options: edit, scope, members. Labels in Portuguese, no codes.
    await page.getByTestId("advanced-options").locator("summary").click();
    const edit = page.locator("form").filter({ hasText: "Editar tarefa" });
    await edit
      .locator('input[name="title"]')
      .fill("E2E Tarefa endurecida editada");
    await submitAction(
      page,
      edit.getByRole("button", { name: "Guardar alterações" }),
    );
    await expect(
      page.getByRole("heading", { name: "E2E Tarefa endurecida editada" }),
    ).toBeVisible();

    await page.getByTestId("advanced-options").locator("summary").click();
    const scope = page.locator("form").filter({ hasText: "Onde se aplica" });
    await scope.locator('input[name="restaurantIds"]').evaluateAll((boxes) =>
      boxes.forEach((box) => {
        (box as HTMLInputElement).checked = true;
      }),
    );
    await scope
      .locator('input[name="reason"]')
      .fill("Cobertura multi-restaurante");
    await submitAction(
      page,
      scope.getByRole("button", { name: "Guardar âmbito" }),
    );
    await expect(
      page.getByText("Restaurant A, Restaurant B", { exact: false }).first(),
    ).toBeVisible();

    await page.getByTestId("advanced-options").locator("summary").click();
    const members = page
      .locator("section")
      .filter({ hasText: "Colaboradores e seguidores" });
    await members
      .locator('select[name="profileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await members
      .locator('select[name="membershipRole"]')
      .selectOption("COLLABORATOR");
    await submitAction(
      page,
      members.getByRole("button", { name: "Adicionar" }),
    );
    await page.getByTestId("advanced-options").locator("summary").click();
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Colaboradores e seguidores" })
        .locator("span")
        .filter({ hasText: "Restaurant Manager A" }),
    ).toBeVisible();

    // Progress: a comment and an attachment.
    const progress = page
      .locator("form")
      .filter({ hasText: "Publicar actualização" });
    await progress
      .locator('textarea[name="body"]')
      .fill("Ponto de situação E2E");
    await submitAction(
      page,
      progress.getByRole("button", { name: "Publicar actualização" }),
    );
    await expect(page.getByText("Ponto de situação E2E")).toBeVisible();

    const upload = page.locator("form").filter({ hasText: "Anexar ficheiro" });
    await upload.locator('input[type="file"]').setInputFiles({
      name: "evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("authorized evidence"),
    });
    await upload.getByRole("button", { name: "Anexar ficheiro" }).click();
    await expect(
      page.getByRole("link", { name: "evidence.txt" }),
    ).toBeVisible();
    const attachmentPath = await page
      .getByRole("link", { name: "evidence.txt" })
      .getAttribute("href");
    await page.goto(taskUrl);

    await logout(page);
    await login(page, "ricardo.torrao@example.test");
    const denied = await page.goto(attachmentPath!);
    expect(denied?.status()).toBe(404);
  });

  test("PDCA: phases with only the relevant fields, child task, completion and reopening", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/pdcas/new");
    await page
      .getByLabel("Qual é o problema?")
      .fill("E2E Ciclo de melhoria: falhas recorrentes no fecho");
    await page
      .getByLabel("O que queremos atingir?")
      .fill("Zero falhas em 30 dias.");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await page
      .locator('select[name="ownerProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar PDCA" }).click();
    await page.waitForURL(/\/pdcas\/[0-9a-f-]+$/);
    const pdcaUrl = page.url();
    await expect(
      page.getByRole("heading", { name: /E2E Ciclo de melhoria/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Planear/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Plan fields are editable in place.
    await page
      .getByLabel("Causa raiz ou hipótese")
      .fill("Checklist de fecho incompleta");
    await submitAction(
      page,
      page.getByRole("button", { name: "Guardar planear" }),
    );
    await expect(page.getByLabel("Causa raiz ou hipótese")).toHaveValue(
      "Checklist de fecho incompleta",
    );

    await submitAction(page, page.getByRole("button", { name: "Activar" }));
    await submitAction(page, page.getByRole("button", { name: "Começar" }));
    await submitAction(
      page,
      page.getByRole("button", { name: "Avançar para Fazer" }),
    );
    await expect(page.getByRole("link", { name: /Fazer/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.getByRole("link", { name: "+ Tarefa" }).click();
    await page.waitForURL(/\/tasks\/new\?pdcaId=/);
    await page.getByLabel("O que é preciso fazer?").fill("E2E Tarefa do PDCA");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await page.goto(pdcaUrl);
    await expect(
      page.getByRole("link", { name: "E2E Tarefa do PDCA" }),
    ).toBeVisible();

    await submitAction(
      page,
      page.getByRole("button", { name: "Avançar para Verificar" }),
    );
    await page
      .getByLabel("Resultado real")
      .fill("Resultado confirmado por evidência");
    await submitAction(
      page,
      page.getByRole("button", { name: "Guardar verificar" }),
    );
    await submitAction(
      page,
      page.getByRole("button", { name: "Avançar para Actuar" }),
    );
    await expect(page.getByRole("link", { name: /Actuar/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const sheet = await openSheet(page, "open-complete-sheet");
    await sheet
      .locator('textarea[name="completionNotes"]')
      .fill("Ciclo concluído");
    await submitAction(
      page,
      sheet.getByRole("button", { name: "Confirmar conclusão" }),
    );
    await expect(
      page.getByText("Concluído", { exact: true }).first(),
    ).toBeVisible();

    await page.getByText("Mais ▾").click();
    const more = page
      .locator("form")
      .filter({ has: page.locator('select[name="status"]') });
    await more.locator('select[name="status"]').selectOption("OPEN");
    await more.locator('input[name="reason"]').fill("Novo ciclo necessário");
    await submitAction(page, more.getByRole("button"));
    await expect(
      page.getByText("Aberto", { exact: true }).first(),
    ).toBeVisible();
  });

  test("PRIVATE stays creator-only; RESTRICTED keeps the creator and hides from others; grants are honoured", async ({
    page,
  }) => {
    // The Restaurant Manager creates a RESTRICTED task and keeps it.
    await login(page, "manager.a@example.test");
    await page.goto("/tasks/new");
    await page
      .getByLabel("O que é preciso fazer?")
      .fill("E2E Tarefa restrita do gerente");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await page.getByText("Opções avançadas").click();
    await page.locator('select[name="visibility"]').selectOption("RESTRICTED");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const restrictedUrl = page.url();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "E2E Tarefa restrita do gerente" }),
    ).toBeVisible();
    await page.goto("/tasks");
    await expect(
      page.getByRole("link", { name: "E2E Tarefa restrita do gerente" }),
    ).toBeVisible();
    await logout(page);

    // A PRIVATE task created by the CEO.
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("O que é preciso fazer?").fill("E2E Tarefa privada");
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await page.getByText("Opções avançadas").click();
    await page.locator('select[name="visibility"]').selectOption("PRIVATE");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    const privateUrl = page.url();
    const taskId = privateUrl.split("/").at(-1)!;
    // The CEO holds restricted read and sees the manager's restricted task.
    await page.goto(restrictedUrl);
    await expect(
      page.getByRole("heading", { name: "E2E Tarefa restrita do gerente" }),
    ).toBeVisible();
    await logout(page);

    // The Kitchen Manager at Restaurant A covers the scope but neither created
    // the restricted task nor holds restricted read.
    await login(page, "kitchen.manager.a@example.test");
    await page.goto(restrictedUrl);
    await expect(
      page.getByRole("heading", { name: "Não tens acesso a este conteúdo" }),
    ).toBeVisible();
    await logout(page);

    await login(page, "manager.a@example.test");
    await page.goto(privateUrl);
    await expect(
      page.getByRole("heading", { name: "Não tens acesso a este conteúdo" }),
    ).toBeVisible();

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
        grantee_profile_id: profiles.managerA,
        permission_id: permission!.id,
        granted_by_profile_id: profiles.ceo,
        reason: "E2E authorized exception",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    await page.goto(privateUrl);
    await expect(
      page.getByRole("heading", { name: "E2E Tarefa privada" }),
    ).toBeVisible();

    await admin
      .from("explicit_access_grants")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by_profile_id: profiles.ceo,
      })
      .eq("id", grant!.id);
    await page.goto(privateUrl);
    await expect(
      page.getByRole("heading", { name: "Não tens acesso a este conteúdo" }),
    ).toBeVisible();

    // No silent grant was created for the restricted creator.
    const { data: restricted } = await admin
      .from("tasks")
      .select("security_object_id")
      .eq("title", "E2E Tarefa restrita do gerente")
      .single();
    const { count } = await admin
      .from("explicit_access_grants")
      .select("id", { count: "exact", head: true })
      .eq("security_object_id", restricted!.security_object_id);
    expect(count).toBe(0);
  });
});
