import type { ReactNode } from 'react';
import { useLogic } from '../../lib/dc';
import { ROUTES } from '../../lib/routes';
import { DcLink } from '../DcLink';
import { LOGIN_URL, logout, signedInUser } from '../../api/staff';
import { type NavKey, SidebarLogic } from './SidebarLogic';

type NavStateKey = 'navKreu' | 'navRaportet' | 'navHarta' | 'navDepartamentet' | 'navAutomatizimet' | 'navPerformanca';

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const NAV: { key: NavKey; label: string; to: string; stateKey: NavStateKey; icon: ReactNode }[] = [
  {
    key: 'kreu',
    label: 'Kreu',
    to: ROUTES.kreu,
    stateKey: 'navKreu',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9h5v-5h2v5h5v-9" />
      </svg>
    ),
  },
  {
    key: 'raportet',
    label: 'Raportet',
    to: ROUTES.raportet,
    stateKey: 'navRaportet',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="16" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="10" x2="9" y2="20" />
      </svg>
    ),
  },
  {
    key: 'harta',
    label: 'Harta',
    to: ROUTES.harta,
    stateKey: 'navHarta',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.3" />
      </svg>
    ),
  },
  {
    key: 'departamentet',
    label: 'Departamentet',
    to: ROUTES.departamentet,
    stateKey: 'navDepartamentet',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="3" width="14" height="18" />
        <line x1="9" y1="8" x2="9" y2="8.01" />
        <line x1="15" y1="8" x2="15" y2="8.01" />
        <line x1="9" y1="13" x2="9" y2="13.01" />
        <line x1="15" y1="13" x2="15" y2="13.01" />
      </svg>
    ),
  },
  {
    key: 'automatizimet',
    label: 'Automatizimet',
    to: ROUTES.automatizimet,
    stateKey: 'navAutomatizimet',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7z" />
      </svg>
    ),
  },
  {
    key: 'performanca',
    label: 'Performanca',
    to: ROUTES.performanca,
    stateKey: 'navPerformanca',
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="4" y1="20" x2="20" y2="20" />
        <rect x="6" y="12" width="3" height="8" />
        <rect x="10.5" y="7" width="3" height="13" />
        <rect x="15" y="15" width="3" height="5" />
      </svg>
    ),
  },
];

const MENU_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  width: '100%',
  padding: '8px 10px',
  border: '0',
  background: 'transparent',
  borderRadius: '6px',
  textAlign: 'left',
  fontFamily: "'Barlow',sans-serif",
  fontSize: '13px',
  color: '#1B1917',
} as const;

/**
 * The dark 232px navigation rail, with the profile menu at the bottom.
 * On tablets it collapses to an icon rail and on phones it is an off-canvas
 * drawer (styles/responsive.css); onClose closes that drawer.
 */
export function Sidebar({ active, onClose }: { active: NavKey; onClose?: () => void }) {
  const v = useLogic(SidebarLogic, { active });

  return (
    <aside
      id="app-sidebar"
      className="app-sidebar"
      style={{ width: '232px', height: '100%', flex: '0 0 232px', background: '#1B1917', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <button type="button" className="tap app-sidebar-close" onClick={onClose} aria-label="Mbyll menunë">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
      <DcLink href={ROUTES.kreu} className="tap app-sidebar-brand" style={{ padding: '24px 20px 18px', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <img src={v.logoUrl} alt="" style={{ display: 'block', height: '20px', width: 'auto', flex: '0 0 auto' }} />
          <span
            className="app-sidebar-wordmark"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '24px', letterSpacing: '.01em', textTransform: 'uppercase', color: '#F5F2ED' }}
          >
            Sinjal
          </span>
        </div>
        <div className="app-sidebar-tagline" style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 500, letterSpacing: 0, color: 'rgba(245,242,237,.5)' }}>
          Paneli i Nëpunësit
        </div>
      </DcLink>

      <nav className="app-sidebar-nav" style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }} aria-label="Navigimi kryesor">
        {NAV.map((item) => {
          const s = v[item.stateKey];
          return (
            <DcLink
              key={item.key}
              href={item.to}
              className="tap staff-nav-item"
              aria-current={s.current === 'page' ? 'page' : undefined}
              title={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '10px 12px',
                borderRadius: '10px',
                boxShadow: s.shadow,
                background: s.bg,
                color: s.color,
                fontFamily: "'Barlow',sans-serif",
                fontWeight: 600,
                fontSize: '13px',
                letterSpacing: 0,
              }}
            >
              {item.icon}
              <span className="app-nav-label">{item.label}</span>
            </DcLink>
          );
        })}
      </nav>

      {v.menuOpen ? (
        <div className="panel app-profile-menu" role="menu" style={{ left: '12px', right: '12px', bottom: '76px', top: 'auto', width: 'auto', padding: '6px' }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #E4DFD6', marginBottom: '4px' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{signedInUser()?.name || 'Nëpunës'}</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>{signedInUser()?.role || 'Stafi'}</div>
          </div>
          <button type="button" role="menuitem" onClick={v.onCloseMenu} className="tap menu-row" style={MENU_ROW_STYLE}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B665F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            Profili
          </button>
          <button type="button" role="menuitem" onClick={v.onCloseMenu} className="tap menu-row" style={MENU_ROW_STYLE}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B665F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 13a7.4 7.4 0 0 0 0-2l2-1.5-2-3.5-2.3.9a7.6 7.6 0 0 0-1.8-1l-.3-2.4h-4l-.3 2.4a7.6 7.6 0 0 0-1.8 1l-2.3-.9-2 3.5L6.6 11a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9a7.6 7.6 0 0 0 1.8 1l.3 2.4h4l.3-2.4a7.6 7.6 0 0 0 1.8-1l2.3.9 2-3.5-2-1.5z" />
            </svg>
            Cilësimet
          </button>
          <div style={{ height: '1px', background: '#E4DFD6', margin: '4px 2px' }} />
          <button type="button" role="menuitem" onClick={() => { logout(); window.location.assign(LOGIN_URL); }} className="tap menu-row" style={{ ...MENU_ROW_STYLE, color: '#C23B31' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C23B31" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Dil
          </button>
        </div>
      ) : null}

      {/* Language toggle. Plain buttons: public/sinjal-i18n.js handles the clicks
          (delegated listener) and keeps aria-pressed in sync, so React doesn't own it. */}
      <div className="sj-lang app-sidebar-lang" role="group" aria-label="Gjuha" style={{ flex: '0 0 auto', display: 'flex', margin: '6px 14px 8px' }}>
        <button type="button" data-lang="sq" lang="sq" aria-label="Shqip" title="Shqip">
          SQ
        </button>
        <button type="button" data-lang="en" lang="en" aria-label="English" title="English">
          EN
        </button>
        <button type="button" data-lang="sr" lang="sr-Latn" aria-label="Srpski" title="Srpski">
          SR
        </button>
      </div>

      <button
        type="button"
        onClick={v.onToggleMenu}
        aria-label="Menuja e profilit"
        aria-expanded={v.menuOpenAttr}
        className="tap sidebar-profile"
        style={{
          border: 0,
          borderTop: '1px solid rgba(245,242,237,.1)',
          background: v.profileBg,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div className="avatar-chip">AM</div>
        <div className="app-profile-text" style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#F5F2ED', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Drita K.</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: 'rgba(245,242,237,.5)' }}>Nëpunëse</div>
        </div>
        <svg
          className="app-profile-chevron"
          width="12"
          height="12"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          style={{ flex: '0 0 auto', transform: v.chevron, transition: 'transform .15s ease' }}
        >
          <path d="M1 7L5 3L9 7" stroke="rgba(245,242,237,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </aside>
  );
}
