import { Link } from 'react-router-dom';
import { articlePath } from '../../lib/routes';
import type { Article } from './articles';
import './ArticleCard.css';

interface ArticleCardProps {
  article: Article;
  /** Photo to show; without one the card keeps its dark placeholder (blog.html's hasPhoto branch). */
  image?: string;
  /** Small caps line above the title: the category on the Bulletini, the city under an article. */
  label: string;
  /** data-reveal stagger index (the Bulletini list); omit for no reveal. */
  reveal?: number;
}

/**
 * 16:9 photo card linking to a write-up. Used by the Bulletini list and the
 * "Të tjera të zgjidhura" list under each article (the same markup in the static pages).
 */
export function ArticleCard({ article, image, label, reveal }: ArticleCardProps) {
  return (
    <Link to={articlePath(article.slug)} data-reveal={reveal} className="tap r-card artikulli-card">
      {image ? <img src={image} alt={article.title} className="artikulli-card__image" /> : <div className="artikulli-card__placeholder" />}
      <div className="artikulli-card__shade" />
      {/* Must stay the last child <div>: responsive.css styles `.r-cards .r-card > div:last-child`. */}
      <div className="artikulli-card__caption">
        <div className="artikulli-card__label">{label}</div>
        <div className="artikulli-card__title">{article.title}</div>
      </div>
    </Link>
  );
}
