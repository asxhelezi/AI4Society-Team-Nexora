/*
 * In-browser stand-in for the backend, reproducing the static site's demo behaviour:
 * - createReport: 1 s delay, tracking code "SNJ-" + 6 random digits (raporto.html _submit).
 * - trackReport: gjurmo.html's sample dataset, plus a deterministic generated result for
 *   any other SNJ-###### code (so codes created by createReport can be tracked).
 * - listPublicReports: harta.html's demo pins.
 * - reverseGeocode / searchLocations: call the public Nominatim API directly, like
 *   raporto.html did (the backend proxies the same API).
 */
import { ARTICLE_SLUGS } from '../../lib/routes';
import { parseAlbanianDate } from '../../lib/format';
import { ApiError } from '../client';
import type { ReportsApi } from '../reports';
import type { CitizenStage, CreateReportResponse, FileKind, NominatimPlace, PublicReport, ReportStatus, TrackedReport, UploadedFile } from '../types';
import { GENERATED, MAP_PINS, TRACKED, generatedStage, type DemoTrackedReport } from './data';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const STAGE_ORDER: CitizenStage[] = ['derguar', 'verifikuar', 'ne_proces', 'perfunduar', 'refuzuar'];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** The backend status a demo stage corresponds to (inverse of citizenStage()). */
function stageToStatus(stage: CitizenStage, published: boolean): ReportStatus {
  switch (stage) {
    case 'derguar':
      return 'submitted';
    case 'verifikuar':
      return 'accepted';
    case 'ne_proces':
      return 'in_progress';
    case 'perfunduar':
      return published ? 'published' : 'resolved';
    case 'refuzuar':
      return 'rejected';
  }
}

/** gjurmo.html `_lookup` for codes outside the sample dataset. */
function generatedReport(code: string): DemoTrackedReport | null {
  if (!/^SNJ-\d{6}$/.test(code)) return null;
  const n = parseInt(code.slice(4), 10);
  const stage = generatedStage(code);
  const d = GENERATED.dates;
  const dates: DemoTrackedReport['dates'] = { derguar: d.derguar };
  if (stage !== 'derguar') dates.verifikuar = d.verifikuar;
  if (stage === 'ne_proces' || stage === 'perfunduar') dates.ne_proces = d.ne_proces;
  if (stage === 'perfunduar') dates.perfunduar = d.perfunduar;
  if (stage === 'refuzuar') dates.refuzuar = d.refuzuar;
  return {
    city: 'Elbasan',
    category: GENERATED.categories[n % GENERATED.categories.length],
    location: GENERATED.locations[n % GENERATED.locations.length],
    desc: GENERATED.desc,
    stage,
    reason: stage === 'refuzuar' ? GENERATED.rejectReason : undefined,
    dates,
  };
}

function toTrackedReport(code: string, demo: DemoTrackedReport): TrackedReport {
  const timeline: TrackedReport['timeline'] = {};
  for (const stage of STAGE_ORDER) {
    const date = demo.dates[stage];
    if (date) timeline[stage] = parseAlbanianDate(date);
  }
  const reached = STAGE_ORDER.filter((s) => timeline[s]);
  return {
    tracking_code: code,
    title: demo.location,
    category: demo.category,
    address: demo.location,
    status: stageToStatus(demo.stage, demo.article !== undefined),
    resolution_note: demo.reason ?? null,
    submitted_at: timeline.derguar ?? new Date().toISOString(),
    updated_at: timeline[reached[reached.length - 1]] ?? new Date().toISOString(),
    description: demo.desc,
    city: demo.city,
    timeline,
    article_slug: demo.article ? ARTICLE_SLUGS[demo.article - 1] : undefined,
  };
}

function pinToPublicReport(pin: (typeof MAP_PINS)[number]): PublicReport {
  const tracked = TRACKED[pin.reportId];
  const submitted = tracked?.dates.derguar ? parseAlbanianDate(tracked.dates.derguar) : new Date().toISOString();
  const resolved = pin.status === 'resolved';
  return {
    id: pin.id,
    tracking_code: pin.reportId,
    anonymous: true,
    title: pin.title,
    description: tracked?.desc ?? '',
    category: pin.category,
    address: pin.street,
    latitude: pin.lat,
    longitude: pin.lon,
    status: resolved ? 'published' : 'in_progress',
    priority: 'normal',
    department_id: null,
    department_name: null,
    zone_id: null,
    zone_name: null,
    reopened_from: null,
    resolution_note: null,
    completion_tags: null,
    public_visible: true,
    submitted_at: submitted,
    accepted_at: null,
    assigned_at: null,
    first_action_at: null,
    started_at: null,
    due_at: null,
    resolved_at: null,
    verified_at: null,
    published_at: resolved ? submitted : null,
    updated_at: submitted,
    photos: { before: pin.beforePhoto, after: pin.afterPhoto },
    article_slug: pin.article ? ARTICLE_SLUGS[pin.article - 1] : undefined,
  };
}

async function nominatim<T>(path: 'reverse' | 'search', params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  let res: Response;
  try {
    res = await fetch(`${NOMINATIM}/${path}?${qs}`, { headers: { Accept: 'application/json' }, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'Nominatim is unreachable');
  }
  if (!res.ok) throw new ApiError(res.status, 'http_error', `Nominatim ${path} failed`);
  return (await res.json()) as T;
}

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const mockReportsApi: ReportsApi = {
  async createReport(payload) {
    if (payload.anonymous === false && !payload.reporter_email?.trim()) {
      throw new ApiError(400, 'email_required', 'Reporter email is required for a non-anonymous report');
    }
    await delay(1000);
    const response: CreateReportResponse = {
      id: newId(),
      tracking_code: 'SNJ-' + String(Math.floor(100000 + Math.random() * 900000)),
      status: 'submitted',
    };
    return response;
  },

  async uploadReportPhoto(_reportId, file, _trackingCode, kind: FileKind = 'citizen_photo') {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      throw new ApiError(400, 'invalid_file_type', 'Only JPEG, PNG, WebP, and PDF files are accepted');
    }
    await delay(300);
    const uploaded: UploadedFile = {
      id: newId(),
      kind,
      original_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      created_at: new Date().toISOString(),
      url: URL.createObjectURL(file),
    };
    return uploaded;
  },

  async trackReport(code) {
    const normalized = code.trim().toUpperCase();
    const demo = TRACKED[normalized] ?? generatedReport(normalized);
    if (!demo) throw new ApiError(404, 'not_found', 'Report was not found');
    return toTrackedReport(normalized, demo);
  },

  async listPublicReports() {
    return MAP_PINS.map(pinToPublicReport);
  },

  reverseGeocode(lat, lon, signal) {
    return nominatim<NominatimPlace>('reverse', { format: 'jsonv2', lat, lon, zoom: 18, addressdetails: 1 }, signal);
  },

  searchLocations(q, limit = 5, signal) {
    return nominatim<NominatimPlace[]>('search', { format: 'jsonv2', q, limit, addressdetails: 1, countrycodes: 'al' }, signal);
  },
};
