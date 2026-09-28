-- SINJAL staff desktop: add-on for the existing Supabase schema
-- (reports, profiles, departments, zones, report_status_history, report_files, staff_reports).
-- Run once in the Supabase SQL editor. It creates no tables and is safe to re-run.
--
-- It adds what the staff app needs on top of that schema:
--   * read access for signed-in staff (profiles.id = auth.users.id, active = true),
--   * staff_review / staff_assign / staff_set_status / staff_publish, the SQL
--     versions of the backend's /v1/reports/{id}/... actions,
--   * the private "report-files" storage bucket for case photos.
-- The browser only holds the publishable key, so all of this goes through RLS.

-- ---------------------------------------------------------------- helpers

-- The profile of the signed-in Supabase Auth user (all nulls when not active staff).
create or replace function public.current_staff()
returns public.profiles
language sql stable security definer set search_path = public
as $$
  select p.* from public.profiles p where p.id = auth.uid() and p.active limit 1
$$;

-- Backend visibility rules: clerks, admins and municipal authorities see every case;
-- a department authority sees its department; field staff see their own cases.
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

-- ---------------------------------------------------------------- read access

-- The view must apply the caller's RLS on reports instead of its owner's.
alter view public.staff_reports set (security_invoker = true);

alter table public.departments enable row level security;
alter table public.zones enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_status_history enable row level security;
alter table public.report_files enable row level security;

grant select on public.departments, public.zones, public.profiles, public.reports,
  public.report_status_history, public.report_files, public.staff_reports to authenticated;

drop policy if exists "staff read departments" on public.departments;
create policy "staff read departments" on public.departments for select to authenticated
  using ((public.current_staff()).id is not null);

drop policy if exists "staff read zones" on public.zones;
create policy "staff read zones" on public.zones for select to authenticated
  using ((public.current_staff()).id is not null);

-- Everyone may read their own profile (to learn their role at sign-in); staff read the directory.
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or (public.current_staff()).id is not null);

drop policy if exists "staff read reports" on public.reports;
create policy "staff read reports" on public.reports for select to authenticated
  using (public.staff_can_see(department_id, assigned_to));

drop policy if exists "staff read history" on public.report_status_history;
create policy "staff read history" on public.report_status_history for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

drop policy if exists "staff read files" on public.report_files;
create policy "staff read files" on public.report_files for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

-- Case photos: a private bucket; staff get short-lived signed URLs.
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
returns public.profiles
language plpgsql stable security definer set search_path = public
as $$
declare s public.profiles;
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
declare s public.profiles := public._staff_editor(); old text := public._staff_lock(p_id);
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
declare s public.profiles := public._staff_editor(); old text := public._staff_lock(p_id); next text;
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
declare s public.profiles := public._staff_editor(); old text := public._staff_lock(p_id);
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
declare s public.profiles := public._staff_editor(); old text := public._staff_lock(p_id);
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

-- Make PostgREST see the new functions straight away.
notify pgrst, 'reload schema';

-- To give someone staff access: create them under Authentication → Users, then:
--   insert into public.profiles (id, email, full_name, role, active)
--   select id, email, 'Drita Kola', 'clerk', true from auth.users where email = 'drita@example.org'
--   on conflict (id) do update set role = excluded.role, active = true;
