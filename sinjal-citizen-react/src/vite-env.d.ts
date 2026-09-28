/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. http://localhost:8000 */
  readonly VITE_API_URL?: string;
  /** "false" to use the real backend; anything else (or unset) uses the mocks. */
  readonly VITE_USE_MOCKS?: string;
  /** Supabase project URL, e.g. https://xxxx.supabase.co. When set with the key, the app uses Supabase. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Safe in the browser; RLS enforces access. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
