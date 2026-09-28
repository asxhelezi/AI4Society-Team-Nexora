import { useRef } from 'react';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { FOOTER_LINKS } from '../../lib/nav';
import { MiaEmpty } from './MiaEmpty';
import { MiaSavedList } from './MiaSavedList';
import { MiaTrack } from './MiaTrack';
import { useSavedReports } from './useSavedReports';
import './RaportetEMia.css';

/** Raportet e mia (the reports saved on this device) — port of sinjal-citizen/raportet-e-mia.html. */
export function RaportetEMia() {
  useDocumentTitle('Sinjal — Raportet e mia');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const { saved, clear } = useSavedReports();
  const hasSaved = saved.length > 0;
  // rescanKey: after "Pastro listën" the empty state is a new [data-reveal] element.
  // With reduced motion the sections render already revealed (data-revealed): useReveal marks
  // them in a passive effect, which can run after the first paint and then fades them in
  // over 0.7 s. The static page showed them at once.
  useReveal(pageRef, { stepMs: 100, threshold: 0.1, disabled: reducedMotion, rescanKey: hasSaved });

  return (
    <PageFrame layout="fill" className="mia" innerRef={pageRef}>
      <SiteHeader variant="dark" />
      <main className="r-wrap r-main r-mia mia-main">
        <div data-reveal="0" data-revealed={reducedMotion ? '' : undefined} className="r-mia-head">
          <div className="mia-eyebrow">
            <span className="mia-eyebrow__bar" />
            <span>Ruajtur në këtë pajisje</span>
          </div>
          <h1 className="mia-title">Raportet e mia</h1>
        </div>
        {hasSaved ? <MiaSavedList key="list" saved={saved} onClear={clear} instant={reducedMotion} /> : <MiaEmpty key="empty" instant={reducedMotion} />}
        <MiaTrack instant={reducedMotion} />
      </main>
      <SiteFooter variant="compact" links={FOOTER_LINKS.raportetEMia} />
    </PageFrame>
  );
}
