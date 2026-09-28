import { useRef } from 'react';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { KreuHero } from './KreuHero';
import { KreuHowItWorks } from './KreuHowItWorks';
import { KreuSolved } from './KreuSolved';
import { KreuTrack } from './KreuTrack';
import './Kreu.css';

/** Kreu (home) — port of sinjal-citizen/index.html. The reference port: see README. */
export function Kreu() {
  useDocumentTitle('Sinjal — Kreu');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 80, maxIndex: 6, threshold: 0.15, rootMargin: '0px 0px -8% 0px', disabled: reducedMotion });

  return (
    <PageFrame layout="flow" className="kreu" innerRef={pageRef}>
      <SiteHeader variant="hero" />
      <KreuHero reducedMotion={reducedMotion} />
      <KreuSolved reducedMotion={reducedMotion} />
      <KreuHowItWorks />
      <KreuTrack />
      <SiteFooter variant="full" />
    </PageFrame>
  );
}
