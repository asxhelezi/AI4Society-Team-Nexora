-- SINJAL staff desktop: Supabase schema.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It mirrors the tables and columns the FastAPI backend reads (app/utils.py REPORT_SELECT),
-- so the staff UI maps Supabase rows exactly like /v1/reports rows.
--
-- Security model: the browser uses the publishable key, so every table has RLS on.
-- Only signed-in Supabase Auth users linked to an active row in public.users can read,
-- and case changes go through the staff_* functions below, which check the role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email text unique,
  full_name text not null,
  role text not null check (role in ('admin', 'clerk', 'municipal_authority', 'department_authority', 'operative_staff')),
  department_id uuid references public.departments (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  anonymous boolean not null default false,
  reporter_email text,
  title text not null,
  description text not null default '',
  category text not null,
  category_code text,
  subcategory text,
  source text not null default 'web',
  address text not null default '',
  latitude double precision,
  longitude double precision,
  status text not null default 'submitted' check (status in
    ('submitted', 'under_review', 'accepted', 'assigned', 'in_progress', 'blocked', 'resolved', 'published', 'rejected')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  department_id uuid references public.departments (id),
  zone_id uuid references public.zones (id),
  assigned_to uuid references public.users (id),
  duplicate_of uuid references public.reports (id),
  reopened_from uuid references public.reports (id),
  ai_analysis jsonb,
  resolution_note text,
  completion_tags text[],
  public_visible boolean not null default false,
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  assigned_at timestamptz,
  first_action_at timestamptz,
  started_at timestamptz,
  due_at timestamptz,
  resolved_at timestamptz,
  verified_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists reports_submitted_at_idx on public.reports (submitted_at desc);
create index if not exists reports_department_idx on public.reports (department_id);
create index if not exists reports_assigned_idx on public.reports (assigned_to);

create table if not exists public.report_status_history (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references public.users (id),
  created_at timestamptz not null default now()
);
create index if not exists report_status_history_report_idx on public.report_status_history (report_id, created_at);

-- storage_path is the object path inside the private "report-files" bucket.
create table if not exists public.report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  kind text not null check (kind in ('citizen_photo', 'before_photo', 'after_photo', 'other')),
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists report_files_report_idx on public.report_files (report_id);

-- ---------------------------------------------------------------- helpers

-- The public.users row of the signed-in Supabase Auth user (null when not staff).
create or replace function public.current_staff()
returns public.users
language sql stable security definer set search_path = public
as $$
  select u.* from public.users u where u.auth_user_id = auth.uid() and u.active limit 1
$$;

-- Same visibility rules as the backend: clerks, admins and municipal authorities see
-- every case; a department authority sees its department; field staff their own cases.
create or replace function public.staff_can_see(p_department_id uuid, p_assigned_to uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select case s.role
      when 'department_authority' then p_department_id = s.department_id
      when 'operative_staff' then p_assigned_to = s.id
      else true
    end
    from public.current_staff() s where s.id is not null
  ), false)
$$;

-- ---------------------------------------------------------------- the staff list query

create or replace view public.staff_reports with (security_invoker = true) as
select r.id, r.tracking_code, r.anonymous, r.title, r.description, r.category, r.category_code, r.subcategory, r.source,
       r.address, r.latitude, r.longitude, r.status, r.priority, r.department_id, d.name as department_name,
       r.zone_id, z.name as zone_name, r.assigned_to, u.full_name as assigned_to_name, r.duplicate_of,
       r.reopened_from, r.ai_analysis, r.resolution_note, r.completion_tags, r.public_visible,
       r.submitted_at, r.accepted_at, r.assigned_at, r.first_action_at, r.started_at, r.due_at,
       r.resolved_at, r.verified_at, r.published_at, r.updated_at
from public.reports r
left join public.departments d on d.id = r.department_id
left join public.zones z on z.id = r.zone_id
left join public.users u on u.id = r.assigned_to;

-- ---------------------------------------------------------------- row level security

alter table public.departments enable row level security;
alter table public.zones enable row level security;
alter table public.users enable row level security;
alter table public.reports enable row level security;
alter table public.report_status_history enable row level security;
alter table public.report_files enable row level security;

drop policy if exists "staff read departments" on public.departments;
create policy "staff read departments" on public.departments for select to authenticated
  using ((public.current_staff()).id is not null);

drop policy if exists "staff read zones" on public.zones;
create policy "staff read zones" on public.zones for select to authenticated
  using ((public.current_staff()).id is not null);

-- Everyone may read their own row (needed to learn their role at sign-in); staff read the directory.
drop policy if exists "staff read users" on public.users;
create policy "staff read users" on public.users for select to authenticated
  using (auth_user_id = auth.uid() or (public.current_staff()).id is not null);

drop policy if exists "staff read reports" on public.reports;
create policy "staff read reports" on public.reports for select to authenticated
  using (public.staff_can_see(department_id, assigned_to));

drop policy if exists "staff read history" on public.report_status_history;
create policy "staff read history" on public.report_status_history for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

drop policy if exists "staff read files" on public.report_files;
create policy "staff read files" on public.report_files for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

-- No insert/update/delete policies: writes only happen through the functions below.
revoke insert, update, delete on public.departments, public.zones, public.users, public.reports,
  public.report_status_history, public.report_files from anon, authenticated;
revoke all on public.staff_reports from anon;
grant select on public.staff_reports to authenticated;

-- Photos live in a private bucket; staff get short-lived signed URLs.
insert into storage.buckets (id, name, public) values ('report-files', 'report-files', false)
on conflict (id) do nothing;
drop policy if exists "staff read report files" on storage.objects;
create policy "staff read report files" on storage.objects for select to authenticated
  using (bucket_id = 'report-files' and exists (
    select 1 from public.report_files f join public.reports r on r.id = f.report_id
    where f.storage_path = storage.objects.name));

-- ---------------------------------------------------------------- staff actions
-- Each mirrors a backend endpoint used by src/api/staff.ts saveCase().

create or replace function public._staff_editor()
returns public.users
language plpgsql stable security definer set search_path = public
as $$
declare s public.users;
begin
  s := public.current_staff();
  if s.id is null or s.role not in ('clerk', 'admin') then
    raise exception 'Kjo llogari nuk ka qasje te stafi.' using errcode = '42501';
  end if;
  return s;
end $$;

create or replace function public._staff_lock(p_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare old text;
begin
  select status into old from public.reports where id = p_id for update;
  if old is null then raise exception 'Raporti nuk u gjet.' using errcode = 'P0002'; end if;
  return old;
end $$;

-- PATCH /v1/reports/{id}/review
create or replace function public.staff_review(p_id uuid, p_decision text, p_priority text,
  p_department_id uuid default null, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare s public.users := public._staff_editor(); old text := public._staff_lock(p_id);
begin
  if old not in ('submitted', 'under_review') then raise exception 'Raporti është shqyrtuar tashmë.'; end if;
  if p_decision not in ('under_review', 'accepted', 'rejected') then raise exception 'Vendim i pavlefshëm.'; end if;
  if p_decision = 'accepted' and p_department_id is null then raise exception 'Zgjidh departamentin përpara pranimit.'; end if;
  update public.reports set status = p_decision, priority = coalesce(p_priority, priority),
    department_id = coalesce(p_department_id, department_id),
    accepted_at = case when p_decision = 'accepted' then now() else accepted_at end,
    first_action_at = coalesce(first_action_at, now()), updated_at = now()
  where id = p_id;
  insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
  values (p_id, old, p_decision, nullif(trim(coalesce(p_note, '')), ''), s.id);
end $$;

-- PATCH /v1/reports/{id}/assign
create or replace function public.staff_assign(p_id uuid, p_department_id uuid, p_assigned_to uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare s public.users := public._staff_editor(); old text := public._staff_lock(p_id); next text;
begin
  if old in ('resolved', 'published', 'rejected') then raise exception 'Raporti është mbyllur.'; end if;
  next := case when p_assigned_to is not null and old in ('accepted', 'assigned') then 'assigned' else old end;
  update public.reports set department_id = p_department_id, assigned_to = p_assigned_to, status = next,
    assigned_at = case when p_assigned_to is not null then now() else assigned_at end, updated_at = now()
  where id = p_id;
  if next <> old then
    insert into public.report_status_history (report_id, old_status, new_status, changed_by) values (p_id, old, next, s.id);
  end if;
end $$;

-- PATCH /v1/reports/{id}/status
create or replace function public.staff_set_status(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare s public.users := public._staff_editor(); old text := public._staff_lock(p_id);
begin
  if p_status not in ('in_progress', 'blocked', 'resolved') then raise exception 'Statusi nuk lejohet.'; end if;
  if old not in ('accepted', 'assigned', 'in_progress', 'blocked') then raise exception 'Raporti duhet të pranohet më parë.'; end if;
  if p_status = 'resolved' and nullif(trim(coalesce(p_note, '')), '') is null then raise exception 'Zgjidhja kërkon shënim.'; end if;
  update public.reports set status = p_status,
    started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    first_action_at = coalesce(first_action_at, now()),
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolution_note = case when p_status = 'resolved' then trim(p_note) else resolution_note end,
    updated_at = now()
  where id = p_id;
  insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
  values (p_id, old, p_status, nullif(trim(coalesce(p_note, '')), ''), s.id);
end $$;

-- POST /v1/reports/{id}/publish
create or replace function public.staff_publish(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare s public.users := public._staff_editor(); old text := public._staff_lock(p_id);
begin
  if old <> 'resolved' then raise exception 'Vetëm raportet e zgjidhura publikohen.'; end if;
  update public.reports set status = 'published', public_visible = true, published_at = now(), updated_at = now()
  where id = p_id;
  insert into public.report_status_history (report_id, old_status, new_status, changed_by) values (p_id, old, 'published', s.id);
end $$;

revoke execute on function public._staff_editor(), public._staff_lock(uuid) from public, anon, authenticated;
revoke execute on function public.staff_review(uuid, text, text, uuid, text), public.staff_assign(uuid, uuid, uuid),
  public.staff_set_status(uuid, text, text), public.staff_publish(uuid) from public, anon;
grant execute on function public.staff_review(uuid, text, text, uuid, text), public.staff_assign(uuid, uuid, uuid),
  public.staff_set_status(uuid, text, text), public.staff_publish(uuid) to authenticated;

-- ---------------------------------------------------------------- reference data

insert into public.departments (code, name) values
  ('infra', 'Infrastrukturë'), ('sherbime', 'Shërbime Publike'), ('mjedis', 'Mjedis'),
  ('ndricim', 'Ndriçim'), ('uje', 'Ujësjellës')
on conflict (code) do nothing;

insert into public.zones (name) values
  ('Qendër'), ('Bradashesh'), ('Shirgjan'), ('Papër'), ('Shushicë'), ('Gjinar'), ('Labinot'), ('Zavalinë')
on conflict (name) do nothing;

-- To give someone staff access: create them under Authentication → Users, then link them:
--   insert into public.users (auth_user_id, email, full_name, role)
--   select id, email, 'Drita Kola', 'clerk' from auth.users where email = 'drita@example.org';
