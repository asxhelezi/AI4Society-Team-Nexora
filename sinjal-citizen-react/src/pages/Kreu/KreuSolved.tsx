import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { ROUTES, articlePathByNumber } from '../../lib/routes';
import { useCountUp } from './useCountUp';

/** Number shown by the "Probleme të zgjidhura" counter. */
const SOLVED_COUNT = 504;

interface CaseCard {
  /** Grid slot: a b c (before the counter), d e (after). responsive.css re-arranges them on desktop via r-b-*. */
  slot: 'a' | 'b' | 'c' | 'd' | 'e';
  /** Case write-up number (blog-cover-<n>). */
  article: number;
  image: string;
  alt: string;
  category: string;
  title: string;
  /** data-reveal stagger index */
  reveal: number;
  /** The tall cards (a, d) have a little more caption padding. */
  tall?: boolean;
}

const CARDS_BEFORE: CaseCard[] = [
  {
    slot: 'a',
    article: 1,
    image: '/images/34c8dada4aa146187cd3b7d2fd7d4887.jpg',
    alt: 'Rruga Elbasan–Çërrik',
    category: 'Trafik',
    title: 'Rikthehet shenja rrugore në Elbasan-Çërrik',
    reveal: 2,
    tall: true,
  },
  { slot: 'b', article: 2, image: '/images/37cb8998f248130bf8f3a84e0582a094.jpg', alt: 'Rruga Aleks Vini', category: 'Ndriçim', title: 'Rikthehet ndriçimi në rrugën Aleks Vini', reveal: 3 },
  { slot: 'c', article: 3, image: '/images/foto/puseta_pas.png', alt: 'Rruga e Teqes', category: 'Infrastrukturë', title: 'Zhbllokohet kanali kullues në rrugën e Teqes', reveal: 4 },
];

const CARDS_AFTER: CaseCard[] = [
  { slot: 'd', article: 5, image: '/images/gropa rruga 28_pas.png', alt: 'Rruga 28 Nëntori', category: 'Infrastrukturë', title: 'Riparohet gropa në rrugën 28 Nëntori', reveal: 6, tall: true },
  { slot: 'e', article: 6, image: '/images/978ce369806749ae84e7d2fc87999f17.jpg', alt: 'Rruga Ptoleme Xhuvani', category: 'Mbetje', title: 'Pastrohet rruga Ptoleme Xhuvani nga mbetjet', reveal: 7 },
];

function CaseCardLink({ card }: { card: CaseCard }) {
  return (
    <Link to={articlePathByNumber(card.article)} data-reveal={card.reveal} className={`tap r-card r-b-${card.slot} kreu-card kreu-bento__item--${card.slot}`}>
      <img src={card.image} alt={card.alt} className="kreu-card__image" />
      <div className="kreu-card__shade" />
      {/* Must stay the last child <div>: responsive.css styles `.r-card > div:last-child`. */}
      <div className={cx('kreu-card__caption', card.tall && 'kreu-card__caption--tall')}>
        <div className="kreu-card__category">{card.category}</div>
        <div className="kreu-card__title">{card.title}</div>
      </div>
    </Link>
  );
}

function SolvedCounter({ reducedMotion }: { reducedMotion: boolean }) {
  const valueRef = useRef<HTMLDivElement>(null);
  const count = useCountUp(valueRef, SOLVED_COUNT, reducedMotion);
  return (
    <div data-reveal="5" className="r-b-count kreu-counter kreu-bento__item--count">
      <div ref={valueRef} data-counter="" className="kreu-counter__value">
        {count}
        <span className="kreu-counter__plus">+</span>
      </div>
      <h2 className="kreu-counter__label">Probleme të zgjidhura</h2>
    </div>
  );
}

/** "Resolved cases" bento: five case cards around the solved counter, plus a link to the Bulletini. */
export function KreuSolved({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section className="kreu-solved">
      <div className="r-wrap kreu-solved__wrap">
        <div className="r-bento kreu-bento">
          {CARDS_BEFORE.map((card) => (
            <CaseCardLink key={card.slot} card={card} />
          ))}
          <SolvedCounter reducedMotion={reducedMotion} />
          {CARDS_AFTER.map((card) => (
            <CaseCardLink key={card.slot} card={card} />
          ))}
          <Link to={ROUTES.bulletini} data-reveal="8" className="tap u-hover-red r-b-f kreu-bento__all kreu-bento__item--f">
            <span className="kreu-arrow" aria-hidden="true">
              <span className="kreu-arrow__line" />
              <span className="kreu-arrow__head" />
            </span>
            <span>Të gjitha problemet e zgjidhura</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
