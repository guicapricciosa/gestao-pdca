# Project instructions — Gestao PDCA

These instructions add project-specific rules to the global agent policy. They do not authorize deployment, production access, destructive migrations, credential use, pushes, or other external side effects.

## Read before changing the project

For substantial work, read the relevant parts of:

- `CONTEXT.md` for the stable product and business model;
- `docs/architecture.md` and `docs/data-model.md` for technical structure;
- `docs/permissions.md` and `docs/security.md` for authorization changes;
- the relevant domain document under `docs/`;
- the current schema, migrations, implementation, and tests.

If documentation and implementation disagree, report the discrepancy instead of silently redefining the domain. Do not load all project documentation when only one domain is relevant.

## Stack and commands

The project is a modular monolith using Next.js, React, strict TypeScript, PostgreSQL/Supabase, Tailwind CSS, and Vitest/Playwright.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:db
npm run test:e2e
```

Run checks proportionately. Database and end-to-end checks reset the local Supabase database; confirm the target is local before running them.

## Engineering boundaries

- Keep domain logic outside UI components and permission logic centralized and testable.
- Use versioned migrations for schema changes; never substitute manual production changes.
- Prefer normalized relational entities for core business concepts. Reserve JSON/JSONB for flexible metadata, AI payloads, or non-critical configuration.
- Do not hardcode people, restaurants, departments, assignments, emails, or role names into business or access logic.
- Keep the application usable when the AI layer is unavailable.
- Update `CONTEXT.md` and the relevant `docs/` file when a stable business or architectural rule changes.

## Authorization and AI

- Frontend visibility is not authorization. Validate every protected read and write server-side.
- Keep role, organizational scope, object scope, visibility, and effective permission as distinct concepts.
- Resolve the authorized record set before building AI context. Never send a global dataset to a model and ask the model to hide unauthorized records.
- High-impact AI actions follow `PROPOSE → REVIEW → CONFIRM → EXECUTE`.
- Add or update permission regression tests whenever scope, visibility, search, analytics, exports, or AI context can change.
- Never disable a failing security test merely to unblock implementation.

## Domain invariants

- Meetings are shared collaborative sessions; recurrence uses Meeting Series and Meeting Sessions.
- Meeting participation does not grant permanent access to every generated object.
- PDCA is a structured object that may contain Tasks; it is not a Task with another label.
- Owner, Responsible, Collaborator, and Watcher are distinct roles.
- Priority, Impact, and Risk are distinct dimensions.
- Preserve historical context through explicit transitions, audit events, archival, and temporal assignments.

Use the detailed specifications in `docs/meetings.md`, `docs/pdca.md`, `docs/tasks.md`, `docs/analytics.md`, and `docs/ai.md` rather than expanding this file.

## UI and completion

Follow `docs/design-language.md`. Usability, accessibility, clear hierarchy, and operational scanability take precedence over decorative effects.

A change is complete only when its business rules, server-side authorization, migrations, types, errors, audit requirements, tests, documentation, accessibility, and data-leak boundaries have been addressed in proportion to the change. Never claim checks that were not run.

Deployment steps live in `docs/deployment.md`; the document explains the procedure but does not authorize a deployment.
