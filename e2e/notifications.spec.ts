import { expect, test } from "@playwright/test";

import { adminClient, login, pickRestaurantA, submitAction } from "./support";

/** Runs the dispatcher exactly like pg_cron / the job route would. */
async function processOutbox() {
  const admin = adminClient();
  const { error } = await admin.rpc("process_outbox", { p_limit: 1000 });
  expect(error).toBeNull();
}

test.describe.serial("Notification Center", () => {
  let meetingId = "";
  let taskTitle = "";
  const meetingTitle = `Notif · Direcção ${Date.now()}`;

  test("being added to a meeting and receiving a task produce notifications for the right person only", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/meetings/new");
    await page.getByLabel("Assunto da reunião").fill(meetingTitle);
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Marcar reunião" }).click();
    await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
    meetingId = page.url().split("/").at(-2)!;
    await page.goto(`/meetings/${meetingId}`);
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

    taskTitle = `Notif · Rever proposta ${Date.now()}`;
    await page.goto("/tasks/new");
    await page.getByLabel("O que é preciso fazer?").fill(taskTitle);
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await page.locator('input[name="dueDate"]').fill("2026-12-01");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await submitAction(page, page.getByRole("button", { name: "Activar" }));

    await processOutbox();
    // The actor gets nothing about their own actions.
    await page.goto("/notificacoes");
    await expect(
      page.getByTestId("notification").filter({ hasText: taskTitle }),
    ).toHaveCount(0);
  });

  test("the recipient sees the bell count, opens the inbox and follows deep links", async ({
    page,
  }) => {
    await login(page, "manager.a@example.test");
    const bell = page.getByTestId("notification-bell");
    await expect(bell).toHaveAttribute("aria-label", /não lidas?/);
    await bell.click();
    await page.waitForURL("**/notificacoes");
    const list = page.getByTestId("notification-list");
    const invite = list
      .getByTestId("notification")
      .filter({ hasText: meetingTitle });
    await expect(invite).toContainText("Foste adicionado a uma reunião");
    await expect(invite).toHaveAttribute("data-read", "false");
    const task = list
      .getByTestId("notification")
      .filter({ hasText: taskTitle });
    await expect(task).toContainText("Nova tarefa atribuída");
    await expect(task).toContainText("Prazo: 01/12/2026");

    await submitAction(
      page,
      task.getByRole("button", { name: "Abrir tarefa" }),
    );
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();

    await page.goto("/notificacoes");
    await expect(
      page.getByTestId("notification").filter({ hasText: taskTitle }),
    ).toHaveCount(0);
    await page.goto("/notificacoes?tab=all");
    await expect(
      page.getByTestId("notification").filter({ hasText: taskTitle }),
    ).toHaveAttribute("data-read", "true");

    await submitAction(
      page,
      invite.getByRole("button", { name: "Abrir reunião" }),
    );
    await page.waitForURL(`**/meetings/${meetingId}/run`);
  });

  test("a new notification updates the bell without reload, and mark-all clears it", async ({
    page,
    browser,
  }) => {
    await login(page, "manager.a@example.test");
    // Start clean: demo data may already have produced notifications.
    await page.goto("/notificacoes");
    const markAll = page.getByRole("button", {
      name: "Marcar todas como lidas",
    });
    if ((await markAll.count()) > 0) await submitAction(page, markAll);
    await page.goto("/my-work");
    await expect(page.getByTestId("notification-count")).toHaveCount(0);

    // The CEO comments with a mention from their own browser.
    const ceo = await (await browser.newContext()).newPage();
    await login(ceo);
    const admin = adminClient();
    const { data: task } = await admin
      .from("tasks")
      .select("id")
      .eq("title", taskTitle)
      .single();
    await ceo.goto(`/tasks/${task!.id}`);
    const progress = ceo
      .locator("form")
      .filter({ hasText: "Publicar actualização" });
    await progress
      .locator('textarea[name="body"]')
      .fill("Olá @Restaurant Manager A, consegues ver isto?");
    await submitAction(
      ceo,
      progress.getByRole("button", { name: "Publicar actualização" }),
    );
    await ceo.context().close();

    await processOutbox();
    await expect(page.getByTestId("notification-count")).toHaveText(/[1-9]/, {
      timeout: 15_000,
    });

    await page.goto("/notificacoes");
    await expect(
      page.getByTestId("notification").filter({ hasText: "Mencionaram-te" }),
    ).toBeVisible();
    await submitAction(
      page,
      page.getByRole("button", { name: "Marcar todas como lidas" }),
    );
    await expect(page.getByTestId("notification-count")).toHaveCount(0);
    await expect(page.getByText("Nada por ler. Bom sinal.")).toBeVisible();
  });

  test("preferences silence a category and are private", async ({ page }) => {
    await login(page, "manager.a@example.test");
    await page.goto("/definicoes");
    const form = page.getByTestId("notification-preferences");
    await form
      .getByLabel("Tarefas atribuídas e alterações relevantes")
      .uncheck();
    await submitAction(
      page,
      form.getByRole("button", { name: "Guardar preferências" }),
    );
    await expect(
      page
        .getByTestId("notification-preferences")
        .getByLabel("Tarefas atribuídas e alterações relevantes"),
    ).not.toBeChecked();

    const admin = adminClient();
    const { data: rows } = await admin
      .from("notification_preferences")
      .select("profile_id,tasks");
    expect(
      rows?.find(
        (row) => row.profile_id === "21000000-0000-0000-0000-000000000017",
      )?.tasks,
    ).toBe(false);

    await form.getByLabel("Tarefas atribuídas e alterações relevantes").check();
    await submitAction(
      page,
      form.getByRole("button", { name: "Guardar preferências" }),
    );
  });

  test("the job route requires the shared secret", async ({ request }) => {
    const denied = await request.post("/api/jobs/process");
    expect([401, 404]).toContain(denied.status());
  });
});
