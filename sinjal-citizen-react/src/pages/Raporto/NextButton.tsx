import { cx } from '../../lib/cx';

/** The red full-width "Vazhdo →" button at the end of steps 1–3. */
export function NextButton({ onClick, spaced = false }: { onClick: () => void; spaced?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('tap u-hover-red raporto-next', spaced && 'raporto-next--spaced')}>
      <span>Vazhdo</span>
      <span className="raporto-arrow">→</span>
    </button>
  );
}
