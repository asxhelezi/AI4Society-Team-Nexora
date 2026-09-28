# Sinjal — citizen site (React + Vite + TypeScript)

This is the React port of `../sinjal-citizen/` (the static site, which stays untouched as the visual reference).
**Kreu (`/`) is fully ported and is the reference.** It matches the static page pixel for pixel at 390, 820 and 1440 px wide. The other pages are placeholders until they are ported. Follow the patterns below.

## Run it

Vite 8 needs **Node ≥ 20.19** (or ≥ 22.12). The system Node 20.10 is too old, so put a newer Node first on `PATH`.

```bash
npm install
npm run dev        # http://localhost:8012 (strictPort; fails instead of picking another port)
npm run typecheck  # tsc -b
npm run build      # tsc -b && vite build → dist/
npm run format     # prettier (printWidth 200, single quotes, same as sinjal-staff)
```

The original static site is served on http://localhost:8011/ for side-by-side comparison.

### Environment

Copy `.env.example` to `.env.local`.

| Variable         | Default          | Meaning                                                                                                                             |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`   | `''` (same origin) | Base URL of the FastAPI backend, e.g. `http://localhost:8000`. Requests go to `${VITE_API_URL}/v1/...`.                             |
| `VITE_USE_MOCKS` | on               | Mocks are used unless this is exactly `false`. The mocks reproduce the static site's demo data, so the app works without a backend. |

## Folder structure

```
public/
  i18n.js              SQ/EN/SR translator (copy of the static one + 3 small SPA patches, marked "[React port]")
  images/, favicon.png
src/
  main.tsx             entry point; sets the global CSS order (see below)
  app/App.tsx          routes + legacy *.html redirects
  api/                 ALL data access goes through here
    client.ts          fetch wrapper, ApiError, API_URL / USE_MOCKS
    types.ts           backend types (ReportCreate, TrackedReport, PublicReport, …)
    reports.ts         createReport, uploadReportPhoto, trackReport, listPublicReports, reverseGeocode, searchLocations
    status.ts          citizenStage(status) + STAGE_META (labels and badge colours)
    mock/              demo data (from the static pages) + mock implementation
    index.ts           barrel: import { trackReport, ApiError } from '../../api'
  components/
    PageFrame/         .sinjal-screen + .r-page wrappers every page has
    SiteHeader/        header (4 variants), DesktopNav, MobileMenu, LangToggle
    SiteFooter/        footer (full | compact)
    PortPlaceholder/   temporary body for unported pages (delete when done)
    ScrollToTop.tsx, LegacyRedirect.tsx
  hooks/               useDocumentTitle, useReveal (+ revealAll), usePrefersReducedMotion
  lib/
    routes.ts          ROUTES, ARTICLE_SLUGS, articlePath(), articlePathByNumber(), trackPath(), LEGACY_PATHS
    nav.ts             nav items, FOOTER_LINKS sets, logo paths
    savedReports.ts    localStorage 'sinjal_reports' (same key and shape as the static site)
    format.ts          formatDate() → "19 Mars 2026", parseAlbanianDate()
    cx.ts              className joiner
  pages/<Name>/        one folder per page: <Name>.tsx + <Name>.css (+ subcomponents/hooks)
    Kreu/ (reference)  Raporto/  Harta/  RaportetEMia/  Gjurmo/  Bulletini/  Artikulli/
  styles/
    tokens.css         design tokens (colours, fonts, easing) as CSS custom properties
    base.css           shared reset, links, focus, .tap, keyframes, scroll-reveal, hover helpers
    responsive.css     VERBATIM copy of the static responsive.css; do not edit
```

Each page folder belongs to one person or agent. Shared files (`components/`, `lib/`, `api/`, `styles/`, `public/i18n.js`) are shared, so keep changes to them small and additive.

## Routes

| Route              | Page         | Static source                          |
| ------------------ | ------------ | -------------------------------------- |
| `/`                | Kreu         | index.html                             |
| `/raporto`         | Raporto      | raporto.html                           |
| `/harta`           | Harta        | harta.html                             |
| `/raportet-e-mia`  | RaportetEMia | raportet-e-mia.html                    |
| `/gjurmo?id=CODE`  | Gjurmo       | gjurmo.html                            |
| `/bulletini`       | Bulletini    | blog.html                              |
| `/bulletini/:slug` | Artikulli    | blog-cover-1..6.html (see `ARTICLE_SLUGS`) |

Old `*.html` URLs redirect to these routes and keep their query string (`gjurmo.html?id=X` → `/gjurmo?id=X`). Unknown paths go to `/`.
Always link with `<Link to={ROUTES.x}>` or the helpers (`trackPath(code)`, `articlePathByNumber(n)`). Use `navigate()` instead of `window.location.href`.

## Page anatomy

```tsx
export function Harta() {
  useDocumentTitle('Sinjal — Harta'); // the static page's <title>, in Albanian
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 80, maxIndex: 6, disabled: reducedMotion }); // copy the page's _setupReveal numbers
  return (
    <PageFrame layout="fill" className="harta" innerRef={pageRef}>
      <SiteHeader variant="dark" />
      …sections…
      <SiteFooter variant="compact" links={FOOTER_LINKS.all} />
    </PageFrame>
  );
}
```

- **`PageFrame layout`**: use `flow` when `.r-page` had `position:relative` (Kreu, Bulletini, case pages). Use `fill` when it had `min-height:100vh; display:flex; flex-direction:column` (Raporto, Harta, Raportet e mia).
- **`SiteHeader variant`**:
  - `hero`: Kreu (transparent, absolute, top 14px)
  - `overlay`: case pages (transparent, absolute, top 0, burger on a 25% ink tint)
  - `dark`: Raporto, Harta, Raportet e mia, Gjurmo
  - `light`: Bulletini
  - `minimal`: reproduces Gjurmo's odd header (no desktop nav, no language toggle, rounded buttons, burger still visible on desktop, where the menu cannot open). Decide with the team whether Gjurmo should keep it or use the normal `dark` header.
  - The header owns the mobile-menu state. Active links come from the route through `NavLink`, so no prop is needed.
- **`SiteFooter`**: `full` is Kreu only. Everything else is `compact`, with the link set that page had (`FOOTER_LINKS.all | bulletini | raporto | raportetEMia`).

## Styling rules (how inline styles were turned into CSS)

The static templates were styled almost entirely with inline `style=""` attributes. When porting:

1. **Move every static inline style into a named class in `<Name>.css`.**
   - Use page-prefixed BEM names: `.kreu-hero`, `.kreu-hero__title`, `.kreu-hero__title--in`, `.kreu-card__caption--tall`.
   - Never use generated or hashed names.
   - Scope every rule to the page prefix. All CSS ships in one bundle, so a bare `button {}` or `input::placeholder {}` in a page file leaks to every page. If a page's `<style>` block had element rules (`button{font:inherit}`, `input::placeholder{…}`), write them as `:where(.harta) button { font: inherit; }`, which scopes the rule without raising specificity.
2. **Keep every existing class on the element**: `r-*`, `tap`, `data-reveal`, `data-counter`, `id`s. responsive.css hooks into them. Keep DOM shapes that responsive.css selects on, such as `.r-card > div:last-child` or `.r-footer-in > nav`.
3. **State-driven styles.**
   - When a style switches between a few fixed values, use a **modifier class** toggled from React, e.g. `cx('kreu-hero__title', headlineIn && 'kreu-hero__title--in')`.
   - Only values that are real data stay inline, e.g. `style={{ height: partner.height }}`, a map pin's `left/top`, a status colour from the API.
   - For show/hide, use conditional rendering or the `hidden` attribute.
4. **Specificity trap: check it on every element you move.**
   - An inline style used to beat any non-`!important` stylesheet rule. A class does not.
   - responsive.css is loaded last, so its non-`!important` declarations now beat your single-class rules on ties. Example: `.r-footer-in { column-gap: 48px; align-items: center }` overrode the footer's `gap`/`align-items` until it was scoped as `.site-footer .site-footer__inner`.
   - For each element with an `r-*` class, grep responsive.css for that class. For any property it sets **without** `!important` that the element also had inline, raise your selector (prefix the parent block class).
5. **Inline-style attribute selectors no longer match.**
   - responsive.css has selectors that match *inline style text*. After the move they match nothing, so re-create them:
     - `a.tap[style*="background:#C23B31"]:hover` / `button.tap[style*="background:#1B1917"]:hover`: add the helper class `u-hover-red` / `u-hover-ink` (base.css) to those `.tap` elements. `a.tap[...1B1917]:not(.r-card)` excludes cards, so do not add it to `.r-card`s.
     - `.r-header[style*="color:#1B1917"]`: already handled by `SiteHeader variant="light"`.
     - `.r-hero-partners [style*="width:max-content"]`: already handled in Kreu.css.
     - `.r-cta-band`, `#mapBox`, `#permission`, `#toast`: these are class/id based, so keep those names.
   - Grep responsive.css for `style*=` when you port a page.
6. **The runtime also patched two things at render time** (runtime.js `createDom`):
   - any element whose inline style contains `z-index:50`: +20px side padding, `overflow-y:auto`, `overflow-x:hidden`
   - any element whose inline style contains `padding:0 20px;gap:2px`: `justify-content:flex-start`, `padding-top:28px`, `padding-left:40px`
   - The mobile menu already has both baked in. In the current pages the menu is the only element that matches either pattern (checked with grep). If you find another one, it got the patch too, so reproduce it.
7. **Links**: base link colours are wrapped in `:where()`, so any class colour wins (as inline did). You don't need `a.foo` selectors.
8. **Colours and fonts**: use the tokens (`var(--c-ink)`, `var(--c-red)`, `rgb(var(--c-paper-rgb) / .15)`, `var(--font-display)`, `var(--ease-out)`). Page-only keyframes (e.g. Raporto's `sjSpin`) go in the page CSS with a page prefix.
9. **CSS order** (set in `main.tsx`):
   - tokens → base → component CSS → page CSS → responsive.css (always last).
   - A page must import its components **before** its own `./Page.css`.
10. **Scroll reveal**: put `data-reveal="<n>"` on the element and do not give it opacity, transform or transition in page CSS. Call `useReveal(ref, { stepMs, maxIndex, threshold, rootMargin, disabled: reducedMotion, rescanKey })` with the numbers from the page's `_setupReveal`:
   - Kreu/Harta: 80ms, cap 6
   - Bulletini and case pages: 90ms, cap 6
   - Raportet e mia: 100ms
   - Raporto/Gjurmo: 110ms, threshold .1
   - Pass `rescanKey` (e.g. the search result) when new `data-reveal` elements appear later. `revealAll(root)` replaces Raporto's `_revealNow`.

## Logic rules

- `class Component extends DCLogic` becomes a function component.
  - `state` → `useState`
  - `componentDidMount`/`WillUnmount` → `useEffect` with cleanup. **Clear every timer, observer and listener.** StrictMode runs effects twice in dev, so this matters.
  - `renderVals()` becomes the component body.
  - `sc-if` → `&&`
  - `sc-for` → `.map()` with keys
- Put long timelines and observers in a hook in the page folder (see `Kreu/useHeroIntro.ts`, `Kreu/useCountUp.ts`). Split big templates into subcomponents in the same folder (`KreuHero`, `KreuSolved`, …).
- Respect `prefers-reduced-motion` the way the source does (`usePrefersReducedMotion()`).
- `closeMenu` / `onMenu` in the templates are handled by `SiteHeader`; drop them.

## Data: the API layer and mocks

Pages talk to data **only** through `src/api` (plus `lib/savedReports.ts` for the device-local list). They never call `fetch` or read demo arrays directly. Flipping `VITE_USE_MOCKS=false` then switches the whole app to the backend.

```ts
import { trackReport, citizenStage, STAGE_META, isApiError } from '../../api';

try {
  const report = await trackReport(code); // TrackedReport
  const stage = citizenStage(report.status); // 'derguar' | 'verifikuar' | 'ne_proces' | 'perfunduar' | 'refuzuar'
  const { label, color } = STAGE_META[stage];
} catch (err) {
  if (isApiError(err) && err.code === 'not_found') showMissing();
  else throw err;
}
```

| Function                                          | Backend                                         | Mock behaviour (the static site's demo)                                                                          |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `createReport(ReportCreate)`                      | `POST /v1/reports`                              | 1 s delay, `tracking_code` = `SNJ-` + 6 random digits                                                              |
| `uploadReportPhoto(reportId, file, trackingCode)` | `POST /v1/reports/{id}/files` + `X-Tracking-Code` | 300 ms, returns an object URL                                                                                     |
| `trackReport(code)`                               | `GET /v1/reports/track/{code}`                  | gjurmo.html's dataset, plus a deterministic generated result for any other `SNJ-######`; otherwise 404 `not_found` |
| `listPublicReports()`                             | `GET /v1/public/reports` (unwraps `items`)      | harta.html's 10 demo pins                                                                                          |
| `reverseGeocode(lat, lon)`                        | `GET /v1/map/reverse`                           | calls nominatim.openstreetmap.org directly (as raporto.html did)                                                 |
| `searchLocations(q)`                              | `GET /v1/map/search`                            | Nominatim search, `countrycodes=al`                                                                                |

- Errors are `ApiError { status, code, message, details }`, built from the backend's `{ "error": { code, message, details? } }` body. `code` is also `network_error` or `http_error`.
- Types use the backend's snake_case. Timestamps are ISO strings; show them with `formatDate()`, which produces `19 Mars 2026`, the form i18n.js knows how to translate.
- Fields marked **"frontend extension"** in `types.ts` are only filled by the mocks today, so treat them as optional:
  - `TrackedReport.description / city / timeline / article_slug`
  - `PublicReport.photos / article_slug`
- **Saved reports**: `loadSavedReports()`, `saveReport({ code, title, category, date })` (returns false when saving failed), `clearSavedReports()`. These use the same `'sinjal_reports'` key and shape as before, so old data carries over.

## i18n (SQ / EN / SR)

- Write copy **in Albanian, directly in JSX**. `public/i18n.js` watches the DOM and swaps each Albanian text node and `alt`/`placeholder`/`aria-label`/`title` attribute for the chosen language. It also translates `document.title` and `confirm()` text. React and i18n.js coexist: React re-sets a node, and the observer re-translates it before paint.
- **New string?** Add `['Albanian', 'English', 'Srpski']` to the `ENTRIES` table at the top of `public/i18n.js`.
- **Matching is per text node** (trimmed, whitespace collapsed, soft hyphens ignored). So build runtime strings as **one** template literal, e.g. `` {`Hapi ${step} nga 4 · ${name}`} ``, not `Hapi {step} nga 4`, which gives three text nodes that never match. Numbers next to text are fine only when the pieces are separate dictionary entries.
- The toggle is `<LangToggle />`. It is plain `<button data-lang>` markup, and i18n.js owns the clicks and `aria-pressed`, so never add `onClick` or `aria-pressed` to it. `?lang=en|sr|sq` in any URL selects and saves a language.
- SPA patches in `public/i18n.js`: it re-reads `document.title` after each route change, observes `<head>`, and supports `?lang=`. Everything else is the original script.

## Porting a page: checklist

1. Open `../sinjal-citizen/<page>.html` and read the template, the `<style>` block and the `Component` class.
2. Replace the placeholder in `src/pages/<Name>/<Name>.tsx`. Keep the `useDocumentTitle` call and choose the `PageFrame` layout, `SiteHeader` variant and `SiteFooter` variant and links from the page.
3. **Styles first.** Move each inline style into a page-prefixed class in `<Name>.css`, keeping every `r-*`, `tap`, `data-*` and id.
4. Check specificity against responsive.css (rule 4 above) and re-create `[style*=…]` selectors (rule 5). Add `u-hover-red`/`u-hover-ink` where needed.
5. **Then logic.** Convert to hooks, clean up every effect, and use `src/api` for data, `navigate()` and route helpers for links, and `useReveal` for reveals.
6. Make sure all visible copy is either in `ENTRIES` or not meant to be translated (street names, codes).
7. Run `npm run typecheck && npm run build`.
8. Screenshot the static page (http://localhost:8011/<page>.html) and the port (http://localhost:8012/<route>) at 390×844 and 1440×900, full page, with `prefers-reduced-motion: reduce` emulated. Pixel-diff them. Kreu reached 0 px, so aim for "negligible". Also test the mobile menu, language switching (EN/SR) and every interaction the page has.
