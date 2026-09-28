import { STAGE_META, type CitizenStage } from '../../api';

/**
 * The status badge shown for a saved report — raportet-e-mia.html `_statusFor`, kept
 * as-is for parity: a hash of the number in the code, NOT the report's real status.
 *
 * TODO(backend): once the real backend is live, look each saved code up with
 * trackReport(code) from src/api and use citizenStage(report.status) instead. Today this
 * can disagree with what Gjurmo shows for the same code: Gjurmo uses the demo dataset
 * for known codes (e.g. SNJ-204817 is "Përfunduar" there, "Në proces" here).
 */
export function savedStage(code: string): CitizenStage {
  const n = parseInt((code.match(/\d+/) || ['0'])[0], 10) || 0;
  const idx = n % 9;
  if (idx <= 1) return 'derguar';
  if (idx <= 3) return 'verifikuar';
  if (idx <= 6) return 'ne_proces';
  if (idx === 7) return 'refuzuar';
  return 'perfunduar';
}

export function savedStatusMeta(code: string): { label: string; color: string } {
  return STAGE_META[savedStage(code)];
}
