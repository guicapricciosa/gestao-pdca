# Progressive Web App

_Gate B of "Realtime Meetings + PWA + Notifications", 2026-09-03._

## What it is

The application is installable on desktop (Chrome/Edge), Android and iPhone/iPad
(Safari → Partilhar → Adicionar ao ecrã principal). It opens in its own window
(`display: standalone`), starts on **O meu trabalho** and carries the configured
identity.

## Branding

Name, short name, description and colours come from public environment
variables read by `src/platform/pwa/branding.ts`:

| Variable                           | Default                                             |
| ---------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`             | `Execution`                                         |
| `NEXT_PUBLIC_APP_SHORT_NAME`       | first 12 characters of the name                     |
| `NEXT_PUBLIC_APP_DESCRIPTION`      | `Reuniões, tarefas, PDCAs e decisões num só sítio.` |
| `NEXT_PUBLIC_APP_THEME_COLOR`      | `#151714`                                           |
| `NEXT_PUBLIC_APP_BACKGROUND_COLOR` | `#f7f6f2`                                           |

Icons are rendered from the same variables with `node scripts/icons.mjs`
(192, 512, maskable 512, Apple touch 180) into `public/icons/`.

## Service worker and caching policy

`public/sw.js` is hand-written and deliberately small:

- **Precached:** `/offline`, the manifest and the icons.
- **`/_next/static/*`:** cache-first (content-hashed, immutable, never personal).
- **Navigations:** network only. If the network fails, the offline page is shown.
- **Everything else** (RSC payloads, Server Actions, Supabase REST/Auth/Realtime,
  attachments): never intercepted, never stored.

Consequences: no business data lives in Cache Storage or IndexedDB; after
logout, or on a shared device, nothing protected can be read offline; a stale
page is never presented as current (`e2e/pwa.spec.ts` checks the cache keys and
the offline behaviour before and after logout).

## Offline

There is no offline editing, no local queue and no later sync. Without a
connection the app shows:

> Sem ligação à Internet — Não foi possível ligar ao servidor. Volta a tentar
> quando tiveres ligação.

Inside an open page a small banner says the connection is gone and that what is
on screen may be outdated.

## Updates

On every load the registration checks for a new worker. When one is installed
behind the current page, a quiet card offers **Actualizar**; accepting posts
`SKIP_WAITING`, the new worker claims the clients and the page reloads once.
Old caches are removed on activation (`VERSION` in `sw.js`).

## Install experience

No pop-ups. **Definições → Instalar aplicação** shows:

- an **Instalar aplicação** button when the browser offered
  `beforeinstallprompt` (Chrome/Edge/Android);
- Safari instructions on iPhone/iPad (only there);
- a short manual hint elsewhere;
- "já está instalada" when running standalone.

## Accessibility

`prefers-reduced-motion` disables transitions globally; the install page and
update card are plain buttons reachable by keyboard; the offline banner uses
`role="status"`.

## Security notes

See `docs/security.md` (PWA section): worker scope `/`, no caching of
authenticated responses, shared-device behaviour, and why push (Gate D) never
authorizes anything by itself.
