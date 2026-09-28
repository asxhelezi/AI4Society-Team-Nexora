import { cx } from '../../lib/cx';
import type { TimelineStep } from './timeline';

/** The numbered stage steps (a column on phones, a row from 768px via .r-timeline). */
export function GjurmoTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="r-timeline gjurmo-timeline">
      {steps.map((step) => (
        <div key={step.stage} className={cx('gjurmo-step', step.tone !== 'pending' && `gjurmo-step--${step.tone}`)}>
          <div className="gjurmo-step__n">{step.n}</div>
          <div className="gjurmo-step__title">{step.title}</div>
          <div className="gjurmo-step__date">{step.date}</div>
        </div>
      ))}
    </div>
  );
}
