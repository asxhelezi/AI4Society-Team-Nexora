/** App routes. Always link through these (or the helpers below), never hard-code paths. */
export const ROUTES = {
  kreu: '/',
  raporto: '/raporto',
  harta: '/harta',
  raportetEMia: '/raportet-e-mia',
  gjurmo: '/gjurmo',
  bulletini: '/bulletini',
  artikulli: '/bulletini/:slug',
} as const;

/**
 * The six published case write-ups (blog-cover-1..6.html in the static site), in the
 * same order. The slug is the URL segment under /bulletini/.
 */
export const ARTICLE_SLUGS = [
  'shenja-rrugore-elbasan-cerrik', // blog-cover-1
  'ndricimi-rruga-aleks-vini', // blog-cover-2
  'kanali-kullues-rruga-e-teqes', // blog-cover-3
  'trotuari-shetitorja-aqif-pasha', // blog-cover-4
  'gropa-rruga-28-nentori', // blog-cover-5
  'mbetjet-rruga-ptoleme-xhuvani', // blog-cover-6
] as const;

export type ArticleSlug = (typeof ARTICLE_SLUGS)[number];

export function articlePath(slug: ArticleSlug | string): string {
  return `${ROUTES.bulletini}/${slug}`;
}

/** Path to the write-up that was blog-cover-<n>.html (n = 1..6). */
export function articlePathByNumber(n: number): string {
  const slug = ARTICLE_SLUGS[n - 1];
  return slug ? articlePath(slug) : ROUTES.bulletini;
}

/** Path to the tracking page for a code, e.g. /gjurmo?id=SNJ-204817. */
export function trackPath(code: string): string {
  return `${ROUTES.gjurmo}?id=${encodeURIComponent(code)}`;
}

/**
 * Old static-site file names → new routes, so bookmarked/shared links keep working.
 * The query string and hash are carried over (gjurmo.html?id=X → /gjurmo?id=X).
 */
export const LEGACY_PATHS: Record<string, string> = {
  '/index.html': ROUTES.kreu,
  '/raporto.html': ROUTES.raporto,
  '/harta.html': ROUTES.harta,
  '/raportet-e-mia.html': ROUTES.raportetEMia,
  '/gjurmo.html': ROUTES.gjurmo,
  '/blog.html': ROUTES.bulletini,
  ...Object.fromEntries(ARTICLE_SLUGS.map((slug, i) => [`/blog-cover-${i + 1}.html`, articlePath(slug)])),
};
