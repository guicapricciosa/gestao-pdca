// Renders the PWA icons from the configured branding.
// Usage: node scripts/icons.mjs   (writes public/icons/*.png)
import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

const name = (
  process.env.NEXT_PUBLIC_APP_SHORT_NAME ??
  process.env.NEXT_PUBLIC_APP_NAME ??
  "Execution"
).trim();
const theme = process.env.NEXT_PUBLIC_APP_THEME_COLOR ?? "#151714";
const accent = process.env.NEXT_PUBLIC_APP_ACCENT_COLOR ?? "#d9481f";
const letter = name.slice(0, 1).toUpperCase();

await mkdir("public/icons", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(file, size, { maskable = false, radius = 0.22 } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inset = maskable ? 0 : 0;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${maskable ? theme : "transparent"}">
    <div style="position:absolute;inset:${inset}px;background:${theme};border-radius:${maskable ? 0 : size * radius}px;display:grid;place-items:center;font-family:-apple-system,Inter,Helvetica,Arial,sans-serif">
      <span style="color:#fff;font-size:${size * 0.56}px;font-weight:700;letter-spacing:-0.06em;line-height:1">${letter}</span>
      <span style="position:absolute;right:${size * 0.18}px;bottom:${size * 0.18}px;width:${size * 0.12}px;height:${size * 0.12}px;border-radius:50%;background:${accent}"></span>
    </div></body></html>`);
  await page.screenshot({
    path: `public/icons/${file}`,
    omitBackground: !maskable,
  });
  console.log(`wrote public/icons/${file}`);
}

await render("icon-192.png", 192);
await render("icon-512.png", 512);
await render("maskable-512.png", 512, { maskable: true });
await render("apple-touch-icon.png", 180, { radius: 0 });
await browser.close();
