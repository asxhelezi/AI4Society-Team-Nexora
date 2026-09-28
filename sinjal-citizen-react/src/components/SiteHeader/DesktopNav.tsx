import { NavLink } from 'react-router-dom';
import { DESKTOP_ITEMS, NAV } from '../../lib/nav';

/**
 * Inline header navigation, shown from 1024px up (.r-desknav in responsive.css).
 * NavLink sets aria-current="page" on the active item, which responsive.css underlines.
 * className={() => undefined} stops NavLink from adding its default "active" class, so the
 * markup matches the static site.
 */
export function DesktopNav() {
  return (
    <nav className="r-desknav" aria-label="Navigimi kryesor">
      {DESKTOP_ITEMS.map((key) => {
        const item = NAV[key];
        return (
          <NavLink key={key} to={item.to} end={item.end} className={() => undefined}>
            {item.label}
          </NavLink>
        );
      })}
      <NavLink to={NAV.raporto.to} className={() => 'r-desknav-cta'}>
        <span>Raporto</span>
        <span aria-hidden="true">→</span>
      </NavLink>
    </nav>
  );
}
