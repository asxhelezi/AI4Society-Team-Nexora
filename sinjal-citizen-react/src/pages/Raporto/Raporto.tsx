import { useRef } from 'react';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { FOOTER_LINKS } from '../../lib/nav';
import { RaportoDone } from './RaportoDone';
import { RaportoHead } from './RaportoHead';
import { StepCategory } from './StepCategory';
import { StepDetails } from './StepDetails';
import { StepLocation } from './StepLocation';
import { StepReview } from './StepReview';
import { useReportForm } from './useReportForm';
import './Raporto.css';

/**
 * Raporto — port of sinjal-citizen/raporto.html: the 4-step report form (category →
 * location → details → review & send) and the success screen with the tracking code.
 */
export function Raporto() {
  useDocumentTitle('Sinjal — Raporto');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 110, threshold: 0.1, disabled: reducedMotion });

  const form = useReportForm();
  const { state, instant } = form;

  return (
    <PageFrame layout="fill" className="raporto" innerRef={pageRef}>
      <SiteHeader variant="dark" />

      <main className="r-wrap r-main r-rap raporto-main">
        {state.done ? (
          <RaportoDone instant={instant} code={state.code} notifyEmail={state.notify ? state.email : null} saveDevice={state.saveDevice} savedOk={state.savedOk} onReset={form.reset} />
        ) : (
          <>
            <RaportoHead step={state.step} instant={instant} onBack={() => form.goStep((state.step - 1) as 1 | 2 | 3)} />
            {state.step === 1 && (
              <StepCategory
                instant={instant}
                category={state.category}
                subcategory={state.subcategory}
                error={state.categoryError}
                onPick={form.pickCategory}
                onPickSub={form.pickSubcategory}
                onOtherText={form.setOtherText}
                onNext={form.nextFromCategory}
              />
            )}
            {state.step === 2 && <StepLocation form={form} />}
            {state.step === 3 && <StepDetails form={form} />}
            {state.step === 4 && <StepReview form={form} />}
          </>
        )}
      </main>

      <SiteFooter variant="compact" links={FOOTER_LINKS.raporto} />
    </PageFrame>
  );
}
