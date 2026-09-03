# Execution Management Platform

Secure modular-monolith foundation for the execution management platform described in `CONTEXT.md` and `docs/`.

## Implemented scope

- Next.js, strict TypeScript, Tailwind CSS and shadcn/ui foundation;
- Supabase Auth/SSR adapters and generated database types;
- organization domain, temporal assignments and hierarchy validation;
- deterministic permission engine in TypeScript and PostgreSQL;
- NORMAL, RESTRICTED and PRIVATE visibility;
- explicit grants, audit foundations and transactional outbox;
- RLS policies and security tests;
- Decisions, Tasks, PDCAs, comments, attachments and audit trail;
- Meeting Series, Sessions, Meeting Mode, review/publish/close and follow-up;
- AI Foundation: provider-neutral gateway (`disabled`, `fake`, `openai`), Meeting Assistant proposals, Meeting Summary, deterministic Execution Validator with optional AI findings; every AI effect requires human confirmation through the normal domain commands.

Projects, Executive Analytics, Management Assistant, Executive Brief and external notification channels are intentionally not implemented yet.

## Local setup

```bash
npm install
supabase start
supabase db reset
npm run dev
```

1. `supabase start` needs a Docker-compatible runtime; it prints the local keys.
2. Copy `.env.example` to `.env.local` and paste the values from `supabase status`
   (`API URL`, `anon key`, `service_role key`). The app reads them on `npm run dev`.
3. `supabase db reset` applies migrations and the development seed, including the
   demo organization, users and execution data.
4. Open http://127.0.0.1:3000 and sign in with a development user.

| What                  | URL                    |
| --------------------- | ---------------------- |
| Application           | http://127.0.0.1:3000  |
| Supabase Studio       | http://127.0.0.1:54323 |
| Mailpit (local email) | http://127.0.0.1:54324 |

Development users, the permission walkthrough and the recommended demo flow are in
[docs/demo-guide.md](docs/demo-guide.md). Screenshots of every screen are in
`docs/screenshots/` and can be regenerated with `node scripts/screenshots.mjs`
while `npm run dev` is running.

AI is disabled unless `AI_PROVIDER` is set: use `fake` for a deterministic local
provider (it recognises lines such as `Tarefa: … | responsável: … | prazo: AAAA-MM-DD`
pasted into the Meeting Assistant) or `openai` with a server-side `OPENAI_API_KEY`.
`npm run test:e2e` always uses the `fake` provider.

The local seed credentials use `DevelopmentOnly123!` and `.test` email addresses. They are development fixtures only and must never be used outside a disposable local environment.

## Local troubleshooting

### Every login fails right after `supabase db reset`

`supabase db reset` (also run by `npm run test:e2e`) recreates the Auth (GoTrue),
Storage and Realtime containers. Kong can keep the previous container IP in its
DNS cache, so every `/auth/v1/*` request returns `502 An invalid response was
received from the upstream server` while GoTrue itself is healthy and receives
nothing. The login page reports this as a temporary service error, not as
invalid credentials.

Diagnose it with a direct request (values from `supabase status -o env`):

```bash
curl -s -X POST "$API_URL/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{"email":"ceo@example.test","password":"DevelopmentOnly123!"}'
```

A `502` with the message above confirms the stale route. Restart only Kong:

```bash
docker restart supabase_kong_execution-management-platform
```

`supabase stop && supabase start` also clears it, at the cost of a full restart.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run test:db
supabase db lint --level warning
npm run test:e2e
```

`npm run test:db` and `npm run test:e2e` both start with `supabase db reset`. The
pgTAP suites assert against the seed only, so running `supabase test db` on a
database that already holds e2e or manual data reports spurious failures.

## Database changes

All schema changes belong in versioned files under `supabase/migrations/`. `supabase/seed.sql` contains configurable development/demo rows; names and assignments there have no special behavior in application or SQL authorization logic.
