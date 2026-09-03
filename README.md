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

1. Copy `.env.example` to `.env.local` and use values printed by `supabase status`.
2. Start a Docker-compatible runtime.
3. Run `supabase start`.
4. Run `supabase db reset` to apply migrations and development seed data.
5. Run `npm install` and `npm run dev`.

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
