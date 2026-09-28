/*
 * Types for the Sinjal FastAPI backend (backend/app/routers/public.py, files.py,
 * schemas.py). Field names are the backend's snake_case, unchanged. Timestamps are ISO
 * 8601 strings.
 *
 * Fields marked "frontend extension" are NOT returned by the backend today: only the mocks
 * fill them in (they carry demo content the static site had). Pages must treat them as
 * optional and degrade gracefully when they're missing.
 */

/** reports.status CHECK constraint (migrations/001_initial.sql). */
export type ReportStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'assigned' | 'in_progress' | 'blocked' | 'resolved' | 'published';

/**
 * The five stages the citizen UI shows (Gjurmo timeline, badges on Raportet e mia).
 * Use `citizenStage()` from ./status to map a backend status to one of these.
 */
export type CitizenStage = 'derguar' | 'verifikuar' | 'ne_proces' | 'perfunduar' | 'refuzuar';

/** POST /v1/reports body (schemas.ReportCreate). */
export interface ReportCreate {
  /** Default true. When false, reporter_email is required. */
  anonymous?: boolean;
  reporter_email?: string;
  /** 1–160 chars */
  title: string;
  /** 1–5000 chars */
  description: string;
  /** 1–120 chars — the Albanian category label, e.g. "Rrugë" */
  category: string;
  /** Up to 160 chars. One of the category's subcategories, or free text for "Tjetër". */
  subcategory?: string;
  /** 1–300 chars */
  address: string;
  latitude: number;
  longitude: number;
  zone_code?: string;
  /** Cloudflare Turnstile token (verification is skipped when the backend has no secret). */
  turnstile_token?: string;
}

/** POST /v1/reports → 201 */
export interface CreateReportResponse {
  id: string;
  /** e.g. "SNJ-3F9A0C12B7E4" from the backend; the mocks generate "SNJ-" + 6 digits like the static site. */
  tracking_code: string;
  status: ReportStatus;
}

/** GET /v1/reports/track/{code} */
export interface TrackedReport {
  tracking_code: string;
  title: string;
  category: string;
  address: string;
  status: ReportStatus;
  /** Also carries the rejection reason for rejected reports. */
  resolution_note: string | null;
  submitted_at: string;
  updated_at: string;

  /** Frontend extension: longer description of the problem. */
  description?: string;
  /** Frontend extension: city/municipality name ("Elbasan"). */
  city?: string;
  /** Frontend extension: date (ISO) each citizen stage was reached. */
  timeline?: Partial<Record<CitizenStage, string>>;
  /** Frontend extension: slug of the published write-up in the Bulletini, if any. */
  article_slug?: string;
}

/** One item of GET /v1/public/reports → { items: PublicReport[] } */
export interface PublicReport {
  id: string;
  tracking_code: string;
  anonymous: boolean;
  title: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department_id: string | null;
  department_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  reopened_from: string | null;
  resolution_note: string | null;
  completion_tags: unknown;
  public_visible: boolean;
  submitted_at: string;
  accepted_at: string | null;
  assigned_at: string | null;
  first_action_at: string | null;
  started_at: string | null;
  due_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  published_at: string | null;
  updated_at: string;

  /** Frontend extension: photo URLs for the map card (before = as reported, after = fixed). */
  photos?: { before?: string; after?: string };
  /** Frontend extension: slug of the published write-up in the Bulletini, if any. */
  article_slug?: string;
}

export interface PublicReportList {
  items: PublicReport[];
}

/** Upload `kind` query parameter (files.py allowed_kinds). Citizens may only send citizen_photo. */
export type FileKind = 'citizen_photo' | 'before_photo' | 'after_photo' | 'attachment';

/** POST /v1/reports/{id}/files → 201 */
export interface UploadedFile {
  id: string;
  kind: FileKind;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  /** Relative API path, e.g. "/v1/files/<id>" (needs the X-Tracking-Code header to download). */
  url: string;
}

/** Nominatim jsonv2 address details (subset — Nominatim returns many optional keys). */
export interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  [key: string]: string | undefined;
}

/** One Nominatim jsonv2 place (GET /v1/map/reverse returns one, /v1/map/search an array). */
export interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  category?: string;
  type?: string;
  importance?: number;
  address?: NominatimAddress;
  boundingbox?: [string, string, string, string];
}

/** Error body of every backend error (main.py exception handlers): { error: ApiErrorBody } */
export interface ApiErrorBody {
  /** e.g. "not_found", "rate_limited", "invalid_request", "captcha_failed", "photo_limit" */
  code: string;
  message: string;
  /** Pydantic validation errors for code "invalid_request". */
  details?: unknown;
}
