# Execution Management Platform

Secure modular-monolith foundation for the execution management platform described in `CONTEXT.md` and `docs/`.

## Implemented scope

- Next.js, strict TypeScript, Tailwind CSS and shadcn/ui foundation;
- Supabase Auth/SSR adapters and generated database types;
- organization domain, temporal assignments and hierarchy validation;
- deterministic permission engine in TypeScript and PostgreSQL;
- NORMAL, RESTRICTED and PRIVATE visibility;
- explicit grants, audit foundations and transactional outbox;
- RLS policies and security tests.

Meetings, Decisions, PDCAs, Tasks, Projects, analytics and AI are intentionally not implemented yet.

## Local setup

1. Copy `.env.example` to `.env.local` and use values printed by `supabase status`.
2. Start a Docker-compatible runtime.
3. Run `supabase start`.
4. Run `supabase db reset` to apply migrations and development seed data.
5. Run `npm install` and `npm run dev`.

The local seed credentials use `DevelopmentOnly123!` and `.test` email addresses. They are development fixtures only and must never be used outside a disposable local environment.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
supabase test db
supabase db lint --level warning
```

## Database changes

All schema changes belong in versioned files under `supabase/migrations/`. `supabase/seed.sql` contains configurable development/demo rows; names and assignments there have no special behavior in application or SQL authorization logic.
