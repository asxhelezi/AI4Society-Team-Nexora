import { useRef } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { FOOTER_LINKS } from '../../lib/nav';
import { ROUTES } from '../../lib/routes';
import { ArticleHero } from './ArticleHero';
import { ArticleMeta } from './ArticleMeta';
import { getArticle, type Article } from './articles';
import { BeforeAfter } from './BeforeAfter';
import { CtaBand } from './CtaBand';
import { RelatedArticles } from './RelatedArticles';
import './Artikulli.css';

/** A published case write-up — port of sinjal-citizen/blog-cover-1..6.html, driven by ./articles.ts. */
export function Artikulli() {
  const { slug } = useParams();
  const article = getArticle(slug);
  if (!article) return <Navigate to={ROUTES.bulletini} replace />;
  // Keyed by slug so moving between write-ups remounts the page and re-runs the reveal.
  return <ArticlePage key={article.slug} article={article} />;
}

function ArticlePage({ article }: { article: Article }) {
  useDocumentTitle(`Sinjal — ${article.title}`);
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 90, maxIndex: 6, threshold: 0.15, rootMargin: '0px 0px -8% 0px', disabled: reducedMotion });

  return (
    <PageFrame layout="flow" className="artikulli" innerRef={pageRef}>
      <SiteHeader variant="overlay" />
      <ArticleHero article={article} />
      <ArticleMeta article={article} />
      <article className="r-wrap r-article artikulli-body">
        <div data-reveal="0" className="r-prose artikulli-prose">
          {article.body.map((paragraph) => (
            <p key={paragraph} className="artikulli-prose__p">
              {paragraph}
            </p>
          ))}
        </div>
        <BeforeAfter article={article} />
      </article>
      <CtaBand />
      <RelatedArticles slug={article.slug} />
      <SiteFooter variant="compact" links={FOOTER_LINKS.bulletini} />
    </PageFrame>
  );
}
