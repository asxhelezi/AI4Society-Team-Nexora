# Shared staff-side layout

One sidebar, profile menu, page header and notification bell for the four staff-side apps:
**admin** (`sinjal-admin/`), **managerial** (`sinjal-managerial/public/`), **department**
(`sinjal-Departamenti/`) and **staff** (`sinjal-staff/`, React). Each app keeps its own pages,
data and styles. Only the chrome around them is shared.

It follows the same pattern as `shared/sinjal-i18n.js`: the source lives here and each app keeps a
copy next to its pages, because every app is served on its own.

## Files

| File | Role | Copied to |
|---|---|---|
| `sinjal-layout.css` | Owns the sidebar, rail, drawer, top bar, profile menu, page header (`.page-header` family) and bell styles, plus all their responsive rules. | all four (`sinjal-staff/public/`) |
| `sinjal-layout.js` | Classic script. Defines `window.SinjalLayout`: per-app nav config, demo users, auth hooks, badge and notification accessors. | all four |
| `Sidebar.dc.html` | One generic `.dc.html` component. Renders the sidebar for whichever app loads it, with the burger, drawer and rail built in. | the three `.dc.html` apps |
| `NotificationBell.dc.html` | The header bell plus its panel. Reads `window.SINJAL_NOTIFICATIONS`, with an empty state. | the three `.dc.html` apps |
| `sync.mjs` | Copies the four files above into the apps. | — |
| `optin-pages.mjs` | One-off helper that opts a `.dc.html` app's pages in (head tags, bell, hint-size). Idempotent. | — |

```sh
node shared/layout/sync.mjs                 # copy into every app
node shared/layout/sync.mjs admin           # only some apps: admin managerial department staff
node shared/layout/sync.mjs --check         # exit 1 if a copy is out of date
```

Edit only the files in this folder. An app's copy is overwritten on the next sync. `sync.mjs`
copies byte for byte, with one exception: the `<!-- sinjal:app-data -->` line in the two
components' `<head>` becomes the app's data script (`admin-data.js`, `city-data.js` or
`dept-data.js`). That lets each copy render on its own as a canvas artboard. A page that imports a
component ignores the component's `<head>`.

## How an app opts in (`.dc.html` apps)

1. **Data file.** In the app's data script (`admin-data.js`, `city-data.js`, `dept-data.js`):
   ```js
   window.SINJAL_APP = 'admin';            // 'admin' | 'managerial' | 'department' | 'staff'
   window.SINJAL_BADGES = function () { … };        // see Badges
   window.SINJAL_NOTIFICATIONS = { … };             // see Notifications
   ```
2. **Every page `<head>`** (run `node shared/layout/optin-pages.mjs <dir> <data script>`):
   ```html
   <link rel="stylesheet" href="staff.css"> … the app's other stylesheets …
   <link rel="stylesheet" href="sinjal-layout.css">   <!-- LAST stylesheet: the layout wins ties -->
   <script src="admin-data.js"></script>              <!-- the data script … -->
   <script src="sinjal-layout.js"></script>           <!-- … then the layout -->
   <script src="i18n-dict.js"></script>
   <script src="sinjal-i18n.js"></script>
   ```
   `sinjal-layout.js` reads the globals only when called, and the runtime renders after
   DOMContentLoaded, so the script order is a convention rather than a hard requirement. Keep it
   anyway, because it documents the dependency. The CSS order does matter: load the layout last.
3. **Sidebar.** Leave the existing `<dc-import name="Sidebar" active="<key>" hint-size="232px,900px"></dc-import>`
   as it is. The `active` key is an item `key` from the app's config, or `none`.
4. **Bell.** Add `<dc-import name="NotificationBell" hint-size="40px,40px"></dc-import>` as the last child of
   the header's `.page-actions`. If a page has no `.page-actions`, create
   `<div class="page-actions">` at the end of `<header class="page-header">`.
5. **Delete the app's own chrome CSS.** This covers sidebar overrides, the `.page-header` family
   (it now lives in `sinjal-layout.css`), any burger or drawer rules, and `fit.js` burger code.
   Leave the artboard scaling in `fit.js` alone.
6. **i18n.** Add the new strings to the app's `i18n-dict.js`: section labels, menu items, bell
   texts, and `{n} orë/ditë më parë`. See the "Shared layout" block in `sinjal-admin/i18n-dict.js`.

`sinjal-admin` is the reference conversion.

## The React app (staff)

`sinjal-staff/public/` receives only `sinjal-layout.css` and `sinjal-layout.js`. The React app:

- loads `/sinjal-layout.js` from `index.html`;
- sets `window.SINJAL_APP = 'staff'`;
- imports the CSS;
- renders `SinjalLayout.nav('staff', active)` and `SinjalLayout.profileMenu('staff')` with the
  same class names the `.dc.html` component uses. Keep the markup of `shared/layout/Sidebar.dc.html` as
  the reference. The frame element gets class `sl-frame`, and the bell wrapper inside
  `.page-actions` gets class `sl-bell-slot`.

## Config schema (`SinjalLayout.apps.<appKey>`)

```js
{
  subtitle: 'Admin / IT · Administrimi i sistemit',   // under the SINJAL wordmark
  home: 'Main.dc.html',                               // brand link; logout fallback
  logo: 'logo.png',                                   // relative to the app root; null = app supplies it
                                                      //   (window.SINJAL_LOGO overrides)
  org: { name, sub, icon, dot? } | null,              // chip under the logo; dot = status colour
  navLabel: 'Navigimi kryesor',                       // aria-label of <nav>
  sections: [
    { label: 'Aksesi',                                // optional; rendered uppercase by CSS
      items: [
        { key: 'perdoruesit',                         // = the page's active="…" (React: NavKey)
          label: 'Përdoruesit',
          href: 'Perdoruesit.dc.html',                // React: router path ('/raportet')
          icon: SinjalLayout.icons.users,             // SVG inner markup, 24×24, stroke=currentColor
          badgeKey: 'perdoruesit',                    // optional → SINJAL_BADGES[badgeKey]
          roles: ['admin', 'superadmin'] },           // optional; omitted = everyone
      ] },
  ],
  profileMenu: [
    { label: 'Cilësimet e sistemit', href: 'Cilesimet.dc.html', icon },   // link
    { label: 'Profili', icon },                                            // no href: just closes the menu
    { divider: true },
    { label: 'Dil', icon, action: 'logout', tone: 'danger' },              // → SinjalLayout.logout()
  ],
}
```

Section labels and all copy are written in Albanian in natural case. The i18n engine translates
the rendered text through each app's dictionary.

Departamenti's former unlabeled dividers became four labelled sections: **Rastet**,
**Ekipi & puna**, **Analiza** and **Departamenti**. These labels are new copy, so review them.

### Adding a nav item

1. Add `{ key, label, href, icon }` to the right section in `sinjal-layout.js`. Reuse an icon from
   `SinjalLayout.icons` or add one there.
2. Add the key to the `active` enum in `Sidebar.dc.html` (`data-props`) if it is new.
3. Run `node shared/layout/sync.mjs`.
4. Point the new page's `<dc-import name="Sidebar" active="<key>">` at the key.
5. Add the label to the app's `i18n-dict.js`.

## Badges

The data script publishes:

```js
window.SINJAL_BADGES = { <badgeKey>: { count: 2, tone: 'alert' | 'neutral', label: 'pa departament' } }
// or a function returning that object — use a function when the count can change while the page is open
```

- A count of `0`, or a missing entry, shows no badge.
- A count over 99 shows `99+`.
- `alert` is red and `neutral` is translucent. On the active item every badge turns translucent white.
- `label` completes the screen-reader text, as in "2 pa departament".

## Notifications

```js
window.SINJAL_NOTIFICATIONS = items                  // an array
window.SINJAL_NOTIFICATIONS = () => items            // or a function
window.SINJAL_NOTIFICATIONS = {                      // or a config object
  items: items | () => items,
  inboxHref: 'Njoftimet.dc.html',  // optional: "Hap kutinë →" footer link, and the default href
  now: NOW,                        // optional: "now" for relative times (demo data has a fixed clock)
  href: (n) => '…',                // optional: per-item link when the item has no href
  relTime: (at) => '…',            // optional: own relative-time formatter
  onOpen: (n) => { … },            // optional: called on click INSTEAD of the built-in read tracking
  onMarkAll: () => { … },          // optional: "Shëno të gjitha si lexuar" INSTEAD of the built-in
}
```

**Item fields:**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Required for read tracking. |
| `title` | string | |
| `body` | string | Optional. |
| `at` | Date, ms or ISO string | Relative time. |
| `time` | string | Preformatted. Wins over `at`. |
| `label` | string | Shown after the time. |
| `color` | string | Dot colour. |
| `read` | boolean | |
| `done` | boolean | Done items are hidden. |
| `href` | string | Link target. |
| `meta` | `{label, color}` | Departamenti's current shape. Used when `label` or `color` are missing. |

Departamenti's `S.notifications()` items therefore work unchanged:
`{ items: () => S.notifications(), relTime: S.relTime, onOpen, href, inboxHref }`.

**Behaviour:**

- The bell shows the first 8 items that are not done.
- The badge counts unread items and caps at `9+`.
- The panel shows "Nuk ka njoftime të reja." when there is nothing.
- Without `onOpen`, read state is kept in `localStorage['sinjal_notif_read_<app>']`.

## Responsive model

| Width | Sidebar | Header |
|---|---|---|
| ≥ 1100px | Full 232px sidebar in the page flow. | 96px band. |
| 720–1099px | 76px icon rail fixed to the left edge; the frame gets `padding-left: 76px`. Labels are visually hidden (kept for screen readers and `title` tooltips), badges become corner bubbles, and the language toggle stacks. | Wraps and grows. |
| < 720px | 56px dark top bar with a burger and the brand; the sidebar is a slide-in drawer (backdrop, close button, Escape, focus handling, page scroll locked while open). | Title row with the bell pinned top-right; actions on the next row. The bell panel goes full-width. |

This is sinjal-staff's model, chosen because it keeps the most navigation on tablets. It works with
every app's `fit.js`, because the rail and the drawer are `position: fixed`. They do not depend on
what the page frame does at that width:

- **admin:** `fit.js` never finds the stage (it looks before the runtime has rendered), so the
  frame is simply `100vw × 100vh` flex.
- **managerial:** fluid ≥ 1024px, and a scrolling document (`html.dc-compact`) below.
- **Departamenti** and **staff:** ≥ 1100px the frame fills the window and only the content under
  the page header is zoomed (`zoom: var(--app-scale)`, from `fit.js` / `src/lib/viewportScale.ts`),
  so their pages keep the 1440 design's proportions. Below 1100px they are fluid (Departamenti:
  a scrolling document, `html.dc-compact`).

**The sidebar and page header are never scaled** in any app: they are 232px and 96px at every
window size, so the layout looks identical across the four apps. If you add scaling to another
app, zoom only the page header's siblings (the content), never the frame, and compute the scale
from the space left beside the sidebar and under the header:
`max(0.8, min((w − 232) / 1208, (h − 96) / 704))`.

The frame is `[data-stage]` in `.dc.html` apps and `.sl-frame` in React. The padding rules only
apply when the frame contains `.sl-side` (`:has()`). Media queries use the real viewport width,
so the breakpoints are the same in all four apps, whatever their `fit.js` threshold (1024) is.

## Auth hooks

There is no login yet. The layout reads or ends identity in only these places, which are the
places the login work plugs into:

- **`SinjalLayout.currentUser(appKey?)`** returns the session user from
  `localStorage/sessionStorage['sinjal_session']`. It expects `{ app?, user: {name, short?, initials?, title?, menuTitle?, roles:[…]} }`.
  Without a session it returns `SinjalLayout.demoUsers[appKey]`, the person each app showed
  before.
- **`SinjalLayout.logout()`** clears that key, calls `SinjalLayout.auth.onLogout(appKey)` if set,
  logs a console note, and navigates to `SinjalLayout.auth.loginUrl`. Until a `login.html` exists
  that value is `null`, so logout goes to the app's `home`. Set
  `SinjalLayout.auth.loginUrl = '/login.html'` when there is one.
- **`roles`** is optional on nav items and profile-menu items. `SinjalLayout.canSee(item, user)`
  hides an item unless one of the user's roles is listed. The role ids are the ones in
  `sinjal-admin/admin-data.js` `ROLES`: `clerk`, `manager`, `operative`, `management`, `admin`,
  `auditor`, `superadmin`, `supervisor`.

**Blocker for a shared login:** the apps are served on different ports (8003 to 8006). Different
ports are different origins, so they cannot read each other's `localStorage`. A single staff login
that routes each role to its app needs one of these:

- one origin, such as a single static server or a reverse proxy serving `/admin`, `/managerial`,
  `/department` and `/staff`;
- a token, for example the backend's JWT, handed over in the URL on redirect.
