import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { ROUTES, trackPath } from '../../lib/routes';
import { STATUS_LABELS } from './data';

interface RaportoDoneProps {
  instant: boolean;
  code: string;
  /** Email the updates go to, or null when the report is anonymous. */
  notifyEmail: string | null;
  saveDevice: boolean;
  savedOk: boolean;
  onReset: () => void;
}

/** How long "U kopjua" stays on the copy button. */
const COPIED_MS = 2000;

/** Success screen: tracking code with copy button, save/notify notes, status strip and next actions. */
export function RaportoDone({ instant, code, notifyEmail, saveDevice, savedOk, onReset }: RaportoDoneProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {
      /* clipboard blocked: the code is still on screen */
    });
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-rap-done raporto-done">
      <div className="raporto-done__banner">
        <span aria-hidden="true" className="raporto-done__check">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="2.6">
            <path d="M4 12.5l5 5L20 6" />
          </svg>
        </span>
        <div>
          <h2 className="raporto-done__title">Raportimi u dërgua</h2>
          <p className="raporto-done__lead">Sinjali juaj u mor.</p>
        </div>
      </div>

      <div className="raporto-done__section">
        <span className="raporto-caption">Numri i gjurmimit</span>
        <div className="raporto-code">
          <div className="raporto-code__value">{code}</div>
          <button type="button" onClick={onCopy} className={cx('tap raporto-code__copy', copied ? 'raporto-code__copy--copied' : 'u-hover-ink')}>
            {copied ? 'U kopjua' : 'Kopjo'}
          </button>
        </div>
        {notifyEmail !== null && (
          <span className="raporto-done__note">
            {'Njoftimet shkojnë te '}
            <span className="raporto-done__email">{notifyEmail}</span>
          </span>
        )}
        {savedOk && (
          <span className="raporto-done__note">
            {'U ruajt edhe në këtë pajisje — shikoje te '}
            <Link to={ROUTES.raportetEMia} className="raporto-done__link">
              Raportet e mia
            </Link>
            .
          </span>
        )}
        {saveDevice && !savedOk && <span className="raporto-done__note">Nuk u ruajt dot në këtë pajisje — shënoje numrin e gjurmimit diku, sepse s'do ta shohësh te Raportet e mia.</span>}
      </div>

      <div className="raporto-done__section">
        <span className="raporto-caption">Statusi</span>
        <div className="raporto-status">
          {STATUS_LABELS.map((label, i) => (
            <div key={label} className="raporto-status__stage">
              <div className="raporto-status__track">
                <span aria-hidden="true" className={cx('raporto-status__line', i === 0 && 'raporto-status__line--hidden')} />
                <span aria-hidden="true" className={cx('raporto-status__dot', i === 0 && 'raporto-status__dot--on')} />
                <span aria-hidden="true" className={cx('raporto-status__line', i === STATUS_LABELS.length - 1 && 'raporto-status__line--hidden')} />
              </div>
              <span className={cx('raporto-status__label', i === 0 && 'raporto-status__label--on')}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="raporto-done__actions">
        <Link to={trackPath(code)} className="tap u-hover-ink raporto-done__track">
          <span>Shiko raportimin</span>
          <span className="raporto-arrow">→</span>
        </Link>
        <button type="button" onClick={onReset} className="tap raporto-done__reset">
          Raportim i ri
        </button>
      </div>
    </div>
  );
}
