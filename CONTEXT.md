# CONTEXT.md

## 1. Purpose

This document is the primary business and functional context for this project.

It describes:
- what the application is intended to solve;
- how the organization is structured;
- how organizational scope works;
- how permissions should behave;
- how meetings generate decisions, PDCAs and tasks;
- how execution should be monitored;
- how AI should interact with the system.

This document is a source of truth for business rules.

Before implementing or modifying functionality related to organization, users, permissions, restaurants, departments, shared services, meetings, decisions, PDCAs, tasks, projects, dashboards, analytics or AI, read this document first.

Do not silently introduce business rules that contradict this document.

---

# 2. Product vision

The application is an internal **Execution Management Platform** for a multi-restaurant hospitality group.

It is not merely:
- a task manager;
- a meeting notes app;
- a PDCA tracker;
- a project management tool.

It should connect:

ORGANIZATION  
→ MEETINGS  
→ DECISIONS  
→ PDCAs  
→ TASKS  
→ EXECUTION  
→ FOLLOW-UP  
→ RESULTS  
→ ANALYTICS  
→ MANAGEMENT INSIGHT

The objective is to ensure that issues discussed throughout the organization result in:
1. clear decisions;
2. clear ownership;
3. concrete actions;
4. deadlines;
5. follow-up;
6. measurable outcomes;
7. organizational learning.

Management should be able to understand not only what is pending, but also:
- where execution is failing;
- which areas accumulate delays;
- which restaurants have recurring problems;
- which departments have growing backlogs;
- which issues repeatedly return to meetings;
- how long issues take to resolve;
- where work is blocked;
- whether execution performance is improving or deteriorating.

---

# 3. Core design principles

## 3.1 Organization must be configurable

The current organizational structure must be representable in the system, but must not be hardcoded.

Administrators must be able to create, modify and deactivate:
- companies;
- departments;
- shared services;
- restaurants / operational units;
- users;
- roles;
- organizational assignments;
- hierarchy relationships;
- restaurant assignments;
- permission policies.

Opening a new restaurant or creating a new department must not require code changes.

## 3.2 Role and scope are different concepts

Never assume that a role alone determines access.

Effective access is conceptually determined by:

FUNCTIONAL PERMISSION  
× ORGANIZATIONAL SCOPE  
× DEPARTMENT/SERVICE SCOPE  
× RESTAURANT SCOPE  
× HIERARCHICAL RELATIONSHIPS  
× OBJECT VISIBILITY RULES  
× EXPLICIT ACCESS WHERE APPLICABLE

## 3.3 Authorization must be deterministic

AI must never decide whether a user is allowed to access information.

AI can help classify, summarize, recommend, detect anomalies and suggest scope, but cannot override permissions.

## 3.4 Backend authorization is mandatory

Every query and mutation involving protected information must be authorized server-side.

Conceptually:

USER  
→ ACTION  
→ OBJECT  
→ SCOPE  
→ PERMISSION  
→ ALLOW / DENY

Unauthorized data should never be sent to the browser.

---

# 4. Organizational structure

The organization contains:
1. Executive Management
2. Internal Support Departments
3. Department of Operations and Logistics (DOL)
4. Shared Services provided by another company within the same holding
5. Restaurants / Operational Units

---

# 5. Executive Management

## CEO

The CEO has global access.

Scope:
- Departments: ALL
- Services: ALL
- Restaurants: ALL
- Users: ALL

## Expansion and Management Support

Immediately below the CEO exists:

**Expansion and Management Support**

Current leader: **André Março**

André Março has the same global organizational visibility as the CEO.

This is a business rule, but the implementation must use configurable permissions rather than checking the person's name.

---

# 6. Internal Support Departments

Current internal support departments include:

- **Marketing** — Mafalda Zuzarte
- **Happy People** — Sara Barradas
- **Support & IT** — Gui Rainho
- **Commercial** — Margarida Vilarinho

These names and departments represent the current organization and must not be hardcoded.

---

# 7. Support Department access model

Internal support departments operate transversally across restaurants.

Default conceptual access model:

THEIR DEPARTMENT  
× ALL RESTAURANTS

Example:

Support & IT can access authorized Support & IT matters concerning all restaurants.

This does not automatically grant Support & IT access to Happy People, Marketing, Commercial or other restricted domains.

---

# 8. Department of Operations and Logistics — DOL

The DOL manages daily restaurant operations.

Current Director: **João Novo**

The Director of DOL has operational visibility across all restaurants.

Current sub-directors:
- Tiago Carvalho
- Mariana Seabra
- Mónica Gomes

Each sub-director is responsible for a configurable group of restaurants.

Names and assignments must not be hardcoded.

---

# 9. DOL operational hierarchy

Typical operational hierarchy:

DOL Director  
→ Sub-director  
→ Supervisor  
→ Restaurant Manager  
→ Restaurant

The hierarchy must support optional levels.

A restaurant manager may report directly to a sub-director when no supervisor exists.

The organizational hierarchy must support branches with different depths.

---

# 10. Hierarchical restaurant inheritance

Operational scope is inherited upward.

Example:

Supervisor 1 manages Restaurant A + B.  
Supervisor 2 manages Restaurant C.  
Both report to Sub-director X.

Effective restaurant scope:
- Supervisor 1: A + B
- Supervisor 2: C
- Sub-director X: A + B + C
- DOL Director: all restaurants under DOL

---

# 11. Kitchen operational hierarchy

Kitchen operations have a parallel structure inside DOL.

Typical hierarchy:

DOL Director  
→ Kitchen Supervisor  
→ Kitchen Manager  
→ Restaurant

Kitchen Supervisors report directly to DOL leadership.

A restaurant may simultaneously have:
- operational manager;
- operational supervisor;
- kitchen manager;
- kitchen supervisor.

---

# 12. DOL access model

Operational users are primarily scoped by restaurant.

Conceptually:

AUTHORIZED BUSINESS DOMAINS  
× RESTAURANTS UNDER RESPONSIBILITY

Support departments see vertically across restaurants within their domain.

Operations sees horizontally across relevant domains within their restaurants.

Executive Management sees both dimensions globally.

---

# 13. Shared Services

Some support functions are provided by another company belonging to the same holding.

Current shared services include:

- **HACCP** — Ricardo Torrão
- **Management Control & Purchasing** — Ana Serrano
- **Maintenance** — André Stoffel
- **DAF** — Bruno Henriques

These names must not be hardcoded.

---

# 14. Shared Services access model

Shared Services generally operate transversally.

Conceptually:

THEIR SERVICE  
× ALL RESTAURANTS COVERED BY THAT SERVICE

Shared Services connect organizationally with:
- CEO;
- Expansion and Management Support;
- department directors;
- restaurant operations when relevant.

They must be modeled as transversal service relationships, not falsely placed under internal department hierarchy.

---

# 15. Scope

Scope is a central concept.

Business objects may be associated with combinations of:
- companies;
- departments;
- shared services;
- restaurants;
- people;
- projects.

Objects requiring scope include at least:
- meetings;
- decisions;
- PDCAs;
- tasks;
- projects.

A single object can involve multiple departments and multiple restaurants.

---

# 16. Visibility

Objects should support at least these visibility policies:

## NORMAL
Uses normal organizational scope rules.

## RESTRICTED
Access is restricted to explicitly authorized participants/users and appropriately privileged administrators (holders of `security.restricted.read` within a covering scope). **The creator of a RESTRICTED object keeps access to the object they created** (decision of 2026-09-03): they still need a current assignment covering the object and the functional permission for the action, but not `security.restricted.read`. No explicit grant is written for this; the condition is part of the central deterministic authorization rule, so it applies uniformly to detail pages, lists, My Work, meetings, linked objects and AI sources, and it disappears when the creator's assignment ends.

## PRIVATE
Access only to creator and explicitly authorized users, subject to explicitly defined administrative/security rules.

Restricted/private access is particularly important for Happy People, DAF, disciplinary issues, compensation, employee evaluations, strategic matters and other sensitive subjects.

---

# 17. Users can have multiple assignments

Never assume:
- 1 user = 1 department
- 1 user = 1 restaurant

Assignments should support:
- start date;
- optional end date;
- active/inactive state.

---

# 18. Meetings

Supported meeting scenarios include:
- one-to-one;
- department meeting;
- management meeting;
- operations meeting;
- restaurant meeting;
- project meeting;
- ad-hoc meeting;
- recurring meeting.

A meeting may include arbitrary combinations of people, departments, shared services and restaurants.

The meeting itself does not permanently determine permissions of every object created during it.

Each Decision, PDCA and Task has its own scope.

---

# 19. Recurring meetings

Recurring meetings should use:

MEETING SERIES  
→ MEETING SESSION

A new session should be able to surface:
- pending actions from previous sessions;
- overdue PDCAs;
- unresolved decisions;
- postponed subjects;
- relevant follow-ups.

---

# 20. Meeting collaboration model

A meeting is a shared workspace.

There should normally be a **Meeting Owner / Chair** responsible for conducting and finalizing the session.

Participants can, according to permissions:
- view agenda;
- add notes;
- comment;
- propose decisions;
- propose tasks;
- propose PDCAs.

Normal operational model:

ONE PERSON CONDUCTS / RECORDS  
+ PARTICIPANTS REVIEW AND CONTRIBUTE  
+ AI MAY ASSIST

---

# 21. Meeting lifecycle

Typical lifecycle:

SCHEDULED  
→ IN PROGRESS  
→ REVIEW  
→ PUBLISHED / CLOSED

During a meeting, newly identified actions may remain DRAFT.

Before closing, the Chair reviews:
- decisions;
- tasks;
- PDCAs;
- responsible users;
- owners;
- deadlines;
- departments;
- restaurants;
- visibility.

After validation, published actions become part of execution workflows and dashboards.

---

# 22. Decisions

A Decision is a first-class entity.

A decision may:
- exist without a task;
- generate one or more tasks;
- generate a PDCA;
- relate to an existing PDCA;
- belong to a project;
- originate from a meeting.

The application must preserve the relationship between a decision and the meeting/context in which it was made.

---

# 23. Tasks

A Task represents a concrete action.

A task can:
- exist independently;
- originate in a meeting;
- belong to a PDCA;
- belong to a project;
- relate to a decision.

A task should support:
- title;
- description;
- status;
- priority;
- owner;
- responsible;
- collaborators;
- watchers;
- department/service;
- restaurant scope;
- project;
- PDCA;
- originating meeting;
- start date;
- due date;
- completion date;
- blockers;
- dependencies;
- comments;
- evidence;
- attachments;
- visibility;
- audit history.

---

# 24. PDCA

PDCA is not just another name for Task.

Conceptually:

PLAN  
→ DO  
→ CHECK  
→ ACT

A PDCA may contain multiple Tasks.

A PDCA should support:
- problem statement;
- objective;
- root cause / hypothesis;
- owner;
- responsible;
- collaborators;
- watchers;
- departments/services;
- restaurants;
- project;
- originating meeting;
- priority;
- impact;
- risk;
- KPI;
- expected result;
- actual result;
- deadline;
- blockers;
- dependencies;
- comments;
- evidence;
- attachments;
- activity history.

PDCAs should support progressive maturation.

---

# 25. Owner vs Responsible

## Responsible
The person executing or coordinating the work.

## Owner
The person accountable for ensuring the issue reaches resolution.

Changing Responsible should not remove organizational accountability.

---

# 26. Collaborators and Watchers

Collaborators actively contribute to execution.

Watchers follow an object but are not responsible for execution.

Being a watcher must not automatically bypass access restrictions.

---

# 27. Status

Status values should ultimately be configurable.

Initial useful statuses:
- Draft
- Open
- Planned
- In Progress
- Blocked
- Waiting
- Under Review
- Completed
- Cancelled
- Archived

PDCA may additionally expose Plan / Do / Check / Act phase information.

Status transitions must be recorded in history.

---

# 28. Priority, Impact and Risk

These are independent dimensions.

Initial levels:
- Low
- Medium
- High
- Critical

Do not assume Priority = Impact = Risk.

---

# 29. Blockers and Dependencies

Tasks and PDCAs can be blocked.

Store at least:
- blocked status;
- blocked since;
- reason;
- blocker;
- dependency where applicable.

Objects may depend on:
- another task;
- another PDCA;
- a decision;
- an external supplier;
- another department;
- an external event.

Blocking time should be measurable.

---

# 30. Deadlines

Important timestamps include:
- created_at;
- start_date;
- first_action_at;
- due_date;
- completed_at;
- last_activity_at.

Deadline changes must preserve history:
- old due date;
- new due date;
- changed by;
- changed at;
- reason.

---

# 31. Completion and reopening

Completed should not merely be a checkbox.

Completion can include:
- completion notes;
- actual result;
- evidence;
- attachments;
- KPI result.

Certain PDCAs may require owner approval before final closure.

Tasks and PDCAs can be reopened, recording:
- reopened_at;
- reopened_by;
- reason.

---

# 32. Projects / Initiatives

Projects aggregate:
- meetings;
- decisions;
- PDCAs;
- tasks;
- departments;
- restaurants;
- people;
- documents.

Projects should have:
- owner;
- responsible;
- scope;
- status;
- start date;
- target end date;
- progress;
- related objects.

---

# 33. Auditability

The system must preserve an audit trail.

Important events include:
- object created;
- status changed;
- responsible changed;
- owner changed;
- deadline changed;
- scope changed;
- restaurant added/removed;
- department changed;
- priority changed;
- blocker added/removed;
- completed;
- reopened;
- comment added;
- attachment added;
- permission changed.

Important historical data must not silently disappear when records are edited.

---

# 34. Dashboards

Dashboards must respect effective permissions.

## Executive Dashboard
Should show:
- active PDCAs;
- active Tasks;
- completed this period;
- overdue;
- critical;
- blocked;
- without recent activity;
- completion rate;
- on-time completion rate;
- average resolution time;
- average backlog age;
- opened vs completed;
- reopening rate.

Breakdowns:
- department;
- shared service;
- restaurant;
- owner;
- responsible;
- priority;
- project;
- status;
- period.

## Department Dashboard
Department leaders should see authorized items across all restaurants in their department.

## DOL Dashboard
Support drill-down:
DOL Director  
→ Sub-director  
→ Supervisor  
→ Restaurant Manager  
→ Restaurant

And separately:
DOL Director  
→ Kitchen Supervisor  
→ Kitchen Manager  
→ Restaurant

## Restaurant Dashboard
Focused view of the relevant restaurant and authorized domains.

## Personal Dashboard — My Work
Include:
- Tasks assigned to me;
- PDCAs assigned to me;
- items I own;
- items where I am collaborator;
- items I follow;
- overdue;
- due today;
- due this week;
- blocked;
- waiting;
- items awaiting my review;
- meetings;
- recent activity.

---

# 35. Metrics

The data model should support:
- time from creation to first action;
- total resolution time;
- average delay;
- percentage completed on time;
- backlog size;
- backlog age;
- objects without activity for X days;
- reopening rate;
- number of deadline extensions;
- number of meetings where an issue appeared;
- number of postponements;
- workload by responsible;
- workload by owner;
- throughput;
- opened vs completed;
- blocked count;
- average blocked duration;
- completion by department;
- completion by restaurant;
- completion by project;
- trends over time.

---

# 36. Meeting-to-execution traceability

A user should be able to open a PDCA months later and understand:
- where it originated;
- which meeting created it;
- which decision led to it;
- who participated;
- what the original issue was;
- how the deadline evolved;
- who was responsible over time;
- which tasks were performed;
- what blockers occurred;
- what result was obtained;
- whether it was reopened;
- whether it returned to later meetings.

A PDCA, Task or topic may appear in multiple meetings without being duplicated.

---

# 37. AI vision

AI should act as an assistant and analytical layer, not as the source of truth.

Primary functions:
1. Meeting Assistant
2. Execution Assistant
3. Management Intelligence

## AI Meeting Assistant
AI may process notes, transcripts, summaries, uploaded documents and free text.

AI can propose:
- decisions;
- Tasks;
- PDCAs;
- owners;
- responsibles;
- collaborators;
- departments;
- services;
- restaurants;
- deadlines;
- priorities;
- blockers;
- dependencies;
- follow-ups.

Workflow:

AI PROPOSES  
→ HUMAN REVIEWS  
→ HUMAN EDITS IF NECESSARY  
→ HUMAN CONFIRMS  
→ SYSTEM CREATES / PUBLISHES

## AI execution validation
AI should help detect:
- Task without Responsible;
- PDCA without Owner;
- PDCA without deadline;
- PDCA without clear objective;
- overdue item without update;
- continuously postponed item;
- missing expected result;
- potential duplicate;
- very similar open issue;
- completed PDCA without evidence;
- conflicting dependencies;
- responsible user possibly unrelated to scope;
- decision without resulting follow-up;
- repeated meeting discussion without progress.

These are recommendations/warnings.

## AI Management Intelligence
Authorized users should be able to ask:
- How is the company doing this week?
- Which departments have the most delays?
- Where is backlog increasing?
- Which restaurants have the highest number of critical issues?
- Which issues keep returning?
- Which PDCAs have had no update for more than 15 days?
- Who appears overloaded?
- Are we closing more items than we are opening?
- What is the average resolution time by department?
- What are the main current blockers?
- Which areas are deteriorating compared with last month?

AI answers must be grounded in authorized system data.

---

# 38. AI permission rule

AI operates with the permissions of the current authenticated user.

Conceptually:

AUTHORIZED_DATA = permission_engine(current_user)

AI_CONTEXT = subset(AUTHORIZED_DATA)

AI_RESPONSE = model(AI_CONTEXT)

Never:

ALL_DATA → AI → "please hide what the user cannot access"

Permission filtering must occur before protected information is provided to the AI model.

---

# 39. AI autonomy

For high-impact actions:

PROPOSE  
→ REVIEW  
→ CONFIRM  
→ EXECUTE

Human confirmation should be required for:
- assign Responsible;
- change Owner;
- change deadline;
- change organizational scope;
- mark a PDCA completed;
- publish a meeting;
- change permissions;
- create a new organizational relationship.

Lower-risk AI actions may later be automated, such as:
- summarizing comments;
- generating titles;
- formatting notes;
- suggesting tags;
- preparing meeting summaries.

---

# 40. Executive Brief

The architecture should support an AI-generated executive briefing based on deterministic analytics.

Important conclusions should link back to the underlying records.

---

# 41. Pattern and workload detection

The system should eventually support:
- recurring operational problems;
- repeatedly late departments;
- restaurants with abnormal issue incidence;
- long-running PDCAs;
- repeated blockers;
- supplier-related dependencies;
- repeated deadline extensions;
- overloaded owners;
- overloaded responsibles;
- topics appearing in multiple meetings;
- frequently repeated Tasks;
- organizational bottlenecks.

Simple task counts are insufficient. Workload analysis should consider priority, impact, risk, deadlines, overdue work and blocked work.

---

# 42. Notifications

The architecture should support:
- Task assigned;
- PDCA assigned;
- Owner assigned;
- mention;
- comment;
- approaching deadline;
- overdue;
- blocked;
- unblocked;
- approval requested;
- responsibility changed;
- deadline changed;
- meeting approaching;
- meeting summary published;
- relevant project updated.

Initial implementation can use in-app notifications.

Future channels may include:
- email;
- Microsoft Teams;
- WhatsApp;
- mobile push.

---

# 43. Search, filters and views

Search must be permission-aware.

Searchable entities:
- meetings;
- meeting sessions;
- decisions;
- Tasks;
- PDCAs;
- Projects;
- restaurants;
- users;
- departments;
- shared services.

Filters should support combinations such as:
- date range;
- status;
- department;
- shared service;
- restaurant;
- Owner;
- Responsible;
- collaborator;
- priority;
- impact;
- risk;
- overdue;
- blocked;
- project;
- meeting;
- visibility.

Saved personal views may be added later.

---

# 44. Administration

The Administration area should manage:
- Companies;
- Departments;
- Shared Services;
- Restaurants;
- Users;
- Roles;
- Permission policies;
- Organizational Assignments;
- Hierarchical Relationships;
- Restaurant Assignments;
- statuses;
- priorities;
- meeting types;
- notification rules.

Important assignments should preferably be temporal.

Business entities with history should generally be deactivated/archiveable instead of physically deleted.

---

# 45. Security principles

Important rules:
- authenticate every protected request;
- authorize server-side;
- deny by default;
- minimize data returned;
- avoid exposing unauthorized rows to the client;
- audit permission changes;
- validate mutations against effective scope;
- never trust IDs supplied by the browser without authorization;
- prevent horizontal privilege escalation;
- prevent vertical privilege escalation.

Exports, dashboards, analytics, search and AI must use exactly the same authorization rules as the application.

---

# 46. UX principles

The interface should feel like a professional internal management product.

Primary design goals:
- clear;
- fast;
- low cognitive load;
- enterprise-oriented;
- strong information hierarchy;
- practical rather than decorative.

Desktop-first but responsive.

A Restaurant Manager should experience “My Restaurant”, not a complex permission matrix.

Main navigation may include:
- Dashboard
- My Work
- Meetings
- PDCAs
- Tasks
- Projects
- Decisions
- Analytics
- Organization
- Admin

---

# 47. Meeting Mode UX

A dedicated Meeting Mode should be considered.

Possible structure:

HEADER  
Meeting title / date / participants / status

MAIN AREA  
Agenda / current subject / notes

SECONDARY AREA  
Pending from previous meeting / existing PDCAs / Tasks / Decisions

Quick actions:
- + Decision
- + Task
- + PDCA
- + Note

At meeting end:
- Review Meeting
- validate decisions;
- validate Tasks;
- validate PDCAs;
- validate Responsible;
- validate Owner;
- validate deadline;
- validate scope;
- validate visibility;
- Publish / Close Meeting

---

# 48. Data model philosophy

Prefer normalized entities and relationships over storing organizational logic inside arbitrary JSON blobs.

Core relational concepts deserve real tables/relationships:
- Users
- Companies
- Organizational Units
- Restaurants
- Assignments
- Roles
- Permissions
- Meetings
- Meeting Sessions
- Decisions
- PDCAs
- Tasks
- Projects
- Scopes
- Comments
- Attachments
- Audit Events

---

# 49. Technical direction

Preferred technical direction:
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- modular monolith
- server-side authorization
- migrations
- testable business logic
- OpenAI integration behind authenticated server-side services

Avoid premature microservices.

Potential domain modules:
- auth
- organization
- permissions
- meetings
- decisions
- pdca
- tasks
- projects
- comments
- attachments
- notifications
- analytics
- ai
- audit

---

# 50. Permission engine as shared infrastructure

Other modules should ask shared authorization infrastructure questions such as:

can(user, action, object)

or:

getAccessibleScope(user)

Do not reimplement permission rules independently in pages, exports, search or AI.

---

# 51. Mandatory permission tests

At minimum test:

- CEO sees authorized global information.
- André Março sees authorized global information.
- Support & IT Director sees Support & IT NORMAL items across all restaurants.
- Support & IT Director does not automatically see Restricted Happy People information.
- Restaurant A Manager sees authorized NORMAL objects relating to Restaurant A.
- Restaurant A Manager does not see equivalent objects limited to Restaurant B.
- Supervisor of A+B can see authorized A+B items.
- Sub-director inherits restaurant scope from subordinate structure.
- HACCP user sees authorized HACCP matters across covered restaurants.
- HACCP role does not automatically grant Maintenance information.
- Organizational scope intersection alone must not expose a Restricted object.
- Private object only appears for explicitly allowed users and specifically authorized administrative access.
- Analytics use the same authorized scope.
- Search never returns inaccessible objects.
- Exports never include inaccessible rows.
- AI never receives inaccessible records in its context.

---

# 52. MVP priorities

First functional version should include:
1. Authentication
2. Organization
3. Users
4. Departments
5. Shared Services
6. Restaurants
7. Organizational Assignments
8. Hierarchy
9. Permission engine
10. Meetings
11. Meeting Sessions
12. Decisions
13. PDCAs
14. Tasks
15. Comments
16. Activity / Audit Log
17. Personal Dashboard
18. Basic Executive Dashboard
19. Filters
20. Administration

The architecture should prepare for AI, but the first version does not need every AI function fully implemented.

---

# 53. Recommended implementation sequence

### Phase A — Foundation
- project structure;
- authentication;
- database;
- migrations;
- seed strategy;
- basic UI shell.

### Phase B — Organization
- companies;
- departments;
- shared services;
- restaurants;
- users;
- roles;
- assignments;
- hierarchy.

### Phase C — Permissions
- permission model;
- scope resolution;
- server-side authorization;
- tests.

Do not proceed deeply into Meetings/PDCAs before the permission model is reliable.

### Phase D — Execution Core
- Tasks;
- PDCAs;
- Decisions;
- Comments;
- Audit Trail.

### Phase E — Meetings
- Meeting Series;
- Meeting Sessions;
- Meeting Mode;
- review/publish flow;
- previous-action follow-up.

### Phase F — Dashboards
- My Work;
- department/restaurant visibility;
- executive dashboard;
- analytics foundation.

### Phase G — AI
- meeting extraction;
- validation;
- management assistant;
- executive briefing.

---

# 54. Things the implementation must NOT assume

Do not assume:
- current people will always hold the same roles;
- there will always be exactly four support departments;
- there will always be exactly three sub-directors;
- every restaurant has a Supervisor;
- each user belongs to one department;
- each user belongs to one restaurant;
- each PDCA belongs to one department;
- each PDCA belongs to one restaurant;
- participant list of a meeting determines permanent PDCA visibility;
- being a Responsible grants arbitrary access to unrelated company data;
- department and company are interchangeable;
- shared service and department are interchangeable;
- role and scope are interchangeable.

Never hardcode names, emails, restaurants or role names into access logic.

---

# 55. Source-of-truth hierarchy

1. CONTEXT.md — product/business source of truth
2. docs/ — detailed technical/functional specifications
3. database/schema/migrations — implemented domain model
4. application code
5. UI

UI behavior must not redefine core business rules.

---

# 56. Definition of success

The product succeeds when the organization can move away from disconnected spreadsheets and informal follow-up toward a common execution system where:
- decisions are recorded;
- responsibility is explicit;
- deadlines are visible;
- progress is transparent;
- permissions follow the real organization;
- meetings naturally feed execution;
- unresolved issues remain visible;
- management has reliable indicators;
- AI reduces administrative effort;
- AI helps identify organizational patterns;
- historical context is preserved.

A manager should be able to answer:

“What do I need to do?”

A department leader:

“What is happening in my department?”

An operational leader:

“What is happening in my restaurants?”

The CEO:

“How well is the organization executing?”

And AI should help answer:

“Where should we focus our attention next?”

without ever bypassing the organization's permission model.

---

# 57. Final principle

This product should optimize for:

**accountability, visibility, execution and learning.**

It should not reward the creation of more Tasks or more PDCAs.

The objective is to help the organization identify issues, resolve them effectively, understand why execution fails, and continuously improve.
