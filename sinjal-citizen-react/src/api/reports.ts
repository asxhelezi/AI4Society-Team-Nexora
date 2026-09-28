/*
 * The citizen-side API. Pages import these functions and nothing else — no fetch() or
 * localStorage "databases" in page code. Whether they hit the real backend or the
 * in-browser mocks is decided once, by VITE_USE_MOCKS (see client.ts).
 */
import { USE_MOCKS, apiRequest } from './client';
import { mockReportsApi } from './mock/reportsMock';
import type { CreateReportResponse, FileKind, NominatimPlace, PublicReport, PublicReportList, ReportCreate, TrackedReport, UploadedFile } from './types';

export interface ReportsApi {
  createReport(payload: ReportCreate): Promise<CreateReportResponse>;
  uploadReportPhoto(reportId: string, file: File, trackingCode: string, kind?: FileKind): Promise<UploadedFile>;
  trackReport(code: string): Promise<TrackedReport>;
  listPublicReports(): Promise<PublicReport[]>;
  reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<NominatimPlace>;
  searchLocations(q: string, limit?: number, signal?: AbortSignal): Promise<NominatimPlace[]>;
}

const httpReportsApi: ReportsApi = {
  createReport(payload) {
    return apiRequest<CreateReportResponse>('/v1/reports', { method: 'POST', body: payload });
  },

  uploadReportPhoto(reportId, file, trackingCode, kind = 'citizen_photo') {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<UploadedFile>(`/v1/reports/${encodeURIComponent(reportId)}/files`, {
      method: 'POST',
      query: { kind },
      body: form,
      headers: { 'X-Tracking-Code': trackingCode },
    });
  },

  trackReport(code) {
    return apiRequest<TrackedReport>(`/v1/reports/track/${encodeURIComponent(code.trim().toUpperCase())}`);
  },

  async listPublicReports() {
    const { items } = await apiRequest<PublicReportList>('/v1/public/reports');
    return items;
  },

  reverseGeocode(lat, lon, signal) {
    return apiRequest<NominatimPlace>('/v1/map/reverse', { query: { lat, lon }, signal });
  },

  searchLocations(q, limit = 5, signal) {
    return apiRequest<NominatimPlace[]>('/v1/map/search', { query: { q, limit }, signal });
  },
};

const api: ReportsApi = USE_MOCKS ? mockReportsApi : httpReportsApi;

/** Submit a new report. Returns its id and tracking code. */
export const createReport = (payload: ReportCreate) => api.createReport(payload);

/**
 * Attach a photo to a report just created. `trackingCode` authorises the anonymous
 * upload (sent as X-Tracking-Code). Max 10 citizen photos per report; JPEG/PNG/WebP/PDF.
 */
export const uploadReportPhoto = (reportId: string, file: File, trackingCode: string) => api.uploadReportPhoto(reportId, file, trackingCode);

/** Look a report up by tracking code. Rejects with ApiError code "not_found" (404) for unknown codes. */
export const trackReport = (code: string) => api.trackReport(code);

/** Published reports for the public map. */
export const listPublicReports = () => api.listPublicReports();

/** Address for a point (Nominatim reverse, jsonv2). Use `.display_name` for a one-line address. */
export const reverseGeocode = (lat: number, lon: number, signal?: AbortSignal) => api.reverseGeocode(lat, lon, signal);

/** Address search, limited to Albania (Nominatim search, jsonv2). `q` must be ≥ 2 chars. */
export const searchLocations = (q: string, limit?: number, signal?: AbortSignal) => api.searchLocations(q, limit, signal);
