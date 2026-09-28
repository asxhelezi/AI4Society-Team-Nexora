import { NavLink } from 'react-router-dom';
import { IMAGES, MENU_ITEMS, NAV } from '../../lib/nav';

interface MobileMenuProps {
  onClose: () => void;
  /** Rounded close button (Gjurmo's phone-frame look). */
  rounded?: boolean;
}

/**
 * Full-screen navigation overlay for phones/tablets. responsive.css pins .r-menu to the
 * viewport and hides it from 1024px up. The current page's link is red.
 */
export function MobileMenu({ onClose, rounded = false }: MobileMenuProps) {
  return (
    <div className="r-menu site-menu">
      <div className="site-menu__top">
        <span className="site-menu__brand">
          <img className="site-brand__logo" src={IMAGES.logo} alt="Sinjal" />
          SINJAL
        </span>
        <button type="button" onClick={onClose} aria-label="Mbyll menunë" className={`tap site-menu__close${rounded ? ' site-menu__close--rounded' : ''}`}>
          <span className="site-menu__close-bar site-menu__close-bar--a" />
          <span className="site-menu__close-bar site-menu__close-bar--b" />
        </button>
      </div>
      <nav className="site-menu__nav">
        {MENU_ITEMS.map((key) => {
          const item = NAV[key];
          return (
            <NavLink key={key} to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => `tap site-menu__link${isActive ? ' site-menu__link--active' : ''}`}>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="site-menu__legal">© 2026 Sinjal · Shqipëri</div>
    </div>
  );
}
