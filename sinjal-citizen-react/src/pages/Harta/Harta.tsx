import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { FOOTER_LINKS } from '../../lib/nav';
import { ROUTES } from '../../lib/routes';
import { HartaMap } from './HartaMap';
import { PIN_STATUS_META, usePublicPins, type PinStatus } from './usePublicPins';
import './Harta.css';

/** Legend order as in the static page. */
const LEGEND: PinStatus[] = ['pending', 'resolved'];

/** Harta — port of sinjal-citizen/harta.html: the map of open and resolved cases around the user. */
export function Harta() {
  useDocumentTitle('Sinjal — Harta');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 80, maxIndex: 6, threshold: 0.1, disabled: reducedMotion });
  const { pins, status } = usePublicPins();

  return (
    <PageFrame layout="fill" className="harta" innerRef={pageRef}>
      <SiteHeader variant="dark" />

      <main className="r-wrap r-main r-harta harta-main">
        <div data-reveal="0" className="r-h-intro">
          <div className="harta-eyebrow">
            <span className="harta-eyebrow__bar" />
            <span>Rreth teje</span>
          </div>
          <h1 className="harta-title">Harta e raportimeve</h1>
          <p className="harta-lead">Lejo qasjen në vendndodhje për të parë raportimet aktive pranë teje.</p>
        </div>

        <div data-reveal="1" className="r-h-map">
          <HartaMap pins={pins} pinsStatus={status} />
        </div>

        <div data-reveal="2" className="r-h-legend harta-legend">
          {LEGEND.map((s) => (
            <span key={s} className="harta-legend__item">
              <span className={`harta-legend__swatch harta-legend__swatch--${s}`} />
              {PIN_STATUS_META[s].label}
            </span>
          ))}
        </div>

        <Link to={ROUTES.raporto} data-reveal="3" className="tap u-hover-red r-h-cta harta-cta">
          <span>Raporto tani</span>
          <span className="harta-cta__arrow">→</span>
        </Link>

        <Link to={ROUTES.raportetEMia} data-reveal="4" className="tap r-h-link harta-mine">
          <span>Shiko raportet e mia</span>
          <span className="harta-mine__arrow">→</span>
        </Link>
      </main>

      <SiteFooter variant="compact" links={FOOTER_LINKS.all} />
    </PageFrame>
  );
}
