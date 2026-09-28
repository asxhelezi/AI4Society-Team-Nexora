/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. http://localhost:8000 */
  readonly VITE_API_URL?: string;
  /** "false" to use the real backend; anything else (or unset) uses the mocks. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
