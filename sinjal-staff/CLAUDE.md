# SINJAL, Staff Desktop (design handoff)

This folder is the approved design for the SINJAL staff desktop, the municipal back office for Bashkia Elbasan (team Nexora, AI4Society hackathon, 25 to 27 Sept 2026). Citizens report problems on the mobile app; municipal staff triage, route, resolve and measure them here.

The design was built in Claude Design as `.dc.html` files. Treat them as the source of truth for layout, copy, states and behaviour. The job in this repo is to turn them into a real app, not to redesign them.

## What is in here

- `design/`: one file per screen, plus the shared pieces.
  - `Main.dc.html` is Kreu (the home page).
  - `Raportet.dc.html` is the report list, and `Raporti.dc.html` is the detail page for a single report.
  - `Harta.dc.html` is the map.
  - `Departamentet.dc.html` shows the department overview and the workspace for each department.
  - `Automatizimet.dc.html` is the automation operations center, with 14 sub-screens.
  - `Performanca.dc.html` covers performance: two scopes (municipal level and department level), the indicator builder, drill-down and scheduled reports.
  - `Sidebar.dc.html` holds the navigation and the profile menu at the bottom.
  - `NotificationBell.dc.html` is the only control in the header.
  - `mock-data.js` holds all seed data and the shared calculations (`window.SINJAL`).
  - `staff.css` holds all shared classes.
  - `assets/logo.png` is the logo. In `mock-data.js` it is referenced as a `/_blob/...` URL; point that at this file.
- `screenshots/`: renders of every screen at 1440×900, used as the visual reference.
- `spec/qa.js`: behaviour tests that load each screen's logic and exercise it. Run them with `node spec/qa.js`; all suites must pass. Use them as the acceptance spec when porting.

## How a `.dc.html` file works

Each file has two parts:

1. A template inside `<x-dc>…</x-dc>`. It is HTML with `{{ path.to.value }}` holes, `<sc-if value="{{ x }}">` for conditionals and `<sc-for list="{{ items }}" as="item">` for loops. The `hint-placeholder-*` attributes are for the editor only and can be ignored. `<dc-import name="Sidebar">` embeds another component.
2. Logic in `<script type="text/x-dc" data-dc-script>`. This is `class Component extends DCLogic` with `state = {}`, `setState()` and a `renderVals()` method that returns every value the template uses, including the event handlers. `data-props` declares the props (for example, Sidebar takes `active`).

The runtime is React, so porting is mechanical: `renderVals()` becomes the body of a component, the template becomes JSX, `sc-if` becomes `&&`, and `sc-for` becomes `.map()`. Keep the logic as it is. It already handles filters, pagination, overrides and deep links.

## Data and shared rules

- Every number comes from `mock-data.js`. Kreu, Departamentet and Performanca all go through `SINJAL.perf`: `records`, `cohort`, `slaRate`, `avgResponse`, `avgResolution` and `newCount`. Keep that single engine so the pages never disagree. For example, the 30-day SLA should read 86% everywhere.
- The 90-day history (843 closed cases, from a seeded generator) is illustrative, and the UI says so. When a backend exists, replace `SINJAL.history`/`reports` with API data and keep the formulas the same.
- Durations always go through `SINJAL.fmtHours`, which produces "24 min", "3 orë 54 min" or "1,7 ditë".
- Status colours come from `SINJAL.tone` together with `statusMeta[status].tier`. Don't hard-code new colours.
- Categorization is a field on the case, not an AI automation. Confidence belongs to routing: 80 or above is high, 55 to 79 is medium, and below 55 goes to "Pranimi i përgjithshëm".
- Pages talk to each other through `localStorage`. In a real app, move this to router state or a store:
  - `sinjal_selected_report` opens a report on Raporti.
  - `sinjal_incoming_filter` and `sinjal_report_filter` pre-filter Raportet.
  - `sinjal_case_overrides` holds clerk edits to cases and is shared by all pages.
  - `sinjal_dept_focus`, `sinjal_auto_focus` and `sinjal_harta_focus` are one-shot deep links into Departamentet, Automatizimet and Harta.
  - `sinjal_raportet_state` and `sinjal_raportet_saved_filters` save the list state on Raportet.
  - `sinjal_notif_read` records which notifications have been read.
  - `sinjal_custom_rules`, `sinjal_routing_rules`, `sinjal_rule_changes`, `sinjal_publications`, `sinjal_automation_*` and `sinjal_perf_*` save state on Automatizimet and Performanca.

## Design system (keep these values)

- Type: Barlow for UI text, and Barlow Condensed for large numbers and the SINJAL wordmark. Sizes are limited to 11, 12, 13, 15, 18, 24 and 32px. Labels use sentence case, never uppercase with letter-spacing.
- Colour:

  | Role | Values |
  |---|---|
  | Ink | #1B1917 |
  | Page | #F5F2ED |
  | Card | #FBFAF8 |
  | Border | #E4DFD6 |
  | Muted text | #6B665F / #8A847C |
  | Accent | #C23B31 |

  Tones: critical #C23B31, warning #B8860B, success #2E7D4F, fresh #4A4640, pending #8A847C, reappeared #8E5FB0.
- Page header: every page uses `.page-header`, a fixed 96px band containing the crumb, the title, a context line and the actions. The notification bell is the only global control on the right. The profile lives at the bottom of the sidebar.
- Lists: every list and table is paginated with the shared `.pager` (showing "1–12 nga 24" and numbered pages). Changing a filter resets the list to page 1.
- Icons are inline SVG with a 1.8 stroke. No emoji.
- Arrows appear only on links that go to another page.
- Layout: the desktop is 1440×900 with a 232px dark sidebar and 28px page gutters. All UI copy is in Albanian.

## Suggested first steps in Claude Code

1. Pick the stack (for example Vite + React + TypeScript, or Next.js) and scaffold it.
2. Port `mock-data.js` into a typed data module, and `staff.css` into global styles or tokens.
3. Port the Sidebar, the NotificationBell and the page header, then one screen at a time in this order: Kreu, Raportet, Raporti, Harta, Departamentet, Automatizimet, Performanca. After each screen, compare it against `screenshots/`.
4. Port `spec/qa.js` to the project's test runner so the same behaviours stay covered.
