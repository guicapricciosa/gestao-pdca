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

`vercel.json` (cron every minute on `/api/jobs/process`) and `/api/health` are in
the repository.

## 5. First-deploy checklist (exact order; DNS last)

Nothing below has been executed yet. No real users are created by these steps.

**Supabase Cloud**

1. Create the project in an **EU region** (e.g. `eu-west-1`/Frankfurt), strong database password kept in a password manager.
2. `supabase link --project-ref <ref>` from the repository root (asks for the database password).
3. `supabase migration list` — every file in `supabase/migrations` must show as pending remotely and none as unknown.
4. `supabase db push` — applies migrations only. **Never** run `supabase db reset --linked` (it destroys the remote database).
5. **Do not** apply `supabase/seed.sql` remotely: it creates demo users with a known password.
6. Database → Extensions: enable `pg_cron` (the migration schedules the jobs when the extension exists; if it was enabled after `db push`, run the three `cron.schedule(...)` statements from migration `202609030015_notifications.sql` once in the SQL editor).
7. Storage: confirm bucket `execution-attachments` exists and is private.
8. Authentication → URL configuration: Site URL `https://pdca.gcpai.pt`; Redirect URLs `https://pdca.gcpai.pt/**`. Keep e-mail confirmations on; sign-ups off unless needed.
9. Copy Project URL, anon (publishable) key and service_role key for the next section — service_role only into Vercel's sensitive env.

**Secrets**

10. Generate a **new production VAPID pair**: `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Never reuse the local pair.
11. Generate `CRON_SECRET`: `openssl rand -base64 32`.

**Vercel**

12. Import the GitHub repository `guicapricciosa/gestao-pdca` (framework Next.js, Node 22.x, Pro plan for the per-minute cron).
13. Environment variables (Production, and Preview if wanted):
    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (sensitive),
    `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` (sensitive), `WEB_PUSH_SUBJECT=mailto:<it mailbox>`, `PUSH_PROVIDER=webpush`,
    `CRON_SECRET` (sensitive), `AI_PROVIDER=disabled`,
    `ATTACHMENT_MAX_BYTES=10485760`, `ATTACHMENT_MAX_PER_OBJECT=25`, `ATTACHMENT_ALLOWED_MIME_TYPES=application/pdf,image/png,image/jpeg,text/plain`,
    `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_SHORT_NAME` (branding, optional).
14. Deploy and confirm the build log ends with a successful `next build` and the cron `/api/jobs/process` appears under Settings → Cron Jobs.

**Validation on the temporary `*.vercel.app` URL** (before touching the domain)

15. `GET /api/health` → 200 with `{"status":"ok"}` (503 means Supabase is unreachable from Vercel: check URL/key).
16. Create **one** administrator profile through the organization commands (not the seed) and log in; `/my-work` renders, logout works, `/tasks` unauthenticated redirects to `/login?next=`.
17. PWA: Chrome shows the install icon; install; `manifest.webmanifest` and `sw.js` 200; go offline and confirm the "Sem ligação à Internet" page.
18. Notification Center: create a task for the admin, activate it from another account or wait a minute; the bell shows the entry after the cron ran (Vercel → Cron Jobs → logs show 200).
19. Push: Definições → Push → "Receber neste dispositivo"; trigger an eligible event; the device receives the push; `notification_deliveries` shows `sent`.
20. `curl -i https://<app>.vercel.app/api/jobs/process` → 401 without the secret.

**Domain — only after 15–20 pass**

21. Vercel → Settings → Domains → add `pdca.gcpai.pt`.
22. Domínios.pt → zone `gcpai.pt` → add `CNAME pdca → cname.vercel-dns.com` (TTL 3600). Wait for the certificate.
23. Update Supabase Site URL / Redirect URLs if they were set to the `vercel.app` URL, and re-check 15–20 on `https://pdca.gcpai.pt`.
24. Re-run the push test on the final domain (subscriptions are per origin; devices must subscribe again).

## 6. Reference data and first people (executed 2026-09-04)

- `supabase/migrations/202609040001_foundation_permissions.sql` moves the nine
  foundation permissions out of the demo seed (they are referenced by code).
- `supabase/bootstrap/production.sql` (idempotent, run with
  `supabase db query --linked --file …`) creates the real organization
  structure: Grupo Capricciosa and the holding, 11 departments/shared services,
  the 9 roles with their permissions and the 15 restaurants (list of 2025-10).
  No people, no demo objects.
- `supabase/bootstrap/first-admin.sql` turns an Auth user created from the
  dashboard into a profile with a company-wide Global Executive assignment.
- Known gap (technical debt): the app has no screen for Auth invitations or
  password recovery, so people are created in the dashboard ("Create new user",
  auto-confirm) and their profile/assignment is added with SQL until an
  onboarding flow exists.

## 7. Importação histórica excepcional (04/09/2026)

Decisão do Gui Rainho em 04/09/2026: os 152 PDCAs do ficheiro
`PDCA_importacao_final.xlsx` (folha "Importação final": 141 de Visita Técnica,
11 de Direção, edição 2026) entram em produção como migração histórica
**sem Responsável nem Owner**. Esta excepção aplica-se apenas a estes registos;
as regras normais de criação de PDCAs (responsável obrigatório nos comandos
da aplicação, validação de acesso) mantêm-se inalteradas.

Como foi feito:

- `scripts/import-pdcas-2026.mjs` lê o ficheiro e gera
  `supabase/bootstrap/import-pdcas-2026.sql` (um único bloco `DO`, idempotente
  por ids determinísticos uuid5 de `fonte + nº original`). O ficheiro Excel e o
  SQL gerado ficam fora do repositório (`.gitignore`) por conterem dados de
  negócio.
- Aplicado com `supabase db query --linked --file supabase/bootstrap/import-pdcas-2026.sql`
  depois de ensaio numa base local.
- Por registo: `security_objects` (PDCA, visibilidade NORMAL, criado por Gui
  Rainho), `pdcas` (título = descrição; estado COMPLETED/IN_PROGRESS/CANCELLED
  conforme a coluna "Estado importação"; fase ACT para concluídos e DO para os
  restantes; datas "mmm/aa" convertidas para o dia 1 do mês; `completed_at` =
  data fim para concluídos), âmbito organizacional (DOL para Visita Técnica,
  EXECUTIVE para Direção) e âmbito de restaurantes conforme a coluna "Âmbito",
  um comentário com o bloco histórico (fonte, nº original, origem da reunião,
  responsável histórico, colaboradores, estado original, notas, correcções) e um
  evento de auditoria `pdca.imported` com actor SYSTEM. O outbox processa estes
  eventos sem gerar notificações.
- Mapeamento de restaurantes decidido em 04/09/2026: Jângal → Jangal Allo;
  Sophia LX → Sophia Pizoteca; Sophia → Sophia Natural; Irish & Co → Irish;
  Lat.A → Lat.a; Capricciosa Cais do Sodré → Capricciosa Cais; Selllva LX
  Factory → Selva Lx; Selllva Mouzinho → Selva MZ; "Todas as Capricciosas" →
  as 5 Capricciosas; "Todas as Capricciosas, Selllvas e Sophias" → 5 + 3 + 2.
- O responsável só é ligado quando existe um perfil activo com o mesmo nome e
  com acesso de leitura ao objecto (a regra do trigger); os restantes nomes
  ficam no comentário histórico até as pessoas existirem na aplicação.

Resultado em produção: 152 PDCAs (82 concluídos, 66 em curso, 4 cancelados);
148 sem responsável (4 ligados a Gui Rainho), 152 sem Owner, 13 sem
restaurante (os 11 da Direção e 2 de Visita Técnica), 14 sem prazo.

Pendente: atribuir Responsável/Owner à medida que as pessoas forem criadas
(o comentário histórico indica o nome) e rever as 13 sem restaurante.
