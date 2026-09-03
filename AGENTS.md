# AGENTS.md

## 1. Purpose

This file defines permanent working rules for Codex and other coding agents operating in this repository.

Before implementing changes that affect organization, permissions, meetings, PDCAs, tasks, analytics, AI access or dashboards:

1. Read `CONTEXT.md`.
2. Read the relevant document under `/docs` if one exists.
3. Inspect the current schema and migrations.
4. Inspect the current permission implementation.
5. Preserve existing business rules unless the requested change explicitly changes them.
6. If a requested change conflicts with `CONTEXT.md`, flag the conflict before changing the domain model.

---

# 2. Core engineering rules

- Use TypeScript strictly.
- Prefer explicit domain types over `any`.
- Keep domain logic outside UI components.
- Keep permission logic centralized.
- Keep database changes in versioned migrations.
- Do not change production data manually when a migration is appropriate.
- Do not duplicate authorization rules.
- Do not hardcode people, restaurants, departments or current organizational assignments.
- Prefer configuration and relational data over conditional logic based on names.
- Avoid premature microservices.
- Build as a modular monolith unless there is a clear reason not to.
- Keep the application usable if the AI layer is unavailable.

---

# 3. Preferred stack

Unless there is a documented reason to change it:

- Next.js
- React
- TypeScript
- PostgreSQL
- Supabase for database/auth/backend services
- Tailwind CSS
- shadcn/ui
- TanStack Query where useful
- OpenAI integration only through authenticated server-side services

Use current stable versions compatible with the project.

---

# 4. Authorization rules

Authorization is a core infrastructure concern.

Never rely on frontend visibility as authorization.

Every protected read or write must be validated server-side.

The canonical permission model is described in `CONTEXT.md`.

Conceptually:

USER
→ ACTION
→ OBJECT
→ ORGANIZATIONAL SCOPE
→ VISIBILITY POLICY
→ EFFECTIVE PERMISSION
→ ALLOW / DENY

Use shared helpers/services such as:

- `can(user, action, object)`
- `getAccessibleScope(user)`
- `getAccessibleRestaurantIds(user)`
- `getAccessibleDepartmentIds(user)`

The exact API can evolve, but permission logic must remain centralized and testable.

Never create UI-specific permission rules that disagree with the backend.

---

# 5. AI security rules

AI never decides access.

Before sending data to any model:

1. authenticate the current user;
2. resolve effective permissions;
3. query only authorized records;
4. build AI context from that authorized subset;
5. call the model.

Never send global data to the model and ask the model to hide unauthorized data.

AI-generated high-impact actions must follow:

PROPOSE
→ REVIEW
→ CONFIRM
→ EXECUTE

Examples requiring confirmation:
- assign Responsible;
- change Owner;
- change deadline;
- change scope;
- publish meeting;
- close PDCA;
- change permissions;
- create organizational relationship.

---

# 6. Data model rules

Prefer normalized relational tables for core concepts.

Do not hide core business relationships inside generic JSON blobs.

Real relational entities should exist for concepts such as:
- companies;
- departments;
- shared services;
- restaurants;
- users;
- organizational assignments;
- hierarchy relationships;
- roles;
- permission policies;
- meetings;
- meeting series;
- meeting sessions;
- decisions;
- PDCAs;
- tasks;
- projects;
- comments;
- attachments;
- audit events.

JSON/JSONB may be used for flexible metadata, AI payloads or non-critical configuration.

---

# 7. Business history

Do not silently destroy historical context.

Prefer:
- deactivation;
- archival;
- temporal assignments;
- audit events;
- explicit transitions.

Important changes must preserve:
- old value;
- new value;
- actor;
- timestamp;
- reason when relevant.

Examples:
- Responsible changed;
- Owner changed;
- due date changed;
- restaurant scope changed;
- status changed;
- PDCA reopened;
- organizational assignment changed;
- permission changed.

---

# 8. Meeting implementation rules

Meetings are collaborative shared sessions.

Do not create isolated personal meeting copies.

Recurring meetings should use:

Meeting Series
→ Meeting Sessions

Each Decision, PDCA and Task created from a meeting has its own scope and visibility.

The participant list of the meeting must not become a permanent permission shortcut for all generated work items.

Support a Draft → Review → Published/Closed workflow.

---

# 9. PDCA and Task rules

Do not model PDCA as a Task with a different label.

A PDCA is a structured improvement/problem-solving object and may contain multiple Tasks.

Keep distinct concepts:
- Owner;
- Responsible;
- Collaborator;
- Watcher.

Keep distinct dimensions:
- Priority;
- Impact;
- Risk.

Support blockers, dependencies, evidence, due date history and reopening.

---

# 10. Testing requirements

Permission tests are mandatory for every change that can affect scope or visibility.

At minimum, preserve tests for:
- global executive access;
- transversal support-department access;
- restaurant-scoped DOL access;
- hierarchical restaurant inheritance;
- shared-service access;
- Restricted objects;
- Private objects;
- search authorization;
- analytics authorization;
- exports authorization;
- AI context authorization.

When fixing a permission bug, add a regression test before or alongside the fix.

Do not disable failing security tests simply to unblock development.

---

# 11. Documentation rules

Keep documentation synchronized with major business or architectural changes.

Suggested documents:
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/permissions.md`
- `docs/meetings.md`
- `docs/pdca.md`
- `docs/tasks.md`
- `docs/analytics.md`
- `docs/ai.md`
- `docs/security.md`

When a change alters a stable business rule, update `CONTEXT.md` as part of the same change.

---

# 12. Development sequence

When starting the project, use this order:

1. Foundation
2. Organization model
3. Permission engine
4. Permission tests
5. Execution core
6. Meetings
7. Dashboards
8. Analytics
9. AI

Do not build large portions of the application before the organization and permission models are stable.

---

# 13. UI / visual direction

The application should feel like a high-end modern digital product while remaining appropriate for daily enterprise use.

Visual inspiration may be taken from the **Hobro Digital** website as a directional reference only.

Do not copy its layout, assets, branding, imagery, copy, animations or distinctive implementation.

Use the reference to extract general principles such as:
- bold visual hierarchy;
- strong typography;
- large, confident headings;
- generous spacing;
- minimalist composition;
- strong black/white contrast;
- restrained accent colors;
- selective use of oversized type;
- editorial feeling;
- subtle high-quality transitions;
- motion used to clarify hierarchy and state;
- clean grid;
- premium but direct presentation.

The reference is known for a clean, minimal and animated presentation, including parallax-style motion and a predominantly black/white palette. For this product, adapt those ideas to an enterprise application rather than reproducing an agency portfolio.

---

# 14. UI adaptation for this product

This is a business application, so usability takes precedence over spectacle.

Use the visual inspiration primarily in:
- login/onboarding;
- dashboard hero/header areas;
- section transitions;
- executive analytics;
- empty states;
- top-level navigation;
- large KPI summaries;
- Meeting Mode introduction/summary;
- AI insight panels.

Use restrained motion inside dense operational screens.

Avoid:
- excessive parallax in tables;
- animated backgrounds behind forms;
- long entrance animations;
- scroll-jacking;
- effects that delay interaction;
- low-contrast typography;
- decorative UI that reduces scanability.

---

# 15. Design language

Recommended direction:

## Typography
- Strong sans-serif display typography for major page titles and KPI statements.
- Highly legible UI sans-serif for tables, forms and controls.
- Large typographic hierarchy is welcome, but operational data must stay compact and scannable.

## Color
Start from a mostly neutral base:
- black / near-black;
- white / off-white;
- neutral grays.

Use one restrained warm accent family for emphasis if appropriate.

Do not use a large rainbow of department colors by default.

Status colors may be used semantically for:
- overdue;
- blocked;
- completed;
- critical;
but must remain accessible.

## Layout
- Strong grid.
- Generous whitespace at page level.
- Dense but readable tables.
- Clear hierarchy between summary and detail.
- Prefer meaningful sections over excessive card grids.

## Motion
- Short, subtle transitions.
- Use motion to communicate change, navigation, completion and expansion.
- Avoid animation that interferes with fast daily work.

---

# 16. Component guidance

Prefer reusable components for:
- KPI summary;
- status badge;
- scope badge;
- person chip;
- restaurant chip;
- timeline;
- activity feed;
- meeting agenda item;
- PDCA progress;
- task row;
- filter bar;
- data table;
- side panel;
- command/search palette;
- AI insight block.

Use shadcn/ui as a base, but do not leave the product looking like an untouched component library.

Establish a coherent design system with:
- spacing tokens;
- radius tokens;
- typography scale;
- surface hierarchy;
- interaction states.

---

# 17. Dashboard design

Executive dashboards should not be a wall of cards.

Prefer a clear visual hierarchy:

1. top-line management statement;
2. critical KPIs;
3. trend / throughput;
4. where attention is needed;
5. breakdown by department / restaurant;
6. actionable lists;
7. AI summary.

The user should understand the state of execution within a few seconds.

---

# 18. Meeting Mode design

Meeting Mode should be optimized for projected/shared-screen use and laptops.

Priorities:
- current agenda item clearly visible;
- pending items from previous meetings easy to review;
- fast creation of Decision / Task / PDCA;
- clear identification of Responsible, Owner, deadline and scope;
- minimal modal interruptions;
- obvious Draft vs Published state.

Use a focused presentation mode with larger typography than standard operational screens.

---

# 19. Accessibility

Maintain:
- keyboard navigation;
- visible focus states;
- sufficient contrast;
- accessible labels;
- reduced-motion support;
- semantic HTML where appropriate.

Do not sacrifice accessibility to reproduce visual inspiration.

---

# 20. Performance

Prefer fast perceived performance.

- Use server rendering where beneficial.
- Paginate or virtualize large datasets.
- Avoid loading global datasets into the client.
- Do not over-fetch for dashboards.
- Keep animations GPU-friendly and lightweight.
- Respect reduced-motion preferences.
- Do not introduce heavy visual libraries unless justified.

---

# 21. Before each major implementation

For a major feature:

1. Read `CONTEXT.md`.
2. Identify affected domains.
3. Identify permission implications.
4. Confirm required entities and relationships.
5. Add/update migrations.
6. Implement server-side authorization.
7. Implement business logic.
8. Add tests.
9. Build UI.
10. Update docs.
11. Run lint, typecheck and tests.

---

# 22. Definition of done

A feature is not complete merely because the UI works.

It is complete when:
- business rules are correct;
- permission rules are enforced server-side;
- migrations are present;
- types are sound;
- errors are handled;
- audit requirements are respected;
- tests cover critical behavior;
- relevant docs are updated;
- UI is accessible and consistent;
- no protected data leaks through search, analytics, exports or AI.

---

# 23. Final agent instruction

Optimize for:

**clarity, maintainability, security, accountability and execution.**

When choosing between a quick hardcoded solution and a slightly more deliberate configurable solution, prefer the configurable solution when it preserves the business model described in `CONTEXT.md`.
