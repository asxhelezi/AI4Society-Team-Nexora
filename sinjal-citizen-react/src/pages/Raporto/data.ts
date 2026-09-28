/** Static content of the report form (raporto.html Component fields). Albanian, translated in the DOM by i18n.js. */

export type Step = 1 | 2 | 3 | 4;

export const STEP_NAMES: Record<Step, string> = {
  1: 'Kategoria',
  2: 'Vendndodhja',
  3: 'Raportimi',
  4: 'Kontrolli & Dërgimi',
};

export const STEP_HEADINGS: Record<Step, string> = {
  1: 'Çfarë problemi dëshiron të raportosh?',
  2: 'Ku ndodhet problemi?',
  3: 'Detajet e raportimit',
  4: 'Kontrollo raportimin',
};

export interface Category {
  /** Albanian label; also what is sent to the backend as `category`. */
  name: string;
  /** Material Symbols ligature. */
  icon: string;
  subs: string[];
}

export const CATEGORIES: Category[] = [
  { name: 'Infrastrukturë', icon: 'construction', subs: ['Gropë në rrugë', 'Trotuar i dëmtuar', 'Pusetë e dëmtuar', 'Asfalt i dëmtuar', 'Tjetër'] },
  { name: 'Mbetje', icon: 'delete_outline', subs: ['Mbetje të grumbulluara', 'Kosh i tejmbushur', 'Mungesë koshash', 'Hedhje e paligjshme mbetjesh', 'Tjetër'] },
  { name: 'Ndriçim', icon: 'lightbulb', subs: ['Ndriçim jo funksional', 'Shtyllë e dëmtuar', 'Errësirë e zgjatur', 'Ndriçim me ndërprerje', 'Tjetër'] },
  { name: 'Trafik & Sinjalistikë', icon: 'traffic', subs: ['Semafor jo funksional', 'Sinjalistikë e dëmtuar ose e munguar', 'Vija të fshira kalimi këmbësorësh', 'Parkim i parregullt', 'Tjetër'] },
  { name: 'Hapësira të gjelbra', icon: 'park', subs: ['Bimësi e neglizhuar', 'Pemë e rrëzuar ose e rrezikshme', 'Pajisje lojrash e dëmtuar', 'Mungesë ujitjeje', 'Tjetër'] },
  { name: 'Hapësira publike', icon: 'location_city', subs: ['Mobilje urbane e dëmtuar', 'Vandalizëm', 'Aksesueshmëri e kufizuar', 'Mungesë mirëmbajtjeje', 'Tjetër'] },
  { name: 'Ujë & Kanalizime', icon: 'water_drop', subs: ['Rrjedhje uji', 'Kanalizim i bllokuar', 'Ndërprerje e furnizimit me ujë', 'Vërshim ose pellgëzim uji', 'Tjetër'] },
  { name: 'Administratë', icon: 'account_balance', subs: ['Vonesë në shërbim', 'Informacion i pasaktë', 'Sjellje jo profesionale', 'Problem me dokumentacion', 'Tjetër'] },
];

/**
 * "Other": not a tile in the grid but a separate option under it. It has no subcategories;
 * the citizen types what the problem is instead, and that text is sent as the subcategory.
 */
export const OTHER_CATEGORY = 'Tjetër';

/** Stages shown on the success screen (only the first is reached). */
export const STATUS_LABELS = ['Dërguar', 'Marrë në shqyrtim', 'Në proces', 'Zgjidhur'];

/** Centre of the picker map and the "current location" demo point (Elbasan). */
export const DEMO_LAT = 41.1118;
export const DEMO_LON = 20.0812;

/** Max words in the description (extra words are cut off while typing). */
export const MAX_DESC_WORDS = 100;

/** Backend limit: at most 10 citizen photos per report (files.py). */
export const MAX_PHOTOS = 10;

/** Backend field limits (schemas.ReportCreate). */
export const MAX_TITLE_CHARS = 160;
export const MAX_DESCRIPTION_CHARS = 5000;
export const MAX_ADDRESS_CHARS = 300;
export const MAX_SUBCATEGORY_CHARS = 160;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function wordCount(s: string): number {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/** The static page's onDesc: keep at most 100 words (whitespace is collapsed once over the limit). */
export function limitWords(value: string, max = MAX_DESC_WORDS): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > max ? words.slice(0, max).join(' ') : value;
}
