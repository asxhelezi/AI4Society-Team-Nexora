import { Link } from 'react-router-dom';
import { STAGE_META, citizenStage, type TrackedReport } from '../../api';
import { ROUTES, articlePath } from '../../lib/routes';
import { GjurmoTimeline } from './GjurmoTimeline';
import { buildTimeline } from './timeline';

/** The found report: code + status badge, timeline, rejection reason, details and links. */
export function GjurmoResult({ code, report, instant }: { code: string; report: TrackedReport; instant: boolean }) {
  const stage = citizenStage(report.status);
  const meta = STAGE_META[stage];
  const reason = stage === 'refuzuar' ? (report.resolution_note ?? '') : '';

  return (
    <section data-reveal="1" data-revealed={instant ? '' : undefined} className="gjurmo-result">
      <div className="gjurmo-result__head">
        <div className="gjurmo-result__code">{code}</div>
        <div className="citizen-pill gjurmo-badge" style={{ background: meta.color }}>
          {meta.label}
        </div>
      </div>

      <GjurmoTimeline steps={buildTimeline(report)} />

      {stage === 'refuzuar' && (
        <div className="gjurmo-reason">
          <div className="gjurmo-reason__label">Arsyeja e refuzimit</div>
          <p className="gjurmo-reason__text">{reason}</p>
        </div>
      )}

      <div className="gjurmo-details">
        <div className="gjurmo-details__grid">
          <div>
            <div className="gjurmo-details__label">Kategoria</div>
            <div className="gjurmo-details__value">{report.category}</div>
          </div>
          <div>
            <div className="gjurmo-details__label">Bashkia</div>
            <div className="gjurmo-details__value">{report.city ?? ''}</div>
          </div>
          <div className="gjurmo-details__wide">
            <div className="gjurmo-details__label">Vendndodhja</div>
            <div className="gjurmo-details__value">{report.address}</div>
          </div>
        </div>
        <div>
          <div className="gjurmo-details__label gjurmo-details__label--desc">Përshkrimi</div>
          <p className="gjurmo-details__desc">{report.description ?? report.title}</p>
          {report.article_slug && (
            <Link to={articlePath(report.article_slug)} className="tap citizen-action u-hover-red gjurmo-details__post">
              <span>Shiko zgjidhjen</span>
              <span className="gjurmo-arrow">→</span>
            </Link>
          )}
        </div>
        <Link to={ROUTES.raportetEMia} className="gjurmo-details__back">
          ← Te raportet e mia
        </Link>
      </div>
    </section>
  );
}
