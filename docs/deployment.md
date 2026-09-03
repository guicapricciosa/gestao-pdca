# Deployment readiness — `pdca.gcpai.pt`

_Review of 2026-09-03, before any external change. Nothing has been deployed._

## 1. Findings

| Item                        | State                                                                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                     | `engines.node >= 22`; developed on Node 24.10, npm 11                                                                                                                                              | Next 16.3 needs Node ≥ 20.9; use 22 LTS in production.                                                                                                                                                                                                                                                                           |
| `next start`                | Verified locally after `next build`: `/login` 200, `/manifest.webmanifest` 200, `/sw.js` 200 (`application/javascript`), `/offline` 200, `/my-work` → 307 `/login?next=…`, `/api/jobs/process` 401 | Standard Node server; no static export possible (dynamic pages, Server Actions, API routes, proxy).                                                                                                                                                                                                                              |
| Server Actions / API routes | `src/app/actions/*`, `api/attachments`, `api/attachments/[id]`, `api/push/subscriptions`, `api/jobs/process`                                                                                       | All need the Node runtime and the Supabase cookies; attachments stream files through the server (`ATTACHMENT_MAX_BYTES`, default 10 MB).                                                                                                                                                                                         |
| Proxy (middleware)          | `src/proxy.ts` refreshes the Supabase session on every request and redirects unauthenticated users to `/login?next=`                                                                               | Runs on every route except static assets.                                                                                                                                                                                                                                                                                        |
| Service worker / PWA        | `public/sw.js` at scope `/`, `app/manifest.ts`, icons in `public/icons`                                                                                                                            | Requires **HTTPS** (except localhost). `Cache-Control: public, max-age=0` on `sw.js` is fine (browser re-checks).                                                                                                                                                                                                                |
| Web Push                    | `web-push` with VAPID; `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`, `PUSH_PROVIDER=webpush`                                                                      | Sending happens only in `/api/jobs/process`; needs outbound HTTPS to push services. Generate a **production** key pair; never reuse the local one.                                                                                                                                                                               |
| `/api/jobs/process`         | Enabled only when `CRON_SECRET` is set; `Authorization: Bearer <secret>`; idempotent                                                                                                               | Must be called every minute or so (Vercel Cron, cPanel cron with `curl`, or pg_cron + pg_net). In-app notifications alone also work through `pg_cron` inside Supabase.                                                                                                                                                           |
| Supabase                    | Local CLI project only; 16 migrations + demo `seed.sql`                                                                                                                                            | A **remote Supabase project** is required: `supabase link` + `supabase db push` (migrations only, **no seed**); `pg_cron` extension enabled; bucket `execution-attachments` is created by migration 0005. Real users are created in Auth and mapped to `profiles` + assignments (organization commands), not with the demo seed. |
| Auth URLs                   | Password sign-in only; no OAuth/magic-link callbacks in code                                                                                                                                       | In the remote project set Site URL `https://pdca.gcpai.pt` and add it to Redirect URLs (needed for password recovery/e-mail links if enabled later). Cookies are first-party; no extra CORS.                                                                                                                                     |
| Realtime                    | Private channels (`meeting:<id>`, `profile:<id>`) over WebSocket to Supabase, not to the app                                                                                                       | The app host does not need WebSocket support; the browser talks to `*.supabase.co` directly.                                                                                                                                                                                                                                     |
| Headers                     | `next.config.ts`: nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy, no `x-powered-by`                                                                                            | Add HSTS at the edge/proxy (`Strict-Transport-Security: max-age=31536000; includeSubDomains`). TLS is mandatory for PWA, push and Secure cookies.                                                                                                                                                                                |
| Never publish               | `.env`, `.env.local`, `.env.*.local`, `supabase/.temp`, `.next` build cache, `node_modules`, `test-results`, `playwright-report`, `docs/screenshots` are fine (demo data)                          | All already in `.gitignore`; `SUPABASE_SERVICE_ROLE_KEY`, `WEB_PUSH_PRIVATE_KEY`, `CRON_SECRET`, `OPENAI_API_KEY` are server-only and must be set in the host's secret store.                                                                                                                                                    |
| Build / start               | `npm ci && npm run build && npm run start` (`next start -p $PORT`)                                                                                                                                 | Turbopack root is `process.cwd()`; build must run on the same Node major as runtime.                                                                                                                                                                                                                                             |
| Health check                | `GET /login` → 200 and `GET /manifest.webmanifest` → 200 (no auth, no DB). For a DB-aware check add `/api/health` later (not implemented).                                                         | `/api/jobs/process` without header returns 401/404 and is a valid liveness probe for the job route itself.                                                                                                                                                                                                                       |

### Environment variables in production

Public (build-time, safe): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_SHORT_NAME`,
`NEXT_PUBLIC_APP_DESCRIPTION`, `NEXT_PUBLIC_APP_THEME_COLOR`, `NEXT_PUBLIC_APP_BACKGROUND_COLOR`.

Server-only (secrets): `SUPABASE_SERVICE_ROLE_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`,
`PUSH_PROVIDER=webpush`, `CRON_SECRET`, `AI_PROVIDER` (`disabled` unless OpenAI is wanted),
`OPENAI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_INPUT_CHARS`,
`ATTACHMENT_MAX_BYTES`, `ATTACHMENT_MAX_PER_OBJECT`, `ATTACHMENT_ALLOWED_MIME_TYPES`.
Never set `PUSH_LOG_FILE`, `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` (test-only).

## 2. Strategy A — Node.js on Domínios.pt cPanel

Feasible only if the plan offers **Node.js Selector (CloudLinux + Passenger)** with a
persistent process and Node 22. Checklist to confirm with Domínios.pt before choosing it:
Node 22 available; long-running process allowed (Passenger keeps it alive); memory
limit ≥ 1 GB for `next build`; HTTPS certificate (Let's Encrypt/AutoSSL) on the
subdomain; cron jobs allowed; outbound HTTPS allowed (Supabase, push services, OpenAI).

Steps (no change made yet):

1. Create the subdomain `pdca.gcpai.pt` in cPanel (document root outside `public_html`, e.g. `~/apps/pdca`).
2. Node.js Selector → new app: Node 22, mode Production, root `~/apps/pdca`, start file `server.js`.
3. `server.js` wrapper (Passenger does not call `next start`):
   ```js
   const next = require("next");
   const http = require("http");
   const app = next({ dev: false });
   const handle = app.getRequestHandler();
   app
     .prepare()
     .then(() =>
       http
         .createServer((req, res) => handle(req, res))
         .listen(process.env.PORT || 3000),
     );
   ```
4. Environment variables in the Node.js Selector UI (the list above).
5. Deploy: `git pull`, `npm ci`, `npm run build`, restart the app. Builds on shared hosting are slow and memory-hungry; alternative: build in CI and upload `.next` + `public` + `package.json` + `node_modules` (production only).
6. Cron in cPanel every minute: `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pdca.gcpai.pt/api/jobs/process`.
7. Force HTTPS and add HSTS in `.htaccess` (Apache in front of Passenger).

Risks: Passenger restarts on inactivity and cold starts; limited control over Node
version upgrades; CPU/memory throttling on shared plans; no built-in preview
environments; cron is the only scheduler; `.htaccess` is the only place for HSTS.
DNS needs nothing beyond the subdomain that cPanel creates (an `A` record to the
hosting IP, added automatically if the zone lives on the same cPanel).

## 3. Strategy B — Next.js host (Vercel) + DNS at Domínios.pt (recommended)

1. Import the GitHub repository `guicapricciosa/gestao-pdca` in Vercel (framework Next.js, Node 22.x, `npm ci` / `next build`).
2. Set the environment variables above (Production + Preview; secrets marked sensitive).
3. Add `vercel.json` with the cron:
   ```json
   { "crons": [{ "path": "/api/jobs/process", "schedule": "* * * * *" }] }
   ```
   Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.
   (Hobby plans allow only daily crons; use Pro for every-minute delivery, or keep
   `pg_cron` for in-app notifications and accept push delays.)
4. Add the domain `pdca.gcpai.pt` in the Vercel project. Vercel issues the certificate and adds HSTS.
5. DNS at Domínios.pt (zone `gcpai.pt`), **only this record**:

   | Type  | Name   | Value                  | TTL  |
   | ----- | ------ | ---------------------- | ---- |
   | CNAME | `pdca` | `cname.vercel-dns.com` | 3600 |

   (Vercel may show `76.76.21.21` as an `A` alternative; the CNAME is preferred for a subdomain.)

6. Remote Supabase: create project (EU region), `supabase link --project-ref …`, `supabase db push`, enable `pg_cron` in Database → Extensions, set Auth Site URL / Redirect URLs to `https://pdca.gcpai.pt`, create real users.
7. Verify: `https://pdca.gcpai.pt/login` 200, manifest installable, a push registered from Definições, `/api/jobs/process` answers 401 without the secret and 200 from the cron log.

## 4. Recommendation

**Strategy B.** It matches the runtime the project was built for (Server Actions,
proxy, streaming uploads, cron, automatic HTTPS/HSTS, preview deployments per
branch) and keeps Domínios.pt to a single CNAME. Strategy A depends on Passenger
details that cannot be verified from here and adds operational risk (cold starts,
memory limits during `next build`, manual HSTS, cron as the only scheduler).

Before the first deploy, still to do in the repository (small, no external
change): add `vercel.json` with the cron and, optionally, an `/api/health` route.
