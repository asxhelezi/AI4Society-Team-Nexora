import { cx } from '../../lib/cx';
import { STEP_HEADINGS, STEP_NAMES, type Step } from './data';

interface RaportoHeadProps {
  step: Step;
  /** Render as already revealed (after the first step change). */
  instant: boolean;
  onBack: () => void;
}

/** Eyebrow, step heading, 4-segment progress bar, "Hapi n nga 4" and the back button. */
export function RaportoHead({ step, instant, onBack }: RaportoHeadProps) {
  return (
    <div data-reveal="0" data-revealed={instant ? '' : undefined} className="r-rap-head">
      <div className="raporto-eyebrow">
        <span className="raporto-eyebrow__bar" />
        <span>Raportim i ri</span>
      </div>
      <h1 className="raporto-head__title">{STEP_HEADINGS[step]}</h1>
      <div className="raporto-progress">
        {([1, 2, 3, 4] as const).map((n) => (
          <span key={n} aria-hidden="true" className={cx('raporto-progress__seg', n < step && 'raporto-progress__seg--done', n === step && 'raporto-progress__seg--current')} />
        ))}
      </div>
      <div className="raporto-head__step">{`Hapi ${step} nga 4 · ${STEP_NAMES[step]}`}</div>
      {step > 1 && (
        <button type="button" onClick={onBack} className="tap raporto-back">
          <span className="raporto-arrow">←</span>
          <span>Mbrapa</span>
        </button>
      )}
    </div>
  );
}
