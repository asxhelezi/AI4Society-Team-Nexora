/*
 * Demo data from the static site, kept verbatim so the mocked app behaves exactly like it:
 * - TRACKED: the sample dataset of gjurmo.html (`known`), dates as written there.
 * - MAP_PINS: harta.html's HARTA_PINS (resolved cases from the Bulletini + in-process ones).
 * The mock API (./reportsMock.ts) converts these to the backend's shapes.
 */
import type { CitizenStage } from '../types';

export interface DemoTrackedReport {
  /** Case write-up number (blog-cover-<n>.html) if the case was published in the Bulletini. */
  article?: number;
  city: string;
  category: string;
  location: string;
  desc: string;
  stage: CitizenStage;
  reason?: string;
  /** Albanian dates per stage, e.g. "3 Mars 2026". */
  dates: Partial<Record<CitizenStage, string>>;
}

export const TRACKED: Record<string, DemoTrackedReport> = {
  'SNJ-204817': {
    article: 1,
    city: 'Tiranë',
    category: 'Ndriçim',
    location: 'Rruga e Kavajës',
    desc: 'Dymbëdhjetë shtylla ndriçimi pa punuar mes Zogut të Zi dhe ish-Bllokut.',
    stage: 'perfunduar',
    dates: { derguar: '3 Mars 2026', verifikuar: '4 Mars 2026', ne_proces: '9 Mars 2026', perfunduar: '19 Mars 2026' },
  },
  'SNJ-198340': {
    article: 2,
    city: 'Durrës',
    category: 'Rrugë',
    location: 'Bulevardi Dyrrah',
    desc: 'Gropë me diametër rreth një metër afër kryqëzimit me Rrugën Taulantia.',
    stage: 'perfunduar',
    dates: { derguar: '11 Shkurt 2026', verifikuar: '11 Shkurt 2026', ne_proces: '18 Shkurt 2026', perfunduar: '2 Mars 2026' },
  },
  'SNJ-176092': {
    article: 3,
    city: 'Shkodër',
    category: 'Mbetje',
    location: 'Bulevardi Skënderbeu',
    desc: 'Kosha me kapak të prishur që mbushen brenda pak orësh.',
    stage: 'perfunduar',
    dates: { derguar: '20 Janar 2026', verifikuar: '22 Janar 2026', ne_proces: '2 Shkurt 2026', perfunduar: '14 Shkurt 2026' },
  },
  'SNJ-231455': {
    article: 4,
    city: 'Vlorë',
    category: 'Rrugë',
    location: 'Lungomare',
    desc: 'Pllaka të ngritura përpara hyrjes së plazhit publik.',
    stage: 'perfunduar',
    dates: { derguar: '7 Prill 2026', verifikuar: '8 Prill 2026', ne_proces: '15 Prill 2026', perfunduar: '28 Prill 2026' },
  },
  'SNJ-258710': {
    article: 5,
    city: 'Elbasan',
    category: 'Ujë',
    location: 'Rruga Kozma Naska',
    desc: 'Pusetat nuk kullojnë pas shiut; rruga mbetet nën ujë.',
    stage: 'perfunduar',
    dates: { derguar: '15 Maj 2026', verifikuar: '15 Maj 2026', ne_proces: '16 Maj 2026', perfunduar: '17 Maj 2026' },
  },
  'SNJ-270338': {
    article: 6,
    city: 'Korçë',
    category: 'Rrugë',
    location: 'Bulevardi Republika',
    desc: 'Vizat e kalimit për këmbësorë përballë shkollës janë fshirë plotësisht.',
    stage: 'perfunduar',
    dates: { derguar: '2 Qershor 2026', verifikuar: '3 Qershor 2026', ne_proces: '10 Qershor 2026', perfunduar: '23 Qershor 2026' },
  },
  'SNJ-311204': {
    city: 'Elbasan',
    category: 'Rrugë',
    location: 'Bulevardi Qemal Stafa',
    desc: 'Gropë e thellë afër ndërprerjes me rrugën dytësore, rrezikon automjetet.',
    stage: 'ne_proces',
    dates: { derguar: '2 Shtator 2026', verifikuar: '3 Shtator 2026', ne_proces: '12 Shtator 2026' },
  },
  'SNJ-298117': {
    city: 'Elbasan',
    category: 'Ndriçim',
    location: 'Rruga Rinia',
    desc: 'Disa shtylla ndriçimi pa dritë prej më shumë se një jave.',
    stage: 'ne_proces',
    dates: { derguar: '28 Gusht 2026', verifikuar: '29 Gusht 2026', ne_proces: '5 Shtator 2026' },
  },
  'SNJ-304455': {
    city: 'Elbasan',
    category: 'Mbetje',
    location: 'Rruga 11 Nëntori',
    desc: 'Koshat mbushen çdo ditë dhe nuk grumbullohen rregullisht.',
    stage: 'ne_proces',
    dates: { derguar: '6 Shtator 2026', verifikuar: '7 Shtator 2026', ne_proces: '14 Shtator 2026' },
  },
  'SNJ-267790': {
    city: 'Elbasan',
    category: 'Rrugë',
    location: 'Lagjja Partizani',
    desc: 'Pllaka trotuari të thyera përgjatë një segmenti prej 30 metrash.',
    stage: 'perfunduar',
    dates: { derguar: '19 Korrik 2026', verifikuar: '20 Korrik 2026', ne_proces: '26 Korrik 2026', perfunduar: '6 Gusht 2026' },
  },
  'SNJ-320981': {
    city: 'Elbasan',
    category: 'Mjedis',
    location: 'Rruga Kozma Naska',
    desc: 'Një pemë e rrëzuar nga era bllokon pjesërisht trotuarin.',
    stage: 'ne_proces',
    dates: { derguar: '15 Shtator 2026', verifikuar: '16 Shtator 2026', ne_proces: '17 Shtator 2026' },
  },
  'SNJ-241663': {
    city: 'Elbasan',
    category: 'Ndërtesa',
    location: 'Rruga Thoma Kalefi',
    desc: 'Suva e rënë nga fasada e një ndërtese rrezikon këmbësorët.',
    stage: 'perfunduar',
    dates: { derguar: '3 Korrik 2026', verifikuar: '4 Korrik 2026', ne_proces: '9 Korrik 2026', perfunduar: '22 Korrik 2026' },
  },
  'SNJ-259901': {
    city: 'Elbasan',
    category: 'Administratë',
    location: 'Zyra e Gjendjes Civile',
    desc: 'Kërkesë e dyfishtë e trajtuar tashmë nëpërmjet një aplikimi tjetër zyrtar.',
    stage: 'refuzuar',
    reason: 'Rasti është jashtë fushës së shërbimeve që trajton Sinjal.',
    dates: { derguar: '1 Shtator 2026', verifikuar: '2 Shtator 2026', refuzuar: '4 Shtator 2026' },
  },
};

/** gjurmo.html `_lookup` fallback: any other SNJ-###### code gets a generated, deterministic result. */
export const GENERATED = {
  categories: ['Mbetje', 'Rrugë', 'Mjedis', 'Ndriçim', 'Ndërtesa', 'Administratë', 'Ujë', 'Tjetër'],
  locations: ['Bulevardi Qemal Stafa', 'Rruga Rinia', 'Rruga 11 Nëntori', 'Lagjja 5 Maji', 'Rruga Thoma Kalefi', 'Lagjja Partizani'],
  desc: 'Raportim në shqyrtim nga zyra përgjegjëse e Bashkisë Elbasan.',
  rejectReason: 'Nuk përputhet me kriteret e raportimit publik.',
  dates: { derguar: '21 Shtator 2026', verifikuar: '22 Shtator 2026', ne_proces: '24 Shtator 2026', perfunduar: '30 Shtator 2026', refuzuar: '23 Shtator 2026' },
} as const;

/**
 * The stage a code gets when it isn't in TRACKED (gjurmo.html / raportet-e-mia.html
 * `_statusFor`): derived from the number in the code, so it's stable across visits.
 */
export function generatedStage(code: string): CitizenStage {
  const n = parseInt((code.match(/\d+/) || ['0'])[0], 10) || 0;
  const idx = n % 9;
  if (idx <= 1) return 'derguar';
  if (idx <= 3) return 'verifikuar';
  if (idx <= 6) return 'ne_proces';
  if (idx === 7) return 'refuzuar';
  return 'perfunduar';
}

export interface DemoMapPin {
  id: string;
  lat: number;
  lon: number;
  street: string;
  title: string;
  category: string;
  reportId: string;
  status: 'resolved' | 'pending';
  beforePhoto: string;
  afterPhoto?: string;
  /** Case write-up number (blog-cover-<n>.html) for resolved pins. */
  article?: number;
}

export const MAP_PINS: DemoMapPin[] = [
  {
    id: 'r1',
    lat: 41.116,
    lon: 20.073,
    street: 'Rruga Elbasan–Çërrik',
    title: 'Rikthehet shenja rrugore',
    category: 'Trafik',
    reportId: 'SNJ-204817',
    status: 'resolved',
    beforePhoto: '/images/34c8dada4aa146187cd3b7d2fd7d4887.jpg',
    afterPhoto: '/images/foto/stop_pas.png',
    article: 1,
  },
  {
    id: 'r2',
    lat: 41.1095,
    lon: 20.085,
    street: 'Rruga Aleks Vini',
    title: 'Rikthehet ndriçimi',
    category: 'Ndriçim',
    reportId: 'SNJ-198340',
    status: 'resolved',
    beforePhoto: '/images/foto/ndricimi_para.png',
    afterPhoto: '/images/37cb8998f248130bf8f3a84e0582a094.jpg',
    article: 2,
  },
  {
    id: 'r3',
    lat: 41.108,
    lon: 20.079,
    street: 'Rruga e Teqes',
    title: 'Zhbllokohet kanali kullues',
    category: 'Infrastrukturë',
    reportId: 'SNJ-176092',
    status: 'resolved',
    beforePhoto: '/images/foto/puseta_para.png',
    afterPhoto: '/images/foto/puseta_pas.png',
    article: 3,
  },
  {
    id: 'r4',
    lat: 41.1113,
    lon: 20.0808,
    street: 'Shëtitorja Aqif Pasha',
    title: 'Trotuari i riparuar',
    category: 'Infrastrukturë',
    reportId: 'SNJ-231455',
    status: 'resolved',
    beforePhoto: '/images/foto/shetitore_para.png',
    afterPhoto: '/images/foto/shetitore_pas.png',
    article: 4,
  },
  {
    id: 'r5',
    lat: 41.1125,
    lon: 20.084,
    street: 'Rruga 28 Nëntori',
    title: 'Riparohet gropa',
    category: 'Infrastrukturë',
    reportId: 'SNJ-258710',
    status: 'resolved',
    beforePhoto: '/images/foto/gropa_para.png',
    afterPhoto: '/images/gropa rruga 28_pas.png',
    article: 5,
  },
  {
    id: 'r6',
    lat: 41.11,
    lon: 20.076,
    street: 'Rruga Ptoleme Xhuvani',
    title: 'Pastrohet nga mbetjet',
    category: 'Mbetje',
    reportId: 'SNJ-270338',
    status: 'resolved',
    beforePhoto: '/images/foto/mbeturinat_para.png',
    afterPhoto: '/images/978ce369806749ae84e7d2fc87999f17.jpg',
    article: 6,
  },
  {
    id: 'p1',
    lat: 41.1135,
    lon: 20.0815,
    street: 'Bulevardi Qemal Stafa',
    title: 'Gropë e thellë',
    category: 'Rrugë',
    reportId: 'SNJ-311204',
    status: 'pending',
    beforePhoto: '/images/foto/grope e madhe.png',
  },
  {
    id: 'p2',
    lat: 41.109,
    lon: 20.087,
    street: 'Rruga Rinia',
    title: 'Shtylla ndriçimi pa dritë',
    category: 'Ndriçim',
    reportId: 'SNJ-298117',
    status: 'pending',
    beforePhoto: '/images/foto/ndricim i prishur.png',
  },
  {
    id: 'p3',
    lat: 41.107,
    lon: 20.082,
    street: 'Rruga 11 Nëntori',
    title: 'Koshat nuk grumbullohen',
    category: 'Mbetje',
    reportId: 'SNJ-304455',
    status: 'pending',
    beforePhoto: '/images/foto/koshi mbeturinave.png',
  },
  {
    id: 'p4',
    lat: 41.115,
    lon: 20.079,
    street: 'Rruga Kozma Naska',
    title: 'Pemë e rrëzuar bllokon trotuarin',
    category: 'Mjedis',
    reportId: 'SNJ-320981',
    status: 'pending',
    beforePhoto: '/images/foto/pema.png',
  },
];
