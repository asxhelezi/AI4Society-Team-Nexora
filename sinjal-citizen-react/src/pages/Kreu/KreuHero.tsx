import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import { ROUTES } from '../../lib/routes';
import { useHeroIntro } from './useHeroIntro';

/** Parts of each phrase to paint red. Phrases not listed render in one colour. */
const HIGHLIGHTS: Record<string, { text: string; highlight: boolean }[]> = {
  'Sheh diçka që nuk shkon?': [
    { text: 'Sheh diçka që ', highlight: false },
    { text: 'nuk shkon?', highlight: true },
  ],
  'Vetëm 40 sekonda': [
    { text: 'Vetëm ', highlight: false },
    { text: '40', highlight: true },
    { text: ' sekonda', highlight: false },
  ],
  'Krejt­ësisht anonim': [
    { text: 'Krejt­ësisht ', highlight: false },
    { text: 'anonim', highlight: true },
  ],
};

const PARTNERS = [
  { src: '/images/abfc416f17735ff2447d875fd022da7c.png', alt: 'Build Green Group', height: 32 },
  { src: '/images/6bc4bb33743620e23aa9ad0ef74ebdf8.png', alt: 'EIT Community Albania', height: 34 },
  { src: '/images/d0d11626b648fbdd24c267de51acc62c.png', alt: 'Open Society Foundations Western Balkans', height: 26 },
];

/** Full-height photo hero: rotating headline, "Raporto tani" CTA and the partner marquee. */
export function KreuHero({ reducedMotion }: { reducedMotion: boolean }) {
  const { introShown, headlineIn, ctaVisible, colorful, headline } = useHeroIntro(reducedMotion);
  const animate = !reducedMotion;
  const parts = HIGHLIGHTS[headline] ?? [{ text: headline, highlight: false }];

  return (
    <section data-hero="" className="r-wrap r-hero kreu-hero">
      <div aria-hidden="true" className="kreu-hero__photo-wrap">
        <img src="/images/77060d3bb13ae2c4f68cc171331c44b6.jpg" alt="" className={cx('kreu-hero__photo', animate && 'kreu-hero__photo--animated', colorful && 'kreu-hero__photo--color')} />
      </div>
      <div aria-hidden="true" className={cx('kreu-hero__glow', animate && 'kreu-hero__glow--animated', colorful && 'kreu-hero__glow--on')} />
      <div aria-hidden="true" className="kreu-hero__grain" />
      <div aria-hidden="true" className="kreu-hero__vignette" />
      <div className="kreu-hero__shade" />

      <div className="r-hero-text kreu-hero__text">
        <div className={cx('kreu-hero__intro', introShown && 'kreu-hero__intro--shown')}>
          <div className="kreu-hero__eyebrow">
            <span className="kreu-hero__eyebrow-bar" />
            <span>Bashkia Elbasan</span>
          </div>
          <div className="r-hero-hl kreu-hero__headline">
            <h1 className={cx('r-hero-h1 kreu-hero__title', headlineIn && 'kreu-hero__title--in')}>
              {parts.map((part, i) => (
                <span key={i} className={cx('kreu-hero__title-part', part.highlight && 'kreu-hero__title-part--highlight')}>
                  {part.text}
                </span>
              ))}
            </h1>
            <div aria-hidden="true" className={cx('kreu-hero__title-bar', headlineIn && 'kreu-hero__title-bar--in')} />
          </div>
        </div>
      </div>

      <div className={cx('r-hero-cta kreu-hero__cta', ctaVisible && 'kreu-hero__cta--visible')}>
        <Link to={ROUTES.raporto} className="tap u-hover-red kreu-button">
          <span>Raporto tani</span>
          <span className="kreu-button__arrow">→</span>
        </Link>
      </div>

      <div className="r-hero-partners kreu-partners">
        <div className="kreu-partners__label-wrap">
          <span className="kreu-partners__label">Mbështetur nga</span>
        </div>
        <div className="kreu-partners__viewport">
          {/* The list is doubled so the marquee can loop seamlessly (translateX -50%). */}
          <div className={cx('kreu-partners__track', animate && 'kreu-partners__track--animated')}>
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <img key={i} src={p.src} alt={p.alt} className="kreu-partners__logo" style={{ height: p.height }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
