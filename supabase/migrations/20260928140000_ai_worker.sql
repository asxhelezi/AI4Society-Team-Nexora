-- The AI worker (app/ai_worker.py, started with `python -m app.ai_loop`) runs on this
-- database. It connects server-side with the database password (never from a browser),
-- picks up new reports and writes reports.ai_analysis, which the staff desktop shows.
-- This adds the columns and the audit table it reads and writes. Safe to run again.

-- Report text embedding (a JSON array of floats), used to find duplicates nearby.
alter table public.reports add column if not exists embedding jsonb;
-- Backend intake fields. Supabase has no screening step and photos can be attached
-- later (the worker merges late photo checks), so every report is ready at once.
alter table public.reports add column if not exists screened_out boolean not null default false;
alter table public.reports add column if not exists intake_ready_at timestamptz not null default now();
-- Result of the AI photo check for one file, copied into the report's ai_analysis.
alter table public.report_files add column if not exists ai_photo_check jsonb;

-- The worker's queue: new reports that have not been analysed yet.
create index if not exists reports_ai_pending_idx on public.reports (submitted_at)
  where ai_analysis is null;

-- Every automatic AI action (accept, reject as spam, merge a duplicate, reclassify).
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at);

-- Only the worker (database owner) writes the log; admins may read it.
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
drop policy if exists "admins read audit log" on public.audit_logs;
create policy "admins read audit log" on public.audit_logs for select to authenticated
  using (public.staff_role() = 'admin');
