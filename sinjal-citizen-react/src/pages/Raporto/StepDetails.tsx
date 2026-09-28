import { cx } from '../../lib/cx';
import { MAX_DESC_WORDS, MAX_TITLE_CHARS, wordCount } from './data';
import { NextButton } from './NextButton';
import { PhotoPicker } from './PhotoPicker';
import type { ReportForm } from './useReportForm';

/** Step 3: title (required), description (≤ 100 words) and photos. */
export function StepDetails({ form }: { form: ReportForm }) {
  const { state, instant } = form;
  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-rap-step raporto-step raporto-step--details">
      <div className="raporto-field">
        <label htmlFor="title" className="raporto-label">
          <span>Titulli</span>
          <span className="raporto-label__error">{state.titleError}</span>
        </label>
        <input
          id="title"
          value={state.title}
          onChange={(e) => form.setTitle(e.target.value)}
          maxLength={MAX_TITLE_CHARS}
          placeholder="P.sh. Gropë e madhe në asfalt"
          className={cx('raporto-input raporto-input--field', state.titleError && 'raporto-input--error')}
        />
      </div>

      <div className="raporto-field">
        <label htmlFor="desc" className="raporto-label">
          <span>Përshkrimi · opsionale</span>
          <span className="raporto-label__meta">{`${wordCount(state.desc)}/${MAX_DESC_WORDS} fjalë`}</span>
        </label>
        <textarea
          id="desc"
          value={state.desc}
          onChange={(e) => form.setDesc(e.target.value)}
          rows={5}
          placeholder="Përshkruaj problemin..."
          className="raporto-input raporto-input--field raporto-input--area"
        />
      </div>

      <PhotoPicker photos={state.photos} onAdd={form.addPhotos} onRemove={form.removePhoto} />

      <NextButton onClick={form.nextFromDetails} />
    </div>
  );
}
