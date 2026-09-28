import { SINJAL, setLiveTime } from '../data/sinjal';
import type { CaseOverride, DeptId, Priority, Report, Status } from '../data/types';
import { STORAGE_KEYS, remove } from '../lib/storage';

const BASE = (import.meta.env.VITE_STAFF_API_URL || '').replace(/\/$/, '');
// Keep the presentation dataset visible after staff authentication. Operators
// can opt into the original API-only dashboard with VITE_STAFF_DEMO=false.
export const AUTH_REQUIRED = import.meta.env.MODE !== 'test' && import.meta.env.VITE_STAFF_REAL !== 'false';
export const DEMO_STAFF = AUTH_REQUIRED && import.meta.env.VITE_STAFF_DEMO !== 'false';
export const REAL_STAFF = AUTH_REQUIRED && !DEMO_STAFF;
const TOKEN_KEY = 'sinjal_staff_access';
let token = typeof window === 'undefined' ? '' :
  (window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY) || '');
export function hasStaffSession(): boolean { return !!token; }
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

export async function login(email: string, password: string): Promise<void> {
  const result = await request<{ access_token: string; user: { role: string } }>('/v1/auth/login', { email, password }, 'POST');
  if (!['admin', 'clerk', 'municipal_authority', 'department_authority', 'operative_staff'].includes(result.user.role)) {
    throw new Error('Kjo llogari nuk ka qasje te stafi.');
  }
  token = result.access_token; // Memory only; never save staff credentials or JWT in localStorage.
}

export function logout(): void {
  token = '';
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem('sinjal_session');
  window.localStorage.removeItem('sinjal_session');
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

function fromApi(row: ApiReport): Report {
  const now = Date.now();
  const submittedAt = new Date(row.submitted_at);
  const due = row.due_at ? new Date(row.due_at) : new Date(submittedAt.getTime() + 120 * 3600000);
  const remaining = (due.getTime() - now) / 3600000;
  const terminal = ['resolved', 'published', 'rejected'].includes(row.status);
  const department = (row.department_id ? [...departments].find(([, id]) => id === row.department_id)?.[0] : undefined) || 'unassigned';
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

export async function loadStaff(): Promise<string> {
  const account = await request<{ role: string }>('/v1/auth/me');
  // Direct navigation to the staff URL must respect the current database role.
  if (account.role !== 'clerk') return account.role;
  const [deps, zones] = await Promise.all([
    request<{ items: { id: string; code: string; name: string }[] }>('/v1/departments'),
    request<{ items: { name: string }[] }>('/v1/zones'),
  ]);
  departments = new Map(deps.items.map((d) => [d.code, d.id]));
  SINJAL.departments.splice(0, SINJAL.departments.length,
    ...deps.items.map((d) => ({ id: d.code as DeptId, name: d.name })),
    { id: 'unassigned', name: 'Pa departament' });
  SINJAL.zones.splice(0, SINJAL.zones.length, ...zones.items.map((z) => z.name));
  try {
    const people = await request<{ items: { id: string; full_name: string; department_id: string | null; role: string }[] }>('/v1/users?active=true');
    users = new Map(people.items.map((u) => [u.id, u.id]));
    SINJAL.employees.splice(0, SINJAL.employees.length, ...people.items.filter((u) => u.role === 'operative_staff').map((u) => ({
      id: u.id, full: u.full_name, name: u.full_name, dept: ([...departments].find(([, id]) => id === u.department_id)?.[0] || 'infra') as DeptId,
      coverageZones: [],
    })));
  } catch { SINJAL.employees.splice(0); } // Roles without user-directory access still see their own cases.
  const rows: ApiReport[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await request<{ items: ApiReport[] }>(`/v1/reports?limit=200&offset=${offset}`);
    rows.push(...page.items);
    if (page.items.length < 200) break;
  }
  for (const row of rows) {
    if (!row.assigned_to || SINJAL.employees.some((e) => e.id === row.assigned_to)) continue;
    SINJAL.employees.push({ id: row.assigned_to, name: row.assigned_to_name || 'Staf',
      full: row.assigned_to_name || 'Staf', dept: ([...departments].find(([, id]) => id === row.department_id)?.[0] || 'unassigned') as DeptId,
      coverageZones: [] });
  }
  setLiveTime(new Date());
  rawStatuses.clear();
  rows.forEach((row) => rawStatuses.set(row.id, row.status));
  SINJAL.categories.splice(0, SINJAL.categories.length, ...[...new Map(rows.map((row) => {
    const key = categoryOf(row);
    const department = [...departments].find(([, id]) => id === row.department_id)?.[0] || 'infra';
    return [key, { id: key, label: row.category, dept: department as DeptId,
      defaultPriority: priorityIn[row.priority] || 'E mesme', exception: '' }] as const;
  })).values()]);
  SINJAL.reports.splice(0, SINJAL.reports.length, ...rows.map(fromApi));
  SINJAL.history.splice(0); // Do not blend the 843 invented historical cases with real reports.
  SINJAL.notifications.splice(0);
  SINJAL.activity.splice(0);
  remove(STORAGE_KEYS.caseOverrides); // Old demo edits must never mask server state.
  return account.role;
}

export function isDatabaseCase(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Show the original staff presentation data alongside the citizen reports.
 * Demo edits stay in the browser; real case transitions use the existing API.
 */
export async function loadDemoStaff(): Promise<string> {
  const account = await request<{ role: string }>('/v1/auth/me');
  if (account.role !== 'clerk') return account.role;

  const [deps, zones] = await Promise.all([
    request<{ items: { id: string; code: string; name: string }[] }>('/v1/departments'),
    request<{ items: { name: string }[] }>('/v1/zones'),
  ]);
  departments = new Map(deps.items.map((d) => [d.code, d.id]));
  for (const dept of deps.items) {
    if (!SINJAL.departments.some((d) => d.id === dept.code))
      SINJAL.departments.push({ id: dept.code as DeptId, name: dept.name });
  }
  for (const zone of zones.items) {
    if (!SINJAL.zones.includes(zone.name)) SINJAL.zones.push(zone.name);
  }
  try {
    const people = await request<{ items: { id: string; full_name: string; department_id: string | null }[] }>(
      '/v1/users?role=operative_staff&active=true');
    for (const person of people.items) {
      if (!SINJAL.employees.some((e) => e.id === person.id))
        SINJAL.employees.push({ id: person.id, full: person.full_name, name: person.full_name,
          dept: ([...departments].find(([, id]) => id === person.department_id)?.[0] || 'infra') as DeptId,
          coverageZones: [] });
    }
  } catch { /* The user directory is optional for clerk accounts. */ }

  const rows: ApiReport[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await request<{ items: ApiReport[] }>(`/v1/reports?limit=200&offset=${offset}`);
    rows.push(...page.items);
    if (page.items.length < 200) break;
  }
  for (const row of rows) {
    rawStatuses.set(row.id, row.status);
    if (row.assigned_to && !SINJAL.employees.some((e) => e.id === row.assigned_to))
      SINJAL.employees.push({ id: row.assigned_to, name: row.assigned_to_name || 'Staf',
        full: row.assigned_to_name || 'Staf',
        dept: ([...departments].find(([, id]) => id === row.department_id)?.[0] || 'infra') as DeptId,
        coverageZones: [] });
    const category = categoryOf(row);
    if (!SINJAL.categories.some((c) => c.id === category))
      SINJAL.categories.push({ id: category, label: row.category, dept: 'infra',
        defaultPriority: 'E mesme', exception: '' });
    const index = SINJAL.reports.findIndex((r) => r.id === row.id);
    if (index >= 0 && isDatabaseCase(row.id)) SINJAL.reports[index] = fromApi(row);
    else if (index < 0) SINJAL.reports.push(fromApi(row));
  }
  return account.role;
}

export async function loadReportDetail(id: string): Promise<void> {
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
  rawStatuses.set(id, row.status);
  const index = SINJAL.reports.findIndex((r) => r.id === id);
  if (index >= 0) SINJAL.reports[index] = fromApi(row);
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
    await request(`/v1/reports/${id}/review`, { decision: 'under_review', priority: priorityOut[patch.priority || current.priority] }, 'PATCH');
  } else if (requested === 'rejected' && ['submitted', 'under_review'].includes(old || '')) {
    await request(`/v1/reports/${id}/review`, { decision: 'rejected', priority: priorityOut[patch.priority || current.priority], note }, 'PATCH');
  } else if (requested === 'accepted' || ((patch.department || patch.responsible !== undefined) && ['submitted', 'under_review'].includes(old || ''))) {
    if (!deptId) throw new Error('Zgjidh departamentin përpara pranimit.');
    await request(`/v1/reports/${id}/review`, { decision: 'accepted', department_id: deptId,
      priority: priorityOut[patch.priority || current.priority] }, 'PATCH');
    if (assignee) await request(`/v1/reports/${id}/assign`, { department_id: deptId, assigned_to: assignee }, 'PATCH');
  } else if (patch.department || patch.responsible !== undefined) {
    if (!deptId) throw new Error('Departamenti nuk u gjet.');
    await request(`/v1/reports/${id}/assign`, { department_id: deptId, assigned_to: assignee || '' }, 'PATCH');
  } else if (requested && ['in_progress', 'blocked', 'resolved'].includes(requested)) {
    const resolutionNote = requested === 'resolved' && !note ? window.prompt('Shënim për zgjidhjen:')?.trim() : note;
    if (requested === 'resolved' && !resolutionNote) throw new Error('Zgjidhja kërkon shënim.');
    await request(`/v1/reports/${id}/status`, { status: requested, note: resolutionNote || '' }, 'PATCH');
  } else if (requested === 'published' && old === 'resolved') {
    await request(`/v1/reports/${id}/publish`, {}, 'POST');
  } else {
    throw new Error('Ky veprim nuk mbështetet ende nga API-ja e stafit.');
  }
  await loadReportDetail(id);
}
