import { useEffect, useState } from 'react';
import { isApiError, trackReport, type TrackedReport } from '../../api';

export type TrackLookup =
  | { kind: 'found'; code: string; report: TrackedReport }
  /** No report with this code (404 not_found, or a code the backend rejects as malformed). */
  | { kind: 'missing'; code: string }
  /** Anything else: offline, server error, rate limited… */
  | { kind: 'error'; code: string };

function isMissing(err: unknown): boolean {
  return isApiError(err) && (err.code === 'not_found' || err.status === 404 || err.code === 'invalid_request');
}

/**
 * Looks `code` up with trackReport(). Returns null while `code` is empty. When the code
 * changes, the previous outcome stays on screen until the new one arrives (the static page
 * was synchronous, so it never flashed an empty state between two lookups).
 */
export function useTrackLookup(code: string): TrackLookup | null {
  const [lookup, setLookup] = useState<TrackLookup | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    trackReport(code).then(
      (report) => {
        if (!cancelled) setLookup({ kind: 'found', code, report });
      },
      (err: unknown) => {
        if (cancelled) return;
        if (!isMissing(err)) console.error('trackReport failed', err);
        setLookup({ kind: isMissing(err) ? 'missing' : 'error', code });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  return code ? lookup : null;
}
