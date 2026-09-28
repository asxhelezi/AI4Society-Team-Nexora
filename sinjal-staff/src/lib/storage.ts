/**
 * Cross-page state. Pages hand work to each other through localStorage, as
 * in the design: a KPI click on Kreu writes a filter that Raportet reads on
 * mount, a row click writes the report Raporti should open, and so on.
 * All keys live here so the contract is in one place; a later step can move
 * them to router state or a store without touching the screens.
 */
export const STORAGE_KEYS = {
  selectedReport: 'sinjal_selected_report',
  incomingFilter: 'sinjal_incoming_filter',
  reportFilter: 'sinjal_report_filter',
  caseOverrides: 'sinjal_case_overrides',
  deptFocus: 'sinjal_dept_focus',
  autoFocus: 'sinjal_auto_focus',
  hartaFocus: 'sinjal_harta_focus',
  raportetState: 'sinjal_raportet_state',
  raportetSavedFilters: 'sinjal_raportet_saved_filters',
  notifRead: 'sinjal_notif_read',
  customRules: 'sinjal_custom_rules',
  routingRules: 'sinjal_routing_rules',
  ruleChanges: 'sinjal_rule_changes',
  publications: 'sinjal_publications',
  automationDecisions: 'sinjal_automation_decisions',
  automationSettings: 'sinjal_automation_settings',
  automationConfig: 'sinjal_automation_config',
  perfRole: 'sinjal_perf_role',
  perfKpis: 'sinjal_perf_kpis',
  perfCustomIndicators: 'sinjal_perf_custom_indicators',
  perfTargets: 'sinjal_perf_targets',
  perfSchedules: 'sinjal_perf_schedules',
  perfReports: 'sinjal_perf_reports',
} as const;

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the hand-off is best-effort */
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
