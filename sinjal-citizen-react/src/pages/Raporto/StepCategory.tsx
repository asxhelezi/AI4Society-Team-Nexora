import { cx } from '../../lib/cx';
import { CATEGORIES, MAX_SUBCATEGORY_CHARS, OTHER_CATEGORY } from './data';
import { NextButton } from './NextButton';

interface StepCategoryProps {
  instant: boolean;
  category: string | null;
  subcategory: string | null;
  error: string;
  onPick: (name: string) => void;
  onPickSub: (name: string) => void;
  onOtherText: (text: string) => void;
  onNext: () => void;
}

/**
 * Step 1: category grid, then the optional subcategory chips of the chosen category.
 * "Tjetër" is a main category too, shown as a full-width bar under the 2×4 grid; picking it opens a short text field instead of chips.
 */
export function StepCategory({ instant, category, subcategory, error, onPick, onPickSub, onOtherText, onNext }: StepCategoryProps) {
  const selected = CATEGORIES.find((c) => c.name === category);
  const otherOn = category === OTHER_CATEGORY;
  return (
    <div data-reveal="1" data-revealed={instant ? '' : undefined} className="r-rap-step raporto-step raporto-step--category">
      <div className="raporto-label">
        <span>Kategoria</span>
        <span className="raporto-label__error">{error}</span>
      </div>
      <div className="r-cat-grid raporto-cats">
        {CATEGORIES.map((c) => {
          const on = category === c.name;
          return (
            <button key={c.name} type="button" onClick={() => onPick(c.name)} aria-pressed={on} className={cx('tap raporto-cat', on && 'raporto-cat--on u-hover-ink')}>
              <span className="material-symbols-outlined raporto-cat__icon" aria-hidden="true">
                {c.icon}
              </span>
              <span className="raporto-cat__name">{c.name}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onPick(OTHER_CATEGORY)} aria-pressed={otherOn} aria-expanded={otherOn} className={cx('tap raporto-cat raporto-other', otherOn && 'raporto-cat--on u-hover-ink')}>
        <span className="material-symbols-outlined raporto-cat__icon" aria-hidden="true">
          more_horiz
        </span>
        <span className="raporto-cat__name">{OTHER_CATEGORY}</span>
      </button>
      {otherOn && (
        <label className="raporto-subcats">
          <span className="raporto-caption">Çfarë lloj problemi është?</span>
          <input
            autoFocus
            value={subcategory ?? ''}
            onChange={(e) => onOtherText(e.target.value)}
            maxLength={MAX_SUBCATEGORY_CHARS}
            placeholder="p.sh. Zhurmë nga ndërtimet natën"
            className="raporto-other__input"
          />
        </label>
      )}
      {selected && (
        <div className="raporto-subcats">
          <span className="raporto-caption">Nënkategoria · opsionale</span>
          <div className="raporto-subcats__list">
            {selected.subs.map((name) => {
              const on = subcategory === name;
              return (
                <button key={name} type="button" onClick={() => onPickSub(name)} aria-pressed={on} className={cx('tap raporto-subcat', on && 'raporto-subcat--on u-hover-ink')}>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <NextButton onClick={onNext} spaced />
    </div>
  );
}
