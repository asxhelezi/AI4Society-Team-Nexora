/**
 * "Raportet e mia": reports the citizen chose to remember on this device.
 * Same localStorage key and entry shape as the static site, so lists saved before the
 * migration still show up. Newest first, capped at 50.
 */

export const SAVED_REPORTS_KEY = 'sinjal_reports';
const MAX_SAVED = 50;

export interface SavedReport {
  /** Tracking code, e.g. "SNJ-482913" */
  code: string;
  title: string;
  /** Albanian category label, e.g. "Rrugë" */
  category: string;
  /** ISO timestamp of when it was submitted */
  date: string;
}

function isSavedReport(value: unknown): value is SavedReport {
  return typeof value === 'object' && value !== null && typeof (value as SavedReport).code === 'string';
}

/** All saved reports (newest first). Never throws; returns [] if storage is unavailable or corrupt. */
export function loadSavedReports(): SavedReport[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(SAVED_REPORTS_KEY) || '[]');
    return Array.isArray(list) ? list.filter(isSavedReport) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a report to the front of the list. Returns true only if it was really persisted
 * (Raporto tells the user when saving failed, e.g. in private mode or when storage is full).
 */
export function saveReport(report: SavedReport): boolean {
  try {
    const list = loadSavedReports();
    list.unshift(report);
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    return loadSavedReports().some((r) => r.code === report.code);
  } catch {
    return false;
  }
}

/** Forgets every saved report on this device. */
export function clearSavedReports(): void {
  try {
    localStorage.removeItem(SAVED_REPORTS_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}
