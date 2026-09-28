import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IMAGES, NAV } from '../../lib/nav';
import { DesktopNav } from './DesktopNav';
import { LangToggle } from './LangToggle';
import { MobileMenu } from './MobileMenu';
import './SiteHeader.css';

/**
 * Header variants, as they appear in the static pages:
 * - `hero`    Kreu: transparent, absolutely positioned over the hero photo (top: 14px).
 * - `overlay` case write-ups (/bulletini/:slug): transparent, absolute at top: 0, over the cover photo.
 * - `dark`    Raporto, Harta, Raportet e mia, Gjurmo: solid ink bar in the page flow.
 * - `light`   Bulletini list: ink text on paper, in the page flow.
 */
export type HeaderVariant = 'hero' | 'overlay' | 'dark' | 'light';

interface SiteHeaderProps {
  variant: HeaderVariant;
  /**
   * Gjurmo's header in the static site: no desktop nav and no language toggle, rounded
   * menu buttons, and the burger stays visible on desktop. Only for a faithful Gjurmo port.
   */
  minimal?: boolean;
}

/**
 * Site header + the full-screen mobile menu it opens. Render it as the first child of
 * <PageFrame> (the menu is a sibling of <header>, as in the static markup).
 */
export function SiteHeader({ variant, minimal = false }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((open) => !open);
  const closeMenu = () => setMenuOpen(false);

  const burgerClass = ['tap', 'site-burger', minimal ? 'site-burger--rounded' : 'r-burger'].join(' ');

  return (
    <>
      <header className={`r-header site-header site-header--${variant}`}>
        <Link to={NAV.kreu.to} onClick={closeMenu} className="site-brand">
          <img className="site-brand__logo" src={IMAGES.logo} alt="Sinjal" />
          <span>SINJAL</span>
        </Link>
        {!minimal && <DesktopNav />}
        <div className={minimal ? 'site-header__tools' : 'r-header-tools site-header__tools'}>
          {!minimal && <LangToggle />}
          <button type="button" onClick={toggleMenu} aria-label="Hap menunë" className={burgerClass}>
            <span className="site-burger__bar" />
            <span className="site-burger__bar" />
            <span className="site-burger__bar" />
          </button>
        </div>
      </header>
      {menuOpen && <MobileMenu onClose={closeMenu} rounded={minimal} />}
    </>
  );
}
