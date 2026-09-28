-- SINJAL on Supabase: tables, row-level security, storage and the functions the two
-- frontends call. There is no application server: the citizen site and the staff
-- desktop talk to Supabase directly with the publishable key, and every rule the old
-- FastAPI backend enforced (who may read what, which status transitions are allowed)
-- lives here.
--
-- Citizens are never signed in. They can only:
--   * create_report()          submit a report (returns id + tracking code)
--   * upload a photo           to storage bucket report-photos/<report id>/..., then
--     register_report_photo()  record it (checked against the tracking code)
--   * track_report()           look one report up by its tracking code
--   * list_public_reports()    read the public map
-- They cannot read the reports table itself.
--
-- Staff sign in with Supabase Auth; their role and department live in profiles. They read
-- reports through RLS (and the staff_reports view) and change them only through the
-- staff_* functions, which apply the same transitions as the old API and write
-- report_status_history.

-- ---------------------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------------------

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Citizen categories (app/citizen_catalog.py). department_code is the default routing.
create table public.categories (
  code text primary key,
  label text not null unique,
  subcategories text[] not null default '{}',
  department_code text references public.departments (code) on update cascade,
  sort_order int not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  role text not null check (role in ('admin', 'clerk', 'municipal_authority', 'department_authority', 'operative_staff')),
  department_id uuid references public.departments (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  anonymous boolean not null default true,
  reporter_email text,
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 5000),
  category text not null,
  category_code text references public.categories (code),
  subcategory text check (char_length(subcategory) <= 160),
  address text not null check (char_length(address) between 1 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  zone_id uuid references public.zones (id),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'accepted', 'rejected', 'assigned', 'in_progress', 'blocked', 'resolved', 'published')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  department_id uuid references public.departments (id),
  assigned_to uuid references public.profiles (id),
  duplicate_of uuid references public.reports (id),
  reopened_from uuid references public.reports (id),
  resolution_note text,
  completion_tags jsonb,
  ai_analysis jsonb,
  public_visible boolean not null default false,
  -- md5 of the submitter's IP, only used for the submission rate limit.
  client_hash text,
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

create index reports_submitted_at_idx on public.reports (submitted_at desc);
create index reports_status_idx on public.reports (status);
create index reports_department_idx on public.reports (department_id);
create index reports_assigned_to_idx on public.reports (assigned_to);
create index reports_client_hash_idx on public.reports (client_hash, submitted_at);

create table public.report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  kind text not null check (kind in ('citizen_photo', 'before_photo', 'after_photo', 'attachment')),
  storage_path text not null unique,
  original_name text not null default '',
  content_type text not null default '',
  size_bytes bigint not null default 0,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index report_files_report_idx on public.report_files (report_id);

create table public.report_status_history (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index report_status_history_report_idx on public.report_status_history (report_id, created_at);

-- ---------------------------------------------------------------------------------------
-- Who is calling (security definer so RLS policies can use them without recursion)
-- ---------------------------------------------------------------------------------------

create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.staff_department() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid() and active
$$;

-- The old API's access_filter(): office roles see everything, a department manager their
-- department, field staff what is assigned to them.
create or replace function public.can_see_report(p_report uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report
      and case public.staff_role()
        when 'admin' then true
        when 'clerk' then true
        when 'municipal_authority' then true
        when 'department_authority' then r.department_id = public.staff_department()
        when 'operative_staff' then r.assigned_to = auth.uid()
        else false
      end
  )
$$;

-- Statuses a citizen may see on the public map: in progress or resolved.
create or replace function public.is_public_status(p_status text) returns boolean
language sql immutable as $$
  select p_status in ('assigned', 'in_progress', 'blocked', 'resolved', 'published')
$$;

-- ---------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------

alter table public.departments enable row level security;
alter table public.zones enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_files enable row level security;
alter table public.report_status_history enable row level security;

-- Nobody writes these tables directly from the browser; the functions below do.
revoke insert, update, delete, truncate on public.reports, public.report_files, public.report_status_history
  from anon, authenticated;
revoke all on public.reports, public.report_files, public.report_status_history, public.profiles from anon;

create policy "reference data is public" on public.departments for select using (true);
create policy "reference data is public" on public.zones for select using (true);
create policy "reference data is public" on public.categories for select using (true);
create policy "admins manage departments" on public.departments for all to authenticated
  using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');
create policy "admins manage zones" on public.zones for all to authenticated
  using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');
create policy "admins manage categories" on public.categories for all to authenticated
  using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');

create policy "staff read profiles" on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.staff_role() in ('admin', 'clerk', 'municipal_authority')
  or (public.staff_role() = 'department_authority' and department_id = public.staff_department())
);
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.staff_role() = 'admin') with check (public.staff_role() = 'admin');

create policy "staff read reports" on public.reports for select to authenticated using (
  case public.staff_role()
    when 'admin' then true
    when 'clerk' then true
    when 'municipal_authority' then true
    when 'department_authority' then department_id = public.staff_department()
    when 'operative_staff' then assigned_to = auth.uid()
    else false
  end
);
create policy "staff read report files" on public.report_files for select to authenticated
  using (public.can_see_report(report_id));
create policy "staff read report history" on public.report_status_history for select to authenticated
  using (public.can_see_report(report_id));

-- What the staff desktop loads: reports with the names it shows. security_invoker keeps
-- the reports RLS above in force for whoever queries it.
create or replace view public.staff_reports with (security_invoker = true) as
select
  r.id, r.tracking_code, r.anonymous, r.title, r.description, r.category, r.category_code, r.subcategory,
  r.address, r.latitude, r.longitude, r.status, r.priority, r.department_id, d.name as department_name,
  d.code as department_code, r.zone_id, z.name as zone_name, r.assigned_to, p.full_name as assigned_to_name,
  r.duplicate_of, r.reopened_from, r.resolution_note, r.ai_analysis, r.public_visible,
  r.submitted_at, r.accepted_at, r.assigned_at, r.first_action_at, r.started_at, r.due_at,
  r.resolved_at, r.verified_at, r.published_at, r.updated_at
from public.reports r
left join public.departments d on d.id = r.department_id
left join public.zones z on z.id = r.zone_id
left join public.profiles p on p.id = r.assigned_to;

revoke all on public.staff_reports from anon;
grant select on public.staff_reports to authenticated;

-- ---------------------------------------------------------------------------------------
-- Citizen functions (callable with the publishable key)
-- ---------------------------------------------------------------------------------------

-- POST /v1/reports. Returns { id, tracking_code, status }.
create or replace function public.create_report(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_anonymous boolean := coalesce((payload ->> 'anonymous')::boolean, true);
  v_email text := nullif(btrim(coalesce(payload ->> 'reporter_email', '')), '');
  v_title text := btrim(coalesce(payload ->> 'title', ''));
  v_description text := btrim(coalesce(payload ->> 'description', ''));
  v_category_raw text := btrim(coalesce(payload ->> 'category', ''));
  v_code_raw text := lower(btrim(coalesce(payload ->> 'category_code', '')));
  v_sub text := nullif(btrim(coalesce(payload ->> 'subcategory', '')), '');
  v_address text := btrim(coalesce(payload ->> 'address', ''));
  v_lat double precision := (payload ->> 'latitude')::double precision;
  v_lon double precision := (payload ->> 'longitude')::double precision;
  v_zone uuid;
  v_category public.categories;
  v_ip text;
  v_hash text;
  v_code text;
  v_id uuid;
begin
  if v_title = '' or char_length(v_title) > 160 then raise exception 'invalid_request: title' using errcode = '22023'; end if;
  if v_description = '' or char_length(v_description) > 5000 then raise exception 'invalid_request: description' using errcode = '22023'; end if;
  if v_address = '' or char_length(v_address) > 300 then raise exception 'invalid_request: address' using errcode = '22023'; end if;
  if v_lat is null or v_lon is null or v_lat not between -90 and 90 or v_lon not between -180 and 180 then
    raise exception 'invalid_request: location' using errcode = '22023';
  end if;
  if not v_anonymous and (v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'email_required' using errcode = '22023';
  end if;

  -- "Infrastrukturë — Gropë në rrugë" is accepted like the old API did.
  if position(' — ' in v_category_raw) > 0 then
    v_sub := coalesce(v_sub, btrim(split_part(v_category_raw, ' — ', 2)));
    v_category_raw := btrim(split_part(v_category_raw, ' — ', 1));
  end if;
  select * into v_category from public.categories c
  where c.code = v_code_raw or c.code = lower(v_category_raw) or lower(c.label) = lower(v_category_raw)
  limit 1;
  if v_category.code is null then raise exception 'invalid_request: category' using errcode = '22023'; end if;
  if v_category.code = 'other' and v_sub is null then raise exception 'invalid_request: subcategory' using errcode = '22023'; end if;
  if v_category.code <> 'other' and v_sub is not null and not (v_sub = any (v_category.subcategories)) then
    raise exception 'invalid_request: subcategory' using errcode = '22023';
  end if;

  -- Rate limit: 10 reports an hour from one address, 60 a minute overall.
  begin
    v_ip := btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1));
  exception when others then v_ip := null;
  end;
  v_hash := case when coalesce(v_ip, '') <> '' then md5(v_ip) end;
  if v_hash is not null and (select count(*) from public.reports
      where client_hash = v_hash and submitted_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports where submitted_at > now() - interval '1 minute') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if coalesce(payload ->> 'zone_code', '') <> '' then
    select id into v_zone from public.zones where code = payload ->> 'zone_code';
  end if;

  loop
    v_code := 'SNJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.reports where tracking_code = v_code);
  end loop;

  insert into public.reports (tracking_code, anonymous, reporter_email, title, description, category, category_code,
    subcategory, address, latitude, longitude, zone_id, client_hash)
  values (v_code, v_anonymous, case when v_anonymous then null else v_email end, v_title, v_description,
    v_category.label, v_category.code, v_sub, v_address, v_lat, v_lon, v_zone, v_hash)
  returning id into v_id;

  insert into public.report_status_history (report_id, old_status, new_status, note)
  values (v_id, null, 'submitted', 'Raporti u dërgua nga qytetari');

  return jsonb_build_object('id', v_id, 'tracking_code', v_code, 'status', 'submitted');
end;
$$;

-- Storage policy helper: a report accepts citizen uploads for one hour after submission.
create or replace function public.report_accepts_uploads(p_folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.reports
    where id::text = p_folder and submitted_at > now() - interval '1 hour'
  ) and (select count(*) from public.report_files where report_id::text = p_folder) < 10
$$;

-- POST /v1/reports/{id}/files after the browser has put the file in storage.
create or replace function public.register_report_photo(
  p_report_id uuid, p_tracking_code text, p_path text, p_name text, p_content_type text, p_size bigint
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_file public.report_files;
begin
  if not exists (select 1 from public.reports where id = p_report_id and tracking_code = upper(btrim(p_tracking_code))
                   and submitted_at > now() - interval '1 hour') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_path not like p_report_id::text || '/%' then raise exception 'invalid_request: path' using errcode = '22023'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'report-photos' and name = p_path) then
    raise exception 'invalid_request: file missing' using errcode = '22023';
  end if;
  if (select count(*) from public.report_files where report_id = p_report_id) >= 10 then
    raise exception 'photo_limit' using errcode = 'P0001';
  end if;
  insert into public.report_files (report_id, kind, storage_path, original_name, content_type, size_bytes)
  values (p_report_id, 'citizen_photo', p_path, left(coalesce(p_name, ''), 255), coalesce(p_content_type, ''), coalesce(p_size, 0))
  returning * into v_file;
  return jsonb_build_object('id', v_file.id, 'kind', v_file.kind, 'original_name', v_file.original_name,
    'content_type', v_file.content_type, 'size_bytes', v_file.size_bytes, 'created_at', v_file.created_at,
    'url', v_file.storage_path);
end;
$$;

-- GET /v1/reports/track/{code}. Returns null for an unknown code.
create or replace function public.track_report(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tracking_code', r.tracking_code, 'title', r.title, 'category', r.category, 'address', r.address,
    'status', r.status, 'resolution_note', r.resolution_note, 'submitted_at', r.submitted_at,
    'updated_at', r.updated_at, 'description', r.description, 'city', 'Elbasan',
    'timeline', jsonb_strip_nulls(jsonb_build_object(
      'derguar', r.submitted_at,
      'verifikuar', (select min(h.created_at) from public.report_status_history h where h.report_id = r.id and h.new_status in ('under_review', 'accepted')),
      'ne_proces', (select min(h.created_at) from public.report_status_history h where h.report_id = r.id and h.new_status in ('assigned', 'in_progress', 'blocked')),
      'perfunduar', (select min(h.created_at) from public.report_status_history h where h.report_id = r.id and h.new_status in ('resolved', 'published')),
      'refuzuar', (select min(h.created_at) from public.report_status_history h where h.report_id = r.id and h.new_status = 'rejected')
    ))
  )
  from public.reports r
  where r.tracking_code = upper(btrim(p_code))
$$;

-- GET /v1/public/reports: the map. Private fields (reporter_email, client_hash,
-- assignee, AI analysis) are never returned. Photos are storage paths; the client signs them.
create or replace function public.list_public_reports() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(item order by submitted_at desc), '[]'::jsonb) from (
    select r.submitted_at, jsonb_build_object(
      'id', r.id, 'tracking_code', r.tracking_code, 'anonymous', r.anonymous, 'title', r.title,
      'description', r.description, 'category', r.category, 'address', r.address,
      'latitude', r.latitude, 'longitude', r.longitude, 'status', r.status, 'priority', r.priority,
      'department_id', r.department_id, 'department_name', d.name, 'zone_id', r.zone_id, 'zone_name', z.name,
      'reopened_from', r.reopened_from, 'resolution_note', r.resolution_note, 'completion_tags', r.completion_tags,
      'public_visible', r.public_visible, 'submitted_at', r.submitted_at, 'accepted_at', r.accepted_at,
      'assigned_at', r.assigned_at, 'first_action_at', r.first_action_at, 'started_at', r.started_at,
      'due_at', r.due_at, 'resolved_at', r.resolved_at, 'verified_at', r.verified_at,
      'published_at', r.published_at, 'updated_at', r.updated_at,
      'photos', jsonb_strip_nulls(jsonb_build_object(
        'before', (select f.storage_path from public.report_files f where f.report_id = r.id
                   and f.kind in ('citizen_photo', 'before_photo') order by f.created_at limit 1),
        'after', (select f.storage_path from public.report_files f where f.report_id = r.id
                  and f.kind = 'after_photo' order by f.created_at desc limit 1)
      ))
    ) as item
    from public.reports r
    left join public.departments d on d.id = r.department_id
    left join public.zones z on z.id = r.zone_id
    where (r.public_visible or public.is_public_status(r.status)) and r.status <> 'rejected'
    order by r.submitted_at desc
    limit 500
  ) t
$$;

-- Storage policy helper: anyone may view the photos of a report that is on the public map.
create or replace function public.photo_is_public(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.report_files f join public.reports r on r.id = f.report_id
    where f.storage_path = p_path and f.kind in ('citizen_photo', 'before_photo', 'after_photo')
      and (r.public_visible or public.is_public_status(r.status)) and r.status <> 'rejected'
  )
$$;

-- ---------------------------------------------------------------------------------------
-- Staff functions: the old /review, /assign, /status and /publish endpoints
-- ---------------------------------------------------------------------------------------

create or replace function public.staff_review(
  p_report uuid, p_decision text, p_priority text default 'normal', p_department uuid default null,
  p_note text default '', p_duplicate_of uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  if coalesce(public.staff_role(), '') not in ('clerk', 'municipal_authority', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('under_review', 'accepted', 'rejected') then raise exception 'invalid_request: decision' using errcode = '22023'; end if;
  if p_priority not in ('low', 'normal', 'high', 'urgent') then raise exception 'invalid_request: priority' using errcode = '22023'; end if;
  if p_decision = 'accepted' and p_department is null then
    raise exception 'department_required: An accepted report must be routed to a department' using errcode = '22023';
  end if;
  select status into v_old from public.reports where id = p_report for update;
  if v_old is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old not in ('submitted', 'under_review') then
    raise exception 'invalid_transition: Only submitted or under-review reports can be reviewed' using errcode = 'P0001';
  end if;
  update public.reports set
    status = p_decision, priority = p_priority,
    department_id = coalesce(p_department, department_id),
    duplicate_of = p_duplicate_of,
    accepted_at = case when p_decision = 'accepted' then now() else accepted_at end,
    first_action_at = coalesce(first_action_at, now()),
    due_at = case when p_decision = 'accepted' then submitted_at + case p_priority
      when 'urgent' then interval '24 hours' when 'high' then interval '72 hours'
      when 'normal' then interval '120 hours' else interval '168 hours' end else due_at end,
    resolution_note = case when p_decision = 'rejected' then nullif(p_note, '') else resolution_note end,
    updated_at = now()
  where id = p_report;
  insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
  values (p_report, v_old, p_decision, nullif(p_note, ''), auth.uid());
  return jsonb_build_object('id', p_report, 'status', p_decision);
end;
$$;

create or replace function public.staff_assign(
  p_report uuid, p_department uuid default null, p_assigned_to uuid default null, p_note text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(public.staff_role(), '');
  v_department uuid := case when public.staff_role() = 'department_authority' then public.staff_department() else p_department end;
  v_old text;
  v_new text := case when p_assigned_to is null then 'accepted' else 'assigned' end;
begin
  -- The clerk desktop routes and assigns too, so clerk is allowed here.
  if v_role not in ('clerk', 'municipal_authority', 'department_authority', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_department is null then raise exception 'department_required: Department is required' using errcode = '22023'; end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.profiles where id = p_assigned_to and role = 'operative_staff' and department_id = v_department and active
  ) then
    raise exception 'invalid_assignee: Assignee must be active field staff in the selected department' using errcode = '22023';
  end if;
  select status into v_old from public.reports where id = p_report for update;
  if v_old is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old not in ('accepted', 'assigned', 'blocked') then
    raise exception 'invalid_transition: Report must be accepted before assignment' using errcode = 'P0001';
  end if;
  update public.reports set
    department_id = v_department, assigned_to = p_assigned_to, status = v_new,
    assigned_at = case when p_assigned_to is not null then coalesce(assigned_at, now()) else assigned_at end,
    updated_at = now()
  where id = p_report;
  insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
  values (p_report, v_old, v_new, nullif(p_note, ''), auth.uid());
  return jsonb_build_object('id', p_report, 'status', v_new);
end;
$$;

create or replace function public.staff_set_status(p_report uuid, p_status text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(public.staff_role(), '');
  v_row public.reports;
begin
  if v_role not in ('clerk', 'operative_staff', 'department_authority', 'municipal_authority', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status = 'resolved' and btrim(coalesce(p_note, '')) = '' then
    raise exception 'resolution_required: A resolution note is required' using errcode = '22023';
  end if;
  select * into v_row from public.reports where id = p_report for update;
  if v_row.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_role = 'operative_staff' and v_row.assigned_to is distinct from auth.uid() then
    raise exception 'not_assigned: This report is not assigned to you' using errcode = '42501';
  end if;
  if v_role = 'department_authority' and v_row.department_id is distinct from public.staff_department() then
    raise exception 'wrong_department: This report belongs to another department' using errcode = '42501';
  end if;
  if not ((v_row.status = 'assigned' and p_status in ('in_progress', 'blocked'))
       or (v_row.status = 'in_progress' and p_status in ('blocked', 'resolved'))
       or (v_row.status = 'blocked' and p_status in ('in_progress', 'resolved'))) then
    raise exception 'invalid_transition: This status transition is not allowed' using errcode = 'P0001';
  end if;
  update public.reports set
    status = p_status,
    first_action_at = coalesce(first_action_at, now()),
    started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolution_note = case when p_status = 'resolved' then p_note else resolution_note end,
    updated_at = now()
  where id = p_report;
  insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
  values (p_report, v_row.status, p_status, nullif(p_note, ''), auth.uid());
  return jsonb_build_object('id', p_report, 'status', p_status);
end;
$$;

create or replace function public.staff_publish(p_report uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  if coalesce(public.staff_role(), '') not in ('clerk', 'municipal_authority', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select status into v_old from public.reports where id = p_report for update;
  if v_old is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_old not in ('resolved', 'published') then
    raise exception 'not_resolved: Only resolved reports can be published' using errcode = 'P0001';
  end if;
  update public.reports set status = 'published', public_visible = true,
    published_at = coalesce(published_at, now()), updated_at = now()
  where id = p_report;
  if v_old <> 'published' then
    insert into public.report_status_history (report_id, old_status, new_status, note, changed_by)
    values (p_report, v_old, 'published', 'U publikua në hartën publike', auth.uid());
  end if;
  return jsonb_build_object('id', p_report, 'status', 'published', 'public_visible', true);
end;
$$;

-- Run from the SQL editor to make an Auth user a staff member:
--   select public.set_staff_profile('name@example.org', 'clerk', 'Emri Mbiemri', 'infra');
create or replace function public.set_staff_profile(p_email text, p_role text, p_full_name text, p_department_code text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_profile public.profiles;
begin
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'No Auth user with email %; create it under Authentication → Users first', p_email; end if;
  insert into public.profiles (id, full_name, email, role, department_id)
  values (v_user, p_full_name, lower(btrim(p_email)), p_role,
          (select id from public.departments where code = p_department_code))
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email,
    role = excluded.role, department_id = excluded.department_id, active = true
  returning * into v_profile;
  return v_profile;
end;
$$;

-- Function permissions: Postgres grants EXECUTE to PUBLIC by default; narrow it.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_report(jsonb), public.register_report_photo(uuid, text, text, text, text, bigint),
  public.track_report(text), public.list_public_reports(), public.report_accepts_uploads(text),
  public.photo_is_public(text), public.is_public_status(text)
  to anon, authenticated;
grant execute on function public.staff_role(), public.staff_department(), public.can_see_report(uuid),
  public.staff_review(uuid, text, text, uuid, text, uuid), public.staff_assign(uuid, uuid, uuid, text),
  public.staff_set_status(uuid, text, text), public.staff_publish(uuid)
  to authenticated;
-- set_staff_profile stays with the database owner (SQL editor) only.

-- ---------------------------------------------------------------------------------------
-- Storage: private bucket for report photos, path <report id>/<random>.<ext>
-- ---------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "citizens upload photos to a new report" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'report-photos' and public.report_accepts_uploads((storage.foldername(name))[1]));

create policy "staff read report photos" on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and public.can_see_report(((storage.foldername(name))[1])::uuid));

create policy "public map photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'report-photos' and public.photo_is_public(name));

-- ---------------------------------------------------------------------------------------
-- Realtime: the staff desktop listens for new and changed reports
-- ---------------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table public.reports, public.report_status_history, public.report_files;
end $$;

-- ---------------------------------------------------------------------------------------
-- Seed data: the staff desktop's departments and zones, the citizen categories
-- ---------------------------------------------------------------------------------------

insert into public.departments (code, name) values
  ('infra', 'Infrastrukturë'),
  ('sherbime', 'Shërbime Publike'),
  ('mjedis', 'Mjedis'),
  ('ndricim', 'Ndriçim'),
  ('uje', 'Ujësjellës')
on conflict (code) do nothing;

insert into public.zones (code, name) values
  ('qender', 'Qendër'), ('bradashesh', 'Bradashesh'), ('shirgjan', 'Shirgjan'), ('paper', 'Papër'),
  ('shushice', 'Shushicë'), ('gjinar', 'Gjinar'), ('labinot', 'Labinot'), ('zavaline', 'Zavalinë')
on conflict (code) do nothing;

insert into public.categories (code, label, subcategories, department_code, sort_order) values
  ('infrastructure', 'Infrastrukturë', array['Gropë në rrugë', 'Trotuar i dëmtuar', 'Pusetë e dëmtuar', 'Asfalt i dëmtuar', 'Tjetër'], 'infra', 1),
  ('waste', 'Mbetje', array['Mbetje të grumbulluara', 'Kosh i tejmbushur', 'Mungesë koshash', 'Hedhje e paligjshme mbetjesh', 'Tjetër'], 'sherbime', 2),
  ('lighting', 'Ndriçim', array['Ndriçim jo funksional', 'Shtyllë e dëmtuar', 'Errësirë e zgjatur', 'Ndriçim me ndërprerje', 'Tjetër'], 'ndricim', 3),
  ('traffic', 'Trafik & Sinjalistikë', array['Semafor jo funksional', 'Sinjalistikë e dëmtuar ose e munguar', 'Vija të fshira kalimi këmbësorësh', 'Parkim i parregullt', 'Tjetër'], 'infra', 4),
  ('green_spaces', 'Hapësira të gjelbra', array['Bimësi e neglizhuar', 'Pemë e rrëzuar ose e rrezikshme', 'Pajisje lojrash e dëmtuar', 'Mungesë ujitjeje', 'Tjetër'], 'sherbime', 5),
  ('public_spaces', 'Hapësira publike', array['Mobilje urbane e dëmtuar', 'Vandalizëm', 'Aksesueshmëri e kufizuar', 'Mungesë mirëmbajtjeje', 'Tjetër'], 'sherbime', 6),
  ('water', 'Ujë & Kanalizime', array['Rrjedhje uji', 'Kanalizim i bllokuar', 'Ndërprerje e furnizimit me ujë', 'Vërshim ose pellgëzim uji', 'Tjetër'], 'uje', 7),
  ('administration', 'Administratë', array['Vonesë në shërbim', 'Informacion i pasaktë', 'Sjellje jo profesionale', 'Problem me dokumentacion', 'Tjetër'], null, 8),
  ('other', 'Tjetër', '{}', null, 9)
on conflict (code) do nothing;
