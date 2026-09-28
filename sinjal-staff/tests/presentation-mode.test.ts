import { afterEach, expect, test, vi } from 'vitest';
import { loadDemoStaff, login, logout, saveCase } from '../src/api/staff';
import { SINJAL } from '../src/data/sinjal';
import { STORAGE_KEYS, readJSON, writeJSON } from '../src/lib/storage';

afterEach(() => {
  logout();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

test('clerk keeps the original presentation cases and sees real citizen reports without new backend endpoints', async () => {
  const visited: string[] = [];
  const realId = 'e270fc56-73c4-4e13-986c-00e193ca8832';
  let status = 'submitted';
  const report = () => ({
    id: realId, tracking_code: 'SNJ-ABCD0123', title: 'Raport nga qytetari',
    description: 'Ndriçim i dëmtuar', category: 'Ndriçim', category_code: 'lighting', subcategory: null,
    address: 'Qendër', status, priority: 'normal', department_id: null,
    department_name: null, zone_name: 'Qendër', assigned_to: null, assigned_to_name: null,
    submitted_at: new Date().toISOString(), due_at: null, updated_at: new Date().toISOString(),
    first_action_at: null, resolved_at: null, reopened_from: null, duplicate_of: null, ai_analysis: null,
    files: [], status_history: [],
  });
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input, 'http://localhost').pathname;
    visited.push(path);
    if (path === '/v1/auth/login') return Response.json({ access_token: 'clerk-token', user: { role: 'clerk' } });
    if (path === '/v1/auth/me') return Response.json({ role: 'clerk' });
    if (path === '/v1/departments') return Response.json({ items: [{ code: 'ndricim', id: 'dept-1', name: 'Ndriçim' }] });
    if (path === '/v1/zones' || path === '/v1/users') return Response.json({ items: [] });
    if (path === '/v1/reports') return Response.json({ items: [report()] });
    if (path.endsWith('/review') && init?.method === 'PATCH') {
      status = 'under_review';
      return Response.json({ status });
    }
    if (path === `/v1/reports/${realId}`) return Response.json(report());
    throw new Error(`Unexpected API call: ${path}`);
  }));

  const demoCount = SINJAL.reports.length;
  const historyCount = SINJAL.history.length;
  await login('demo.staff@sinjal.local', 'test-password8');
  expect(await loadDemoStaff()).toBe('clerk');
  expect(SINJAL.reports).toHaveLength(demoCount + 1);
  expect(SINJAL.reports[0].id).toBe('02481');
  expect(SINJAL.history).toHaveLength(historyCount);
  writeJSON(STORAGE_KEYS.caseOverrides, { '02481': { status: 'Në shqyrtim' } });
  expect(readJSON<Record<string, { status: string }>>(STORAGE_KEYS.caseOverrides, {})['02481'].status).toBe('Në shqyrtim');

  await saveCase(realId, { status: 'Në shqyrtim' });
  expect(visited).toContain(`/v1/reports/${realId}/review`);
  expect(visited.some((path) => path.startsWith('/v1/staff/demo'))).toBe(false);
  expect(await loadDemoStaff()).toBe('clerk');
  expect(SINJAL.reports).toHaveLength(demoCount + 1);
});

test('admin is routed by its database role before staff reports load', async () => {
  const fetch = vi.fn(async (input: string) => {
    const path = new URL(input, 'http://localhost').pathname;
    if (path === '/v1/auth/login') return Response.json({ access_token: 'admin-token', user: { role: 'admin' } });
    if (path === '/v1/auth/me') return Response.json({ role: 'admin' });
    throw new Error(`Staff data was requested for an admin: ${path}`);
  });
  vi.stubGlobal('fetch', fetch);
  await login('admin@sinjal.local', 'test-password8');
  expect(await loadDemoStaff()).toBe('admin');
  expect(fetch).toHaveBeenCalledTimes(2);
});
