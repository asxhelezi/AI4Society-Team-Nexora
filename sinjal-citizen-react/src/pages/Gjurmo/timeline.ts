import { STAGE_META, citizenStage, type CitizenStage, type TrackedReport } from '../../api';
import { formatDate } from '../../lib/format';

/** How a timeline step is drawn: grey (not reached), red (reached), green (done), brown (rejected). */
export type StepTone = 'pending' | 'active' | 'resolved' | 'rejected';

export interface TimelineStep {
  stage: CitizenStage;
  /** "01", "02", … */
  n: string;
  /** Albanian stage label ("Dërguar") */
  title: string;
  /** "19 Mars 2026", or "—" when the stage hasn't been reached / has no date */
  date: string;
  tone: StepTone;
}

const NORMAL_ORDER: CitizenStage[] = ['derguar', 'verifikuar', 'ne_proces', 'perfunduar'];
const REJECTED_ORDER: CitizenStage[] = ['derguar', 'verifikuar', 'refuzuar'];
const RANK: Record<CitizenStage, number> = { derguar: 1, verifikuar: 2, ne_proces: 3, perfunduar: 4, refuzuar: 3 };

/**
 * The date each stage was reached. The mocks send `timeline` (a frontend extension); the
 * real backend doesn't yet, so fall back to submitted_at for "Dërguar" and updated_at for
 * the current stage.
 */
function stageDates(report: TrackedReport, current: CitizenStage): Partial<Record<CitizenStage, string>> {
  if (report.timeline) return report.timeline;
  return { derguar: report.submitted_at, [current]: current === 'derguar' ? report.submitted_at : report.updated_at };
}

/** gjurmo.html `_buildSteps`: four steps (or three, ending in "Refuzuar", for a rejected report). */
export function buildTimeline(report: TrackedReport): TimelineStep[] {
  const current = citizenStage(report.status);
  const dates = stageDates(report, current);
  const order = current === 'refuzuar' ? REJECTED_ORDER : NORMAL_ORDER;
  return order.map((stage, i) => {
    const done = RANK[stage] <= RANK[current];
    let tone: StepTone = 'pending';
    if (done) tone = stage === 'perfunduar' ? 'resolved' : stage === 'refuzuar' ? 'rejected' : 'active';
    return { stage, n: `0${i + 1}`, title: STAGE_META[stage].label, date: formatDate(dates[stage]) || '—', tone };
  });
}
