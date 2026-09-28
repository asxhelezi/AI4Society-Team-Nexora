# sinjal-web

SINJAL staff desktop for Bashkia Elbasan: the municipal back office where staff triage, route, resolve and measure the problems citizens report on the mobile app.

The approved design lives in `design/` (see `CLAUDE.md`). This app ports it to Vite + React + TypeScript. Every screen is ported.

For live backend setup and the current integration scope, see [STAFF_BACKEND.md](STAFF_BACKEND.md). In live mode, automation and performance remain pending until their demo controls have matching backend operations.

## Run

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest suites, then the original spec/qa.js
npm run typecheck
npm run build
npm run format       # Prettier
```

## Layout

- `src/data/`: typed port of `design/mock-data.js` (`SINJAL`), including the shared performance engine (`SINJAL.perf`) that Kreu, Departamentet and Performanca all use.
- `src/lib/dc.ts`: `DCLogic` base class and `useLogic` hook. Each screen keeps the design's logic class (`renderVals()` returns every value and handler the view needs), and a React view renders it.
- `src/lib/storage.ts`: the localStorage keys pages use to hand state to each other.
- `src/lib/routes.ts`: app routes, and the mapping from design page names (`Raporti.dc.html`) to paths.
- `src/components/`: `Shell` (sidebar + content column), `Sidebar`, `NotificationBell`, `PageHeader`, `DcLink`, `Photo`.
- `src/screens/<screen>/`: one folder per screen, `<Screen>Logic.ts` + `<Screen>.tsx`.
- `src/styles/staff.css`: the design's shared stylesheet, verbatim. `app.css` holds the app frame and fixes on top of the design.

| Route | Screen | Design file |
|---|---|---|
| `/` | Kreu | `Main.dc.html` |
| `/raportet` | Raportet | `Raportet.dc.html` |
| `/raporti` | Raporti | `Raporti.dc.html` |
| `/harta` | Harta | `Harta.dc.html` |
| `/departamentet` | Departamentet | `Departamentet.dc.html` |
| `/automatizimet` | Automatizimet | `Automatizimet.dc.html` |
| `/performanca` | Performanca | `Performanca.dc.html` |

## Screen sizes

- **Desktop (≥1100px):** the design's 1440×900 artboard, laid out at design size and scaled to fill the window (`src/lib/viewportScale.ts`), exactly as designed.
- **Below 1100px:** a fluid layout at real device size (`src/styles/responsive.css`). Tablets (720–1099px) get a 76px icon rail instead of the sidebar; phones get a top bar whose menu button opens the sidebar as a drawer. Grids reflow, side-by-side panes stack, the Automatizimet/Performanca sub-navigation becomes a tab strip, Raportet rows become cards, and Harta's filters and side panel open over the map.
- Responsive rules hook into `app-*` / `r-*` classes on the layout containers; the inline design styles are untouched, so the desktop renders pixel-identically.

## Tests

- `tests/qa.test.ts` runs every suite in `spec/qa.js`, unchanged, against the ported logic classes (its `loadComponent` returns the TypeScript class instead of the design script).
- `tests/parity.test.ts` drives each ported screen and the design's own logic through the same actions and checks that the port renders every value the design does.
- `tests/data.test.ts` checks the typed data module against `design/mock-data.js`: the same reports, the same 843-case history, and a 30-day SLA of 86%.
- `node spec/qa.js` (the last step of `npm test`) still runs the spec against the design files.

## Typing

Sidebar, NotificationBell, Kreu, Raportet, Raporti, Harta and Departamentet are fully typed. Automatizimet and Performanca derive dozens of ad-hoc record shapes inside one render pass; their state, storage and handlers are typed, while those intermediate records use a documented loose `Rec` type so the logic stays exactly as designed. The parity tests cover what the types don't.

## Differences from the design

- The logo renders from `design/assets/logo.png`; the reference screenshots show the wordmark without it.
- Citizen photos were hosted blobs in the design tool and aren't in the handoff. The references are kept, because logic checks whether a case has a photo, and `Photo` shows a neutral placeholder when an image can't load.
- Raporti's status select shows the case's real status; the design runtime showed the first option.
- Harta: the layers menu opened underneath the report side panel; it now opens above it.
- Harta: wheel-to-zoom uses a native non-passive listener so it can prevent page scroll.
- Pages still hand state to each other through localStorage, as in the design (keys in `src/lib/storage.ts`). Moving that to router state or a store is the next step once there is a backend.
