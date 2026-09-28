import { SINJAL, setLiveTime } from '../data/sinjal';
import type { CaseOverride, DeptId, Priority, Report, Status } from '../data/types';
import { DATA_CHANGED_EVENT } from '../lib/dc';
import { STORAGE_KEYS, remove } from '../lib/storage';
import { AUTH_STORAGE_KEY, USE_SUPABASE, dbError, sb } from './supabase';

const BASE = (import.meta.env.VITE_STAFF_API_URL || '').replace(/\/$/, '');
// Keep the presentation dataset visible after staff authentication. Operators
// can opt into the original API-only dashboard with VITE_STAFF_DEMO=false.
export const AUTH_REQUIRED = import.meta.env.MODE !== 'test' && import.meta.env.VITE_STAFF_REAL !== 'false';
export const DEMO_STAFF = AUTH_REQUIRED && import.meta.env.VITE_STAFF_DEMO !== 'false';
export const REAL_STAFF = AUTH_REQUIRED && !DEMO_STAFF;
/** Roles that may use this desktop. With Supabase the office roles all land here (their own panels are not in this repo). */
export const DESKTOP_ROLES = USE_SUPABASE ? ['clerk', 'admin', 'municipal_authority', 'department_authority'] : ['clerk'];
const TOKEN_KEY = 'sinjal_staff_access';
const REFRESH_KEY = 'sinjal_staff_refresh';
let token = typeof window === 'undefined' ? '' :
  (window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) || '');
export function hasStaffSession(): boolean {
  if (token) return true;
  if (!USE_SUPABASE) return false;
  return !!(window.localStorage.getItem(AUTH_STORAGE_KEY) || window.sessionStorage.getItem(AUTH_STORAGE_KEY));
}
export function signedInUser(): { name: string; role: string } | null {
  try {
    const raw = window.sessionStorage.getItem('sinjal_session') || window.localStorage.getItem('sinjal_session');
    const value = raw ? JSON.parse(raw) as { user?: { name?: string; roles?: string[] } } : null;
    return value?.user?.name ? { name: value.user.name, role: value.user.roles?.[0] || '' } : null;
  } catch { return null; }
}
let departments = new Map<string, string>();
let users = new Map<string, string>();
const rawStatuses = new Map<string, string>();
const photoUrls = new Map<string, string>();
/** Reports whose files and history are loaded; a live update reloads those in full. */
const detailed = new Set<string>();

interface ApiReport {
  id: string; tracking_code: string; title: string; description: string; category: string;
  category_code: string | null; subcategory: string | null; address: string;
  status: string; priority: string; department_id: string | null; department_name: string | null;
  zone_name: string | null; assigned_to: string | null; assigned_to_name: string | null;
  submitted_at: string; due_at: string | null; updated_at: string;
  first_action_at: string | null; resolved_at: string | null; reopened_from: string | null;
  duplicate_of: string | null; ai_analysis: unknown;
  files?: { kind: string; url: string }[];
  status_history?: { new_status: string; note: string | null; created_at: string }[];
}
interface ApiDepartment { id: string; code: string; name: string }
interface ApiUser { id: string; full_name: string; department_id: string | null; role: string }

async function request<T>(path: string, body?: object, method = 'GET'): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

/**
 * The staff data source: the FastAPI backend (/v1) or Supabase. Both return the same
 * shapes, so the loaders and saveCase below don't care which one is in use.
 */
interface StaffBackend {
  role(): Promise<string>;
  departments(): Promise<ApiDepartment[]>;
  zones(): Promise<{ name: string }[]>;
  users(fieldStaffOnly: boolean): Promise<ApiUser[]>;
  reports(): Promise<ApiReport[]>;
  /** One report with its files (displayable URLs) and status history. */
  report(id: string): Promise<ApiReport>;
  review(id: string, body: { decision: string; priority: string; department_id?: string; note?: string }): Promise<void>;
  assign(id: string, body: { department_id: string; assigned_to: string }): Promise<void>;
  status(id: string, body: { status: string; note: string }): Promise<void>;
  publish(id: string): Promise<void>;
}

const httpBackend: StaffBackend = {
  async role() { return (await request<{ role: string }>('/v1/auth/me')).role; },
  async departments() { return (await request<{ items: ApiDepartment[] }>('/v1/departments')).items; },
  async zones() { return (await request<{ items: { name: string }[] }>('/v1/zones')).items; },
  async users(fieldStaffOnly) {
    return (await request<{ items: ApiUser[] }>(fieldStaffOnly ? '/v1/users?role=operative_staff&active=true' : '/v1/users?active=true')).items;
  },
  async reports() {
    const rows: ApiReport[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await request<{ items: ApiReport[] }>(`/v1/reports?limit=200&offset=${offset}`);
      rows.push(...page.items);
      if (page.items.length < 200) break;
    }
    return rows;
  },
  async report(id) {
    const row = await request<ApiReport>(`/v1/reports/${encodeURIComponent(id)}`);
    if (row.files?.length) {
      await Promise.all(row.files.filter((f) => ['citizen_photo', 'after_photo', 'before_photo'].includes(f.kind)).map(async (file) => {
        const response = await fetch(`${BASE}${file.url}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!response.ok) return;
        const previous = photoUrls.get(file.url);
        if (previous) URL.revokeObjectURL(previous);
        const url = URL.createObjectURL(await response.blob());
        photoUrls.set(file.url, url);
        file.url = url;
      }));
    }
    return row;
  },
  async review(id, body) { await request(`/v1/reports/${id}/review`, body, 'PATCH'); },
  async assign(id, body) { await request(`/v1/reports/${id}/assign`, body, 'PATCH'); },
  async status(id, body) { await request(`/v1/reports/${id}/status`, body, 'PATCH'); },
  async publish(id) { await request(`/v1/reports/${id}/publish`, {}, 'POST'); },
};

/** Supabase: reads go through RLS (staff_reports view), writes through the staff_* functions. */
const supabaseBackend: StaffBackend = {
  async role() {
    const { data: auth } = await sb().auth.getUser();
    if (!auth.user) throw new Error('Sesioni ka skaduar.');
    const { data, error } = await sb().from('profiles').select('role, active').eq('id', auth.user.id).maybeSingle();
    if (error) throw dbError(error);
    return data?.active ? data.role as string : '';
  },
  async departments() {
    const { data, error } = await sb().from('departments').select('id, code, name').order('name');
    if (error) throw dbError(error);
    return data as ApiDepartment[];
  },
  async zones() {
    const { data, error } = await sb().from('zones').select('name').order('name');
    if (error) throw dbError(error);
    return data as { name: string }[];
  },
  async users(fieldStaffOnly) {
    let query = sb().from('profiles').select('id, full_name, department_id, role').eq('active', true);
    if (fieldStaffOnly) query = query.eq('role', 'operative_staff');
    const { data, error } = await query;
    if (error) throw dbError(error);
    return data as ApiUser[];
  },
  async reports() {
    const rows: ApiReport[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb().from('staff_reports').select('*')
        .order('submitted_at', { ascending: false }).range(offset, offset + 999);
      if (error) throw dbError(error);
      rows.push(...(data as ApiReport[]));
      if (data.length < 1000) break;
    }
    return rows;
  },
  async report(id) {
    const [row, files, history] = await Promise.all([
      sb().from('staff_reports').select('*').eq('id', id).single(),
      sb().from('report_files').select('kind, storage_path').eq('report_id', id).order('created_at'),
      sb().from('report_status_history').select('new_status, note, created_at').eq('report_id', id).order('created_at'),
    ]);
    if (row.error) throw dbError(row.error);
    const paths = (files.data || []).map((f) => f.storage_path as string);
    const signed = paths.length ? await sb().storage.from('report-photos').createSignedUrls(paths, 60 * 60) : { data: [] };
    const urls = new Map((signed.data || []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
    return {
      ...(row.data as ApiReport),
      files: (files.data || []).map((f) => ({ kind: f.kind as string, url: urls.get(f.storage_path as string) || '' })).filter((f) => f.url),
      status_history: (history.data || []) as ApiReport['status_history'],
    };
  },
  async review(id, body) {
    const { error } = await sb().rpc('staff_review', { p_report: id, p_decision: body.decision, p_priority: body.priority,
      p_department: body.department_id || null, p_note: body.note || '' });
    if (error) throw dbError(error);
  },
  async assign(id, body) {
    const { error } = await sb().rpc('staff_assign', { p_report: id, p_department: body.department_id || null,
      p_assigned_to: body.assigned_to || null, p_note: '' });
    if (error) throw dbError(error);
  },
  async status(id, body) {
    const { error } = await sb().rpc('staff_set_status', { p_report: id, p_status: body.status, p_note: body.note });
    if (error) throw dbError(error);
  },
  async publish(id) {
    const { error } = await sb().rpc('staff_publish', { p_report: id });
    if (error) throw dbError(error);
  },
};

const api: StaffBackend = USE_SUPABASE ? supabaseBackend : httpBackend;

export async function login(email: string, password: string): Promise<void> {
  if (USE_SUPABASE) {
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email-i ose fjalëkalimi është i gabuar.');
    const role = await supabaseBackend.role();
    if (!DESKTOP_ROLES.includes(role)) {
      await sb().auth.signOut({ scope: 'local' });
      throw new Error('Kjo llogari nuk ka qasje te stafi.');
    }
    return;
  }
  const result = await request<{ access_token: string; user: { role: string } }>('/v1/auth/login', { email, password }, 'POST');
  if (!['admin', 'clerk', 'municipal_authority', 'department_authority', 'operative_staff'].includes(result.user.role)) {
    throw new Error('Kjo llogari nuk ka qasje te stafi.');
  }
  token = result.access_token; // Memory only; never save staff credentials or JWT in localStorage.
}

/**
 * Supabase: turn the tokens the login page handed over into a supabase-js session
 * (which then refreshes itself). Resolves false when there is no usable session.
 */
export async function restoreSession(): Promise<boolean> {
  if (!USE_SUPABASE) return hasStaffSession();
  const refresh = window.sessionStorage.getItem(REFRESH_KEY) || window.localStorage.getItem(REFRESH_KEY);
  const handoff = token && refresh ? { access_token: token, refresh_token: refresh } : null;
  for (const store of [window.sessionStorage, window.localStorage]) { store.removeItem(TOKEN_KEY); store.removeItem(REFRESH_KEY); }
  token = '';
  if (handoff) {
    const { data, error } = await sb().auth.setSession(handoff);
    return !error && !!data.session;
  }
  const { data } = await sb().auth.getSession();
  return !!data.session;
}

export function logout(): void {
  token = '';
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.sessionStorage.removeItem('sinjal_session');
  window.localStorage.removeItem('sinjal_session');
  if (USE_SUPABASE) {
    void sb().auth.signOut({ scope: 'local' });
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  photoUrls.forEach((url) => URL.revokeObjectURL(url));
  photoUrls.clear();
}

const statusIn: Record<string, Status> = {
  submitted: 'I ri', under_review: 'Në shqyrtim', accepted: 'Në shqyrtim',
  assigned: 'Caktuar', in_progress: 'Në punë', blocked: 'Kërkon informacion',
  resolved: 'Zgjidhur', published: 'Mbyllur', rejected: 'Refuzuar',
};
const statusOut: Partial<Record<Status, string>> = {
  'I ri': 'submitted', 'Në shqyrtim': 'under_review', Caktuar: 'assigned',
  'Në punë': 'in_progress', 'Kërkon informacion': 'blocked', Zgjidhur: 'resolved',
  Mbyllur: 'published', Refuzuar: 'rejected',
};
const priorityIn: Record<string, Priority> = { low: 'E ulët', normal: 'E mesme', high: 'E lartë', urgent: 'Urgjente' };
const priorityOut: Record<Priority, string> = { 'E ulët': 'low', 'E mesme': 'normal', 'E lartë': 'high', Urgjente: 'urgent' };

function categoryOf(row: ApiReport): Report['category'] {
  const code = row.category_code || '';
  if (code === 'waste') return 'mbetje';
  if (code === 'lighting') return 'ndricim';
  if (code === 'public_spaces' || code === 'green_spaces') return 'hapesira';
  if (row.subcategory?.toLowerCase().includes('grop')) return 'gropa';
  if (code === 'infrastructure') return 'infra';
  return (code || row.category) as Report['category'];
}

function deptCode(id: string | null): string | undefined {
  return id ? [...departments].find(([, value]) => value === id)?.[0] : undefined;
}

function fromApi(row: ApiReport): Report {
  const now = Date.now();
  const submittedAt = new Date(row.submitted_at);
  const due = row.due_at ? new Date(row.due_at) : new Date(submittedAt.getTime() + 120 * 3600000);
  const remaining = (due.getTime() - now) / 3600000;
  const terminal = ['resolved', 'published', 'rejected'].includes(row.status);
  const department = deptCode(row.department_id) || 'unassigned';
  const responsible = row.assigned_to ? [...users].find(([, id]) => id === row.assigned_to)?.[0] || row.assigned_to : null;
  const ai = row.ai_analysis && typeof row.ai_analysis === 'object' ? row.ai_analysis as Record<string, unknown> : {};
  const category = categoryOf(row);
  const files = row.files || [];
  return {
    id: row.id, displayId: row.tracking_code, title: row.title, description: row.description,
    category, categoryLabel: row.category, address: row.address, zone: row.zone_name || 'Pa zonë',
    priority: priorityIn[row.priority] || 'E mesme', status: statusIn[row.status] || 'Në shqyrtim',
    department: department as DeptId, departmentName: row.department_name || SINJAL.deptName(department),
    responsible, responsibleName: row.assigned_to_name || null,
    submittedAt, submittedLabel: SINJAL.fmtDateTime(submittedAt), slaDeadline: due,
    slaRemainingHours: terminal ? null : remaining, slaLabel: terminal ? '—' : SINJAL.fmtSLA(remaining),
    slaBreached: !terminal && remaining < 0, slaAtRisk: !terminal && remaining >= 0 && remaining <= 4,
    citizenInitials: '—', photo: files.find((f) => f.kind === 'citizen_photo')?.url || '',
    ai: { suggestedPriority: priorityIn[row.priority] || 'E mesme', confidence: Number(ai.confidence ?? 100), risk: 'I ulët',
      suggestedDepartment: row.department_name || '', rationale: typeof ai.rationale === 'string' ? ai.rationale : '' },
    assignment: { department: department as DeptId, team: row.department_name || '', responsible,
      priority: priorityIn[row.priority] || 'E mesme', deadline: due, approved: !!row.assigned_to },
    duplicateOf: row.duplicate_of, duplicateCandidateId: null, duplicateSimilarity: null,
    reappeared: false, reappearedFromId: null, linkedIds: [],
    resolutionEvidence: files.filter((f) => f.kind === 'after_photo').map((f) => ({ photo: f.url, note: '' })),
    timeline: (row.status_history || []).map((item) => ({ time: new Date(item.created_at),
      label: item.note || statusIn[item.new_status] || item.new_status, kind: 'clerk' as const })),
    resolutionHours: row.resolved_at ? (new Date(row.resolved_at).getTime() - submittedAt.getTime()) / 3600000 : null,
    firstResponseHours: row.first_action_at ? (new Date(row.first_action_at).getTime() - submittedAt.getTime()) / 3600000 : null,
  };
}

/** Add or replace one database report in SINJAL (list, category and assignee lookups included). */
function upsertReport(row: ApiReport): void {
  rawStatuses.set(row.id, row.status);
  if (row.assigned_to && !SINJAL.employees.some((e) => e.id === row.assigned_to))
    SINJAL.employees.push({ id: row.assigned_to, name: row.assigned_to_name || 'Staf',
      full: row.assigned_to_name || 'Staf', dept: (deptCode(row.department_id) || 'unassigned') as DeptId,
      coverageZones: [] });
  const category = categoryOf(row);
  if (!SINJAL.categories.some((c) => c.id === category))
    SINJAL.categories.push({ id: category, label: row.category, dept: (deptCode(row.department_id) || 'infra') as DeptId,
      defaultPriority: 'E mesme', exception: '' });
  const index = SINJAL.reports.findIndex((r) => r.id === row.id);
  if (index >= 0) SINJAL.reports[index] = fromApi(row);
  else SINJAL.reports.unshift(fromApi(row));
}

export async function loadStaff(): Promise<string> {
  const role = await api.role();
  // Direct navigation to the staff URL must respect the current database role.
  if (!DESKTOP_ROLES.includes(role)) return role;
  const [deps, zones] = await Promise.all([api.departments(), api.zones()]);
  departments = new Map(deps.map((d) => [d.code, d.id]));
  SINJAL.departments.splice(0, SINJAL.departments.length,
    ...deps.map((d) => ({ id: d.code as DeptId, name: d.name })),
    { id: 'unassigned', name: 'Pa departament' });
  SINJAL.zones.splice(0, SINJAL.zones.length, ...zones.map((z) => z.name));
  try {
    const people = await api.users(false);
    users = new Map(people.map((u) => [u.id, u.id]));
    SINJAL.employees.splice(0, SINJAL.employees.length, ...people.filter((u) => u.role === 'operative_staff').map((u) => ({
      id: u.id, full: u.full_name, name: u.full_name, dept: (deptCode(u.department_id) || 'infra') as DeptId,
      coverageZones: [],
    })));
  } catch { SINJAL.employees.splice(0); } // Roles without user-directory access still see their own cases.
  const rows = await api.reports();
  for (const row of rows) {
    if (!row.assigned_to || SINJAL.employees.some((e) => e.id === row.assigned_to)) continue;
    SINJAL.employees.push({ id: row.assigned_to, name: row.assigned_to_name || 'Staf',
      full: row.assigned_to_name || 'Staf', dept: (deptCode(row.department_id) || 'unassigned') as DeptId,
      coverageZones: [] });
  }
  setLiveTime(new Date());
  rawStatuses.clear();
  rows.forEach((row) => rawStatuses.set(row.id, row.status));
  SINJAL.categories.splice(0, SINJAL.categories.length, ...[...new Map(rows.map((row) => {
    const key = categoryOf(row);
    const department = deptCode(row.department_id) || 'infra';
    return [key, { id: key, label: row.category, dept: department as DeptId,
      defaultPriority: priorityIn[row.priority] || 'E mesme', exception: '' }] as const;
  })).values()]);
  SINJAL.reports.splice(0, SINJAL.reports.length, ...rows.map(fromApi));
  SINJAL.history.splice(0); // Do not blend the 843 invented historical cases with real reports.
  SINJAL.notifications.splice(0);
  SINJAL.activity.splice(0);
  remove(STORAGE_KEYS.caseOverrides); // Old demo edits must never mask server state.
  return role;
}

export function isDatabaseCase(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Show the original staff presentation data alongside the citizen reports.
 * Demo edits stay in the browser; real case transitions use the existing API.
 */
export async function loadDemoStaff(): Promise<string> {
  const role = await api.role();
  if (!DESKTOP_ROLES.includes(role)) return role;

  const [deps, zones] = await Promise.all([api.departments(), api.zones()]);
  departments = new Map(deps.map((d) => [d.code, d.id]));
  for (const dept of deps) {
    if (!SINJAL.departments.some((d) => d.id === dept.code))
      SINJAL.departments.push({ id: dept.code as DeptId, name: dept.name });
  }
  for (const zone of zones) {
    if (!SINJAL.zones.includes(zone.name)) SINJAL.zones.push(zone.name);
  }
  try {
    const people = await api.users(true);
    for (const person of people) {
      if (!SINJAL.employees.some((e) => e.id === person.id))
        SINJAL.employees.push({ id: person.id, full: person.full_name, name: person.full_name,
          dept: (deptCode(person.department_id) || 'infra') as DeptId,
          coverageZones: [] });
    }
  } catch { /* The user directory is optional for clerk accounts. */ }

  const rows = await api.reports();
  for (const row of rows) {
    rawStatuses.set(row.id, row.status);
    if (row.assigned_to && !SINJAL.employees.some((e) => e.id === row.assigned_to))
      SINJAL.employees.push({ id: row.assigned_to, name: row.assigned_to_name || 'Staf',
        full: row.assigned_to_name || 'Staf',
        dept: (deptCode(row.department_id) || 'infra') as DeptId,
        coverageZones: [] });
    const category = categoryOf(row);
    if (!SINJAL.categories.some((c) => c.id === category))
      SINJAL.categories.push({ id: category, label: row.category, dept: 'infra',
        defaultPriority: 'E mesme', exception: '' });
    const index = SINJAL.reports.findIndex((r) => r.id === row.id);
    if (index >= 0 && isDatabaseCase(row.id)) SINJAL.reports[index] = fromApi(row);
    else if (index < 0) SINJAL.reports.push(fromApi(row));
  }
  return role;
}

export async function loadReportDetail(id: string): Promise<void> {
  const row = await api.report(id);
  detailed.add(id);
  rawStatuses.set(id, row.status);
  const index = SINJAL.reports.findIndex((r) => r.id === id);
  if (index >= 0) SINJAL.reports[index] = fromApi(row);
}

/**
 * Supabase Realtime: keep SINJAL.reports in step with the database, so a citizen's new
 * report (or another clerk's change) appears on every staff screen without a reload.
 * Screens re-render on DATA_CHANGED_EVENT (see useLogic). Returns an unsubscribe function.
 */
export function subscribeToReports(): () => void {
  if (!USE_SUPABASE) return () => {};
  let pending = Promise.resolve();
  const refresh = (id: string) => {
    pending = pending.then(async () => {
      if (detailed.has(id)) await loadReportDetail(id);
      else {
        const { data } = await sb().from('staff_reports').select('*').eq('id', id).maybeSingle();
        if (data) upsertReport(data as ApiReport);
        else {
          // No longer visible to this account (e.g. routed to another department).
          const index = SINJAL.reports.findIndex((r) => r.id === id);
          if (index >= 0) SINJAL.reports.splice(index, 1);
        }
      }
      setLiveTime(new Date());
      window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
    }).catch(() => { /* A failed refresh leaves the last known state on screen. */ });
  };
  const channel = sb().channel('staff-reports')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (change) => {
      const id = (change.new as { id?: string })?.id || (change.old as { id?: string })?.id;
      if (id) refresh(id);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_files' }, (change) => {
      const id = (change.new as { report_id?: string })?.report_id;
      if (id && detailed.has(id)) refresh(id);
    })
    .subscribe();
  return () => { void sb().removeChannel(channel); };
}

/** Apply only transitions the backend actually supports. Never record an unsupported local-only edit. */
export async function saveCase(id: string, patch: CaseOverride): Promise<void> {
  const current = SINJAL.byId(id);
  if (!current) throw new Error('Raporti nuk u gjet.');
  const requested = patch.status && patch.status !== current.status ? statusOut[patch.status] : undefined;
  const old = rawStatuses.get(id) || statusOut[current.status];
  const dept = patch.department || current.department;
  const deptId = departments.get(dept);
  const assignee = patch.responsible === undefined ? current.responsible : patch.responsible;
  const lastNote = (patch.notes || []).at(-1);
  const note = String((patch.reopenLog || []).at(-1)?.reason || (lastNote && typeof lastNote !== 'string' ? lastNote.text : '') || '').trim();
  if (requested === 'under_review' && old === 'submitted') {
    await api.review(id, { decision: 'under_review', priority: priorityOut[patch.priority || current.priority] });
  } else if (requested === 'rejected' && ['submitted', 'under_review'].includes(old || '')) {
    await api.review(id, { decision: 'rejected', priority: priorityOut[patch.priority || current.priority], note });
  } else if (requested === 'accepted' || ((patch.department || patch.responsible !== undefined) && ['submitted', 'under_review'].includes(old || ''))) {
    if (!deptId) throw new Error('Zgjidh departamentin përpara pranimit.');
    await api.review(id, { decision: 'accepted', department_id: deptId,
      priority: priorityOut[patch.priority || current.priority] });
    if (assignee) await api.assign(id, { department_id: deptId, assigned_to: assignee });
  } else if (patch.department || patch.responsible !== undefined) {
    if (!deptId) throw new Error('Departamenti nuk u gjet.');
    await api.assign(id, { department_id: deptId, assigned_to: assignee || '' });
  } else if (requested && ['in_progress', 'blocked', 'resolved'].includes(requested)) {
    const resolutionNote = requested === 'resolved' && !note ? window.prompt('Shënim për zgjidhjen:')?.trim() : note;
    if (requested === 'resolved' && !resolutionNote) throw new Error('Zgjidhja kërkon shënim.');
    await api.status(id, { status: requested, note: resolutionNote || '' });
  } else if (requested === 'published' && old === 'resolved') {
    await api.publish(id);
  } else {
    throw new Error('Ky veprim nuk mbështetet ende nga API-ja e stafit.');
  }
  await loadReportDetail(id);
}
