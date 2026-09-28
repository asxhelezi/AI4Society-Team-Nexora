import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { SUPABASE_SESSION_KEY, type ApiReport, type ApiUser, type StaffSource } from './staff';

// The publishable key is safe in the browser: every table has RLS and only
// signed-in staff with an active public.profiles row can read (see supabase/staff-access.sql).
// Only imported when both variables are set (SUPABASE_STAFF).
const client = createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: SUPABASE_SESSION_KEY },
});

interface StaffAccount { id: string; full_name: string; email: string | null; role: string; department_id: string | null }

const PAGE = 1000; // PostgREST's default max rows per request.
const BUCKET = 'report-files';
const SIGNED_URL_SECONDS = 3600;

function check<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function hasSupabaseSession(): Promise<boolean> {
  const { data } = await client.auth.getSession();
  return !!data.session;
}

export async function supabaseSignIn(email: string, password: string): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials'
    ? 'Emri i përdoruesit ose fjalëkalimi është i gabuar.' : error.message);
}

export async function supabaseSignOut(): Promise<void> {
  await client.auth.signOut();
}

export const supabaseSource: StaffSource = {
  async me() {
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) throw new Error('Nuk ka seancë stafi.');
    const account = check<StaffAccount | null>(await client.from('profiles')
      .select('id, full_name, email, role, department_id')
      .eq('id', auth.user.id).eq('active', true).maybeSingle());
    if (!account) throw new Error('Kjo llogari nuk ka qasje te stafi.');
    // The sidebar profile reads the same session record the /login/ page writes.
    window.sessionStorage.setItem('sinjal_session', JSON.stringify({
      app: 'staff', user: { id: account.id, name: account.full_name, email: account.email,
        department_id: account.department_id, roles: [account.role] },
    }));
    return { role: account.role };
  },

  async departments() {
    return check(await client.from('departments').select('id, code, name').order('name'));
  },

  async zones() {
    return check(await client.from('zones').select('name').order('name'));
  },

  async users(role) {
    let query = client.from('profiles').select('id, full_name, department_id, role').eq('active', true).order('full_name');
    if (role) query = query.eq('role', role);
    return check<ApiUser[]>(await query);
  },

  async reports() {
    const rows: ApiReport[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = check<ApiReport[]>(await client.from('staff_reports').select('*')
        .order('submitted_at', { ascending: false }).range(offset, offset + PAGE - 1));
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    return rows;
  },

  async report(id) {
    const [row, history, files] = await Promise.all([
      client.from('staff_reports').select('*').eq('id', id).maybeSingle(),
      client.from('report_status_history').select('new_status, note, created_at').eq('report_id', id).order('created_at'),
      client.from('report_files').select('kind, storage_path').eq('report_id', id).order('created_at'),
    ]);
    const report = check<ApiReport | null>(row);
    if (!report) throw new Error('Raporti nuk u gjet.');
    return {
      ...report,
      status_history: check(history),
      files: check(files).map((f) => ({ kind: f.kind as string, url: f.storage_path as string })),
    };
  },

  async photo(path) {
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    return error ? null : data.signedUrl;
  },

  async review(id, body) {
    check(await client.rpc('staff_review', { p_id: id, p_decision: body.decision, p_priority: body.priority,
      p_department_id: body.department_id ?? null, p_note: body.note ?? null }));
  },

  async assign(id, body) {
    check(await client.rpc('staff_assign', { p_id: id, p_department_id: body.department_id,
      p_assigned_to: body.assigned_to || null }));
  },

  async status(id, body) {
    check(await client.rpc('staff_set_status', { p_id: id, p_status: body.status, p_note: body.note || null }));
  },

  async publish(id) {
    check(await client.rpc('staff_publish', { p_id: id }));
  },
};
