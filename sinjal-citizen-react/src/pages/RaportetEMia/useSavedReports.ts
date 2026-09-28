import { useCallback, useEffect, useState } from 'react';
import { clearSavedReports, loadSavedReports, type SavedReport } from '../../lib/savedReports';

/**
 * The reports saved on this device. Re-read whenever the tab regains focus, is shown again
 * (bfcache) or becomes visible, like the static page did, so a report saved in another
 * tab shows up without a reload.
 */
export function useSavedReports(): { saved: SavedReport[]; clear: () => void } {
  const [saved, setSaved] = useState<SavedReport[]>(loadSavedReports);

  useEffect(() => {
    const reload = () => setSaved(loadSavedReports());
    window.addEventListener('focus', reload);
    window.addEventListener('pageshow', reload);
    document.addEventListener('visibilitychange', reload);
    return () => {
      window.removeEventListener('focus', reload);
      window.removeEventListener('pageshow', reload);
      document.removeEventListener('visibilitychange', reload);
    };
  }, []);

  const clear = useCallback(() => {
    clearSavedReports();
    setSaved([]);
  }, []);

  return { saved, clear };
}
