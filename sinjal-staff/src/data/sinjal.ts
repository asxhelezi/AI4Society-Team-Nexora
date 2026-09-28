/* SINJAL, staff desktop: shared seed data and helpers.
   Typed port of design/mock-data.js. Every page reads from this one module so
   reports, departments, employees and the performance engine agree
   everywhere (Kreu, Raportet, Harta, Departamentet, Automatizimet,
   Performanca). When a backend exists, replace `reports`/`history` with API
   data and keep the formulas as they are. */

import logoUrl from '../assets/logo.png';
import type {
  Activity,
  Automation,
  AutomationType,
  AutonomyId,
  AutonomyMeta,
  CaseOverrides,
  Category,
  CategoryId,
  ConfTier,
  Department,
  DeptId,
  DuplicateCandidate,
  Employee,
  HistoricalOverride,
  HistoryRecord,
  MissingField,
  MissingInfoRequest,
  ModerationFlag,
  ModerationType,
  Notification,
  PerfEngine,
  PerfFilter,
  PerfRecord,
  Priority,
  PriorityMeta,
  Publication,
  Report,
  Risk,
  RoutingRule,
  SlaRule,
  SlaTarget,
  Status,
  StatusMeta,
  TierMeta,
  TimelineEvent,
  ToneKey,
} from './types';

let NOW = new Date('2026-09-23T15:40:00');
const HOUR_MS = 3600000;

// Citizen photos were hosted blobs in the design tool and are not part of the
// handoff. The references are kept, because logic depends on whether a case
// has a photo (e.g. the before/after verification check); the Photo component
// shows a neutral placeholder when an image cannot be loaded.
const ASSETS = {
  logo: logoUrl,
  photos: [
    '/_blob/209f0c2bc20f3e0e6e1d5e9b54bce054',
    '/_blob/3364e0de199cdbb5e3afd0f319bfdc30',
    '/_blob/0aec477b7b9789067a00ad1b8a9e93eb',
    '/_blob/c662354f264478f93391a7af55aae197',
    '/_blob/22d921eeb0d432384f32e721a3dfc1ce',
    '/_blob/92ff6347a4d44a5a25fd912a15e5cd6b',
  ],
};

const DEPARTMENTS: Department[] = [
  { id: 'infra', name: 'Infrastrukturë' },
  { id: 'sherbime', name: 'Shërbime Publike' },
  { id: 'mjedis', name: 'Mjedis' },
  { id: 'ndricim', name: 'Ndriçim' },
  { id: 'uje', name: 'Ujësjellës' },
];

// coverageZones: which zones each employee is the primary responder for.
// Authored demo content, used by Departamentet's workload-balancing
// suggestion and shown on the employee card as "Zonat e mbulimit".
const EMPLOYEES: Employee[] = [
  { id: 'ahoxha', name: 'A. Hoxha', full: 'Ardit Hoxha', dept: 'infra', coverageZones: ['Qendër', 'Bradashesh', 'Shirgjan'] },
  { id: 'vcara', name: 'V. Cara', full: 'Vjollca Cara', dept: 'infra', coverageZones: ['Papër', 'Shushicë'] },
  { id: 'bkrasniqi', name: 'B. Krasniqi', full: 'Blerim Krasniqi', dept: 'infra', coverageZones: ['Gjinar', 'Labinot', 'Zavalinë'] },
  { id: 'edervishi', name: 'E. Dervishi', full: 'Elona Dervishi', dept: 'sherbime', coverageZones: ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër'] },
  { id: 'krama', name: 'K. Rama', full: 'Klodian Rama', dept: 'sherbime', coverageZones: ['Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'] },
  { id: 'lmeta', name: 'L. Meta', full: 'Lira Meta', dept: 'mjedis', coverageZones: ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër', 'Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'] },
  { id: 'dsula', name: 'D. Sula', full: 'Dorina Sula', dept: 'ndricim', coverageZones: ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër'] },
  { id: 'gcela', name: 'G. Çela', full: 'Gentian Çela', dept: 'ndricim', coverageZones: ['Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'] },
  { id: 'fbasha', name: 'F. Basha', full: 'Fatjon Basha', dept: 'uje', coverageZones: ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër', 'Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'] },
];

const ZONES = ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër', 'Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'];

// Illustrative placement for the map widgets: a stylised layout, not real GPS
// coordinates. x/y are percentages of a 0–100 square.
const ZONE_COORDS: Record<string, { x: number; y: number }> = {
  Qendër: { x: 50, y: 48 },
  Bradashesh: { x: 74, y: 28 },
  Shirgjan: { x: 60, y: 18 },
  Papër: { x: 26, y: 34 },
  Shushicë: { x: 40, y: 76 },
  Gjinar: { x: 80, y: 70 },
  Labinot: { x: 84, y: 44 },
  Zavalinë: { x: 16, y: 58 },
};

// Category → department mapping used for routing everywhere, plus the default
// priority and standard exception clause shown in Departamentet.
const CATEGORIES: Category[] = [
  { id: 'mbetje', label: 'Mbetje', dept: 'sherbime', defaultPriority: 'E mesme', exception: 'Nëse AI identifikon rrezik shëndetësor → Urgjente' },
  { id: 'gropa', label: 'Gropa në rrugë', dept: 'infra', defaultPriority: 'E lartë', exception: 'Nëse AI identifikon rrezik për kalimtarë → Urgjente' },
  { id: 'ndricim', label: 'Ndriçim publik', dept: 'ndricim', defaultPriority: 'E mesme', exception: 'Nëse prek një zonë me shkollë/kalim këmbësorësh → E lartë' },
  { id: 'infra', label: 'Infrastrukturë', dept: 'infra', defaultPriority: 'E lartë', exception: 'Nëse AI identifikon rrezik strukturor → Urgjente' },
  { id: 'hapesira', label: 'Hapësira publike', dept: 'sherbime', defaultPriority: 'E ulët', exception: 'Asnjë' },
];

// One semantic colour vocabulary for the whole app (pills, pins, dots, chart
// marks). Red = urgent, amber = under way / waiting, green = resolved, dark
// neutral = new, light neutral = pending or closed out, purple = came back.
const TONE: Record<ToneKey, string> = { critical: '#C23B31', warning: '#B8860B', success: '#2E7D4F', fresh: '#4A4640', pending: '#8A847C', reappeared: '#8E5FB0' };
const STATUS_META: Record<Status, StatusMeta> = {
  'I ri': { bg: '#EDEAE3', ink: '#1B1917', dot: TONE.fresh, tier: 'new' },
  'Në shqyrtim': { bg: '#EDEAE3', ink: '#4A4640', dot: TONE.pending, tier: 'review' },
  Caktuar: { bg: '#EDEAE3', ink: '#4A4640', dot: TONE.pending, tier: 'review' },
  'Në punë': { bg: '#F5EBD6', ink: '#7A5A0B', dot: TONE.warning, tier: 'progress' },
  'Kërkon informacion': { bg: '#F5EBD6', ink: '#7A5A0B', dot: TONE.warning, tier: 'progress' },
  Zgjidhur: { bg: '#E1EEE5', ink: '#1E5C3A', dot: TONE.success, tier: 'resolved' },
  Mbyllur: { bg: '#E4DFD6', ink: '#4A4640', dot: TONE.success, tier: 'resolved' },
  Dublikatë: { bg: '#EDEAE3', ink: '#6B665F', dot: TONE.pending, tier: 'review' },
  Refuzuar: { bg: '#EDEAE3', ink: '#6B665F', dot: TONE.pending, tier: 'review' },
};
const STATUS_ORDER: Status[] = ['I ri', 'Në shqyrtim', 'Caktuar', 'Në punë', 'Zgjidhur', 'Mbyllur', 'Dublikatë', 'Refuzuar', 'Kërkon informacion'];

const PRIORITY_META: Record<Priority, PriorityMeta> = {
  'E ulët': { color: '#8A847C', weight: 0 },
  'E mesme': { color: '#4A4640', weight: 1 },
  'E lartë': { color: '#B8860B', weight: 2 },
  Urgjente: { color: '#C23B31', weight: 3 },
};
const PRIORITY_ORDER: Priority[] = ['E ulët', 'E mesme', 'E lartë', 'Urgjente'];

const p2 = (n: number) => (n < 10 ? '0' : '') + n;

function h(hours: number): Date {
  return new Date(NOW.getTime() + hours * HOUR_MS);
}
function fmtDateTime(d: Date): string {
  const days = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
  return days[d.getDay()] + ' ' + p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + ' · ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
function fmtTime(d: Date): string {
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
}
// ONE duration format for the whole app: "24 min", "3 orë 54 min", "2 orë",
// "1,7 ditë"; negative (overdue) values get a leading "−".
function fmtHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';
  const neg = hours < 0;
  const a = Math.abs(hours);
  let out: string;
  if (a < 1) out = Math.max(1, Math.round(a * 60)) + ' min';
  else if (a < 24) {
    let hh = Math.floor(a);
    let mm = Math.round((a - hh) * 60);
    if (mm === 60) {
      hh += 1;
      mm = 0;
    }
    out = hh + ' orë' + (mm ? ' ' + mm + ' min' : '');
  } else {
    const dd = Math.round((a / 24) * 10) / 10;
    out = String(dd).replace('.', ',') + ' ditë';
  }
  return (neg ? '−' : '') + out;
}
const fmtSLA = (hoursRemaining: number | null | undefined) => fmtHours(hoursRemaining);
const fmtDuration = (hours: number | null | undefined) => fmtHours(hours);
function deptName(id: string): string {
  const d = DEPARTMENTS.find((x) => x.id === id);
  return d ? d.name : id;
}
function empName(id: string): string {
  const e = EMPLOYEES.find((x) => x.id === id);
  return e ? e.name : id;
}
function catLabel(id: string): string {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : id;
}
function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) as Category;
}

// ---- Report seed rows ----------------------------------------------------
// [id, category, title, zone, address, priority, status, dept, resp,
//  submittedHoursAgo, slaHours, aiConf, aiRisk, photoIdx, citizenInitials]
type SeedRow = [string, CategoryId, string, string, string, Priority, Status, DeptId, string | null, number, number, number, Risk, number, string];
const SEED: SeedRow[] = [
  ['02481', 'mbetje', 'Mbetje të pambledhura prej 4 ditësh', 'Qendër', 'Rr. Qemal Stafa, pranë Nr. 14', 'E lartë', 'Në punë', 'sherbime', 'edervishi', -3, 2, 91, 'I ulët', 4, 'A. M.'],
  ['02480', 'gropa', 'Gropë e thellë në mes të rrugës', 'Bradashesh', 'Rr. Bradashesh–Shirgjan, km 2', 'Urgjente', 'Caktuar', 'infra', 'ahoxha', -1.5, 4, 88, 'I lartë', 1, 'E. K.'],
  ['02479', 'ndricim', 'Poçe e djegur, rruga mbetet pa dritë', 'Shirgjan', 'Rr. Kryesore, poçja nr. 6', 'E mesme', 'I ri', 'ndricim', null, -0.6, 12, 76, 'I mesëm', 3, 'F. B.'],
  ['02478', 'infra', 'Kapak kanalizimi i çarë, rrezik kalimtarësh', 'Qendër', 'Bulevardi Nacional, para Nr. 22', 'Urgjente', 'Në shqyrtim', 'infra', null, -0.2, 4, 94, 'I lartë', 0, 'M. D.'],
  ['02477', 'hapesira', 'Bankina e parkut e mbushur me barishte', 'Qendër', 'Parku Rinia, hyrja jugore', 'E ulët', 'I ri', 'sherbime', null, -8, 48, 62, 'I ulët', 5, 'L. Ç.'],
  ['02476', 'gropa', 'Gropa të shumta pas shirave të fundit', 'Papër', 'Rr. Papër, seksioni qendror', 'E lartë', 'Caktuar', 'infra', 'bkrasniqi', -20, 6, 85, 'I mesëm', 2, 'R. S.'],
  ['02475', 'mbetje', 'Kontejner i rrëzuar, mbeturina të shpërndara', 'Shushicë', 'Rr. Shushicë, afër shkollës', 'E mesme', 'Në punë', 'sherbime', 'krama', -26, 24, 90, 'I ulët', 4, 'A. V.'],
  ['02474', 'ndricim', 'Errësirë totale në 3 poçe rresht', 'Qendër', 'Rr. Aleksandër Moisiu', 'E lartë', 'Në punë', 'ndricim', 'dsula', -30, 12, 93, 'I mesëm', 3, 'K. P.'],
  ['02473', 'infra', 'Trotuar i shembur pranë kopshtit', 'Gjinar', 'Rr. Gjinar, pranë kopshtit Nr. 3', 'E mesme', 'Caktuar', 'infra', 'vcara', -33, 48, 79, 'I ulët', 1, 'S. T.'],
  ['02472', 'gropa', 'Gropë e vogël, rrezik për motoçiklistë', 'Labinot', 'Rr. Labinot–Fushë', 'E ulët', 'I ri', 'infra', null, -36, 72, 58, 'I ulët', 2, 'B. N.'],
  ['02471', 'hapesira', 'Bankina e lulishtes e dëmtuar nga ndërtimi', 'Zavalinë', 'Lulishtja Zavalinë', 'E ulët', 'Kërkon informacion', 'sherbime', 'edervishi', -40, 48, 54, 'I ulët', 5, 'H. M.'],
  ['02470', 'mbetje', 'Pikë e paligjshme mbeturinash pranë lumit', 'Shushicë', 'Buzë lumit Shkumbin', 'E lartë', 'Në shqyrtim', 'mjedis', null, -44, 24, 82, 'I mesëm', 4, 'D. G.'],
  ['02469', 'infra', 'Parmakë të thyer mbi urën e vjetër', 'Qendër', 'Ura e Vjetër', 'E lartë', 'Caktuar', 'infra', 'ahoxha', -48, 24, 87, 'I lartë', 0, 'P. R.'],
  ['02468', 'ndricim', 'Poçja pulson dhe fiket vazhdimisht', 'Bradashesh', 'Rr. Bradashesh Nr. 9', 'E ulët', 'Zgjidhur', 'ndricim', 'gcela', -70, 24, 71, 'I ulët', 3, 'N. K.'],
  ['02467', 'gropa', 'Gropë e riformuar pas riasfaltimit', 'Qendër', 'Rr. Qemal Stafa, pranë Nr. 14', 'E mesme', 'Në punë', 'infra', 'bkrasniqi', -72, 12, 80, 'I mesëm', 1, 'A. M.'],
  ['02466', 'mbetje', 'Kontejnerë të mbushur, era e keqe', 'Papër', 'Rr. Papër Nr. 40', 'E mesme', 'Zgjidhur', 'sherbime', 'krama', -96, 24, 88, 'I ulët', 4, 'V. L.'],
  ['02465', 'infra', 'Kanal i hapur pa mbulesë', 'Shirgjan', 'Rr. Shirgjan, pranë urës', 'Urgjente', 'Zgjidhur', 'infra', 'vcara', -100, 4, 96, 'I lartë', 0, 'E. K.'],
  ['02464', 'hapesira', 'Bangat e parkut të thyera', 'Qendër', 'Parku Rinia, ana lindore', 'E ulët', 'Mbyllur', 'sherbime', 'edervishi', -140, 72, 66, 'I ulët', 5, 'M. D.'],
  ['02463', 'ndricim', 'Ndriçim jo funksional te stacioni i autobusit', 'Qendër', 'Stacioni Autobusit, Bulevardi', 'E mesme', 'Mbyllur', 'ndricim', 'dsula', -160, 24, 84, 'I ulët', 3, 'G. F.'],
  ['02462', 'gropa', 'Gropë e madhe, ka dëmtuar goma makinash', 'Bradashesh', 'Rr. Bradashesh–Shirgjan, km 1', 'Urgjente', 'Mbyllur', 'infra', 'ahoxha', -190, 4, 92, 'I lartë', 2, 'B. N.'],
  ['02461', 'mbetje', 'Mbeturina ndërtimi të hedhura pa leje', 'Zavalinë', 'Rr. Zavalinë Nr. 3', 'E lartë', 'Refuzuar', 'mjedis', 'lmeta', -50, 24, 45, 'I ulët', 4, 'H. M.'],
  ['02460', 'infra', 'Dysheme trotuari e ngritur nga rrënjët', 'Qendër', 'Bulevardi Nacional, pranë Nr. 55', 'E ulët', 'Dublikatë', 'infra', null, -18, 48, 70, 'I ulët', 1, 'D. G.'],
  ['02459', 'gropa', 'Gropë e re, ende e pashenjuar', 'Qendër', 'Bulevardi Nacional, para Nr. 22', 'E lartë', 'Në shqyrtim', 'infra', null, -0.1, 4, 77, 'I mesëm', 0, 'S. T.'],
  ['02458', 'ndricim', 'Poçe e vjedhur, kablloja mbetur e zbuluar', 'Papër', 'Rr. Papër, kryqëzimi kryesor', 'Urgjente', 'Në shqyrtim', 'ndricim', null, -0.9, 4, 73, 'I lartë', 3, 'N. K.'],
];

const reports: Report[] = SEED.map((row) => {
  const [id, catId, title, zone, address, priority, status, dept, resp, subH, slaH, conf, risk, photoIdx, citizen] = row;
  const submittedAt = h(subH);
  const slaDeadline = h(subH + slaH);
  const slaRemaining = status === 'Zgjidhur' || status === 'Mbyllur' || status === 'Refuzuar' || status === 'Dublikatë' ? null : (slaDeadline.getTime() - NOW.getTime()) / HOUR_MS;
  const suggestedDept = categoryById(catId).dept;
  return {
    id,
    displayId: '#' + id,
    category: catId,
    categoryLabel: catLabel(catId),
    title,
    description: title + '. Qytetari ka raportuar problemin me foto shoqëruese dhe vendndodhje të saktë nëpërmjet aplikacionit SINJAL.',
    zone,
    address,
    priority,
    status,
    department: dept,
    departmentName: deptName(dept),
    responsible: resp,
    responsibleName: resp ? empName(resp) : null,
    submittedAt,
    submittedLabel: fmtDateTime(submittedAt),
    slaDeadline,
    slaRemainingHours: slaRemaining,
    slaLabel: slaRemaining === null ? '—' : fmtSLA(slaRemaining),
    slaBreached: slaRemaining !== null && slaRemaining < 0,
    slaAtRisk: slaRemaining !== null && slaRemaining >= 0 && slaRemaining <= 4,
    citizenInitials: citizen,
    photo: ASSETS.photos[photoIdx % ASSETS.photos.length],
    ai: {
      // Categorization is NOT an AI automation: the category is an ordinary
      // case field. `confidence` is the ROUTING confidence and drives the
      // automation tiers in Automatizimet.
      suggestedPriority: priority,
      confidence: conf,
      risk,
      suggestedDepartment: deptName(suggestedDept),
      rationale:
        'Routing-u bazohet në kategorinë e rastit (' +
        catLabel(catId) +
        '), zonën ' +
        zone +
        ', rregullin e departamentit ' +
        deptName(suggestedDept) +
        ' dhe ' +
        Math.max(3, Math.round(conf / 12)) +
        ' raste të ngjashme të trajtuara nga i njëjti ekip.',
    },
    assignment: {
      department: dept,
      team: deptName(dept),
      responsible: resp,
      priority,
      deadline: slaDeadline,
      approved: !!resp,
    },
    duplicateOf: null,
    duplicateCandidateId: null,
    duplicateSimilarity: null,
    reappeared: false,
    reappearedFromId: null,
    linkedIds: [],
    resolutionEvidence: [],
    timeline: [],
    resolutionHours: null,
    firstResponseHours: null,
  };
});

function byId(id: string): Report | null {
  return reports.find((r) => r.id === id) ?? null;
}
/** byId for ids the seed data guarantees exist. */
function seeded(id: string): Report {
  return byId(id) as Report;
}

// Hand-authored relationships layered on top of the seed data.
seeded('02460').duplicateOf = '02459';
seeded('02460').status = 'Dublikatë';
seeded('02459').duplicateCandidateId = '02460';
seeded('02459').duplicateSimilarity = 89;
seeded('02459').linkedIds = ['02460', '02478'];
seeded('02478').linkedIds = ['02459'];

seeded('02467').reappeared = true;
seeded('02467').reappearedFromId = '02465';
seeded('02465').linkedIds = ['02467'];

seeded('02480').linkedIds = ['02476', '02462'];
seeded('02476').linkedIds = ['02480'];
seeded('02462').linkedIds = ['02480'];

seeded('02461').resolutionEvidence = [];
seeded('02461').ai.rationale =
  'Besueshmëria e routing-ut e ulët (45%): fotoja nuk tregon nëse mbeturinat janë në hapësirë publike apo private, ndaj SINJAL nuk mund të vendoste departamentin dhe e dërgoi te Pranimi i përgjithshëm. Nëpunësi e refuzoi pas verifikimit në terren — mbeturinat u identifikuan si private.';

function seedIndex(id: string): number {
  const i = SEED.findIndex((row) => row[0] === id);
  return i === -1 ? 0 : i;
}
['02468', '02466', '02465', '02464', '02463', '02462'].forEach((id) => {
  seeded(id).resolutionEvidence = [{ photo: ASSETS.photos[(seedIndex(id) + 2) % ASSETS.photos.length], note: 'Foto pas ndërhyrjes, e ngarkuar nga ekipi në terren.' }];
});

function buildTimeline(r: Report): TimelineEvent[] {
  const t: TimelineEvent[] = [];
  // hours from NOW at which the report was submitted (negative)
  const s = (r.submittedAt.getTime() - NOW.getTime()) / HOUR_MS;
  const span = (r.slaDeadline.getTime() - r.submittedAt.getTime()) / HOUR_MS;
  t.push({ time: r.submittedAt, label: 'Qytetari dërgoi raportin.', kind: 'citizen' });
  t.push({ time: h(s + 0.02), label: 'Kategoria e rastit u regjistrua: ' + r.categoryLabel + '.', kind: 'system' });
  if (r.ai.confidence < 55) {
    t.push({ time: h(s + 0.05), label: 'SINJAL nuk e routoi dot me siguri (besueshmëri ' + r.ai.confidence + '%) — u dërgua te Pranimi i përgjithshëm.', kind: 'ai' });
  } else {
    t.push({ time: h(s + 0.05), label: 'Routing automatik te ' + r.ai.suggestedDepartment + ' (besueshmëri ' + r.ai.confidence + '%).', kind: 'ai' });
  }
  if (r.duplicateCandidateId)
    t.push({ time: h(s + 0.08), label: 'U zbulua kandidat dublikatë: ' + seeded(r.duplicateCandidateId).displayId + ' (' + r.duplicateSimilarity + '% ngjashmëri).', kind: 'ai' });
  if (r.duplicateOf) t.push({ time: h(s + 0.1), label: 'Shënuar si dublikatë e ' + seeded(r.duplicateOf).displayId + '.', kind: 'system' });
  if (r.reappeared && r.reappearedFromId) t.push({ time: r.submittedAt, label: 'Problem i ngjashëm i raportuar më parë në ' + seeded(r.reappearedFromId).displayId + '.', kind: 'ai' });
  if (r.responsible) {
    t.push({ time: h(s + 0.4), label: 'Nëpunësi konfirmoi caktimin.', kind: 'clerk' });
    t.push({ time: h(s + 0.5), label: 'Raporti u caktua te ' + r.departmentName + ' · ' + r.responsibleName + '.', kind: 'clerk' });
  }
  if (['Në punë', 'Zgjidhur', 'Mbyllur'].includes(r.status)) {
    t.push({ time: h(s + 2), label: 'Statusi ndryshoi në Në punë.', kind: 'clerk' });
  }
  if (['Zgjidhur', 'Mbyllur'].includes(r.status)) {
    t.push({ time: h(s + span * 0.7), label: 'U shtua dëshmi zgjidhjeje.', kind: 'clerk' });
    t.push({ time: h(s + span * 0.75), label: 'Statusi ndryshoi në Zgjidhur.', kind: 'clerk' });
  }
  if (r.status === 'Mbyllur') t.push({ time: r.slaDeadline, label: 'Rasti u mbyll pas verifikimit.', kind: 'clerk' });
  if (r.status === 'Refuzuar') t.push({ time: h(s + 1.2), label: 'Raporti u refuzua nga nëpunësi.', kind: 'clerk' });
  t.sort((a, b) => a.time.getTime() - b.time.getTime());
  return t;
}
reports.forEach((r) => {
  r.timeline = buildTimeline(r);
});

// resolutionHours / firstResponseHours use the exact offsets buildTimeline
// uses, so these numbers can't drift from what the case's timeline says.
reports.forEach((r) => {
  r.resolutionHours = r.status === 'Zgjidhur' || r.status === 'Mbyllur' ? ((r.slaDeadline.getTime() - r.submittedAt.getTime()) / HOUR_MS) * 0.75 : null;
  r.firstResponseHours = r.responsible ? 0.4 : null;
});

// ---- Notifications --------------------------------------------------------
const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'action',
    group: 'Kërkon veprim',
    title: 'Raporti ' + seeded('02478').displayId + ' është në rrezik SLA',
    body: 'Mbeten ' + fmtSLA(seeded('02478').slaRemainingHours) + '. Kapak kanalizimi i çarë, Bulevardi Nacional.',
    reportId: '02478',
    time: h(-0.15),
    read: false,
  },
  {
    id: 'n2',
    type: 'action',
    group: 'Kërkon veprim',
    title: '3 raporte kanë nevojë për caktim',
    body: 'Raporte të reja pa përgjegjës në Infrastrukturë dhe Ndriçim.',
    filter: { status: 'I ri' },
    time: h(-0.4),
    read: false,
  },
  {
    id: 'n3',
    type: 'action',
    group: 'Kërkon veprim',
    title: 'Dublikatë e mundshme: ' + seeded('02459').displayId,
    body: '89% ngjashmëri me ' + seeded('02460').displayId + '.',
    reportId: '02459',
    time: h(-0.5),
    read: false,
  },
  {
    id: 'n4',
    type: 'action',
    group: 'Kërkon veprim',
    title: 'Routing me besueshmëri të ulët: ' + seeded('02461').displayId,
    body: '45% besueshmëri — u dërgua te Pranimi i përgjithshëm për vendim manual.',
    reportId: '02461',
    time: h(-2),
    read: false,
  },
  {
    id: 'n5',
    type: 'action',
    group: 'Kërkon veprim',
    title: 'Raport i përsëritur: ' + seeded('02467').displayId,
    body: 'Problem i ngjashëm me ' + seeded('02465').displayId + ', tashmë i shënuar Zgjidhur.',
    reportId: '02467',
    time: h(-3),
    read: false,
  },
  {
    id: 'n6',
    type: 'ai',
    group: 'AI/Sistemi',
    title: 'Rrugëzim automatik u ekzekutua',
    body: seeded('02481').displayId + ' u caktua automatikisht te Shërbime Publike.',
    reportId: '02481',
    time: h(-3),
    read: true,
  },
  {
    id: 'n7',
    type: 'info',
    group: 'Informacion',
    title: 'Statusi ndryshoi: ' + seeded('02467').displayId,
    body: 'Në punë · caktuar te ' + seeded('02467').responsibleName + '.',
    reportId: '02467',
    time: h(-4),
    read: true,
  },
  {
    id: 'n8',
    type: 'completion',
    group: 'Përfunduar',
    title: 'Raporti ' + seeded('02465').displayId + ' u zgjidh',
    body: 'Kanal i hapur pa mbulesë, Shirgjan.',
    reportId: '02465',
    time: h(-6),
    read: true,
  },
  {
    id: 'n9',
    type: 'info',
    group: 'Informacion',
    title: 'Raport i lidhur u krijua',
    body: seeded('02480').displayId + ' lidhur gjeografikisht me ' + seeded('02476').displayId + '.',
    reportId: '02480',
    time: h(-9),
    read: true,
  },
  { id: 'n10', type: 'system', group: 'Sistemi', title: 'Raporti javor u gjenerua', body: 'Performanca · javë 38, 2026.', time: h(-20), read: true },
  {
    id: 'n11',
    type: 'action',
    group: 'Kërkon veprim',
    title: 'Verifikim mbylljeje: ' + seeded('02464').displayId,
    body: 'Dëshmia e zgjidhjes pret konfirmim përfundimtar.',
    reportId: '02464',
    time: h(-30),
    read: true,
  },
  { id: 'n12', type: 'ai', group: 'AI/Sistemi', title: 'Zbulim dublikate u ekzekutua', body: '1 çift dublikatësh u identifikua këtë orë.', time: h(-0.5), read: false },
];

// ---- Automation rules -----------------------------------------------------
const automations: Automation[] = [
  { id: 'a1', name: 'Rrugëzim automatik — Mbetje', condition: 'Kategoria = Mbetje', action: 'Cakto → Shërbime Publike', active: true, lastRun: h(-3), affected: 4 },
  { id: 'a2', name: 'Rrugëzim automatik — Ndriçim publik', condition: 'Kategoria = Ndriçim publik', action: 'Cakto → Ndriçim', active: true, lastRun: h(-0.6), affected: 3 },
  { id: 'a3', name: 'Njoftim SLA', condition: 'SLA < 4 orë', action: 'Njofto përgjegjësin + supervisorin', active: true, lastRun: h(-0.15), affected: 2 },
  { id: 'a4', name: 'Zbulim dublikatësh', condition: 'Ngjashmëri > 85%', action: 'Sugjero dublikatë', active: true, lastRun: h(-0.5), affected: 1 },
  { id: 'a5', name: 'Rrugëzim automatik — Gropa', condition: 'Kategoria = Gropa në rrugë', action: 'Cakto → Infrastrukturë', active: true, lastRun: h(-0.1), affected: 5 },
  { id: 'a6', name: 'Sinjalizim përsëritjeje', condition: 'Ngjashmëri gjeografike > 80% me rast të mbyllur', action: 'Shëno si i përsëritur', active: false, lastRun: h(-70), affected: 1 },
];

// ---- Recent activity feed (Kreu) -----------------------------------------
// Hand-authored, but every entry names a real report whose current status
// matches what the feed claims.
const ACTIVITY: Activity[] = [
  { id: 'act1', kind: 'resolved', reportId: '02465', minutesAgo: 4 },
  { id: 'act2', kind: 'auto_assigned', reportId: '02481', minutesAgo: 11 },
  { id: 'act3', kind: 'reviewed', reportId: '02478', minutesAgo: 18, actor: 'Drita K.' },
  { id: 'act4', kind: 'reappeared', reportId: '02467', minutesAgo: 24 },
];

// ==========================================================================
// ---- Automatizimet: the automation layer ----------------------------------
// ==========================================================================
// Automatizo → Monitoro → Ndërhy kur duhet → Regjistro ndërhyrjen →
// Përmirëso rregullat. Categorization is NOT here: category is a case field.

const CLERKS = ['Drita K.', 'Ermal K.'];
const INTAKE = 'Pranimi i përgjithshëm';

const TEAMS: Record<DeptId, string[]> = {
  infra: ['Mirëmbajtja e rrugëve', 'Kanalizime & trotuare'],
  sherbime: ['Pastrimi', 'Gjelbërimi & parqet'],
  mjedis: ['Inspektimi mjedisor'],
  ndricim: ['Rrjeti i ndriçimit'],
  uje: ['Rrjeti i ujësjellësit'],
};

// Routing rules, evaluated top to bottom: first active match wins.
const ROUTING_RULES: RoutingRule[] = [
  {
    id: 'rr14',
    no: 14,
    category: 'gropa',
    zone: 'Qendër',
    dept: 'infra',
    team: 'Mirëmbajtja e rrugëve',
    exception: 'Nëse prioriteti = Urgjente → Eskalimi #4 (njofto përgjegjësin e departamentit)',
    active: true,
  },
  { id: 'rr15', no: 15, category: 'gropa', zone: null, dept: 'infra', team: 'Mirëmbajtja e rrugëve', exception: 'Nëse rrezik për kalimtarë → Urgjente', active: true },
  { id: 'rr16', no: 16, category: 'infra', zone: null, dept: 'infra', team: 'Kanalizime & trotuare', exception: 'Nëse rrezik strukturor → Urgjente', active: true },
  { id: 'rr11', no: 11, category: 'mbetje', zone: null, dept: 'sherbime', team: 'Pastrimi', exception: 'Nëse rrezik shëndetësor → Urgjente', active: true },
  { id: 'rr12', no: 12, category: 'hapesira', zone: null, dept: 'sherbime', team: 'Gjelbërimi & parqet', exception: null, active: true },
  { id: 'rr13', no: 13, category: 'ndricim', zone: null, dept: 'ndricim', team: 'Rrjeti i ndriçimit', exception: 'Nëse pranë shkollës / kalimit të këmbësorëve → E lartë', active: true },
];

function matchRule<R extends Pick<RoutingRule, 'active' | 'category' | 'zone'>>(rules: R[], r: { category: string; zone: string }): R | null {
  for (const ru of rules) {
    if (!ru.active) continue;
    if (ru.category !== r.category) continue;
    if (ru.zone && ru.zone !== r.zone) continue;
    return ru;
  }
  return null;
}

// Routing confidence: high ≥ 80 acts automatically, medium 55–79 acts and
// highlights review, low < 55 makes no consequential decision (→ intake).
function confTier(c: number): ConfTier {
  return c >= 80 ? 'high' : c >= 55 ? 'medium' : 'low';
}
const TIER_META: Record<ConfTier, TierMeta> = {
  high: { label: 'E lartë', color: '#2E7D4F', bg: '#E1EEE5', ink: '#1E5C3A' },
  medium: { label: 'Mesatare', color: '#B8860B', bg: '#F5EBD6', ink: '#7A5A0B' },
  low: { label: 'E ulët', color: '#C23B31', bg: '#F6E1DE', ink: '#8E2A22' },
};

const AUTOMATION_TYPES: AutomationType[] = [
  { id: 'routing', label: 'Routing', short: 'Routing', defaultAutonomy: 'auto', autonomyOptions: ['auto', 'auto_review', 'suggest'] },
  { id: 'priority', label: 'Prioriteti', short: 'Prioriteti', defaultAutonomy: 'auto', autonomyOptions: ['auto', 'auto_review', 'suggest'] },
  { id: 'duplicates', label: 'Dublikatat', short: 'Dublikatat', defaultAutonomy: 'threshold', autonomyOptions: ['threshold', 'flag_review', 'suggest'] },
  { id: 'moderation', label: 'Moderimi', short: 'Moderimi', defaultAutonomy: 'flag_review', autonomyOptions: ['flag_review', 'suggest'] },
  { id: 'missing', label: 'Informacioni i munguar', short: 'Info e munguar', defaultAutonomy: 'auto', autonomyOptions: ['auto', 'suggest'] },
  { id: 'sla', label: 'SLA & Eskalimet', short: 'SLA', defaultAutonomy: 'auto', autonomyOptions: ['auto', 'suggest'] },
  { id: 'verification', label: 'Verifikimi i zgjidhjeve', short: 'Verifikimi', defaultAutonomy: 'flag_review', autonomyOptions: ['flag_review', 'suggest'] },
  { id: 'publications', label: 'Publikimet', short: 'Publikimet', defaultAutonomy: 'draft', autonomyOptions: ['draft'] },
];
const AUTONOMY_META: Record<AutonomyId, AutonomyMeta> = {
  auto: { label: 'Automatik', color: '#2E7D4F', note: 'Vepron vetë; stafi monitoron dhe ndërhyn kur duhet.' },
  auto_review: { label: 'Automatik + shqyrtim', color: '#B8860B', note: 'Vepron vetë, por çdo vendim shfaqet për konfirmim.' },
  threshold: { label: 'Automatik nën prag', color: '#B8860B', note: 'Lidh vetë vetëm mbi pragun e ngjashmërisë; poshtë tij sinjalizon.' },
  flag_review: { label: 'Sinjalizim + shqyrtim njerëzor', color: '#B8860B', note: 'Sinjalizon dhe pezullon; vendimi përfundimtar është i stafit.' },
  draft: { label: 'Draft AI → miratim njerëzor', color: '#B8860B', note: 'Përgatit draftin; publikimi kërkon miratimin e nëpunësit.' },
  suggest: { label: 'Vetëm sugjerim', color: '#8A847C', note: 'Nuk vepron; vetëm sugjeron.' },
};

// ---- Priority reasons: derived from real report fields --------------------
function priorityReasons(r: Pick<Report, 'category' | 'ai' | 'address' | 'title'>): string[] {
  const out: string[] = [];
  const cat = CATEGORIES.find((c) => c.id === r.category);
  if (r.ai.risk === 'I lartë') out.push('Rrezik për sigurinë publike (risku: I lartë)');
  else if (r.ai.risk === 'I mesëm') out.push('Rrezik i moderuar (risku: I mesëm)');
  const place = (r.address + ' ' + r.title).toLowerCase();
  if (place.includes('shkoll') || place.includes('kopsht')) out.push('Vendndodhje pranë shkollës / kopshtit');
  if (r.title.toLowerCase().includes('rrezik')) out.push('Përshkrimi përmend rrezik');
  if (cat) out.push('Prioriteti bazë i kategorisë: ' + cat.defaultPriority);
  return out;
}

// ---- Duplicate detector output (authored) ---------------------------------
// `dupe` is the case that gets marked Dublikatë when linked.
const DUPLICATE_CANDIDATES: DuplicateCandidate[] = [
  { id: 'd1', a: '02459', b: '02460', dupe: '02460', similarity: 89, distanceM: 35, textSim: 71, imagesSimilar: true, autoLinked: true },
  { id: 'd2', a: '02478', b: '02459', similarity: 78, distanceM: 0, textSim: 38, imagesSimilar: true, autoLinked: false },
  { id: 'd3', a: '02475', b: '02470', similarity: 66, distanceM: 420, textSim: 44, imagesSimilar: true, autoLinked: false },
  { id: 'd4', a: '02481', b: '02467', similarity: 61, distanceM: 0, textSim: 12, imagesSimilar: false, autoLinked: false },
  {
    id: 'd5',
    a: '02474',
    b: '02463',
    similarity: 68,
    distanceM: 260,
    textSim: 52,
    imagesSimilar: true,
    autoLinked: false,
    decision: { decision: 'separate', by: 'Ermal K.', reason: 'Rasti i stacionit është mbyllur; problemi i ri është në një rrugë tjetër.', hoursAfterNewer: 0.3 },
  },
];

// ---- Moderation flags (authored detector output) --------------------------
// Detection ≠ deletion: a flag only HOLDS citizen-facing publication.
const MODERATION_TYPES: ModerationType[] = [
  { id: 'abuse', label: 'Gjuhë fyese / abuzive' },
  { id: 'threat', label: 'Kërcënime' },
  { id: 'spam', label: 'Spam' },
  { id: 'irrelevant', label: 'Paraqitje e parëndësishme' },
  { id: 'pii', label: 'Informacion personal identifikues' },
  { id: 'image', label: 'Imazhe të papërshtatshme' },
];
const MODERATION_FLAGS: ModerationFlag[] = [
  { id: 'm1', reportId: '02470', type: 'pii', confidence: 92, excerpt: '…e hedh çdo natë fqinji, telefononi në 06█ ███ ████ dhe do ta shihni vetë…', hoursAfterSubmit: 0.07 },
  { id: 'm2', reportId: '02475', type: 'abuse', confidence: 81, excerpt: '…këta [fjalë fyese] të bashkisë nuk lëvizin kurrë nga zyra…', hoursAfterSubmit: 0.07 },
  {
    id: 'm3',
    reportId: '02466',
    type: 'abuse',
    confidence: 58,
    excerpt: '…është katastrofë e vërtetë, era është e padurueshme…',
    hoursAfterSubmit: 0.07,
    decision: { decision: 'allow', by: 'Drita K.', reason: 'Fals pozitiv: "katastrofë" përshkruan gjendjen, nuk është fyerje.', hoursAfterSubmit: 0.6 },
  },
  {
    id: 'm4',
    reportId: '02461',
    type: 'image',
    confidence: 77,
    excerpt: 'Fotoja shfaq targën e lexueshme të një automjeti privat.',
    hoursAfterSubmit: 0.07,
    decision: { decision: 'edit', by: 'Ermal K.', reason: 'Targa u maskua para çdo publikimi.', editedText: 'Fotoja u publikua me targën e maskuar.', hoursAfterSubmit: 0.9 },
  },
];

// ---- Missing-information requests (authored) ------------------------------
const MISSING_FIELDS: MissingField[] = [
  { id: 'location', label: 'Vendndodhje e saktë' },
  { id: 'photo', label: 'Foto e qartë' },
  { id: 'description', label: 'Përshkrim' },
  { id: 'category', label: 'Informacion për kategorinë' },
];
const MISSING_INFO: MissingInfoRequest[] = [
  {
    reportId: '02471',
    missing: ['location', 'photo'],
    problem: 'Vendndodhja nuk është mjaftueshëm e saktë dhe fotoja nuk e tregon dëmtimin.',
    message: 'Ju lutemi na jepni një vendndodhje më të saktë dhe një foto më të qartë të bankinës së dëmtuar.',
    hoursAfterSubmit: 0.1,
    state: 'waiting',
  },
  {
    reportId: '02472',
    missing: ['location'],
    problem: 'Vendndodhja nuk është mjaftueshëm e saktë.',
    message: 'Ju lutemi na jepni një vendndodhje më të saktë (p.sh. një pikë reference ose numrin e ndërtesës më të afërt).',
    hoursAfterSubmit: 0.1,
    state: 'waiting',
  },
  {
    reportId: '02470',
    missing: ['location'],
    problem: 'Vendndodhja "Buzë lumit" mbulon disa kilometra.',
    message: 'Ju lutemi na tregoni në cilën pjesë të lumit ndodhen mbeturinat.',
    hoursAfterSubmit: 0.1,
    state: 'answered',
    answer: 'Poshtë urës së Shkumbinit, ana e majtë, pranë rrugës së kalldrëmtë.',
    answeredHoursAfterSubmit: 3.2,
  },
];

// ---- SLA automation rules + standard targets ------------------------------
const SLA_RULES: SlaRule[] = [
  { id: 's1', no: 1, condition: 'SLA e mbetur < 25%', action: 'Njofto punonjësin përgjegjës', active: true },
  { id: 's2', no: 2, condition: 'SLA e shkelur', action: 'Përshkallëzo te përgjegjësi i departamentit', active: true },
  { id: 's3', no: 3, condition: 'Pa përgjegjës > 24 orë', action: 'Përshkallëzo te ' + INTAKE, active: true },
];
const SLA_TARGETS: SlaTarget[] = [
  { priority: 'Urgjente', hours: 4 },
  { priority: 'E lartë', hours: 24 },
  { priority: 'E mesme', hours: 48 },
  { priority: 'E ulët', hours: 72 },
];

// ---- Resolution verification: visual-consistency detector (authored) -----
const VERIFY_VISUAL: Record<string, 'warn'> = { '02465': 'warn' };

// ---- Past publications (authored; every case in it is Mbyllur) ------------
const PUBLICATIONS: Publication[] = [
  {
    id: 'pub1',
    caseIds: ['02464', '02463', '02462'],
    hoursAgo: 26,
    by: 'Drita K.',
    status: 'Publikuar',
    text: 'Gjatë kësaj jave, Bashkia Elbasan ka përfunduar 3 ndërhyrje të raportuara nga qytetarët përmes SINJAL: u riparuan bangat në Parkun Rinia, u rikthye ndriçimi te stacioni i autobusit dhe u mbyll një gropë e madhe në rrugën Bradashesh–Shirgjan. Faleminderit që raportoni.',
  },
];

// ---- Authored historical clerk overrides on real cases --------------------
const HISTORICAL_OVERRIDES: HistoricalOverride[] = [
  { kind: 'routing', reportId: '02470', from: 'Shërbime Publike', to: 'Mjedis', by: 'Ermal K.', reason: 'Hedhje e paligjshme pranë lumit — kompetencë e inspektimit mjedisor.', hoursAfterSubmit: 0.5 },
  { kind: 'priority', reportId: '02472', from: 'E mesme', to: 'E ulët', by: 'Ermal K.', reason: 'Gropë e vogël në rrugë me trafik të ulët; rreziku nuk konfirmohet.', hoursAfterSubmit: 0.4 },
];
// the automatic priority the historical priority override reversed
seeded('02472').ai.suggestedPriority = 'E mesme';

// ==========================================================================
// ---- Performanca: 90-day case history (ILLUSTRATIVE) ----------------------
// ==========================================================================
// A deterministic (seeded) history of CLOSED cases for the 90 days before
// NOW. Demo content, never presented as real municipal statistics. Built-in
// dynamics so the analysis has something true to find:
//   · Ndriçim publik volume +~28% in the last 30 days
//   · Infrastrukturë slowing down from ~day −35
//   · Papër has a higher share of reappearing problems
//   · Mbetje concentrated in Shushicë in the last 30 days
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260923);
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function pickW<T>(pairs: [T, number][]): T {
  let tot = 0;
  for (const p of pairs) tot += p[1];
  let x = rnd() * tot;
  for (const p of pairs) {
    x -= p[1];
    if (x <= 0) return p[0];
  }
  return pairs[pairs.length - 1][0];
}
const SLA_H: Record<Priority, number> = { Urgjente: 4, 'E lartë': 24, 'E mesme': 48, 'E ulët': 72 };
const TITLES: Record<CategoryId, string[]> = {
  gropa: ['Gropë në rrugë', 'Gropë e thellë pranë kryqëzimit', 'Asfalt i dëmtuar pas shirave', 'Gropa të shumta në rrugë dytësore'],
  infra: ['Kapak kanalizimi i dëmtuar', 'Trotuar i dëmtuar', 'Parmakë të thyer', 'Kanal i hapur', 'Mur mbajtës i çarë'],
  mbetje: ['Kontejner i mbushur', 'Mbetje të pambledhura', 'Hedhje e paligjshme mbetjesh', 'Kontejner i dëmtuar'],
  ndricim: ['Poçe e djegur', 'Rrugë pa ndriçim', 'Shtyllë ndriçimi e dëmtuar', 'Ndriçim që pulson'],
  hapesira: ['Bangë parku e thyer', 'Lulishte e pakujdesur', 'Kënd lojërash i dëmtuar', 'Barishte në trotuar'],
};
const BASE_RATE: Record<CategoryId, number> = { mbetje: 3.1, gropa: 2.2, infra: 1.6, ndricim: 1.7, hapesira: 1.0 };
const DEPT_SPEED: Record<DeptId, number> = { infra: 1.0, ndricim: 0.78, sherbime: 0.85, mjedis: 1.05, uje: 0.8 };
const DEPT_RESPONSE_H: Record<DeptId, number> = { infra: 5.0, ndricim: 3.0, sherbime: 7.0, mjedis: 6.0, uje: 4.0 };
const ZONE_W: [string, number][] = [
  ['Qendër', 30],
  ['Bradashesh', 11],
  ['Shirgjan', 9],
  ['Papër', 12],
  ['Shushicë', 11],
  ['Gjinar', 9],
  ['Labinot', 8],
  ['Zavalinë', 10],
];

type HistoryDraft = Omit<HistoryRecord, 'id' | 'displayId'> & Partial<Pick<HistoryRecord, 'id' | 'displayId'>>;
const histDraft: HistoryDraft[] = [];
const dayStart = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
for (let d = -90; d <= 0; d++) {
  const day0 = new Date(dayStart.getTime() + d * 86400000);
  const weekend = day0.getDay() === 0 || day0.getDay() === 6;
  (Object.keys(BASE_RATE) as CategoryId[]).forEach((cat) => {
    let rate = BASE_RATE[cat] * (weekend ? 0.8 : 1);
    if (d > -30 && cat === 'ndricim') rate *= 1.3;
    if (d > -30 && (cat === 'gropa' || cat === 'infra')) rate *= 1.18;
    const n = Math.floor(rate + rnd());
    for (let k = 0; k < n; k++) {
      const catObj = categoryById(cat);
      const zone = d > -30 && cat === 'mbetje' && rnd() < 0.3 ? 'Shushicë' : pickW(ZONE_W);
      let dept: DeptId = catObj.dept;
      if (cat === 'mbetje' && rnd() < 0.08) dept = 'mjedis';
      if (cat === 'infra' && rnd() < 0.06) dept = 'uje';
      const base = catObj.defaultPriority;
      const prio = pickW<Priority>([
        [base, 70],
        ['Urgjente', cat === 'infra' || cat === 'gropa' ? 10 : 4],
        ['E ulët', 10],
        ['E lartë', 8],
        ['E mesme', 8],
      ]);
      const sub = new Date(day0.getTime() + (6 + rnd() * 15) * HOUR_MS);
      if (sub > NOW) continue;
      const slaH = SLA_H[prio];
      const ramp = dept === 'infra' && d > -36 ? 1 + 0.55 * ((d + 36) / 36) : dept === 'sherbime' && d > -20 ? 1.08 : 1;
      const f = Math.exp(Math.log(0.6) + 0.45 * gauss()) * DEPT_SPEED[dept] * ramp;
      const resolveH = Math.max(0.6, slaH * f);
      let assignH = Math.max(0.1, 0.4 + Math.abs(gauss()) * 2.2);
      if ((dept === 'infra' && d > -30 && rnd() < 0.06) || rnd() < 0.015) assignH = 24 + rnd() * 20;
      const responseH = Math.min(resolveH * 0.9, Math.max(assignH, DEPT_RESPONSE_H[dept] * Math.exp(0.45 * gauss())));
      const startH = Math.min(resolveH * 0.95, Math.max(responseH, assignH + 0.5 + rnd() * 6));
      let status: Status = 'Mbyllur';
      const r = rnd();
      if (r < 0.04) status = 'Dublikatë';
      else if (r < 0.06) status = 'Refuzuar';
      const resolvedAt = new Date(sub.getTime() + resolveH * HOUR_MS);
      if (status === 'Mbyllur' && resolvedAt > NOW) continue;
      const emps = EMPLOYEES.filter((e) => e.dept === dept);
      // Evaluation order matters: every rnd() call below advances the seeded
      // generator, so the fields are filled in the same order as the design.
      const closed = status === 'Mbyllur';
      const rec: HistoryDraft = {
        live: false,
        category: cat,
        dept,
        zone,
        priority: prio,
        basePriority: base,
        submittedAt: sub,
        slaH,
        assignH: closed ? assignH : null,
        responseH: closed ? responseH : 0.5 + rnd() * 3,
        startH: closed ? startH : null,
        resolveH: closed ? resolveH : null,
        status,
        slaMet: closed ? resolveH <= slaH : null,
        reappeared: closed && rnd() < (zone === 'Papër' ? 0.14 : 0.055),
        reopened: closed && rnd() < 0.03,
        verified: closed ? rnd() < 0.9 : null,
        responsible: closed && emps.length ? pick(emps).id : null,
        title: pick(TITLES[cat]),
      };
      histDraft.push(rec);
    }
  });
}
histDraft.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
histDraft.forEach((h0, i) => {
  const num = 2457 - (histDraft.length - 1 - i);
  const id = ('0000' + num).slice(-5);
  h0.id = id;
  h0.displayId = '#' + id;
});
const hist = histDraft as HistoryRecord[];

// ---- Shared performance engine ---------------------------------------------
// ONE definition of the service metrics, used by Kreu, Departamentet and
// Performanca so the same figure can never read differently on two pages.
// Records = the illustrative closed history + the live reports (with the
// session's case overrides applied).
const PERF_CLOSED: Status[] = ['Zgjidhur', 'Mbyllur', 'Dublikatë', 'Refuzuar'];
function perfRecords(overrides?: CaseOverrides): PerfRecord[] {
  const ovs = overrides || {};
  const live: PerfRecord[] = reports.map((r) => {
    const ov = ovs[r.id] || {};
    const status = ov.status || r.status;
    const dept = ov.department || r.department;
    const resp = ov.responsible !== undefined ? ov.responsible : r.responsible;
    const resolved = status === 'Zgjidhur' || status === 'Mbyllur';
    const slaH = (r.slaDeadline.getTime() - r.submittedAt.getTime()) / HOUR_MS;
    const resolveH = resolved ? (r.resolutionHours != null ? r.resolutionHours : (NOW.getTime() - r.submittedAt.getTime()) / HOUR_MS) : null;
    const open = !PERF_CLOSED.includes(status);
    return {
      live: true,
      id: r.id,
      displayId: r.displayId,
      title: r.title,
      category: r.category,
      dept,
      zone: r.zone,
      priority: ov.priority || r.priority,
      submittedAt: r.submittedAt,
      slaH,
      assignH: resp ? 0.5 : null,
      responseH: resp ? 0.4 : null,
      startH: ['Në punë', 'Zgjidhur', 'Mbyllur'].includes(status) ? 2 : null,
      resolveH,
      status,
      slaMet: resolved ? (resolveH as number) <= slaH : null,
      reappeared: !!r.reappeared,
      reopened: !!(ov.reopenLog && ov.reopenLog.length),
      verified: resolved ? status === 'Mbyllur' : null,
      responsible: resp,
      open,
      slaBreached: open && r.slaDeadline < NOW,
      slaAtRisk: open && r.slaDeadline >= NOW && (r.slaDeadline.getTime() - NOW.getTime()) / HOUR_MS <= 4,
    };
  });
  const histRecs: PerfRecord[] = hist.map((r) => ({ open: false, slaBreached: false, slaAtRisk: false, ...r }));
  return histRecs.concat(live);
}
function perfWindow(days: number, shift?: number) {
  const s = shift || 0;
  return { from: new Date(NOW.getTime() - days * (s + 1) * 86400000), to: new Date(NOW.getTime() - days * s * 86400000 + 1) };
}
function perfCohort(recs: PerfRecord[], f: PerfFilter, days: number, shift?: number): PerfRecord[] {
  const w = perfWindow(days, shift);
  return recs.filter((r) => r.submittedAt >= w.from && r.submittedAt < w.to && (!f.dept || r.dept === f.dept) && (!f.category || r.category === f.category) && (!f.zone || r.zone === f.zone));
}
function avg(a: number[]): number | null {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
}
const PERF: PerfEngine = {
  records: perfRecords,
  window: perfWindow,
  cohort: perfCohort,
  slaRate: (recs, f, days, shift) => {
    const R = perfCohort(recs, f || {}, days, shift).filter((r) => r.resolveH != null);
    return R.length ? (R.filter((r) => r.slaMet).length / R.length) * 100 : null;
  },
  avgResponse: (recs, f, days, shift) =>
    avg(
      perfCohort(recs, f || {}, days, shift)
        .filter((r) => r.responseH != null)
        .map((r) => r.responseH as number),
    ),
  avgResolution: (recs, f, days, shift) =>
    avg(
      perfCohort(recs, f || {}, days, shift)
        .filter((r) => r.resolveH != null)
        .map((r) => r.resolveH as number),
    ),
  newCount: (recs, f, days, shift) => perfCohort(recs, f || {}, days, shift).length,
};

export const SINJAL = {
  now: NOW,
  activity: ACTIVITY,
  assets: ASSETS,
  departments: DEPARTMENTS,
  employees: EMPLOYEES,
  zones: ZONES,
  zoneCoords: ZONE_COORDS,
  categories: CATEGORIES,
  statusMeta: STATUS_META,
  tone: TONE,
  statusOrder: STATUS_ORDER,
  priorityMeta: PRIORITY_META,
  priorityOrder: PRIORITY_ORDER,
  reports,
  notifications,
  automations,
  byId,
  deptName,
  empName,
  catLabel,
  fmtDateTime,
  fmtTime,
  fmtSLA,
  fmtDuration,
  fmtHours,
  history: hist,
  perf: PERF,
  slaHours: SLA_H,
  automation: {
    clerks: CLERKS,
    intake: INTAKE,
    teams: TEAMS,
    routingRules: ROUTING_RULES,
    matchRule,
    confTier,
    tierMeta: TIER_META,
    types: AUTOMATION_TYPES,
    autonomyMeta: AUTONOMY_META,
    priorityReasons,
    duplicateCandidates: DUPLICATE_CANDIDATES,
    moderationTypes: MODERATION_TYPES,
    moderationFlags: MODERATION_FLAGS,
    missingFields: MISSING_FIELDS,
    missingInfo: MISSING_INFO,
    slaRules: SLA_RULES,
    slaTargets: SLA_TARGETS,
    verifyVisual: VERIFY_VISUAL,
    publications: PUBLICATIONS,
    historicalOverrides: HISTORICAL_OVERRIDES,
  },
};

export type Sinjal = typeof SINJAL;
export function setLiveTime(now: Date): void { NOW = now; SINJAL.now = now; }
export default SINJAL;
