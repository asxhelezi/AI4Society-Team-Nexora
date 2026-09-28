# Citizen app ↔ backend

**Supabase (no server):** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, and the app
submits, uploads photos, tracks and loads the map through Supabase (`src/api/supabaseReports.ts`). For setup,
see `../supabase/README.md`. The rest of this page describes the FastAPI backend.

The citizen site (`sinjal-citizen-react`) runs on mock data by default. This is what it
needs from the FastAPI backend (`backend/`) to run on real data.

All requests go through `src/api/` (`reports.ts`); the expected shapes are in
`src/api/types.ts`. Field names are the backend's own, unchanged.

## Switching the app to the real backend

In `sinjal-citizen-react/.env.local`:

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCKS=false
```

Then `npm run dev` (Node ≥ 20.19). The app runs on **http://localhost:8012**.

## Endpoints the app calls

| App action | Endpoint | Status |
|---|---|---|
| Submit a report | `POST /v1/reports` | ✅ ready |
| Upload photos (one call per photo, after the report is created, with `X-Tracking-Code`) | `POST /v1/reports/{id}/files?kind=citizen_photo` | ✅ ready |
| Track by code (Gjurmo) | `GET /v1/reports/track/{code}` | ⚠️ works, missing fields (below) |
| Map pins (Harta) | `GET /v1/public/reports` | ⚠️ works, missing fields (below) |
| Address search / reverse lookup | `GET /v1/map/search`, `GET /v1/map/reverse` | ✅ ready |

Errors are read from the existing `{ "error": { code, message, details } }` body.
Gjurmo treats `not_found` (404) and `invalid_request` as "code not found".

## To do on the backend

1. **CORS:** add `http://localhost:8012` to `CORS_ORIGINS` (it allows only 8000, 5174 and 5175 today).
2. **Turnstile:** the app sends `turnstile_token: ""` for now. That only passes when
   `APP_ENV=development` and `TURNSTILE_SECRET` is empty. Before production, the frontend
   needs the widget (`src/pages/Raporto/useTurnstileToken.ts` is the hook for it) and the
   backend needs the secret and hostnames set.
3. **Track endpoint:** the app can show these, and hides them when they're missing. All optional:
   - `timeline`: the date each citizen stage was reached,
     `{ derguar?, verifikuar?, ne_proces?, perfunduar?, refuzuar? }` as ISO strings.
     `report_status_history` already has this data. Without it, the app uses `submitted_at` and
     `updated_at`.
   - `description`, `city` (e.g. "Elbasan"), `article_slug` (the Bulletini write-up, if published).
4. **Public reports endpoint:**
   - **Scope:** it returns only `published` reports, but the map also shows open, in-progress
     ones. Decide which statuses belong on the public map and widen the query if needed. Keep
     `reporter_email` and the other private fields stripped, as now.
   - **Photos:** add `photos: { before?: url, after?: url }` from `report_files` (citizen photo
     = before, `after_photo` = after). `GET /v1/files/{id}` only serves a file to the public
     when the report is `public_visible`, so check that.
   - **`article_slug`:** add it for reports that have a Bulletini write-up.
5. **Bulletini posts:** these are static in `src/pages/Artikulli/articles.ts` for now. The comment
   there maps each field to `PublicReport` (`resolution_note` → body, `article_slug` → URL).
   A published report would need a slug and write-up text for this to come from the API.
6. **Subcategory (optional):** the report form collects a subcategory, but `ReportCreate` has no
   field for it, so it isn't sent. Add `subcategory` if you want it stored.

## Status mapping

The app shows five citizen stages. `src/api/status.ts` maps backend statuses to them:

| Backend `status` | Citizen stage |
|---|---|
| `submitted` | Dërguar |
| `under_review`, `accepted` | Verifikuar |
| `assigned`, `in_progress`, `blocked` | Në proces |
| `resolved`, `published` | Përfunduar |
| `rejected` | Refuzuar (`resolution_note` shown as the reason) |

If the statuses change, update that file.

## Running the backend without Docker

The documented route is Docker (see `backend/README.md`). Without it:

1. Install PostgreSQL and create a database. Redis is optional: leave `REDIS_URL` empty and
   rate limiting and the map cache are switched off.
2. `cd backend`, `python -m venv .venv`, then `.venv\Scripts\pip install -r requirements.txt`.
3. Copy `.env.local.example` to `.env` and set:
   - `DATABASE_URL` to your local Postgres, e.g. `postgresql+asyncpg://sinjal:<password>@localhost:5432/sinjal`
     (the example points at the Docker host `postgres`)
   - `APP_ENV=development`
   - `CORS_ORIGINS` to include `http://localhost:8012`
4. Apply `migrations/*.sql` (or run alembic), then start the API with `uvicorn app.main:app --reload --port 8000`.
