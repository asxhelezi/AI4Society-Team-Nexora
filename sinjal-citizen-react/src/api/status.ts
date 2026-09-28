import type { CitizenStage, ReportStatus } from './types';

/** Backend status → the stage a citizen sees. */
export function citizenStage(status: ReportStatus): CitizenStage {
  switch (status) {
    case 'submitted':
      return 'derguar';
    case 'under_review':
    case 'accepted':
      return 'verifikuar';
    case 'assigned':
    case 'in_progress':
    case 'blocked':
      return 'ne_proces';
    case 'resolved':
    case 'published':
      return 'perfunduar';
    case 'rejected':
      return 'refuzuar';
  }
}

/** Albanian label + badge colour per stage (same values as the static Gjurmo / Raportet e mia pages). */
export const STAGE_META: Record<CitizenStage, { label: string; color: string }> = {
  derguar: { label: 'Dërguar', color: '#B8B2A9' },
  verifikuar: { label: 'Verifikuar', color: '#6B665F' },
  ne_proces: { label: 'Në proces', color: '#C23B31' },
  perfunduar: { label: 'Përfunduar', color: '#2E7D4F' },
  refuzuar: { label: 'Refuzuar', color: '#8B5E34' },
};
