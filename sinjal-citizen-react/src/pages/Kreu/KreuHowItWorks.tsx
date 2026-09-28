import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';

interface Step {
  number: string;
  title: string;
  text: string;
  strokeWidth: number;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Plotëso formularin',
    text: 'Përshkruaj shqetësimin, shto një foto dhe vendndodhjen.',
    strokeWidth: 1.5,
    icon: (
      <>
        <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
  },
  {
    number: '02',
    title: 'Kërkesa procesohet',
    text: 'Bashkia e Elbasanit verifikon dhe ia kalon zyrës përgjegjëse.',
    strokeWidth: 1.5,
    icon: (
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3L5.6 5.6" />
      </>
    ),
  },
  {
    number: '03',
    title: 'Problemi zgjidhet',
    text: 'Ndiq ecurinë me numrin e gjurmimit deri sa të përfundojë.',
    strokeWidth: 1.8,
    icon: <path d="M4 12.5l5 5L20 6" />,
  },
];

/** Dark "Si funksionon" band: three numbered steps and a second "Raporto tani" CTA. */
export function KreuHowItWorks() {
  return (
    <section className="kreu-how">
      <div className="kreu-how__grid" />
      <div className="kreu-how__square" />
      <div className="r-wrap r-how kreu-how__inner">
        <h2 data-reveal="0" className="kreu-heading kreu-how__title">
          Si funksionon
        </h2>
        <div className="r-steps kreu-steps">
          {STEPS.map((step, i) => (
            <div key={step.number} data-reveal={i + 1} className="kreu-step">
              <svg className="kreu-step__icon" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C23B31" strokeWidth={step.strokeWidth}>
                {step.icon}
              </svg>
              <div>
                <div className="kreu-step__number">{step.number}</div>
                <div className="kreu-step__title">{step.title}</div>
                <p className="kreu-step__text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div data-reveal="4" className="r-how-cta kreu-how__cta">
          <Link to={ROUTES.raporto} className="tap u-hover-red kreu-button">
            <span>Raporto tani</span>
            <span className="kreu-button__arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
