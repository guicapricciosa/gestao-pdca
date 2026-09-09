import { expect, test } from "@playwright/test";

import { login, logout } from "./support";

const recording = (id: string) =>
  JSON.stringify({
    source: {
      provider: "plaud",
      recording_id: id,
      recording_title: "Reunião diária",
      recorded_at: "2026-09-01",
    },
    actions: [
      {
        title: `Plaud ${id} · reservas de grupo`,
        description: "Reservas com mais de 15 pessoas avançam sem menu.",
        phase: "Do",
        priority: "high",
        due_date: "2026-09-30",
        status_note: "Validar com operações",
        tasks: ["Reproduzir o erro", { title: "Corrigir" }],
      },
      { title: `Plaud ${id} · tema fechado`, phase: "Done" },
    ],
  });

test("a Plaud recording becomes private PDCAs with subtasks, once", async ({
  page,
}) => {
  const id = `REC${Date.now()}`;
  await login(page);
  await page.goto("/definicoes/importar-plaud");
  await page.getByTestId("plaud-json").fill("{");
  await page.getByTestId("plaud-preview").click();
  await expect(page.getByTestId("plaud-error")).toContainText("JSON");

  await page.getByTestId("plaud-json").fill(recording(id));
  await page.getByTestId("plaud-preview").click();
  await expect(page.getByTestId("plaud-items")).toContainText("2 acções");
  await expect(page.getByTestId("plaud-items")).toContainText("2 subtarefas");
  await page.getByLabel("Restaurante de referência").selectOption({
    label: "Restaurant A",
  });
  await page.getByRole("button", { name: "Importar" }).click();
  await page.waitForURL(/criados=2&ignorados=0/);

  await page.goto(`/pesquisa?q=${encodeURIComponent(`Plaud ${id}`)}`);
  await expect(page.getByTestId("search-pdca")).toContainText(
    "reservas de grupo",
  );
  await expect(page.getByTestId("search-pdca")).toContainText("Concluído");
  await expect(page.getByTestId("search-task")).toContainText("Corrigir");
  await expect(page.getByTestId("search-task")).toContainText(
    "Reproduzir o erro",
  );

  // Same recording again: nothing new.
  await page.goto("/definicoes/importar-plaud");
  await page.getByTestId("plaud-json").fill(recording(id));
  await page.getByTestId("plaud-preview").click();
  await page.getByLabel("Restaurante de referência").selectOption({
    label: "Restaurant A",
  });
  await page.getByRole("button", { name: "Importar" }).click();
  await page.waitForURL(/criados=0&ignorados=2/);
  await logout(page);

  // Private: another person with the same restaurant sees nothing.
  await login(page, "manager.a@example.test");
  await page.goto(`/pesquisa?q=${encodeURIComponent(`Plaud ${id}`)}`);
  await expect(page.getByTestId("search-empty")).toBeVisible();
});
