import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';

/** "Nuk u gjet asnjë raportim me <code>" + a link to start a new report. */
export function GjurmoMissing({ code, instant }: { code: string; instant: boolean }) {
  return (
    <section data-reveal="1" data-revealed={instant ? '' : undefined} className="gjurmo-missing">
      <div className="gjurmo-missing__title">
        Nuk u gjet asnjë raportim me <span className="gjurmo-missing__code">{code}</span>
      </div>
      <Link to={ROUTES.raporto} className="tap citizen-action gjurmo-missing__link">
        <span>Raportim i ri</span>
        <span className="gjurmo-arrow">→</span>
      </Link>
    </section>
  );
}

/**
 * The lookup failed for another reason (offline, server error…). Not in the static page,
 * which had no network; same frame as the not-found state so the layout doesn't jump.
 */
export function GjurmoLookupError({ instant }: { instant: boolean }) {
  return (
    <section data-reveal="1" data-revealed={instant ? '' : undefined} className="gjurmo-missing" role="alert">
      <div className="gjurmo-missing__title">Diçka shkoi keq. Provo përsëri.</div>
    </section>
  );
}
