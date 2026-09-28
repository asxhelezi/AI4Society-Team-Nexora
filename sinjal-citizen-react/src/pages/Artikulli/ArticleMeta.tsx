import { cx } from '../../lib/cx';
import { formatDate } from '../../lib/format';
import type { Article } from './articles';

interface Stat {
  label: string;
  value: string;
  /** The tracking code is set in red with a little tracking. */
  code?: boolean;
}

/**
 * The 2×2 (desktop: 1×4) facts grid under the cover. The cell shape
 * (`.r-meta > div > div + div`) is what responsive.css styles, so keep it.
 */
export function ArticleMeta({ article }: { article: Article }) {
  const stats: Stat[] = [
    { label: 'Raportuar', value: formatDate(article.submitted_at) },
    { label: 'Zgjidhur', value: formatDate(article.resolved_at) },
    { label: 'Kategoria', value: article.category },
    { label: 'Raportimi', value: article.tracking_code, code: true },
  ];
  return (
    <section className="artikulli-meta">
      <div className="r-wrap r-meta artikulli-meta__grid">
        {stats.map((stat, i) => (
          <div key={stat.label} className={cx('artikulli-meta__cell', i % 2 === 0 ? 'artikulli-meta__cell--left' : 'artikulli-meta__cell--right', i >= 2 && 'artikulli-meta__cell--lower')}>
            <div className="artikulli-meta__label">{stat.label}</div>
            <div className={cx('artikulli-meta__value', stat.code && 'artikulli-meta__value--code')}>{stat.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
