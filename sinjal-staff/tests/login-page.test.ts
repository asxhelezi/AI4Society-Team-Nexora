import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { expect, test, vi } from 'vitest';

const html = readFileSync(resolve(process.cwd(), '../sinjal-login/index.html'), 'utf8');

test('the supplied login rejects bad credentials and shares a real staff session', async () => {
  let allowed = false;
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    expect(JSON.parse(init.body as string)).toEqual({ username: 'admin@sinjal.local', password: 'correct-pass' });
    return new Response(JSON.stringify(allowed ? {
      access_token: 'signed-jwt',
      user: { id: 'admin-1', full_name: 'Real Administrator', role: 'admin' },
    } : { error: { message: 'Invalid credentials' } }), {
      status: allowed ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const dom = new JSDOM(html, {
    url: 'http://localhost:5173/login/', runScripts: 'dangerously',
    beforeParse(win) {
      Object.assign(win, {
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        fetch,
      });
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
    },
  });
  try {
    const { document, localStorage } = dom.window;
    (document.getElementById('username') as HTMLInputElement).value = 'admin@sinjal.local';
    const password = document.getElementById('password') as HTMLInputElement;
    password.value = 'correct-pass';
    const submit = () => document.getElementById('login')!.dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true }),
    );
    submit();
    await vi.waitFor(() => expect(document.getElementById('alert')!.hidden).toBe(false));
    expect(localStorage.getItem('sinjal_staff_access')).toBeNull();

    allowed = true;
    password.value = 'correct-pass';
    submit();
    await vi.waitFor(() => expect(localStorage.getItem('sinjal_staff_access')).toBe('signed-jwt'));
    expect(JSON.parse(localStorage.getItem('sinjal_session')!).user.name).toBe('Real Administrator');
    expect(JSON.parse(localStorage.getItem('sinjal_session')!).app).toBe('admin');
    expect(document.getElementById('r-dest')!.textContent).toBe('Paneli i Administrimit');
    expect(document.getElementById('view-route')!.hidden).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  } finally {
    dom.window.close();
  }
});

test('the Google callback result uses the same staff session handoff', async () => {
  const fetch = vi.fn(async (url: string) => {
    expect(url).toBe('/v1/auth/google/complete');
    return new Response(JSON.stringify({
      access_token: 'google-session-jwt',
      user: { id: 'staff-id', full_name: 'Google Staff', role: 'clerk' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const dom = new JSDOM(html, {
    url: 'http://localhost:5173/login/?google=complete', runScripts: 'dangerously',
    beforeParse(win) {
      Object.assign(win, { matchMedia: () => ({ matches: false, addEventListener() {} }), fetch });
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
    },
  });
  try {
    await vi.waitFor(() => expect(dom.window.localStorage.getItem('sinjal_staff_access')).toBe('google-session-jwt'));
    expect(JSON.parse(dom.window.localStorage.getItem('sinjal_session')!).app).toBe('staff');
    expect(dom.window.document.getElementById('r-dest')!.textContent).toBe('Paneli i punës');
    expect(dom.window.document.getElementById('view-route')!.hidden).toBe(false);
    expect(dom.window.location.search).toBe('');
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    dom.window.close();
  }
});

test.each([
  ['department_authority', 'department', 'Paneli i Departamentit'],
  ['municipal_authority', 'managerial', 'Paneli i Menaxhimit'],
  ['operative_staff', 'field', 'Aplikacioni Operativ'],
])('a real %s account enters its own panel', async (role, app, destination) => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({
    access_token: 'valid-token',
    user: { id: 'account-id', email: 'real@example.org', full_name: 'Real User', role, department_id: 'dept-id' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const dom = new JSDOM(html, {
    url: 'http://localhost:5173/login/', runScripts: 'dangerously',
    beforeParse(win) {
      Object.assign(win, { matchMedia: () => ({ matches: false, addEventListener() {} }), fetch });
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
    },
  });
  try {
    const { document } = dom.window;
    (document.getElementById('username') as HTMLInputElement).value = 'real@example.org';
    (document.getElementById('password') as HTMLInputElement).value = 'password';
    document.getElementById('login')!.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(dom.window.localStorage.getItem('sinjal_staff_access')).toBe('valid-token'));
    expect(JSON.parse(dom.window.localStorage.getItem('sinjal_session')!)).toMatchObject({
      app, user: { id: 'account-id', email: 'real@example.org', department_id: 'dept-id', roles: [role] },
    });
    expect(document.getElementById('r-dest')!.textContent).toBe(destination);
    expect(document.getElementById('alert')!.hidden).toBe(true);
  } finally { dom.window.close(); }
});
