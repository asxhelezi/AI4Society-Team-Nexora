import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { cx } from '../../lib/cx';
import { FOOTER_LINKS } from '../../lib/nav';
import { GjurmoLookupError, GjurmoMissing } from './GjurmoMissing';
import { GjurmoResult } from './GjurmoResult';
import { GjurmoSearch } from './GjurmoSearch';
import { useTrackLookup } from './useTrackLookup';
import './Gjurmo.css';

/**
 * Gjurmo (track a report) — port of sinjal-citizen/gjurmo.html. /gjurmo?id=SNJ-204817
 * pre-fills the field and looks the code up straight away.
 */
export function Gjurmo() {
  useDocumentTitle('Sinjal — Gjurmo');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);

  // The submitted code lives in the URL (?id=), like the static page's history.replaceState.
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = (searchParams.get('id') ?? '').toUpperCase();
  const code = idParam.trim();

  // The field starts from ?id= and follows it when the URL changes from outside
  // (e.g. a link to another code), but keeps what the user typed otherwise.
  const [query, setQuery] = useState(idParam);
  const [syncedParam, setSyncedParam] = useState(idParam);
  if (idParam !== syncedParam) {
    setSyncedParam(idParam);
    setQuery(idParam);
  }

  const lookup = useTrackLookup(code);
  // With reduced motion the result renders already revealed (instant): useReveal marks it in a
  // passive effect, which runs after the async lookup has painted, so it would fade in anyway.
  useReveal(pageRef, { stepMs: 110, threshold: 0.1, disabled: reducedMotion, rescanKey: lookup?.kind });

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    setSyncedParam(q);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', q);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <PageFrame layout="fill" className="gjurmo" innerRef={pageRef}>
      <SiteHeader variant="dark" />
      <main className={cx('r-wrap r-main r-narrow gjurmo-main', !code && 'gjurmo-main--centered')}>
        <GjurmoSearch query={query} onQueryChange={setQuery} onSubmit={submit} />
        {/* Keyed by outcome: switching found ↔ not found remounts the section, so it fades in again (as in the static page). */}
        {lookup?.kind === 'found' && <GjurmoResult key="found" code={lookup.code} report={lookup.report} instant={reducedMotion} />}
        {lookup?.kind === 'missing' && <GjurmoMissing key="missing" code={lookup.code} instant={reducedMotion} />}
        {lookup?.kind === 'error' && <GjurmoLookupError key="error" instant={reducedMotion} />}
      </main>
      <SiteFooter variant="compact" links={FOOTER_LINKS.all} />
    </PageFrame>
  );
}
