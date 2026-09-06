import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./support";

/** Clicks a command and waits for the page that follows the redirect. */
async function clickAndSettle(page: Page, button: Locator) {
  await button.click();
  await page.waitForURL(/saved=1|error=/);
  await page.waitForLoadState("networkidle");
}

test.describe("Definições › Organização", () => {
  test("creates, renames and deactivates a restaurant and a department", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/definicoes");
    await page.getByRole("link", { name: "Gerir organização" }).click();
    await page.waitForURL("**/definicoes/organizacao**");

    const name = `Restaurante E2E ${Date.now()}`;
    const form = page.getByTestId("new-restaurant-form");
    await form.getByLabel("Nome").fill(name);
    await clickAndSettle(page, form.getByRole("button", { name: "Criar" }));
    const list = page.getByTestId("restaurant-list");
    const field = list.getByLabel(`Nome de ${name}`);
    await expect(field).toHaveValue(name);

    // A fresh URL each time, so every redirect is a real navigation.
    await page.goto("/definicoes/organizacao?tab=restaurantes");
    await list.getByLabel(`Nome de ${name}`).fill(`${name} renomeado`);
    await clickAndSettle(
      page,
      list
        .locator("li", { has: page.getByLabel(`Nome de ${name}`) })
        .getByRole("button", { name: "Guardar" }),
    );
    await expect(list.getByLabel(`Nome de ${name} renomeado`)).toBeVisible();
    await page.goto("/definicoes/organizacao?tab=restaurantes");
    const renamed = list.locator("li", {
      has: page.getByLabel(`Nome de ${name} renomeado`),
    });
    await clickAndSettle(
      page,
      renamed.getByRole("button", { name: "Desactivar" }),
    );
    await expect(
      list.locator("li", { has: page.getByLabel(`Nome de ${name} renomeado`) }),
    ).toContainText("inactivo");

    await page.getByRole("link", { name: "Departamentos e serviços" }).click();
    await page.waitForURL("**/organizacao?tab=departamentos");
    const unitForm = page.getByTestId("new-unit-form");
    const unitName = `Qualidade ${Date.now()}`;
    await unitForm.getByLabel("Nome").fill(unitName);
    await unitForm.getByLabel("Tipo").selectOption("SHARED_SERVICE");
    await clickAndSettle(page, unitForm.getByRole("button", { name: "Criar" }));
    await expect(
      page
        .getByTestId("unit-list")
        .locator("li", { has: page.getByLabel(`Nome de ${unitName}`) }),
    ).toContainText("Serviço partilhado");
  });

  test("changes a person's scope and manager from the People panel", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/definicoes/pessoas");
    const row = page
      .getByTestId("people-list")
      .locator("li", { hasText: "manager.b@example.test" });
    await row.getByTestId("edit-person").click();
    await page.waitForURL(/editar=/);
    const form = page.getByTestId("person-edit-form");
    await form.getByLabel("Cargo (opcional)").fill("Gerente B e C");
    await form.getByLabel("Só alguns (escolhe abaixo)").check();
    await form.getByRole("checkbox", { name: "Restaurant C" }).check();
    await form.getByLabel("Reporta a").selectOption({
      label: "Supervisor Operations B · Operations Supervisor B",
    });
    await clickAndSettle(page, form.getByRole("button", { name: "Guardar" }));
    const updated = page
      .getByTestId("people-list")
      .locator("li", { hasText: "manager.b@example.test" });
    await expect(updated).toContainText("Gerente B e C");
    await expect(updated).toContainText("Restaurant B, Restaurant C");
    await expect(updated).toContainText("reporta a Supervisor Operations B");
  });

  test("name and e-mail can be corrected; people can rename themselves", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/definicoes/pessoas");
    await page
      .getByTestId("people-list")
      .locator("li", { hasText: "supervisor.ops.b@example.test" })
      .getByTestId("edit-person")
      .click();
    await page.waitForURL(/editar=/);
    const identity = page.getByTestId("person-identity-form");
    await identity.getByLabel("Nome").fill("Supervisora Operações B");
    await identity.getByLabel("Email").fill("supervisora.b@example.test");
    await clickAndSettle(
      page,
      identity.getByRole("button", { name: "Guardar dados" }),
    );
    const row = page
      .getByTestId("people-list")
      .locator("li", { hasText: "supervisora.b@example.test" });
    await expect(row).toContainText("Supervisora Operações B");

    await page.goto("/definicoes");
    const mine = page.getByTestId("my-name-form");
    await mine.getByLabel("Nome").fill("CEO Renomeado");
    await clickAndSettle(page, mine.getByRole("button", { name: "Guardar" }));
    await expect(page.getByTestId("viewer-name")).toHaveText("CEO Renomeado");
    await mine.getByLabel("Nome").fill("CEO");
    await clickAndSettle(page, mine.getByRole("button", { name: "Guardar" }));
    await expect(page.getByTestId("viewer-name")).toHaveText("CEO");
  });

  test("deactivating a person ends their access", async ({ page, browser }) => {
    await login(page);
    await page.goto("/definicoes/pessoas");
    await page
      .getByTestId("people-list")
      .locator("li", { hasText: "kitchen.supervisor.a@example.test" })
      .first()
      .getByTestId("edit-person")
      .click();
    await page.waitForURL(/editar=/);
    await clickAndSettle(
      page,
      page.getByRole("button", { name: "Desactivar Kitchen Supervisor A" }),
    );
    await expect(
      page
        .getByTestId("people-list")
        .locator("li", { hasText: "kitchen.supervisor.a@example.test" }),
    ).toHaveCount(0);

    const other = await (await browser.newContext()).newPage();
    await other.goto("/login");
    await other.getByLabel("Email").fill("kitchen.supervisor.a@example.test");
    await other.getByLabel("Palavra-passe").fill("DevelopmentOnly123!");
    await other.getByRole("button", { name: "Entrar" }).click();
    await expect(other.getByRole("alert")).toBeVisible();
    await other.context().close();
  });

  test("the executive cannot deactivate themselves", async ({ page }) => {
    await login(page);
    await page.goto("/definicoes/pessoas");
    await page
      .getByTestId("people-list")
      .locator("li", { hasText: "ceo@example.test" })
      .getByTestId("edit-person")
      .click();
    await page.waitForURL(/editar=/);
    await expect(
      page.getByRole("button", { name: /^Desactivar / }),
    ).toHaveCount(0);
  });
});
