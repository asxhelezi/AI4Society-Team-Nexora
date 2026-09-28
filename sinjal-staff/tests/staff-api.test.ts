import { afterEach, expect, test, vi } from 'vitest';
import { SINJAL } from '../src/data/sinjal';
import { loadStaff, login, saveCase } from '../src/api/staff';
import { KreuLogic } from '../src/screens/kreu/KreuLogic';
import { RaportetLogic } from '../src/screens/raportet/RaportetLogic';
import { RaportiLogic } from '../src/screens/raporti/RaportiLogic';
import { HartaLogic } from '../src/screens/harta/HartaLogic';
import { DepartamentetLogic } from '../src/screens/departamentet/DepartamentetLogic';

afterEach(() => vi.unstubAllGlobals());

test('staff login loads real reports and assignment writes through to the API', async () => {
  const calls: { path: string; auth: string | null }[] = [];
  let status = 'submitted';
  const report = () => ({
    id: 'b74a8e63-45c0-4a47-a1bc-21076e745420', tracking_code: 'SNJ-ABCDEF123456',
    title: 'Ndriçimi', description: 'Shtyllë e dëmtuar', category: 'Ndriçim', category_code: 'lighting', subcategory: null,
    address: 'Rruga e Qendrës', status, priority: 'normal', department_id: status === 'submitted' ? null : 'dept-1',
    department_name: status === 'submitted' ? null : 'Ndriçim', zone_name: 'Qendër', assigned_to: null, assigned_to_name: null,
    submitted_at: new Date().toISOString(), due_at: null, updated_at: new Date().toISOString(),
    first_action_at: null, resolved_at: null, reopened_from: null, duplicate_of: null, ai_analysis: null,
    files: [], status_history: [],
  });
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input, 'http://localhost').pathname;
    const headers = new Headers(init?.headers);
    calls.push({ path, auth: headers.get('Authorization') });
    let value: unknown;
    if (path === '/v1/auth/login') value = { access_token: 'test-token', user: { role: 'clerk' } };
    else if (path === '/v1/auth/me') value = { role: 'clerk' };
    else if (path === '/v1/departments') value = { items: [{ id: 'dept-1', code: 'ndricim', name: 'Ndriçim' }] };
    else if (path === '/v1/zones') value = { items: [{ name: 'Qendër' }] };
    else if (path === '/v1/users') value = { items: [] };
    else if (path === '/v1/reports' && init?.method !== 'PATCH') value = { items: [report()] };
    else if (path.endsWith('/review')) { status = 'accepted'; value = { status }; }
    else if (path.endsWith('/assign')) { status = 'assigned'; value = { status }; }
    else if (path.startsWith('/v1/reports/')) value = report();
    else throw new Error(`Unexpected request: ${path}`);
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));

  await login('staff@example.com', 'password');
  await loadStaff();
  expect(SINJAL.reports).toHaveLength(1);
  expect(SINJAL.reports[0].title).toBe('Ndriçimi');
  expect(SINJAL.history).toHaveLength(0);
  for (const Logic of [KreuLogic, RaportetLogic, RaportiLogic, HartaLogic, DepartamentetLogic]) {
    const screen = new Logic({});
    screen.componentDidMount?.();
    expect(() => screen.renderVals()).not.toThrow();
  }
  await saveCase(SINJAL.reports[0].id, { department: 'ndricim' });
  expect(calls.map((c) => c.path)).toContain('/v1/reports/b74a8e63-45c0-4a47-a1bc-21076e745420/review');
  expect(SINJAL.reports[0].status).toBe('Në shqyrtim');
  expect(calls.filter((c) => c.path !== '/v1/auth/login').every((c) => c.auth === 'Bearer test-token')).toBe(true);
});

test('admin is sent to its own panel without loading staff reports', async () => {
  const fetch = vi.fn(async (input: string) => {
    const path = new URL(input, 'http://localhost').pathname;
    if (path === '/v1/auth/login') return Response.json({ access_token: 'admin-token', user: { role: 'admin' } });
    if (path === '/v1/auth/me') return Response.json({ role: 'admin' });
    throw new Error(`Staff API was called for admin: ${path}`);
  });
  vi.stubGlobal('fetch', fetch);
  await login('admin@example.org', 'password8');
  expect(await loadStaff()).toBe('admin');
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('a clerk with no reports can load the staff dashboard', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input, 'http://localhost').pathname;
    if (path === '/v1/auth/login') return Response.json({ access_token: 'clerk-token', user: { role: 'clerk' } });
    if (path === '/v1/auth/me') return Response.json({ role: 'clerk' });
    if (path === '/v1/departments' || path === '/v1/zones' || path === '/v1/users' || path === '/v1/reports') {
      return Response.json({ items: [] });
    }
    throw new Error(`Unexpected API request: ${path}`);
  }));
  await login('demo.staff@sinjal.local', 'password8');
  expect(await loadStaff()).toBe('clerk');
  expect(SINJAL.reports).toHaveLength(0);
  const screen = new KreuLogic({});
  screen.componentDidMount?.();
  expect(() => screen.renderVals()).not.toThrow();
});
