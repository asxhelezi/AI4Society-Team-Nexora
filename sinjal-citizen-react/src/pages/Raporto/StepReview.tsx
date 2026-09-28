import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { EditButton } from './EditButton';
import type { ReportForm } from './useReportForm';

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="raporto-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="raporto-check__input" />
      <span aria-hidden="true" className={cx('raporto-check__box', checked && 'raporto-check__box--on')}>
        <span className="raporto-check__mark" />
      </span>
      <span className="raporto-check__text">{children}</span>
    </label>
  );
}

function ReviewRow({ caption, onEdit, last = false, shrink = false, children }: { caption: string; onEdit: () => void; last?: boolean; shrink?: boolean; children: ReactNode }) {
  return (
    <div className={cx('raporto-review__row', last && 'raporto-review__row--last')}>
      <div className={shrink ? 'raporto-review__body--shrink' : undefined}>
        <div className={cx('raporto-review__caption', last && 'raporto-review__caption--photos')}>{caption}</div>
        {children}
      </div>
      <EditButton onClick={onEdit} />
    </div>
  );
}

/** Step 4: summary with "Ndrysho" links, save-on-device and notify-by-email toggles, and the submit button. */
export function StepReview({ form }: { form: ReportForm }) {
  const { state, instant } = form;
  const reviewCategory = state.subcategory ? `${state.category} — ${state.subcategory}` : state.category || '—';

  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-rap-step raporto-step raporto-step--review">
      <div className="raporto-review">
        <ReviewRow caption="Kategoria" onEdit={() => form.goStep(1)}>
          <div className="raporto-review__value">{reviewCategory}</div>
        </ReviewRow>
        <ReviewRow caption="Vendndodhja" onEdit={() => form.goStep(2)}>
          <div className="raporto-review__value">{state.resolvedAddress || '—'}</div>
        </ReviewRow>
        <ReviewRow caption="Titulli" onEdit={() => form.goStep(3)}>
          <div className="raporto-review__value">{state.title}</div>
        </ReviewRow>
        <ReviewRow caption="Përshkrimi" onEdit={() => form.goStep(3)} shrink>
          <div className="raporto-review__text">{state.desc.trim() ? state.desc : '—'}</div>
        </ReviewRow>
        <ReviewRow caption="Foto" onEdit={() => form.goStep(3)} shrink last>
          {state.photos.length > 0 ? (
            <div className="raporto-review__thumbs">
              {state.photos.map((ph) => (
                <img key={ph.id} src={ph.url} alt={ph.name} className="raporto-review__thumb" />
              ))}
            </div>
          ) : (
            <div className="raporto-review__empty">Pa foto</div>
          )}
        </ReviewRow>
      </div>

      <Checkbox checked={state.saveDevice} onChange={form.setSaveDevice}>
        Ruaj raportimin në këtë pajisje
      </Checkbox>

      <div className="raporto-notify">
        <Checkbox checked={state.notify} onChange={form.setNotify}>
          Njoftohu për përditësime për këtë raport
        </Checkbox>
        <div className={cx('raporto-notify__panel', state.notify && 'raporto-notify__panel--open')}>
          <div className="raporto-notify__inner">
            <label htmlFor="email" className="raporto-label">
              <span>Email</span>
              <span className="raporto-label__error">{state.emailError}</span>
            </label>
            <input
              id="email"
              type="email"
              value={state.email}
              onChange={(e) => form.setEmail(e.target.value)}
              placeholder="Shkruaj adresën e emailit..."
              autoComplete="email"
              inputMode="email"
              tabIndex={state.notify ? undefined : -1}
              className={cx('raporto-input raporto-input--field', state.emailError && 'raporto-input--error')}
            />
          </div>
        </div>
      </div>

      {state.submitError && <span className="raporto-submit-error">{state.submitError}</span>}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          void form.submit();
        }}
        aria-busy={state.loading}
        className={cx('tap u-hover-red raporto-next raporto-next--submit', state.loading && 'raporto-next--loading')}
      >
        <span>{state.loading ? 'Duke dërguar' : 'Dërgo raportimin'}</span>
        <span className="raporto-arrow">→</span>
        <span className={cx('raporto-next__progress', state.progress && 'raporto-next__progress--on')} />
      </button>
    </div>
  );
}
