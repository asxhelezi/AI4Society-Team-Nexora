import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { SINJAL } from '../data/sinjal';
import { ROUTES } from '../lib/routes';
import { DcLink } from './DcLink';
import { Sidebar } from './sidebar/Sidebar';
import type { NavKey } from './sidebar/SidebarLogic';

interface Props {
  active: NavKey;
  /** true: the whole content column scrolls; false: the screen manages its own scroll areas. */
  scroll?: boolean;
  /** Rendered before the sidebar, e.g. a click-away layer for a floating panel. */
  overlay?: ReactNode;
  frameStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * The app frame: sidebar + content column.
 *
 * Desktop (≥1100px) is the design's 232px sidebar. Below that the layout goes
 * fluid (see styles/responsive.css): tablets get a slim icon rail, and phones
 * get a top bar whose menu button opens the sidebar as an off-canvas drawer.
 */
export function Shell({ active, scroll = false, overlay, frameStyle, children }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  const closeNav = useCallback(() => {
    setNavOpen(false);
    menuBtn.current?.focus();
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    document.querySelector<HTMLElement>('#app-sidebar .app-sidebar-close')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNav();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen, closeNav]);

  // Below 1024px, list + detail panes stack (.r-md in responsive.css), which puts
  // the detail under the list; picking a row then brings the detail into view.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const stacked = window.matchMedia('(max-width: 1023px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onClick = (e: MouseEvent) => {
      if (!stacked.matches) return;
      const row = (e.target as Element | null)?.closest?.('.r-md > :first-child .auto-row, .r-md > :first-child .pub-case');
      const md = row?.closest('.r-md');
      if (!md) return;
      requestAnimationFrame(() => {
        const detail = md.lastElementChild;
        if (detail && detail !== md.firstElementChild) detail.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className={'app-frame' + (navOpen ? ' is-nav-open' : '')} style={frameStyle}>
      {overlay}
      <header className="app-topbar">
        <button ref={menuBtn} type="button" className="tap app-topbar-menu" aria-label="Hap menunë" aria-expanded={navOpen} aria-controls="app-sidebar" onClick={() => setNavOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <DcLink href={ROUTES.kreu} className="tap app-topbar-brand">
          <img src={SINJAL.assets.logo || ''} alt="" />
          <span>Sinjal</span>
        </DcLink>
      </header>
      <div className="app-nav-backdrop" onClick={closeNav} aria-hidden="true" />
      <Sidebar active={active} onClose={closeNav} />
      <div className="app-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', ...(scroll ? { overflowY: 'auto' } : { overflow: 'hidden' }) }}>
        {children}
      </div>
    </div>
  );
}
