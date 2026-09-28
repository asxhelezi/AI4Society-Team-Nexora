import { useEffect, useState } from 'react';
import { citizenStage, listPublicReports, type PublicReport } from '../../api';
import { articlePath, trackPath } from '../../lib/routes';

/** The two pin colours of the map and its legend. */
export type PinStatus = 'resolved' | 'pending';

export const PIN_STATUS_META: Record<PinStatus, { color: string; label: string }> = {
  resolved: { color: '#3EB489', label: 'Zgjidhur' },
  pending: { color: '#FFDD00', label: 'Në pritje' },
};

/** One map pin, in the shape harta.html's HARTA_PINS had. */
export interface HartaPin {
  id: string;
  lat: number;
  lon: number;
  street: string;
  title: string;
  category: string;
  reportId: string;
  status: PinStatus;
  beforePhoto?: string;
  afterPhoto?: string;
  /** Resolved cases with a write-up open it in the Bulletini; everything else opens tracking. */
  link: string;
  linkText: 'Lexo më shumë →' | 'Gjurmo këtë raportim →';
}

export function toHartaPin(r: PublicReport): HartaPin {
  const status: PinStatus = citizenStage(r.status) === 'perfunduar' ? 'resolved' : 'pending';
  const article = status === 'resolved' && r.article_slug;
  return {
    id: r.id,
    lat: r.latitude,
    lon: r.longitude,
    street: r.address,
    title: r.title,
    category: r.category,
    reportId: r.tracking_code,
    status,
    beforePhoto: r.photos?.before,
    afterPhoto: r.photos?.after,
    link: article ? articlePath(article) : trackPath(r.tracking_code),
    linkText: article ? 'Lexo më shumë →' : 'Gjurmo këtë raportim →',
  };
}

export type PinsStatus = 'loading' | 'ready' | 'error';

/** Published reports for the map, via the API layer (mocks: harta.html's 10 demo pins). */
export function usePublicPins(): { pins: HartaPin[]; status: PinsStatus } {
  const [state, setState] = useState<{ pins: HartaPin[]; status: PinsStatus }>({ pins: [], status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listPublicReports().then(
      (reports) => !cancelled && setState({ pins: reports.map(toHartaPin), status: 'ready' }),
      () => !cancelled && setState({ pins: [], status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
