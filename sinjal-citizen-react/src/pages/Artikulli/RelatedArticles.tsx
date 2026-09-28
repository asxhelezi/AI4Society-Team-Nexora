import type { ArticleSlug } from '../../lib/routes';
import { ArticleCard } from './ArticleCard';
import { relatedArticles } from './articles';

/**
 * "Të tjera të zgjidhura": three other write-ups. responsive.css reaches this section as
 * `.r-article + section + section`, so it must stay the second section after <article>.
 */
export function RelatedArticles({ slug }: { slug: ArticleSlug }) {
  return (
    <section className="artikulli-related">
      <div className="r-wrap artikulli-related__inner">
        <h2 className="artikulli-related__title">Të tjera të zgjidhura</h2>
        <div className="r-cards artikulli-related__cards">
          {relatedArticles(slug).map((article) => (
            <ArticleCard key={article.slug} article={article} image={article.thumbnail ?? article.photos.after} label={article.zone_name} />
          ))}
        </div>
      </div>
    </section>
  );
}
