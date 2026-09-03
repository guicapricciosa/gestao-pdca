import { readFileSync, rmSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { adminClient, login, pickRestaurantA, submitAction } from "./support";

const logFile = `${process.cwd()}/test-results/push-log.jsonl`;

async function runJobs(
  request: Parameters<Parameters<typeof test>[2]>[0]["request"],
) {
  const response = await request.post("/api/jobs/process", {
    headers: { authorization: "Bearer e2e-secret" },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    push: { sent: number; failed: number; skipped: number };
  };
}

function pushLog(): {
  endpoint: string;
  title: string;
  body: string;
  href: string;
}[] {
  try {
    return readFileSync(logFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(line) as {
            endpoint: string;
            title: string;
            body: string;
            href: string;
          },
      );
  } catch {
    return [];
  }
}

test.describe.serial("Web Push", () => {
  const stamp = Date.now();
  const okEndpoint = `https://push.example/ok/${stamp}`;
  const goneEndpoint = `https://push.example/gone/${stamp}`;
  const reservedTitle = `Push · avaliação reservada ${stamp}`;
  const normalTitle = `Push · tarefa normal ${stamp}`;

  test.beforeAll(() => {
    rmSync(logFile, { force: true });
  });

  test("a person registers two devices through the API, sees them, and one is rejected as invalid", async ({
    page,
  }) => {
    await login(page, "manager.a@example.test");
    for (const endpoint of [okEndpoint, goneEndpoint]) {
      const response = await page.request.post("/api/push/subscriptions", {
        data: { endpoint, keys: { p256dh: "BPUSHKEY", auth: "AUTHKEY" } },
      });
      expect(response.ok()).toBe(true);
    }
    const invalid = await page.request.post("/api/push/subscriptions", {
      data: {
        endpoint: "http://insecure.example/x",
        keys: { p256dh: "k", auth: "a" },
      },
    });
    expect(invalid.status()).toBe(400);

    await page.goto("/definicoes");
    await expect(page.getByTestId("push-settings")).toBeVisible();
    await expect(page.getByTestId("push-devices").locator("li")).toHaveCount(2);
  });

  test("another person cannot see or revoke those devices", async ({
    page,
  }) => {
    await login(page, "kitchen.manager.a@example.test");
    const list = await page.request.get("/api/push/subscriptions");
    expect(
      ((await list.json()) as { devices: unknown[] }).devices,
    ).toHaveLength(0);
    const revoke = await page.request.delete("/api/push/subscriptions", {
      data: { endpoint: okEndpoint },
    });
    expect(((await revoke.json()) as { revoked: boolean }).revoked).toBe(false);
  });

  test("a normal notification is pushed with its title; the gone device is cleaned up", async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto("/tasks/new");
    await page.getByLabel("O que é preciso fazer?").fill(normalTitle);
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "Restaurant Manager A" });
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await submitAction(page, page.getByRole("button", { name: "Activar" }));

    const result = await runJobs(request);
    expect(result.push.sent).toBeGreaterThanOrEqual(1);
    const sent = pushLog().filter((entry) => entry.body.includes(normalTitle));
    expect(sent.some((entry) => entry.endpoint === okEndpoint)).toBe(true);
    expect(sent[0]?.title).toBe("Nova tarefa atribuída");
    expect(sent[0]?.href).toMatch(/^\/tasks\/[0-9a-f-]+$/);

    const admin = adminClient();
    const { data: gone } = await admin
      .from("push_subscriptions")
      .select("revoked_at,revoked_reason")
      .eq("endpoint", goneEndpoint)
      .single();
    expect(gone?.revoked_at).not.toBeNull();
    expect(gone?.revoked_reason).toBe("gone");
    const { data: deliveries } = await admin
      .from("notification_deliveries")
      .select(
        "status,subscription:push_subscriptions!notification_deliveries_subscription_id_fkey(endpoint)",
      )
      .in("status", ["sent", "failed"]);
    expect(deliveries?.some((row) => row.status === "sent")).toBe(true);
  });

  test("a RESTRICTED notification never reveals its title on the lock screen", async ({
    page,
    request,
  }) => {
    // Manager A creates a RESTRICTED task for the CEO (who holds restricted read).
    await login(page, "manager.a@example.test");
    await page.request.post("/api/push/subscriptions", {
      data: {
        endpoint: `https://push.example/ok/ceo-${stamp}`,
        keys: { p256dh: "k", auth: "a" },
      },
    });
    await page.goto("/tasks/new");
    await page.getByLabel("O que é preciso fazer?").fill(reservedTitle);
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await page.getByText("Opções avançadas").click();
    await page.locator('select[name="visibility"]').selectOption("RESTRICTED");
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await submitAction(page, page.getByRole("button", { name: "Activar" }));
    await page.context().clearCookies();

    // The CEO registers a device and receives the push.
    await login(page);
    const ceoEndpoint = `https://push.example/ok/ceo-device-${stamp}`;
    await page.request.post("/api/push/subscriptions", {
      data: { endpoint: ceoEndpoint, keys: { p256dh: "k", auth: "a" } },
    });
    await runJobs(request);
    const forCeo = pushLog().filter((entry) => entry.endpoint === ceoEndpoint);
    expect(forCeo.length).toBeGreaterThanOrEqual(1);
    for (const entry of forCeo) {
      expect(entry.title).toBe("Assunto reservado");
      expect(entry.body).not.toContain(reservedTitle);
      expect(entry.body).not.toContain("Restaurant Manager A");
    }
    expect(JSON.stringify(forCeo)).not.toContain(reservedTitle);

    // Push disabled in preferences: nothing more is queued for the CEO.
    await page.goto("/definicoes");
    const form = page.getByTestId("notification-preferences");
    await form.getByLabel("Receber notificações push").uncheck();
    await submitAction(
      page,
      form.getByRole("button", { name: "Guardar preferências" }),
    );
    const before = pushLog().filter(
      (entry) => entry.endpoint === ceoEndpoint,
    ).length;
    await page.goto("/tasks/new");
    await page
      .getByLabel("O que é preciso fazer?")
      .fill(`Push · sem push ${stamp}`);
    await page
      .locator('select[name="responsibleProfileId"]')
      .selectOption({ label: "CEO" });
    await pickRestaurantA(page);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
    await runJobs(request);
    expect(
      pushLog().filter((entry) => entry.endpoint === ceoEndpoint).length,
    ).toBe(before);
    await page.goto("/definicoes");
    await page
      .getByTestId("notification-preferences")
      .getByLabel("Receber notificações push")
      .check();
    await submitAction(
      page,
      page
        .getByTestId("notification-preferences")
        .getByRole("button", { name: "Guardar preferências" }),
    );
  });

  test("the job route rejects a wrong secret", async ({ request }) => {
    const response = await request.post("/api/jobs/process", {
      headers: { authorization: "Bearer nope" },
    });
    expect(response.status()).toBe(401);
  });
});
