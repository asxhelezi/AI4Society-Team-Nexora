# Staff backend integration

With `npm run dev`, `/v1` is proxied to the FastAPI server on `127.0.0.1:8080`; the API and PostgreSQL must be running. Start the backend according to `backend/README.md`, then run `npm ci && npm run dev` here. Sign in with a backend clerk account. The existing login and role checks remain in place.

Docker Compose builds the staff UI at `http://127.0.0.1:8013` and proxies `/v1/` to `api:8080`. By default the authenticated clerk sees the original demonstration reports, charts, pins, automations and performance screens, alongside citizen reports fetched from the backend. In this presentation mode, changes to the authored demo cases and controls are stored only in that browser's localStorage; changes to real citizen cases use the existing API and database where the backend supports the transition. No new staff demo endpoints or database migrations are included in this frontend update. For an API-only view set `VITE_STAFF_DEMO=false` **at build time** and rebuild the staff UI. To inspect the standalone demo without login set `VITE_STAFF_REAL=false` at build time; this is only for local development.

The dashboard maps use the same Esri imagery service as the citizen map. The Kreu pins and Harta status rings are the authored ones; Harta's mouse wheel, buttons, drag and pinch move the satellite imagery and its overlays together. Imagery requires an internet connection.

## Connected

- Backend login and role authorization; real reports are loaded in pages of 200. In API-only mode, an API failure does not fall back to demo records.
- The report list, detail view, dashboard, map, and department report counts consume the authenticated report feed.
- Report review, routing/assignment, supported status changes, and publication call the corresponding API. A failed or unauthorized call displays the API error and does not save a local override.
- Detail view fetches the report history and files; its timeline and photo use actual backend records.
- Old local demo edits and the generated performance records are cleared in API-only mode; in presentation mode they remain available for the pitch.

## Still requires backend/UI mapping

- The authored automation and performance screens depend on demo-only records and controls. In live mode their routes show a clear pending message rather than showing invented figures or saving edits only in the browser.
- Custom department routing rules, duplicate marking, escalation, reopening, freeform notes, and citizen information requests lack equivalent staff API actions. The existing buttons report that the backend operation is unavailable. Bulk updates only work for transitions allowed by the backend; a partial bulk operation may have committed earlier reports before a later one fails.
- Authenticated list results do not include file/history detail; the detail screen loads those on demand. Reporter identity is not invented when a report is anonymous.
- A real browser-to-PostgreSQL workflow still needs to be exercised against a running backend; this workspace does not have Docker/PostgreSQL.
