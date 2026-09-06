import { expect, test } from "@playwright/test";

import { adminClient, login, pickRestaurantA, submitAction } from "./support";

test("a meeting can be deleted by its creator and lives on in the audit trail", async ({
  page,
}) => {
  const title = `E2E Reunião a apagar ${Date.now()}`;
  await login(page);
  await page.goto("/meetings/new");
  await page.locator('input[name="title"]').fill(title);
  await pickRestaurantA(page);
  await page.getByRole("button", { name: "Marcar reunião" }).click();
  await page.waitForURL(/\/meetings\/[0-9a-f-]+\/run$/);
  const id = page.url().split("/").at(-2)!;

  await page.goto(`/meetings/${id}`);
  await page.getByText("Opções avançadas").click();
  const form = page.getByTestId("delete-meeting-form");
  await form.locator('input[name="reason"]').fill("marcada por engano");
  await submitAction(
    page,
    form.getByRole("button", { name: "Apagar reunião" }),
  );
  await page.waitForURL(/\/meetings(\?saved=1)?$/);

  await page.goto("/meetings?period=all");
  await expect(page.getByText(title)).toHaveCount(0);
  await page.goto(`/pesquisa?q=${encodeURIComponent("Reunião a apagar")}`);
  await expect(page.getByText(title)).toHaveCount(0);
  await page.goto(`/meetings/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(title);

  const admin = adminClient();
  const { data: events } = await admin
    .from("audit_events")
    .select("action,reason,before_data")
    .eq("subject_id", id)
    .eq("action", "meeting.deleted");
  expect(events).toHaveLength(1);
  expect(events![0]!.reason).toBe("marcada por engano");
  expect(
    (events![0]!.before_data as { session: { title: string } }).session.title,
  ).toBe(title);
});
