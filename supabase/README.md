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
| Public map | `list_public_reports()` returns reports from *accepted* onwards, never *submitted* or *rejected*, and without private fields. The app signs the photo paths it returns. |

| Staff action | Supabase |
|---|---|
| Sign in | Supabase Auth (email and password) on `/login/`. The role and department come from `profiles`. |
| See reports | The `staff_reports` view, filtered by RLS: admin, clerk and municipal_authority see everything; department_authority sees their department; operative_staff sees reports assigned to them. |
| Review, assign, change status, publish | `staff_review()`, `staff_assign()`, `staff_set_status()` and `staff_publish()`. They apply the same transitions as the old API and write `report_status_history`. Direct table writes are blocked. |
| Live updates | The staff app subscribes to Realtime changes on `reports`. A new citizen report appears on Kreu, Raportet, Harta and Departamentet without a reload. |

## Setup (once)

1. **Run the schema.** In the Supabase dashboard, open **SQL Editor → New query**, paste
   the whole of `migrations/20260928120000_sinjal_schema.sql` and click **Run**. Or, with
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

## Not covered yet

- **Spam protection.** Cloudflare Turnstile needs a server to verify tokens, so it is not
  checked. The rate limits in `create_report()` are the only protection for now.
- **Google and e-Albania sign-in.** In Supabase mode the Google button is hidden. It can be
  enabled later under Authentication → Providers.
- **Role panels.** The admin, department, managerial and field panels are not in this
  repo. With Supabase, the office roles sign in to the staff desktop, and field staff are
  refused on the login page.
- **Staff photo upload.** There is no "after" photo upload from the staff side yet.
