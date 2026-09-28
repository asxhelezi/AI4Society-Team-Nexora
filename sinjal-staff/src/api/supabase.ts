import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Supabase replaces the FastAPI staff API when it is configured (never in unit tests). */
export const USE_SUPABASE = !!URL && !!KEY && import.meta.env.MODE !== 'test';

/** Where supabase-js keeps the staff session. The login page hands tokens over (see restoreSession). */
export const AUTH_STORAGE_KEY = 'sinjal_supabase_auth';
/** Set by the login page: "0" when "Më mbaj të kyçur" was unticked, so the session lasts one tab. */
const REMEMBER_KEY = 'sinjal_remember';

function sessionStore(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === '0' ? window.sessionStorage : window.localStorage;
  } catch { return undefined; }
}

export const supabase: SupabaseClient | null = USE_SUPABASE
  ? createClient(URL, KEY, {
    auth: { storageKey: AUTH_STORAGE_KEY, storage: sessionStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  : null;

export function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase nuk është konfiguruar.');
  return supabase;
}

/** Database errors are raised as "code: message" by the staff_* functions. Show the message. */
export function dbError(error: { message: string }): Error {
  const [code, ...rest] = error.message.split(':');
  if (code.trim() === 'forbidden') return new Error('Kjo llogari nuk ka të drejtë për këtë veprim.');
  return new Error(/^[a-z_]+$/.test(code.trim()) && rest.length ? rest.join(':').trim() : error.message);
}
