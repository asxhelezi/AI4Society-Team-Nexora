/** App routes, keyed by the design file each screen was ported from. */
export const ROUTES = {
  kreu: '/',
  raportet: '/raportet',
  raporti: '/raporti',
  harta: '/harta',
  departamentet: '/departamentet',
  automatizimet: '/automatizimet',
  performanca: '/performanca',
} as const;

const DESIGN_FILES: Record<string, string> = {
  'Main.dc.html': ROUTES.kreu,
  'Raportet.dc.html': ROUTES.raportet,
  'Raporti.dc.html': ROUTES.raporti,
  'Harta.dc.html': ROUTES.harta,
  'Departamentet.dc.html': ROUTES.departamentet,
  'Automatizimet.dc.html': ROUTES.automatizimet,
  'Performanca.dc.html': ROUTES.performanca,
};

/**
 * Screen logic still speaks in design file names (e.g. a notification's
 * target is 'Raporti.dc.html'); this maps them to app paths.
 */
export function toPath(href: string | null | undefined): string | null {
  if (!href) return null;
  return DESIGN_FILES[href] ?? href;
}
