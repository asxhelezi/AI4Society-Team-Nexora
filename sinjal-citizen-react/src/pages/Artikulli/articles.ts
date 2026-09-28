import type { ArticleSlug } from '../../lib/routes';

/**
 * The published case write-ups: the single source of truth for the Bulletini list
 * (blog.html) and the article pages (blog-cover-1..6.html). Copy is byte-identical to
 * the static pages, because public/i18n.js translates by matching the Albanian text.
 *
 * The shape follows the backend's PublicReport (src/api/types.ts) so this array can later
 * be replaced by `listPublicReports()` filtered to published reports that have an
 * `article_slug`:
 *
 *   Article field      ← PublicReport field
 *   slug               ← article_slug (frontend extension)
 *   tracking_code      ← tracking_code
 *   title              ← title
 *   category           ← category
 *   zone_name          ← zone_name (the static pages show the city; null → hide/"Elbasan")
 *   submitted_at       ← submitted_at   (shown as "Raportuar")
 *   resolved_at        ← resolved_at    (shown as "Zgjidhur", also in the hero eyebrow)
 *   photos             ← photos (frontend extension; before = as reported, after = fixed)
 *   body               ← resolution_note / description, split into paragraphs on blank lines
 *   thumbnail          ← no backend field yet; optional card image for the "Të tjera të
 *                        zgjidhura" list (falls back to photos.after)
 *
 * Dates are local-time ISO strings (no "Z") at noon, so formatDate() prints the same day
 * the static page showed in every time zone ("5 Shtator 2026").
 */
export interface Article {
  slug: ArticleSlug;
  tracking_code: string;
  title: string;
  category: string;
  zone_name: string;
  submitted_at: string;
  resolved_at: string;
  photos: { before?: string; after?: string };
  body: string[];
  thumbnail?: string;
}

export const ARTICLES: Article[] = [
  {
    slug: 'shenja-rrugore-elbasan-cerrik',
    tracking_code: 'SNJ-204817',
    title: 'Rikthehet shenja rrugore në Elbasan-Çërrik',
    category: 'Trafik',
    zone_name: 'Elbasan',
    submitted_at: '2026-09-02T12:00:00',
    resolved_at: '2026-09-05T12:00:00',
    photos: { before: '/images/34c8dada4aa146187cd3b7d2fd7d4887.jpg', after: '/images/foto/stop_pas.png' },
    body: [
      'Shenja e ndalimit në hyrje të rrugës Elbasan-Çërrik ishte rrëzuar nga një automjet dhe kishte mbetur e shtrirë në buzë të rrugës për disa ditë.',
      'Drejtoria e Trafikut Rrugor e klasifikoi si rrezik të menjëhershëm për kryqëzimin dhe e zëvendësoi brenda 48 orësh me një shtyllë të re të përforcuar.',
      'Shenjëzimi funksionon normalisht që prej fillimit të javës.',
    ],
    // The static "others" cards show the *before* photo for this case (Kreu does too).
    thumbnail: '/images/34c8dada4aa146187cd3b7d2fd7d4887.jpg',
  },
  {
    slug: 'ndricimi-rruga-aleks-vini',
    tracking_code: 'SNJ-198340',
    title: 'Rikthehet ndriçimi në rrugën Aleks Vini',
    category: 'Ndriçim',
    zone_name: 'Elbasan',
    submitted_at: '2026-08-15T12:00:00',
    resolved_at: '2026-08-22T12:00:00',
    photos: { before: '/images/foto/ndricimi_para.png', after: '/images/37cb8998f248130bf8f3a84e0582a094.jpg' },
    body: [
      'Katër nga gjashtë shtyllat e ndriçimit përgjatë rrugës Aleks Vini kishin mbetur pa punuar prej javësh, duke lënë segmentin në errësirë të plotë pas orës 20:00.',
      'Ndërmarrja e Ndriçimit Publik identifikoi një defekt në linjën ushqyese dhe e riparoi atë brenda një jave.',
      'Ndriçimi funksionon normalisht që nga mesi i gushtit.',
    ],
  },
  {
    slug: 'kanali-kullues-rruga-e-teqes',
    tracking_code: 'SNJ-176092',
    title: 'Zhbllokohet kanali kullues në rrugën e Teqes',
    category: 'Infrastrukturë',
    zone_name: 'Elbasan',
    submitted_at: '2026-07-28T12:00:00',
    resolved_at: '2026-08-03T12:00:00',
    photos: { before: '/images/foto/puseta_para.png', after: '/images/foto/puseta_pas.png' },
    body: [
      'Kanali kullues përgjatë rrugës së Teqes ishte bllokuar nga gjethe e mbeturina, duke shkaktuar përmbytje të vogla pas çdo shiu.',
      'Drejtoria e Shërbimeve Publike pastroi pusetat dhe kanalin kryesor, duke rikthyer kullimin normal të ujërave.',
    ],
    // The static "others" cards use an older stock photo for this case.
    thumbnail: '/images/f9f3034eaa557d6323d4feb63f50fe6c.jpg',
  },
  {
    slug: 'trotuari-shetitorja-aqif-pasha',
    tracking_code: 'SNJ-231455',
    title: 'Trotuari i riparuar në Shëtitoren Aqif Pasha',
    category: 'Infrastrukturë',
    zone_name: 'Elbasan',
    submitted_at: '2026-04-07T12:00:00',
    resolved_at: '2026-04-28T12:00:00',
    photos: { before: '/images/foto/shetitore_para.png', after: '/images/foto/shetitore_pas.png' },
    body: [
      'Pllakat e ngritura përgjatë Shëtitores Aqif Pasha kishin shkaktuar disa rrëzime këmbësorësh, veçanërisht mbrëmjeve kur ndriçimi është më i dobët.',
      'Bashkia Elbasan rishtroi segmentin 40-metërsh dhe shtoi një rampë të re për karrocat.',
    ],
  },
  {
    slug: 'gropa-rruga-28-nentori',
    tracking_code: 'SNJ-258710',
    title: 'Riparohet gropa në rrugën 28 Nëntori',
    category: 'Infrastrukturë',
    zone_name: 'Elbasan',
    submitted_at: '2026-09-10T12:00:00',
    resolved_at: '2026-09-13T12:00:00',
    photos: { before: '/images/foto/gropa_para.png', after: '/images/gropa rruga 28_pas.png' },
    body: [
      'Gropa e thellë në rrugën 28 Nëntori ishte bërë rrezik i vazhdueshëm për automjetet dhe motoçiklistët që kalonin aty çdo ditë.',
      'Pas raportimit, Bashkia Elbasan e klasifikoi si ndërhyrje urgjente dhe e asfaltoi brenda dy ditësh.',
      'Segmenti është plotësisht i sheshtë dhe i sigurt që prej fillimit të shtatorit.',
    ],
  },
  {
    slug: 'mbetjet-rruga-ptoleme-xhuvani',
    tracking_code: 'SNJ-270338',
    title: 'Pastrohet rruga Ptoleme Xhuvani nga mbetjet',
    category: 'Mbetje',
    zone_name: 'Elbasan',
    submitted_at: '2026-06-20T12:00:00',
    resolved_at: '2026-06-25T12:00:00',
    photos: { before: '/images/foto/mbeturinat_para.png', after: '/images/978ce369806749ae84e7d2fc87999f17.jpg' },
    body: [
      'Mbetjet e grumbulluara përgjatë rrugës Ptoleme Xhuvani, të lëna pas një aktiviteti në zonë, kishin mbetur të papastruara për ditë të tëra.',
      'Ekipi i pastrimit të Bashkisë Elbasan e pastroi plotësisht segmentin dhe shtoi kalime më të shpeshta të fshesave rrugore.',
    ],
  },
];

export function getArticle(slug: string | undefined): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

/** How many cards "Të tjera të zgjidhura" shows. */
const RELATED_COUNT = 3;

/** The static pages list the first three other write-ups, in Bulletini order. */
export function relatedArticles(slug: ArticleSlug): Article[] {
  return ARTICLES.filter((article) => article.slug !== slug).slice(0, RELATED_COUNT);
}
