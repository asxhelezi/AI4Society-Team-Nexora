import { ROUTES } from './routes';

/** Top-level destinations used by the header, mobile menu and footer. */
export type NavKey = 'kreu' | 'raporto' | 'harta' | 'raportetEMia' | 'bulletini' | 'gjurmo';

export interface NavItem {
  key: NavKey;
  to: string;
  /** Albanian label (i18n.js translates it in the DOM). */
  label: string;
  /** Only active on an exact match (needed for "/"). */
  end?: boolean;
}

export const NAV: Record<NavKey, NavItem> = {
  kreu: { key: 'kreu', to: ROUTES.kreu, label: 'Kreu', end: true },
  raporto: { key: 'raporto', to: ROUTES.raporto, label: 'Raporto' },
  harta: { key: 'harta', to: ROUTES.harta, label: 'Harta' },
  raportetEMia: { key: 'raportetEMia', to: ROUTES.raportetEMia, label: 'Raportet e mia' },
  bulletini: { key: 'bulletini', to: ROUTES.bulletini, label: 'Bulletini' },
  gjurmo: { key: 'gjurmo', to: ROUTES.gjurmo, label: 'Gjurmo' },
};

/** Order of the full-screen mobile menu (identical on every page). */
export const MENU_ITEMS: NavKey[] = ['kreu', 'raporto', 'harta', 'raportetEMia', 'bulletini'];

/** Order of the desktop inline nav; "Raporto" is rendered separately as the red CTA. */
export const DESKTOP_ITEMS: NavKey[] = ['kreu', 'harta', 'raportetEMia', 'bulletini'];

/** Footer link sets as they appear in the static pages (they differ per page). */
export const FOOTER_LINKS = {
  /** Kreu, Harta, Gjurmo */
  all: ['kreu', 'raporto', 'harta', 'raportetEMia', 'bulletini'],
  /** Bulletini + case pages */
  bulletini: ['kreu', 'raporto', 'harta', 'raportetEMia', 'gjurmo'],
  raporto: ['kreu', 'harta', 'raportetEMia', 'bulletini', 'gjurmo'],
  raportetEMia: ['kreu', 'raporto', 'harta', 'bulletini'],
} satisfies Record<string, NavKey[]>;

export const IMAGES = {
  /** Header / menu logo (on dark and light headers alike). */
  logo: '/images/e244adb6acbaff1565a2c15b3dd28a05.png',
  /** Footer logo (white on red). */
  logoFooter: '/images/757c4159873a86558682dfd42933bbd2.png',
} as const;
