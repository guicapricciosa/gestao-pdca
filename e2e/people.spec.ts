import { expect, test, type Page } from "@playwright/test";

import { adminClient, login, logout, password } from "./support";

const mailpit = "http://127.0.0.1:54324";

async function lastMailLink(to: string, pattern: RegExp) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await fetch(
      `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    ).then(
      (response) => response.json() as Promise<{ messages: { ID: string }[] }>,
    );
    const first = list.messages[0];
    if (first) {
      const message = await fetch(`${mailpit}/api/v1/message/${first.ID}`).then(
        (response) =>
          response.json() as Promise<{ Text: string; HTML: string }>,
      );
      const match = (message.HTML || message.Text).match(pattern);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no e-mail with a link for ${to}`);
}

async function setPassword(page: Page, value: string) {
  await page.waitForURL("**/definir-palavra-passe**", { timeout: 20000 });
  await page.getByLabel("Nova palavra-passe").fill(value);
  await page.getByLabel("Repete a palavra-passe").fill(value);
  await page.getByRole("button", { name: "Guardar e entrar" }).click();
  await page.waitForURL("**/my-work**");
}

test("password recovery sends a link that lets the person set a new password", async ({
  page,
}) => {
  const email = "margarida.vilarinho@example.test";
  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci-me da palavra-passe" }).click();
  await page.waitForURL("**/recuperar-palavra-passe");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByTestId("recovery-sent")).toBeVisible();

  const link = await lastMailLink(email, /https?:\/\/[^"'\s<]+verify[^"'\s<]+/);
  page.on("console", (message) => {
    if (message.text().includes("auth callback")) console.log(message.text());
  });
  await page.goto(link);
  console.log("landed on", page.url());
  await setPassword(page, "NovaPalavraPasse2026!");
  await logout(page);

  // The new password works; restore the seed password for other specs.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Palavra-passe").fill("NovaPalavraPasse2026!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/my-work");
  const admin = adminClient();
  await admin.auth.admin.updateUserById(
    "20000000-0000-0000-0000-000000000006",
    {
      password,
    },
  );
});

test("an unknown e-mail gets the same neutral answer", async ({ page }) => {
  await page.goto("/recuperar-palavra-passe");
  await page.getByLabel("Email").fill("ninguem@example.test");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByTestId("recovery-sent")).toBeVisible();
});

test("set-password page requires a session and invalid links are explained", async ({
  page,
}) => {
  await page.goto("/definir-palavra-passe");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/auth/callback?code=not-a-real-code&next=%2Fmy-work");
  await expect(page.getByText("Esse link já não é válido")).toBeVisible();
});

test("an executive invites a person who then sets a password and appears as seen", async ({
  page,
}) => {
  const email = `convidada.${Date.now()}@example.test`;
  await login(page);
  await page.goto("/definicoes");
  await page.getByRole("link", { name: "Gerir pessoas" }).click();
  await page.waitForURL("**/definicoes/pessoas");
  const form = page.getByTestId("invite-form");
  await form.getByLabel("Nome").fill("Pessoa Convidada");
  await form.getByLabel("Email da empresa").fill(email);
  await form.getByLabel("Papel").selectOption({ label: "Subdirector DOL" });
  await form.getByLabel("Departamento ou serviço").selectOption({
    label: "Operations and Logistics",
  });
  await form.getByLabel("Só alguns").check();
  await form.getByRole("checkbox", { name: "Restaurant A" }).check();
  await form.getByRole("button", { name: "Enviar convite" }).click();
  await page.waitForURL(/definicoes\/pessoas\?saved=1/);
  await expect(page.getByTestId("people-list")).toContainText(email);
  await expect(page.getByTestId("people-list")).toContainText(
    "Ainda não entrou",
  );
  await logout(page);

  const link = await lastMailLink(email, /https?:\/\/[^"'\s<]+verify[^"'\s<]+/);
  await page.goto(link);
  await setPassword(page, "PalavraPasseConvite2026!");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "O meu trabalho",
  );
  await logout(page);

  await login(page);
  await page.goto("/definicoes/pessoas");
  const list = page.getByTestId("people-list");
  await expect(list).toContainText("Pessoa Convidada");
  const item = list.locator("li", { hasText: email });
  await expect(item).toContainText("Visto");
  await expect(item).toContainText("Subdirector DOL");
  await expect(item).toContainText("Restaurant A");
});

test("someone without organization.manage does not see People", async ({
  page,
}) => {
  await login(page, "manager.a@example.test");
  await page.goto("/definicoes");
  await expect(page.getByRole("link", { name: "Gerir pessoas" })).toHaveCount(
    0,
  );
  await page.goto("/definicoes/pessoas");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    "Pessoas",
  );
});
