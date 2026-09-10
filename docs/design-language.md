# Design language

This document preserves the visual and interaction direction for Gestao PDCA. It is project documentation, not a global agent policy.

## Direction

The application should feel like a high-end modern digital product while remaining appropriate for daily enterprise use.

Hobro Digital may be used as a directional reference only. Do not copy its layout, assets, branding, imagery, copy, animations, or distinctive implementation. Extract general principles such as:

- bold visual hierarchy;
- strong typography and confident headings;
- generous spacing and a clean grid;
- minimalist composition;
- strong black/white contrast with restrained accent colors;
- an editorial feeling;
- subtle, high-quality transitions;
- motion used to clarify hierarchy and state.

Adapt these ideas to an enterprise application rather than reproducing an agency portfolio.

## Product adaptation

Usability takes precedence over spectacle. Use stronger visual expression mainly in:

- login and onboarding;
- dashboard hero and header areas;
- section transitions;
- executive analytics and large KPI summaries;
- empty states and top-level navigation;
- Meeting Mode introductions and summaries;
- AI insight panels.

Use restrained motion inside dense operational screens. Avoid:

- excessive parallax in tables;
- animated backgrounds behind forms;
- long entrance animations or scroll-jacking;
- effects that delay interaction;
- low-contrast typography;
- decorative UI that reduces scanability.

## Typography and color

Use strong sans-serif display typography for major page titles and KPI statements, with a highly legible UI sans-serif for tables, forms, and controls. Large typographic hierarchy is welcome, but operational data must remain compact and scannable.

Start from a mostly neutral palette:

- black or near-black;
- white or off-white;
- neutral grays;
- one restrained warm accent family when useful.

Do not use a large rainbow of department colors by default. Status colors may distinguish overdue, blocked, completed, and critical states, but must remain accessible.

## Layout and motion

- Use a strong grid and generous page-level whitespace.
- Keep tables dense but readable.
- Separate summaries clearly from detail.
- Prefer meaningful sections over excessive card grids.
- Use short transitions to communicate navigation, state change, completion, and expansion.
- Keep animation lightweight and respect reduced-motion preferences.

## Components

Prefer reusable components for:

- KPI summaries and AI insight blocks;
- status and scope badges;
- person and restaurant chips;
- timelines and activity feeds;
- meeting agenda items;
- PDCA progress and task rows;
- filter bars, data tables, and side panels;
- command and search palettes.

Use shadcn/ui as a base without leaving the application looking like an untouched component library. Maintain coherent spacing, radius, typography, surface, and interaction-state tokens.

## Dashboards

Executive dashboards should not be a wall of cards. Prefer this hierarchy:

1. top-line management statement;
2. critical KPIs;
3. trend and throughput;
4. areas requiring attention;
5. breakdown by department or restaurant;
6. actionable lists;
7. AI summary.

The user should understand the state of execution within a few seconds.

## Meeting Mode

Meeting Mode is designed for projected/shared screens and laptops. Prioritize:

- a clearly visible current agenda item;
- easy review of pending items from previous meetings;
- fast creation of a Decision, Task, or PDCA;
- clear Responsible, Owner, deadline, and scope;
- minimal modal interruption;
- obvious Draft and Published states.

Use a focused presentation mode with larger typography than ordinary operational screens.

## Accessibility and performance

Maintain keyboard navigation, visible focus states, sufficient contrast, accessible labels, reduced-motion support, and semantic HTML. Do not sacrifice accessibility for visual inspiration.

Prefer fast perceived performance:

- use server rendering where beneficial;
- paginate or virtualize large datasets;
- do not load global datasets into the client;
- avoid over-fetching dashboards;
- keep animations GPU-friendly and lightweight;
- avoid heavy visual libraries unless justified.
