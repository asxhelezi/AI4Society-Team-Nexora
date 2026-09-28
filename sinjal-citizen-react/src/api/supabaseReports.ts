/*
 * The citizen API on Supabase (no application server). The database functions it calls
 * are in supabase/migrations: create_report, register_report_photo, track_report and
 * list_public_reports. Citizens are never signed in; the publishable key only lets them
 * call those functions and upload photos to a report they just created.
 */
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { ApiError } from './client';
import { mockReportsApi } from './mock/reportsMock';
import type { ReportsApi } from './reports';
import type { CreateReportResponse, PublicReport, TrackedReport, UploadedFile } from './types';

export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
/** Supabase is used whenever it is configured; VITE_USE_MOCKS only applies without it. */
export const USE_SUPABASE: boolean = !!SUPABASE_URL && !!SUPABASE_KEY;

const BUCKET = 'report-photos';
const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const supabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

function db() {
  if (!supabase) throw new ApiError(0, 'network_error', 'Supabase is not configured');
  return supabase;
}

/** Database errors are raised as "code: message" (see the migration); keep the code. */
function toApiError(error: PostgrestError | { message: string; statusCode?: string | number }): ApiError {
  const [code, ...rest] = error.message.split(':');
  const known = /^[a-z_]+$/.test(code.trim());
  const status = Number((error as { statusCode?: string | number }).statusCode) || (code.trim() === 'not_found' ? 404 : 400);
  return new ApiError(status, known ? code.trim() : 'http_error', known && rest.length ? rest.join(':').trim() : error.message);
}

function extensionOf(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[file.type] ?? 'bin';
}

export const supabaseReportsApi: ReportsApi = {
  async createReport(payload) {
    if (payload.anonymous === false && !payload.reporter_email?.trim()) {
      throw new ApiError(400, 'email_required', 'Reporter email is required for a non-anonymous report');
    }
    const { turnstile_token: _unused, ...body } = payload;
    const { data, error } = await db().rpc('create_report', { payload: body });
    if (error) throw toApiError(error);
    return data as CreateReportResponse;
  },

  async uploadReportPhoto(reportId, file, trackingCode) {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      throw new ApiError(400, 'invalid_file_type', 'Only JPEG, PNG, WebP, and PDF files are accepted');
    }
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'file_too_large', 'Files must be 10 MB or smaller');
    const path = `${reportId}/${crypto.randomUUID()}.${extensionOf(file)}`;
    const upload = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw toApiError(upload.error);
    const { data, error } = await db().rpc('register_report_photo', {
      p_report_id: reportId,
      p_tracking_code: trackingCode,
      p_path: path,
      p_name: file.name,
      p_content_type: file.type,
      p_size: file.size,
    });
    if (error) throw toApiError(error);
    return data as UploadedFile;
  },

  async trackReport(code) {
    const { data, error } = await db().rpc('track_report', { p_code: code.trim().toUpperCase() });
    if (error) throw toApiError(error);
    if (!data) throw new ApiError(404, 'not_found', 'Report was not found');
    return data as TrackedReport;
  },

  async listPublicReports() {
    const { data, error } = await db().rpc('list_public_reports');
    if (error) throw toApiError(error);
    const items = (data ?? []) as PublicReport[];
    // Photos are stored privately; the database returns their paths and only lets the
    // public read photos of reports that are on the map. Turn them into signed URLs.
    const paths = [...new Set(items.flatMap((r) => [r.photos?.before, r.photos?.after]).filter((p): p is string => !!p))];
    if (paths.length) {
      const signed = await db()
        .storage.from(BUCKET)
        .createSignedUrls(paths, 60 * 60);
      const urls = new Map((signed.data ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
      for (const item of items) {
        if (!item.photos) continue;
        const { before, after } = item.photos;
        item.photos = { before: (before && urls.get(before)) || undefined, after: (after && urls.get(after)) || undefined };
      }
    }
    return items;
  },

  // Address lookups go straight to Nominatim, as the static site did.
  reverseGeocode: mockReportsApi.reverseGeocode,
  searchLocations: mockReportsApi.searchLocations,
};
