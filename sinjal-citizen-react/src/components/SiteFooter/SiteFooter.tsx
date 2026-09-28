import { Link } from 'react-router-dom';
import { FOOTER_LINKS, IMAGES, NAV, type NavKey } from '../../lib/nav';
import './SiteFooter.css';

interface SiteFooterProps {
  /**
   * `full`: Kreu's footer — privacy note, 2-column link grid, legal links.
   * `compact`: every other page — logo, one wrapping row of links, copyright.
   */
  variant: 'full' | 'compact';
  /** Links to show, in order. The static pages each list a slightly different set (see FOOTER_LINKS). */
  links?: NavKey[];
}

/** Red site footer. Tablet/desktop layout comes from .r-footer-in in responsive.css. */
export function SiteFooter({ variant, links = FOOTER_LINKS.all }: SiteFooterProps) {
  const full = variant === 'full';
  return (
    <footer className="r-footer site-footer">
      <div className={`r-wrap r-footer-in site-footer__inner site-footer__inner--${variant}`}>
        <div className="site-footer__brand">
          <img className="site-footer__logo" src={IMAGES.logoFooter} alt="Sinjal" />
          <span>SINJAL</span>
        </div>
        {full && (
          <p className="r-footer-note site-footer__note">
            Nuk mbledhim asnjë të dhënë personale. Njoftimet janë me zgjedhjen tënde.{' '}
            <a href="#" className="site-footer__note-link">
              Mëso më shumë.
            </a>
          </p>
        )}
        <nav className={`site-footer__nav site-footer__nav--${variant}`}>
          {links.map((key) => (
            <Link key={key} to={NAV[key].to} className="site-footer__link">
              {NAV[key].label}
            </Link>
          ))}
        </nav>
        {full && (
          <div className="site-footer__legal">
            <a href="#" className="site-footer__legal-link">
              Termat e Përdorimit
            </a>
            <span className="site-footer__legal-sep">·</span>
            <a href="#" className="site-footer__legal-link">
              Politika e Privatësisë
            </a>
          </div>
        )}
        <span className="site-footer__copy">© 2026 Sinjal</span>
      </div>
    </footer>
  );
}
