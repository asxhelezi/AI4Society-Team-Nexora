import type { ApiErrorBody } from './types';

/** Backend base URL, e.g. "http://localhost:8000" (empty = same origin). */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Mocks are on unless VITE_USE_MOCKS is exactly "false". */
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS !== 'false';

/**
 * Any failed API call. `code` is the backend's machine-readable code ("not_found",
 * "rate_limited", "invalid_request"…), or one of:
 *   "network_error"  the request never got a response (offline, CORS, server down)
 *   "http_error"     a non-2xx response without the usual { error } body
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Query parameters; undefined values are skipped. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON-serialised unless it's FormData (then sent as multipart). */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // not JSON
  }
  const body = (payload as { error?: Partial<ApiErrorBody> } | null)?.error;
  if (body && typeof body.code === 'string') {
    return new ApiError(res.status, body.code, body.message ?? res.statusText, body.details);
  }
  return new ApiError(res.status, 'http_error', res.statusText || `HTTP ${res.status}`);
}

/** fetch() wrapper for the Sinjal API: JSON in/out, errors thrown as ApiError. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, headers = {}, signal } = options;
  const init: RequestInit = { method, headers: { Accept: 'application/json', ...headers }, signal };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network error');
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
