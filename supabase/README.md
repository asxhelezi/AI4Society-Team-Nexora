# SINJAL on Supabase

The citizen site and the staff desktop can run on Supabase with no application server.
`migrations/20260928120000_sinjal_schema.sql` creates everything: tables, row-level
security, the photo bucket, Realtime, seed data (departments, zones, categories) and the
functions both apps call.

## How it fits together

| Citizen action | Supabase |
|---|---|
| Submit a report | `create_report()` checks the input, creates the `SNJ-…` tracking code and the first history row. Limited to 10 an hour per IP address. |
| Attach photos | Upload to the private `report-photos` bucket at `<report id>/…`, allowed for one hour after submitting, max 10. Then `register_report_photo()` records it, checked against the tracking code. |
| Track by code | `track_report()` returns the report and its timeline. Citizens cannot read the `reports` table. |
| Public map | `list_public_reports()` returns only reports that are in progress (assigned, in progress, blocked) or resolved (resolved, published), without private fields. The app signs the photo paths it returns. |

| Staff action | Supabase |
|---|---|
| Sign in | Supabase Auth (email and password) on `/login/`. Only accounts whose `profiles` role is `clerk` can use the staff app. |
| See reports | The `staff_reports` view, filtered by RLS: admin, clerk and municipal_authority see everything; department_authority sees their department; operative_staff sees reports assigned to them. |
| Review, assign, change status, publish | `staff_review()`, `staff_assign()`, `staff_set_status()` and `staff_publish()`. They apply the same transitions as the old API and write `report_status_history`. Direct table writes are blocked. |
| Live updates | The staff app subscribes to Realtime changes on `reports`. A new citizen report appears on Kreu, Raportet, Harta and Departamentet without a reload. |

## Setup (once)

1. **Run the schema.** In the Supabase dashboard, open **SQL Editor → New query**, paste
   each file in `migrations/` in name order and click **Run**. Or, with
   the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
2. **Turn off public sign-ups.** Go to **Authentication → Sign In / Providers → Email** and switch off
   "Allow new users to sign up". Staff accounts are created by an admin.
3. **Allow the app URLs.** Under **Authentication → URL Configuration**, add
   `http://localhost:5173`, `http://localhost:8012` and your deployed domains.
4. **Create staff accounts.** For each person, go to **Authentication → Users → Add user**
   (email and password, "Auto confirm" on). Then give them a role in the SQL Editor:

   ```sql
   select public.set_staff_profile('klerk@bashkia-elbasan.al', 'clerk', 'Emri Mbiemri');
   select public.set_staff_profile('drejtor.infra@bashkia-elbasan.al', 'department_authority', 'Emri Mbiemri', 'infra');
   select public.set_staff_profile('punetor@bashkia-elbasan.al', 'operative_staff', 'Emri Mbiemri', 'ndricim');
   ```

   The roles are `admin`, `clerk`, `municipal_authority`, `department_authority` and
   `operative_staff`. The department codes are `infra`, `sherbime`, `mjedis`, `ndricim`
   and `uje`. An Auth user without a profile can sign in, but they see nothing.
5. **Configure both apps.** Create `.env.local` in `sinjal-citizen-react/` and in `sinjal-staff/`:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key>
   ```

   Set the same two variables in each Vercel project. They are read at build time, so
   redeploy after setting them. Only ever use the publishable key. The `service_role` key
   bypasses every rule above and must never reach a browser.

## Running locally

- Citizen site: `cd sinjal-citizen-react && npm ci && npm run dev`
- Staff desktop: `cd sinjal-staff && npm ci && npm run dev`, then open `/login/`. The staff
  desktop's presentation mode (demo reports shown next to real ones) stays on unless you
  set `VITE_STAFF_DEMO=false`.

## AI analysis

The backend's AI pipeline (`app/ai_worker.py`) runs on this same database, so staff see its
results in the Raporti AI panel and the list updates live. For every new report it:

- picks the category, department, severity and spam likelihood, with a confidence and a
  one-line rationale for staff;
- finds a duplicate open report within about 300 m, and warns when the same problem was
  resolved at that spot before;
- acts on its own only when it is very sure: accepts and routes the report (confidence ≥ 90
  and it agrees with the citizen's category), links a clear duplicate to the original, or
  rejects obvious spam (the citizen can appeal). Everything else stays a suggestion.

Every automatic action writes `report_status_history` and `audit_logs`. The limits are
the `AI_*` variables in `.env.example`; `AI_AUTO_ACTIONS=0` turns all automatic actions off.

To run it:

1. Run `migrations/20260928140000_ai_worker.sql` (it adds the columns and `audit_logs`
   table the worker uses).
2. Get the database connection string: **Connect** (top of the dashboard) → **Session
   pooler**, with your database password. Use the session pooler (port 5432), not the
   transaction pooler (6543).
3. Start the worker on any always-on host, for example a Render **Background Worker**
   from this repository:
   - build command: `pip install -r requirements-ai.txt`
   - start command: `python -m app.ai_loop`
   - environment: `DATABASE_URL` (the connection string), `AI_API_KEY`, `AI_BASE_URL`,
     `AI_MODEL`, `AI_MOCK=0`, plus any `AI_*` limits you want to change.

The worker connects with the database password, so it bypasses row-level security. Keep
that connection string on the server, never in a `VITE_` variable. With `AI_MOCK=1` it
runs without an AI key and returns test answers.

## Not covered yet

- **Spam protection.** Cloudflare Turnstile needs a server to verify tokens, so it is not
  checked. The rate limits in `create_report()` are the only protection for now.
- **Google and e-Albania sign-in.** In Supabase mode the Google button is hidden. It can be
  enabled later under Authentication → Providers.
- **Other roles.** Only clerks use the staff app, and the login page refuses every other
  role. The database still knows the other roles, ready for their own panels.
- **AI photo checks.** The backend checked each uploaded photo (`app/photo_check.py`).
  Photos now go straight to Supabase Storage, so that check does not run yet.
- **Staff photo upload.** There is no "after" photo upload from the staff side yet.
