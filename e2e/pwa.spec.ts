import { expect, test } from "@playwright/test";

import { login, logout } from "./support";

test.describe("Progressive Web App", () => {
  test("manifest is valid, installable and branded", async ({ page }) => {
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/my-work");
    expect(manifest.lang).toBe("pt-PT");
    expect(manifest.theme_color).toMatch(/^#/);
    expect(manifest.background_color).toMatch(/^#/);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      const image = await page.request.get(icon.src);
      expect(image.ok(), icon.src).toBe(true);
      expect(image.headers()["content-type"]).toContain("image/png");
    }
    expect(
      manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose === "maskable",
      ),
    ).toBe(true);

    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });

  test("service worker controls the app, caches only the shell and serves the offline page", async ({
    page,
    context,
  }) => {
    await login(page);
    await page.goto("/tasks");
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (
        registration.active?.state === "activated" &&
        !!navigator.serviceWorker.controller
      );
    });
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.ready).scope,
    );
    expect(scope.endsWith("/")).toBe(true);

    await page.goto("/my-work");
    await page.goto("/tasks");
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const urls: string[] = [];
      for (const key of keys) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          urls.push(new URL(request.url).pathname);
      }
      return { keys, urls };
    });
    expect(cached.urls.some((url) => url === "/offline")).toBe(true);
    for (const url of cached.urls) {
      expect(url, "protected routes must never be cached").not.toMatch(
        /^\/(my-work|tasks|pdcas|decisions|meetings|api)/,
      );
      expect(url).not.toMatch(/rest\/v1|auth\/v1/);
      expect(
        url.startsWith("/_next/static/") ||
          url === "/offline" ||
          url === "/manifest.webmanifest" ||
          url.startsWith("/icons/"),
      ).toBe(true);
    }

    await context.setOffline(true);
    await page.goto("/pdcas");
    await expect(
      page.getByRole("heading", { name: "Não foi possível ligar ao servidor" }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("Reduzir desperdício");
    await context.setOffline(false);
    await page.goto("/pdcas");
    await expect(page.getByRole("heading", { name: "PDCAs" })).toBeVisible();
  });

  test("after logout nothing protected is reachable offline", async ({
    page,
    context,
  }) => {
    await login(page);
    await page.goto("/my-work");
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await logout(page);
    await context.setOffline(true);
    await page.goto("/my-work");
    await expect(
      page.getByRole("heading", { name: "Não foi possível ligar ao servidor" }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("Precisa da minha atenção");
    await context.setOffline(false);
  });

  test("install guidance adapts to the platform without prompting", async ({
    browser,
  }) => {
    const desktop = await browser.newContext();
    const page = await desktop.newPage();
    await login(page);
    await page.goto("/definicoes");
    await expect(
      page.getByRole("heading", { name: "Instalar aplicação" }),
    ).toBeVisible();
    await expect(page.getByTestId("install-app")).toHaveAttribute(
      "data-mode",
      /manual|prompt/,
    );
    await desktop.close();

    const ios = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await ios.newPage();
    await login(phone);
    await phone.goto("/definicoes");
    await expect(phone.getByTestId("install-app")).toHaveAttribute(
      "data-mode",
      "ios",
    );
    await expect(phone.getByText("Adicionar ao ecrã principal")).toBeVisible();
    await ios.close();
  });
});
