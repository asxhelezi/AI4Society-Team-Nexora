import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format';
import { trackPath } from '../../lib/routes';
import type { SavedReport } from '../../lib/savedReports';
import { savedStatusMeta } from './savedStatus';

const CLEAR_CONFIRM = 'Të fshihet lista e raportimeve të ruajtura në këtë pajisje?';

/** One saved report: status stripe, title, "category · date", code and status badge; opens Gjurmo. */
function MiaSavedItem({ report }: { report: SavedReport }) {
  const { label, color } = savedStatusMeta(report.code);
  return (
    <Link to={trackPath(report.code)} className="tap mia-item">
      <span aria-hidden="true" className="mia-item__stripe" style={{ background: color }} />
      <span className="mia-item__text">
        <span className="mia-item__title">{report.title || 'Raportim pa titull'}</span>
        <span className="mia-item__meta">{`${report.category || 'Tjetër'} · ${formatDate(report.date)}`}</span>
        <span className="mia-item__code">{report.code}</span>
      </span>
      <span className="mia-item__badge" style={{ background: color }}>
        {label}
      </span>
    </Link>
  );
}

interface MiaSavedListProps {
  saved: SavedReport[];
  onClear: () => void;
  /** Reduced motion: render already revealed (see RaportetEMia.tsx). */
  instant: boolean;
}

/** The saved reports + "Pastro listën e ruajtur" (asks for confirmation first). */
export function MiaSavedList({ saved, onClear, instant }: MiaSavedListProps) {
  const clear = () => {
    // i18n.js translates the confirm() text.
    if (window.confirm(CLEAR_CONFIRM)) onClear();
  };

  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-mia-list mia-list">
      {saved.map((report, i) => (
        // Codes can repeat (saveReport doesn't de-duplicate), so the index is part of the key.
        <MiaSavedItem key={`${i}-${report.code}`} report={report} />
      ))}
      <button type="button" onClick={clear} className="tap mia-clear">
        Pastro listën e ruajtur
      </button>
    </div>
  );
}
