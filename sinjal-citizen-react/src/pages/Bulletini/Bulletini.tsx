import { useRef } from 'react';
import { PageFrame } from '../../components/PageFrame/PageFrame';
import { SiteFooter } from '../../components/SiteFooter/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader/SiteHeader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useReveal } from '../../hooks/useReveal';
import { FOOTER_LINKS } from '../../lib/nav';
import { ArticleCard } from '../Artikulli/ArticleCard';
import { ARTICLES } from '../Artikulli/articles';
import { CtaBand } from '../Artikulli/CtaBand';
import './Bulletini.css';

/** Bulletini — port of sinjal-citizen/blog.html: the list of published write-ups (from Artikulli/articles.ts). */
export function Bulletini() {
  useDocumentTitle('Sinjal — Bulletini');
  const reducedMotion = usePrefersReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef, { stepMs: 90, maxIndex: 6, threshold: 0.15, rootMargin: '0px 0px -8% 0px', disabled: reducedMotion });

  return (
    <PageFrame layout="flow" className="bulletini" innerRef={pageRef}>
      <SiteHeader variant="light" />
      <section className="r-wrap r-intro bulletini-intro">
        <h1 data-reveal="0" className="bulletini-intro__title">
          Bulletini
        </h1>
        <p data-reveal="1" className="bulletini-intro__lead">
          Problemet e zgjidhura nga Bashkia Elbasan, me ecurinë e plotë të secilit rast.
        </p>
      </section>
      <section className="bulletini-list">
        <div className="r-wrap r-cards bulletini-list__cards">
          {ARTICLES.map((article, i) => (
            <ArticleCard key={article.slug} article={article} image={article.photos.after} label={article.category} reveal={i} />
          ))}
        </div>
      </section>
      <CtaBand />
      <SiteFooter variant="compact" links={FOOTER_LINKS.bulletini} />
    </PageFrame>
  );
}
