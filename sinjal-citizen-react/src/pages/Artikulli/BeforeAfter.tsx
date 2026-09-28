import { cx } from '../../lib/cx';
import type { Article } from './articles';

interface PhotoProps {
  label: 'Para' | 'Pas';
  src?: string;
  alt: string;
}

function Photo({ label, src, alt }: PhotoProps) {
  const before = label === 'Para';
  return (
    <div className="artikulli-ba__item">
      <span className={cx('artikulli-ba__label', !before && 'artikulli-ba__label--after')}>{label}</span>
      <div className="artikulli-ba__frame">{src && <img src={src} alt={alt} className={cx('artikulli-ba__image', before && 'artikulli-ba__image--before')} />}</div>
    </div>
  );
}

/** "Para" (greyscale) / "Pas" photo pair. */
export function BeforeAfter({ article }: { article: Article }) {
  return (
    <div data-reveal="1" className="r-ba-grid artikulli-ba">
      <Photo label="Para" src={article.photos.before} alt={`${article.title} — para`} />
      <Photo label="Pas" src={article.photos.after} alt={`${article.title} — pas`} />
    </div>
  );
}
