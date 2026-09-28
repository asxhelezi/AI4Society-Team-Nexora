/**
 * Cloudflare Turnstile token for POST /v1/reports.
 *
 * TODO(turnstile): render the Turnstile widget on step 4 (site key from an env var, e.g.
 * VITE_TURNSTILE_SITE_KEY) and return the token it issues. Until then this returns '' and
 * the backend skips verification when it has no Turnstile secret configured.
 */
export function useTurnstileToken(): string {
  return '';
}
