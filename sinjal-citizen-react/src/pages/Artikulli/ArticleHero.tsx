import { formatDate } from '../../lib/format';
import type { Article } from './articles';

/** Full-bleed cover photo with the "Zgjidhur · city · date" eyebrow and the title. */
export function ArticleHero({ article }: { article: Article }) {
  const cover = article.photos.after;
  return (
    <section className="r-cover-hero artikulli-hero">
      {cover && <img src={cover} alt={article.title} className="artikulli-hero__image" />}
      <div className="artikulli-hero__shade" />
      <div className="r-wrap r-cover-text artikulli-hero__text">
        <div data-reveal="0" className="artikulli-hero__eyebrow">
          <span className="artikulli-hero__badge">Zgjidhur</span>
          <span>{article.zone_name}</span>
          <span className="artikulli-hero__date">{formatDate(article.resolved_at)}</span>
        </div>
        <h1 data-reveal="1" className="r-cover-h1 artikulli-hero__title">
          {article.title}
        </h1>
      </div>
    </section>
  );
}
