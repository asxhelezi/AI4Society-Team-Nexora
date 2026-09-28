import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';

/** Nothing saved on this device yet. */
export function MiaEmpty({ instant }: { instant: boolean }) {
  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-mia-list r-mia-empty mia-empty">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A847C" strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 10h8M8 14h5" />
      </svg>
      <p className="mia-empty__text">Nuk ke asnjë raportim të ruajtur në këtë pajisje. Aktivizo "Ruaje raportimin në këtë pajisje" herën tjetër kur raporton.</p>
      <Link to={ROUTES.raporto} className="tap u-hover-red mia-empty__cta">
        <span>Fillo një raportim</span>
        <span className="mia-arrow">→</span>
      </Link>
    </div>
  );
}
