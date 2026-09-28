/* SINJAL — Nëpunësi (Municipal Staff) — shared mock data & helpers.
   Loaded by every staff artboard via <script src="mock-data.js"></script>
   so the same report/department/employee data is consistent everywhere
   (dashboard, table, map, notifications, analytics). Plain JS globals,
   no imports — this is a .dc.html support file, not a module.
*/
(function () {
  'use strict';

  var NOW = new Date('2026-09-23T15:40:00');

  var ASSETS = {
    logo: '/_blob/d69b3b84a9b8ecd63f1590e53c85c936',
    photos: [
      '/_blob/209f0c2bc20f3e0e6e1d5e9b54bce054',
      '/_blob/3364e0de199cdbb5e3afd0f319bfdc30',
      '/_blob/0aec477b7b9789067a00ad1b8a9e93eb',
      '/_blob/c662354f264478f93391a7af55aae197',
      '/_blob/22d921eeb0d432384f32e721a3dfc1ce',
      '/_blob/92ff6347a4d44a5a25fd912a15e5cd6b',
    ],
  };

  var DEPARTMENTS = [
    { id: 'infra', name: 'Infrastrukturë' },
    { id: 'sherbime', name: 'Shërbime Publike' },
    { id: 'mjedis', name: 'Mjedis' },
    { id: 'ndricim', name: 'Ndriçim' },
    { id: 'uje', name: 'Ujësjellës' },
  ];

  // coverageZones: which zones each employee is the primary responder for —
  // authored demo content (like ZONE_COORDS below), not derived from any
  // report data. Used by Departamentet's workload-balancing suggestion
  // (assign the employee whose coverage includes the report's zone) and
  // shown on the employee's own card as "Zonat e mbulimit".
  var EMPLOYEES = [
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

  var ZONES = ['Qendër', 'Bradashesh', 'Shirgjan', 'Papër', 'Shushicë', 'Gjinar', 'Labinot', 'Zavalinë'];

  // Illustrative placement for the Kreu map widget — a stylized layout, not
  // real GPS coordinates. x/y are percentages of the widget's 0–100 square
  // coordinate space (shared with the widget's SVG viewBox so pins and
  // district shapes line up without a separate projection).
  var ZONE_COORDS = {
    'Qendër':     { x: 50, y: 48 },
    'Bradashesh': { x: 74, y: 28 },
    'Shirgjan':   { x: 60, y: 18 },
    'Papër':      { x: 26, y: 34 },
    'Shushicë':   { x: 40, y: 76 },
    'Gjinar':     { x: 80, y: 70 },
    'Labinot':    { x: 84, y: 44 },
    'Zavalinë':   { x: 16, y: 58 },
  };

  // defaultPriority/exception: the routing rule shown in Departamentet's
  // "Rregullat e Caktimit" table — the same category → department mapping
  // already used for AI routing everywhere else, plus the default priority
  // and standard exception clause that rule applies. Authored rule content,
  // not derived from the report seed rows.
  var CATEGORIES = [
    { id: 'mbetje', label: 'Mbetje', dept: 'sherbime', defaultPriority: 'E mesme', exception: 'Nëse AI identifikon rrezik shëndetësor → Urgjente' },
    { id: 'gropa', label: 'Gropa në rrugë', dept: 'infra', defaultPriority: 'E lartë', exception: 'Nëse AI identifikon rrezik për kalimtarë → Urgjente' },
    { id: 'ndricim', label: 'Ndriçim publik', dept: 'ndricim', defaultPriority: 'E mesme', exception: 'Nëse prek një zonë me shkollë/kalim këmbësorësh → E lartë' },
    { id: 'infra', label: 'Infrastrukturë', dept: 'infra', defaultPriority: 'E lartë', exception: 'Nëse AI identifikon rrezik strukturor → Urgjente' },
    { id: 'hapesira', label: 'Hapësira publike', dept: 'sherbime', defaultPriority: 'E ulët', exception: 'Asnjë' },
  ];

  // status → { label, bg, ink, dot }. Icon + word always; color only supports.
  // One semantic colour vocabulary for the whole app (pills, pins, dots,
  // chart marks). Red = needs urgent action, amber = work under way /
  // waiting, green = resolved, dark neutral = new, light neutral = pending
  // or closed out, purple = the problem came back. Harta's map tiers and
  // every status pill read from here.
  var TONE = { critical: '#C23B31', warning: '#B8860B', success: '#2E7D4F', fresh: '#4A4640', pending: '#8A847C', reappeared: '#8E5FB0' };
  var STATUS_META = {
    'I ri':                { bg: '#EDEAE3', ink: '#1B1917', dot: TONE.fresh,   tier: 'new' },
    'Në shqyrtim':         { bg: '#EDEAE3', ink: '#4A4640', dot: TONE.pending, tier: 'review' },
    'Caktuar':             { bg: '#EDEAE3', ink: '#4A4640', dot: TONE.pending, tier: 'review' },
    'Në punë':             { bg: '#F5EBD6', ink: '#7A5A0B', dot: TONE.warning, tier: 'progress' },
    'Kërkon informacion':  { bg: '#F5EBD6', ink: '#7A5A0B', dot: TONE.warning, tier: 'progress' },
    'Zgjidhur':            { bg: '#E1EEE5', ink: '#1E5C3A', dot: TONE.success, tier: 'resolved' },
    'Mbyllur':             { bg: '#E4DFD6', ink: '#4A4640', dot: TONE.success, tier: 'resolved' },
    'Dublikatë':           { bg: '#EDEAE3', ink: '#6B665F', dot: TONE.pending, tier: 'review' },
    'Refuzuar':            { bg: '#EDEAE3', ink: '#6B665F', dot: TONE.pending, tier: 'review' },
  };
  var STATUS_ORDER = ['I ri', 'Në shqyrtim', 'Caktuar', 'Në punë', 'Zgjidhur', 'Mbyllur', 'Dublikatë', 'Refuzuar', 'Kërkon informacion'];

  var PRIORITY_META = {
    'E ulët':   { color: '#8A847C', weight: 0 },
    'E mesme':  { color: '#4A4640', weight: 1 },
    'E lartë':  { color: '#B8860B', weight: 2 },
    'Urgjente': { color: '#C23B31', weight: 3 },
  };
  var PRIORITY_ORDER = ['E ulët', 'E mesme', 'E lartë', 'Urgjente'];

  function h(hours) { return new Date(NOW.getTime() + hours * 3600000); }
  function fmtDateTime(d) {
    var days = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return days[d.getDay()] + ' ' + p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + ' · ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function fmtTime(d) {
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  // ONE duration format for the whole app: "24 min", "3 orë 54 min",
  // "2 orë", "1,7 ditë"; negative (overdue) values get a leading "−".
  function fmtHours(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) return '—';
    var neg = hours < 0, a = Math.abs(hours), out;
    if (a < 1) out = Math.max(1, Math.round(a * 60)) + ' min';
    else if (a < 24) { var hh = Math.floor(a), mm = Math.round((a - hh) * 60); if (mm === 60) { hh += 1; mm = 0; } out = hh + ' orë' + (mm ? ' ' + mm + ' min' : ''); }
    else { var dd = Math.round((a / 24) * 10) / 10; out = String(dd).replace('.', ',') + ' ditë'; }
    return (neg ? '−' : '') + out;
  }
  function fmtSLA(hoursRemaining) { return fmtHours(hoursRemaining); }
  function fmtDuration(hours) { return fmtHours(hours); }
  function deptName(id) { for (var i = 0; i < DEPARTMENTS.length; i++) if (DEPARTMENTS[i].id === id) return DEPARTMENTS[i].name; return id; }
  function empName(id) { for (var i = 0; i < EMPLOYEES.length; i++) if (EMPLOYEES[i].id === id) return EMPLOYEES[i].name; return id; }
  function catLabel(id) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].label; return id; }

  // ---- Report seed rows -----------------------------------------------
  // [id, category, title, zone, address, priority, status, dept, resp, submittedHoursAgo, slaHours, aiConf, aiRisk, photoIdx, citizenInitials]
  var SEED = [
    ['02481', 'mbetje',   'Mbetje të pambledhura prej 4 ditësh',        'Qendër',    'Rr. Qemal Stafa, pranë Nr. 14',     'E lartë',  'Në punë',            'sherbime', 'edervishi', -3,   2,    91, 'I ulët',   4, 'A. M.'],
    ['02480', 'gropa',    'Gropë e thellë në mes të rrugës',            'Bradashesh','Rr. Bradashesh–Shirgjan, km 2',     'Urgjente', 'Caktuar',            'infra',    'ahoxha',    -1.5, 4,    88, 'I lartë',  1, 'E. K.'],
    ['02479', 'ndricim',  'Poçe e djegur, rruga mbetet pa dritë',       'Shirgjan',  'Rr. Kryesore, poçja nr. 6',         'E mesme',  'I ri',               'ndricim',  null,        -0.6, 12,   76, 'I mesëm',  3, 'F. B.'],
    ['02478', 'infra',    'Kapak kanalizimi i çarë, rrezik kalimtarësh','Qendër',    'Bulevardi Nacional, para Nr. 22',   'Urgjente', 'Në shqyrtim',        'infra',    null,        -0.2, 4,    94, 'I lartë',  0, 'M. D.'],
    ['02477', 'hapesira', 'Bankina e parkut e mbushur me barishte',     'Qendër',    'Parku Rinia, hyrja jugore',         'E ulët',   'I ri',               'sherbime', null,        -8,   48,   62, 'I ulët',   5, 'L. Ç.'],
    ['02476', 'gropa',    'Gropa të shumta pas shirave të fundit',      'Papër',     'Rr. Papër, seksioni qendror',       'E lartë',  'Caktuar',            'infra',    'bkrasniqi', -20,  6,    85, 'I mesëm',  2, 'R. S.'],
    ['02475', 'mbetje',   'Kontejner i rrëzuar, mbeturina të shpërndara','Shushicë', 'Rr. Shushicë, afër shkollës',       'E mesme',  'Në punë',            'sherbime', 'krama',     -26,  24,   90, 'I ulët',   4, 'A. V.'],
    ['02474', 'ndricim',  'Errësirë totale në 3 poçe rresht',           'Qendër',    'Rr. Aleksandër Moisiu',             'E lartë',  'Në punë',            'ndricim',  'dsula',     -30,  12,   93, 'I mesëm',  3, 'K. P.'],
    ['02473', 'infra',    'Trotuar i shembur pranë kopshtit',           'Gjinar',    'Rr. Gjinar, pranë kopshtit Nr. 3',  'E mesme',  'Caktuar',            'infra',    'vcara',     -33,  48,   79, 'I ulët',   1, 'S. T.'],
    ['02472', 'gropa',    'Gropë e vogël, rrezik për motoçiklistë',     'Labinot',   'Rr. Labinot–Fushë',                 'E ulët',   'I ri',               'infra',    null,        -36,  72,   58, 'I ulët',   2, 'B. N.'],
    ['02471', 'hapesira', 'Bankina e lulishtes e dëmtuar nga ndërtimi', 'Zavalinë',  'Lulishtja Zavalinë',                'E ulët',   'Kërkon informacion', 'sherbime', 'edervishi', -40,  48,   54, 'I ulët',   5, 'H. M.'],
    ['02470', 'mbetje',   'Pikë e paligjshme mbeturinash pranë lumit',  'Shushicë',  'Buzë lumit Shkumbin',               'E lartë',  'Në shqyrtim',        'mjedis',   null,        -44,  24,   82, 'I mesëm',  4, 'D. G.'],
    ['02469', 'infra',    'Parmakë të thyer mbi urën e vjetër',         'Qendër',    'Ura e Vjetër',                      'E lartë',  'Caktuar',            'infra',    'ahoxha',    -48,  24,   87, 'I lartë',  0, 'P. R.'],
    ['02468', 'ndricim',  'Poçja pulson dhe fiket vazhdimisht',         'Bradashesh','Rr. Bradashesh Nr. 9',              'E ulët',   'Zgjidhur',           'ndricim',  'gcela',     -70,  24,   71, 'I ulët',   3, 'N. K.'],
    ['02467', 'gropa',    'Gropë e riformuar pas riasfaltimit',         'Qendër',    'Rr. Qemal Stafa, pranë Nr. 14',     'E mesme',  'Në punë',            'infra',    'bkrasniqi', -72,  12,   80, 'I mesëm',  1, 'A. M.'],
    ['02466', 'mbetje',   'Kontejnerë të mbushur, era e keqe',          'Papër',     'Rr. Papër Nr. 40',                  'E mesme',  'Zgjidhur',           'sherbime', 'krama',     -96,  24,   88, 'I ulët',   4, 'V. L.'],
    ['02465', 'infra',    'Kanal i hapur pa mbulesë',                   'Shirgjan',  'Rr. Shirgjan, pranë urës',          'Urgjente', 'Zgjidhur',           'infra',    'vcara',     -100, 4,    96, 'I lartë',  0, 'E. K.'],
    ['02464', 'hapesira', 'Bangat e parkut të thyera',                  'Qendër',    'Parku Rinia, ana lindore',          'E ulët',   'Mbyllur',            'sherbime', 'edervishi', -140, 72,   66, 'I ulët',   5, 'M. D.'],
    ['02463', 'ndricim',  'Ndriçim jo funksional te stacioni i autobusit','Qendër',  'Stacioni Autobusit, Bulevardi',     'E mesme',  'Mbyllur',            'ndricim',  'dsula',     -160, 24,   84, 'I ulët',   3, 'G. F.'],
    ['02462', 'gropa',    'Gropë e madhe, ka dëmtuar goma makinash',    'Bradashesh','Rr. Bradashesh–Shirgjan, km 1',     'Urgjente', 'Mbyllur',            'infra',    'ahoxha',    -190, 4,    92, 'I lartë',  2, 'B. N.'],
    ['02461', 'mbetje',   'Mbeturina ndërtimi të hedhura pa leje',      'Zavalinë',  'Rr. Zavalinë Nr. 3',                'E lartë',  'Refuzuar',           'mjedis',   'lmeta',     -50,  24,   45, 'I ulët',   4, 'H. M.'],
    ['02460', 'infra',    'Dysheme trotuari e ngritur nga rrënjët',     'Qendër',    'Bulevardi Nacional, pranë Nr. 55',  'E ulët',   'Dublikatë',          'infra',    null,        -18,  48,   70, 'I ulët',   1, 'D. G.'],
    ['02459', 'gropa',    'Gropë e re, ende e pashenjuar',              'Qendër',    'Bulevardi Nacional, para Nr. 22',   'E lartë',  'Në shqyrtim',        'infra',    null,        -0.1, 4,    77, 'I mesëm',  0, 'S. T.'],
    ['02458', 'ndricim',  'Poçe e vjedhur, kablloja mbetur e zbuluar',  'Papër',     'Rr. Papër, kryqëzimi kryesor',      'Urgjente', 'Në shqyrtim',        'ndricim',  null,        -0.9, 4,    73, 'I lartë',  3, 'N. K.'],
  ];

  var reports = SEED.map(function (r) {
    var id = r[0], catId = r[1], title = r[2], zone = r[3], address = r[4], priority = r[5], status = r[6],
      dept = r[7], resp = r[8], subH = r[9], slaH = r[10], conf = r[11], risk = r[12], photoIdx = r[13], citizen = r[14];
    var submittedAt = h(subH);
    var slaDeadline = h(subH + slaH);
    var slaRemaining = (status === 'Zgjidhur' || status === 'Mbyllur' || status === 'Refuzuar' || status === 'Dublikatë')
      ? null
      : (slaDeadline.getTime() - NOW.getTime()) / 3600000;
    var suggestedDept = CATEGORIES.filter(function (c) { return c.id === catId; })[0].dept;
    return {
      id: id,
      displayId: '#' + id,
      category: catId,
      categoryLabel: catLabel(catId),
      title: title,
      description: title + '. Qytetari ka raportuar problemin me foto shoqëruese dhe vendndodhje të saktë nëpërmjet aplikacionit SINJAL.',
      zone: zone,
      address: address,
      priority: priority,
      status: status,
      department: dept,
      departmentName: deptName(dept),
      responsible: resp,
      responsibleName: resp ? empName(resp) : null,
      submittedAt: submittedAt,
      submittedLabel: fmtDateTime(submittedAt),
      slaDeadline: slaDeadline,
      slaRemainingHours: slaRemaining,
      slaLabel: slaRemaining === null ? '—' : fmtSLA(slaRemaining),
      slaBreached: slaRemaining !== null && slaRemaining < 0,
      slaAtRisk: slaRemaining !== null && slaRemaining >= 0 && slaRemaining <= 4,
      citizenInitials: citizen,
      photo: ASSETS.photos[photoIdx % ASSETS.photos.length],
      ai: {
        // Categorization is NOT an AI automation: the category is an ordinary
        // case field (chosen by the citizen, confirmable/editable by intake).
        // `confidence` is the ROUTING confidence — how sure SINJAL is about
        // the responsible department/team given category, zone, rules and
        // workload — and drives the automation tiers in Automatizimet.
        suggestedPriority: priority,
        confidence: conf,
        risk: risk,
        suggestedDepartment: deptName(suggestedDept),
        rationale: 'Routing-u bazohet në kategorinë e rastit (' + catLabel(catId) + '), zonën ' + zone + ', rregullin e departamentit ' + deptName(suggestedDept) + ' dhe ' + Math.max(3, Math.round(conf / 12)) + ' raste të ngjashme të trajtuara nga i njëjti ekip.',
      },
      assignment: {
        department: dept,
        team: deptName(dept),
        responsible: resp,
        priority: priority,
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
    };
  });

  function byId(id) { for (var i = 0; i < reports.length; i++) if (reports[i].id === id) return reports[i]; return null; }

  // Hand-authored relationships layered on top of the seed data.
  byId('02460').duplicateOf = '02459';
  byId('02460').status = 'Dublikatë';
  byId('02459').duplicateCandidateId = '02460';
  byId('02459').duplicateSimilarity = 89;
  byId('02459').linkedIds = ['02460', '02478'];
  byId('02478').linkedIds = ['02459'];

  byId('02467').reappeared = true;
  byId('02467').reappearedFromId = '02465';
  byId('02465').linkedIds = ['02467'];

  byId('02480').linkedIds = ['02476', '02462'];
  byId('02476').linkedIds = ['02480'];
  byId('02462').linkedIds = ['02480'];

  byId('02461').resolutionEvidence = [];
  byId('02461').ai.rationale = 'Besueshmëria e routing-ut e ulët (45%): fotoja nuk tregon nëse mbeturinat janë në hapësirë publike apo private, ndaj SINJAL nuk mund të vendoste departamentin dhe e dërgoi te Pranimi i përgjithshëm. Nëpunësi e refuzoi pas verifikimit në terren — mbeturinat u identifikuan si private.';

  ['02468', '02466', '02465', '02464', '02463', '02462'].forEach(function (id) {
    byId(id).resolutionEvidence = [
      { photo: ASSETS.photos[(SEED_INDEX(id) + 2) % ASSETS.photos.length], note: 'Foto pas ndërhyrjes, e ngarkuar nga ekipi në terren.' },
    ];
  });
  function SEED_INDEX(id) { for (var i = 0; i < SEED.length; i++) if (SEED[i][0] === id) return i; return 0; }

  function buildTimeline(r) {
    var t = [];
    t.push({ time: r.submittedAt, label: 'Qytetari dërgoi raportin.', kind: 'citizen' });
    t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.02), label: 'Kategoria e rastit u regjistrua: ' + r.categoryLabel + '.', kind: 'system' });
    if (r.ai.confidence < 55) {
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.05), label: 'SINJAL nuk e routoi dot me siguri (besueshmëri ' + r.ai.confidence + '%) — u dërgua te Pranimi i përgjithshëm.', kind: 'ai' });
    } else {
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.05), label: 'Routing automatik te ' + r.ai.suggestedDepartment + ' (besueshmëri ' + r.ai.confidence + '%).', kind: 'ai' });
    }
    if (r.duplicateCandidateId) t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.08), label: 'U zbulua kandidat dublikatë: ' + byId(r.duplicateCandidateId).displayId + ' (' + r.duplicateSimilarity + '% ngjashmëri).', kind: 'ai' });
    if (r.duplicateOf) t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.1), label: 'Shënuar si dublikatë e ' + byId(r.duplicateOf).displayId + '.', kind: 'system' });
    if (r.reappeared) t.push({ time: r.submittedAt, label: 'Problem i ngjashëm i raportuar më parë në ' + byId(r.reappearedFromId).displayId + '.', kind: 'ai' });
    if (r.responsible) {
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.4), label: 'Nëpunësi konfirmoi caktimin.', kind: 'clerk' });
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 0.5), label: 'Raporti u caktua te ' + r.departmentName + ' · ' + r.responsibleName + '.', kind: 'clerk' });
    }
    if (['Në punë', 'Zgjidhur', 'Mbyllur'].indexOf(r.status) !== -1) {
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 2), label: 'Statusi ndryshoi në Në punë.', kind: 'clerk' });
    }
    if (['Zgjidhur', 'Mbyllur'].indexOf(r.status) !== -1) {
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + (r.slaDeadline.getTime() - r.submittedAt.getTime()) / 3600000 * 0.7), label: 'U shtua dëshmi zgjidhjeje.', kind: 'clerk' });
      t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + (r.slaDeadline.getTime() - r.submittedAt.getTime()) / 3600000 * 0.75), label: 'Statusi ndryshoi në Zgjidhur.', kind: 'clerk' });
    }
    if (r.status === 'Mbyllur') t.push({ time: r.slaDeadline, label: 'Rasti u mbyll pas verifikimit.', kind: 'clerk' });
    if (r.status === 'Refuzuar') t.push({ time: h((r.submittedAt.getTime() - NOW.getTime()) / 3600000 + 1.2), label: 'Raporti u refuzua nga nëpunësi.', kind: 'clerk' });
    t.sort(function (a, b) { return a.time - b.time; });
    return t;
  }
  reports.forEach(function (r) { r.timeline = buildTimeline(r); });

  // resolutionHours / firstResponseHours: real, derived performance figures
  // for Departamentet's "Koha mesatare e reagimit/zgjidhjes" — computed with
  // the exact same offsets buildTimeline already uses for its "u shtua
  // dëshmi zgjidhjeje"/"raporti u caktua" events, so these numbers can't
  // drift from what the case's own timeline says happened.
  reports.forEach(function (r) {
    r.resolutionHours = (r.status === 'Zgjidhur' || r.status === 'Mbyllur')
      ? ((r.slaDeadline.getTime() - r.submittedAt.getTime()) / 3600000) * 0.75
      : null;
    r.firstResponseHours = r.responsible ? 0.4 : null;
  });

  // ---- Notifications ----------------------------------------------------
  var notifications = [
    { id: 'n1', type: 'action', group: 'Kërkon veprim', title: 'Raporti ' + byId('02478').displayId + ' është në rrezik SLA', body: 'Mbeten ' + fmtSLA(byId('02478').slaRemainingHours) + '. Kapak kanalizimi i çarë, Bulevardi Nacional.', reportId: '02478', time: h(-0.15), read: false },
    { id: 'n2', type: 'action', group: 'Kërkon veprim', title: '3 raporte kanë nevojë për caktim', body: 'Raporte të reja pa përgjegjës në Infrastrukturë dhe Ndriçim.', filter: { status: 'I ri' }, time: h(-0.4), read: false },
    { id: 'n3', type: 'action', group: 'Kërkon veprim', title: 'Dublikatë e mundshme: ' + byId('02459').displayId, body: '89% ngjashmëri me ' + byId('02460').displayId + '.', reportId: '02459', time: h(-0.5), read: false },
    { id: 'n4', type: 'action', group: 'Kërkon veprim', title: 'Routing me besueshmëri të ulët: ' + byId('02461').displayId, body: '45% besueshmëri — u dërgua te Pranimi i përgjithshëm për vendim manual.', reportId: '02461', time: h(-2), read: false },
    { id: 'n5', type: 'action', group: 'Kërkon veprim', title: 'Raport i përsëritur: ' + byId('02467').displayId, body: 'Problem i ngjashëm me ' + byId('02465').displayId + ', tashmë i shënuar Zgjidhur.', reportId: '02467', time: h(-3), read: false },
    { id: 'n6', type: 'ai', group: 'AI/Sistemi', title: 'Rrugëzim automatik u ekzekutua', body: byId('02481').displayId + ' u caktua automatikisht te Shërbime Publike.', reportId: '02481', time: h(-3), read: true },
    { id: 'n7', type: 'info', group: 'Informacion', title: 'Statusi ndryshoi: ' + byId('02467').displayId, body: 'Në punë · caktuar te ' + byId('02467').responsibleName + '.', reportId: '02467', time: h(-4), read: true },
    { id: 'n8', type: 'completion', group: 'Përfunduar', title: 'Raporti ' + byId('02465').displayId + ' u zgjidh', body: 'Kanal i hapur pa mbulesë, Shirgjan.', reportId: '02465', time: h(-6), read: true },
    { id: 'n9', type: 'info', group: 'Informacion', title: 'Raport i lidhur u krijua', body: byId('02480').displayId + ' lidhur gjeografikisht me ' + byId('02476').displayId + '.', reportId: '02480', time: h(-9), read: true },
    { id: 'n10', type: 'system', group: 'Sistemi', title: 'Raporti javor u gjenerua', body: 'Performanca · javë 38, 2026.', time: h(-20), read: true },
    { id: 'n11', type: 'action', group: 'Kërkon veprim', title: 'Verifikim mbylljeje: ' + byId('02464').displayId, body: 'Dëshmia e zgjidhjes pret konfirmim përfundimtar.', reportId: '02464', time: h(-30), read: true },
    { id: 'n12', type: 'ai', group: 'AI/Sistemi', title: 'Zbulim dublikate u ekzekutua', body: '1 çift dublikatësh u identifikua këtë orë.', time: h(-0.5), read: false },
  ];

  // ---- Automation rules (used by Automatizimet, later pass) -------------
  var automations = [
    { id: 'a1', name: 'Rrugëzim automatik — Mbetje', condition: 'Kategoria = Mbetje', action: 'Cakto → Shërbime Publike', active: true, lastRun: h(-3), affected: 4 },
    { id: 'a2', name: 'Rrugëzim automatik — Ndriçim publik', condition: 'Kategoria = Ndriçim publik', action: 'Cakto → Ndriçim', active: true, lastRun: h(-0.6), affected: 3 },
    { id: 'a3', name: 'Njoftim SLA', condition: 'SLA < 4 orë', action: 'Njofto përgjegjësin + supervisorin', active: true, lastRun: h(-0.15), affected: 2 },
    { id: 'a4', name: 'Zbulim dublikatësh', condition: 'Ngjashmëri > 85%', action: 'Sugjero dublikatë', active: true, lastRun: h(-0.5), affected: 1 },
    { id: 'a5', name: 'Rrugëzim automatik — Gropa', condition: 'Kategoria = Gropa në rrugë', action: 'Cakto → Infrastrukturë', active: true, lastRun: h(-0.1), affected: 5 },
    { id: 'a6', name: 'Sinjalizim përsëritjeje', condition: 'Ngjashmëri gjeografike > 80% me rast të mbyllur', action: 'Shëno si i përsëritur', active: false, lastRun: h(-70), affected: 1 },
  ];

  // ---- Recent activity feed (Kreu) --------------------------------------
  // Hand-authored rather than derived from buildTimeline, but every entry
  // names a real report whose current status matches what the feed claims
  // (the "resolved" line only points at a report that's actually Zgjidhur,
  // etc.), so clicking through never contradicts what the feed just said.
  var ACTIVITY = [
    { id: 'act1', kind: 'resolved', reportId: '02465', minutesAgo: 4 },
    { id: 'act2', kind: 'auto_assigned', reportId: '02481', minutesAgo: 11 },
    { id: 'act3', kind: 'reviewed', reportId: '02478', minutesAgo: 18, actor: 'Drita K.' },
    { id: 'act4', kind: 'reappeared', reportId: '02467', minutesAgo: 24 },
  ];

  // =====================================================================
  // ---- Automatizimet: the automation layer ------------------------------
  // =====================================================================
  // Governing model: Automatizo → Monitoro → Ndërhy kur duhet → Regjistro
  // ndërhyrjen → Përmirëso rregullat. Categorization is NOT here: category
  // is a case field. What SINJAL automates is routing, priority, duplicate
  // detection, moderation, missing-information requests, SLA escalation,
  // resolution verification and publication drafts.
  //
  // Everything below is either (a) derived straight from the report seed
  // rows (routing/priority decisions, confidence tiers, SLA escalations,
  // verification checks on real resolution evidence), or (b) authored demo
  // content in the same role as ZONE_COORDS — detector output the seed rows
  // can't carry (moderation excerpts, duplicate-detector similarity,
  // missing-info requests, a handful of historical clerk overrides). Every
  // authored item points at a real report whose current state it agrees with.

  var CLERKS = ['Drita K.', 'Ermal K.'];
  var INTAKE = 'Pranimi i përgjithshëm';

  var TEAMS = {
    infra: ['Mirëmbajtja e rrugëve', 'Kanalizime & trotuare'],
    sherbime: ['Pastrimi', 'Gjelbërimi & parqet'],
    mjedis: ['Inspektimi mjedisor'],
    ndricim: ['Rrjeti i ndriçimit'],
    uje: ['Rrjeti i ujësjellësit'],
  };

  // Routing rules, evaluated top to bottom — first active match wins.
  var ROUTING_RULES = [
    { id: 'rr14', no: 14, category: 'gropa', zone: 'Qendër', dept: 'infra', team: 'Mirëmbajtja e rrugëve', exception: 'Nëse prioriteti = Urgjente → Eskalimi #4 (njofto përgjegjësin e departamentit)', active: true },
    { id: 'rr15', no: 15, category: 'gropa', zone: null, dept: 'infra', team: 'Mirëmbajtja e rrugëve', exception: 'Nëse rrezik për kalimtarë → Urgjente', active: true },
    { id: 'rr16', no: 16, category: 'infra', zone: null, dept: 'infra', team: 'Kanalizime & trotuare', exception: 'Nëse rrezik strukturor → Urgjente', active: true },
    { id: 'rr11', no: 11, category: 'mbetje', zone: null, dept: 'sherbime', team: 'Pastrimi', exception: 'Nëse rrezik shëndetësor → Urgjente', active: true },
    { id: 'rr12', no: 12, category: 'hapesira', zone: null, dept: 'sherbime', team: 'Gjelbërimi & parqet', exception: null, active: true },
    { id: 'rr13', no: 13, category: 'ndricim', zone: null, dept: 'ndricim', team: 'Rrjeti i ndriçimit', exception: 'Nëse pranë shkollës / kalimit të këmbësorëve → E lartë', active: true },
  ];

  function matchRule(rules, r) {
    for (var i = 0; i < rules.length; i++) {
      var ru = rules[i];
      if (!ru.active) continue;
      if (ru.category !== r.category) continue;
      if (ru.zone && ru.zone !== r.zone) continue;
      return ru;
    }
    return null;
  }

  // Confidence model — only for automations where uncertainty is meaningful.
  //   high  ≥ 80  → automatic action
  //   medium 55–79 → automatic action + review highlighted
  //   low   < 55  → no consequential automated decision (routing → intake)
  function confTier(c) { return c >= 80 ? 'high' : (c >= 55 ? 'medium' : 'low'); }
  var TIER_META = {
    high:   { label: 'E lartë', color: '#2E7D4F', bg: '#E1EEE5', ink: '#1E5C3A' },
    medium: { label: 'Mesatare', color: '#B8860B', bg: '#F5EBD6', ink: '#7A5A0B' },
    low:    { label: 'E ulët', color: '#C23B31', bg: '#F6E1DE', ink: '#8E2A22' },
  };

  var AUTOMATION_TYPES = [
    { id: 'routing',      label: 'Routing',                 short: 'Routing',      defaultAutonomy: 'auto',        autonomyOptions: ['auto', 'auto_review', 'suggest'] },
    { id: 'priority',     label: 'Prioriteti',              short: 'Prioriteti',   defaultAutonomy: 'auto',        autonomyOptions: ['auto', 'auto_review', 'suggest'] },
    { id: 'duplicates',   label: 'Dublikatat',              short: 'Dublikatat',   defaultAutonomy: 'threshold',   autonomyOptions: ['threshold', 'flag_review', 'suggest'] },
    { id: 'moderation',   label: 'Moderimi',                short: 'Moderimi',     defaultAutonomy: 'flag_review', autonomyOptions: ['flag_review', 'suggest'] },
    { id: 'missing',      label: 'Informacioni i munguar',  short: 'Info e munguar', defaultAutonomy: 'auto',      autonomyOptions: ['auto', 'suggest'] },
    { id: 'sla',          label: 'SLA & Eskalimet',         short: 'SLA',          defaultAutonomy: 'auto',        autonomyOptions: ['auto', 'suggest'] },
    { id: 'verification', label: 'Verifikimi i zgjidhjeve', short: 'Verifikimi',   defaultAutonomy: 'flag_review', autonomyOptions: ['flag_review', 'suggest'] },
    { id: 'publications', label: 'Publikimet',              short: 'Publikimet',   defaultAutonomy: 'draft',       autonomyOptions: ['draft'] },
  ];
  var AUTONOMY_META = {
    auto:        { label: 'Automatik', color: '#2E7D4F', note: 'Vepron vetë; stafi monitoron dhe ndërhyn kur duhet.' },
    auto_review: { label: 'Automatik + shqyrtim', color: '#B8860B', note: 'Vepron vetë, por çdo vendim shfaqet për konfirmim.' },
    threshold:   { label: 'Automatik nën prag', color: '#B8860B', note: 'Lidh vetë vetëm mbi pragun e ngjashmërisë; poshtë tij sinjalizon.' },
    flag_review: { label: 'Sinjalizim + shqyrtim njerëzor', color: '#B8860B', note: 'Sinjalizon dhe pezullon; vendimi përfundimtar është i stafit.' },
    draft:       { label: 'Draft AI → miratim njerëzor', color: '#B8860B', note: 'Përgatit draftin; publikimi kërkon miratimin e nëpunësit.' },
    suggest:     { label: 'Vetëm sugjerim', color: '#8A847C', note: 'Nuk vepron; vetëm sugjeron.' },
  };

  // ---- Priority reasons: derived from real report fields -------------
  function priorityReasons(r) {
    var out = [];
    var cat = CATEGORIES.filter(function (c) { return c.id === r.category; })[0];
    if (r.ai.risk === 'I lartë') out.push('Rrezik për sigurinë publike (risku: I lartë)');
    else if (r.ai.risk === 'I mesëm') out.push('Rrezik i moderuar (risku: I mesëm)');
    var place = (r.address + ' ' + r.title).toLowerCase();
    if (place.indexOf('shkoll') !== -1 || place.indexOf('kopsht') !== -1) out.push('Vendndodhje pranë shkollës / kopshtit');
    if (r.title.toLowerCase().indexOf('rrezik') !== -1) out.push('Përshkrimi përmend rrezik');
    if (cat) out.push('Prioriteti bazë i kategorisë: ' + cat.defaultPriority);
    return out;
  }

  // ---- Duplicate detector output (authored; see note above) ------------
  // similarity + the factor breakdown the detector reports. `dupe` is the
  // case that gets marked Dublikatë when linked (default: the newer one).
  // Time gap and
  // same-category/zone are recomputed from the reports themselves.
  var DUPLICATE_CANDIDATES = [
    { id: 'd1', a: '02459', b: '02460', dupe: '02460', similarity: 89, distanceM: 35, textSim: 71, imagesSimilar: true, autoLinked: true },
    { id: 'd2', a: '02478', b: '02459', similarity: 78, distanceM: 0, textSim: 38, imagesSimilar: true, autoLinked: false },
    { id: 'd3', a: '02475', b: '02470', similarity: 66, distanceM: 420, textSim: 44, imagesSimilar: true, autoLinked: false },
    { id: 'd4', a: '02481', b: '02467', similarity: 61, distanceM: 0, textSim: 12, imagesSimilar: false, autoLinked: false },
    { id: 'd5', a: '02474', b: '02463', similarity: 68, distanceM: 260, textSim: 52, imagesSimilar: true, autoLinked: false,
      decision: { decision: 'separate', by: 'Ermal K.', reason: 'Rasti i stacionit është mbyllur; problemi i ri është në një rrugë tjetër.', hoursAfterNewer: 0.3 } },
  ];

  // ---- Moderation flags (authored detector output) ---------------------
  // Detection ≠ deletion: a consequential flag only HOLDS citizen-facing
  // publication; the case itself keeps being processed.
  var MODERATION_TYPES = [
    { id: 'abuse', label: 'Gjuhë fyese / abuzive' },
    { id: 'threat', label: 'Kërcënime' },
    { id: 'spam', label: 'Spam' },
    { id: 'irrelevant', label: 'Paraqitje e parëndësishme' },
    { id: 'pii', label: 'Informacion personal identifikues' },
    { id: 'image', label: 'Imazhe të papërshtatshme' },
  ];
  var MODERATION_FLAGS = [
    { id: 'm1', reportId: '02470', type: 'pii', confidence: 92, excerpt: '…e hedh çdo natë fqinji, telefononi në 06█ ███ ████ dhe do ta shihni vetë…', hoursAfterSubmit: 0.07 },
    { id: 'm2', reportId: '02475', type: 'abuse', confidence: 81, excerpt: '…këta [fjalë fyese] të bashkisë nuk lëvizin kurrë nga zyra…', hoursAfterSubmit: 0.07 },
    { id: 'm3', reportId: '02466', type: 'abuse', confidence: 58, excerpt: '…është katastrofë e vërtetë, era është e padurueshme…', hoursAfterSubmit: 0.07,
      decision: { decision: 'allow', by: 'Drita K.', reason: 'Fals pozitiv: "katastrofë" përshkruan gjendjen, nuk është fyerje.', hoursAfterSubmit: 0.6 } },
    { id: 'm4', reportId: '02461', type: 'image', confidence: 77, excerpt: 'Fotoja shfaq targën e lexueshme të një automjeti privat.', hoursAfterSubmit: 0.07,
      decision: { decision: 'edit', by: 'Ermal K.', reason: 'Targa u maskua para çdo publikimi.', editedText: 'Fotoja u publikua me targën e maskuar.', hoursAfterSubmit: 0.9 } },
  ];

  // ---- Missing-information requests (authored) -------------------------
  var MISSING_FIELDS = [
    { id: 'location', label: 'Vendndodhje e saktë' },
    { id: 'photo', label: 'Foto e qartë' },
    { id: 'description', label: 'Përshkrim' },
    { id: 'category', label: 'Informacion për kategorinë' },
  ];
  var MISSING_INFO = [
    { reportId: '02471', missing: ['location', 'photo'], problem: 'Vendndodhja nuk është mjaftueshëm e saktë dhe fotoja nuk e tregon dëmtimin.', message: 'Ju lutemi na jepni një vendndodhje më të saktë dhe një foto më të qartë të bankinës së dëmtuar.', hoursAfterSubmit: 0.1, state: 'waiting' },
    { reportId: '02472', missing: ['location'], problem: 'Vendndodhja nuk është mjaftueshëm e saktë.', message: 'Ju lutemi na jepni një vendndodhje më të saktë (p.sh. një pikë reference ose numrin e ndërtesës më të afërt).', hoursAfterSubmit: 0.1, state: 'waiting' },
    { reportId: '02470', missing: ['location'], problem: 'Vendndodhja "Buzë lumit" mbulon disa kilometra.', message: 'Ju lutemi na tregoni në cilën pjesë të lumit ndodhen mbeturinat.', hoursAfterSubmit: 0.1, state: 'answered', answer: 'Poshtë urës së Shkumbinit, ana e majtë, pranë rrugës së kalldrëmtë.', answeredHoursAfterSubmit: 3.2 },
  ];

  // ---- SLA automation rules + standard targets -------------------------
  var SLA_RULES = [
    { id: 's1', no: 1, condition: 'SLA e mbetur < 25%', action: 'Njofto punonjësin përgjegjës', active: true },
    { id: 's2', no: 2, condition: 'SLA e shkelur', action: 'Përshkallëzo te përgjegjësi i departamentit', active: true },
    { id: 's3', no: 3, condition: 'Pa përgjegjës > 24 orë', action: 'Përshkallëzo te ' + INTAKE, active: true },
  ];
  var SLA_TARGETS = [
    { priority: 'Urgjente', hours: 4 },
    { priority: 'E lartë', hours: 24 },
    { priority: 'E mesme', hours: 48 },
    { priority: 'E ulët', hours: 72 },
  ];

  // ---- Resolution verification: visual-consistency detector (authored).
  // Description/evidence/before-after checks are computed from real fields.
  var VERIFY_VISUAL = { '02465': 'warn' };

  // ---- Past publications (authored; every case in it is Mbyllur) -------
  var PUBLICATIONS = [
    { id: 'pub1', caseIds: ['02464', '02463', '02462'], hoursAgo: 26, by: 'Drita K.', status: 'Publikuar',
      text: 'Gjatë kësaj jave, Bashkia Elbasan ka përfunduar 3 ndërhyrje të raportuara nga qytetarët përmes SINJAL: u riparuan bangat në Parkun Rinia, u rikthye ndriçimi te stacioni i autobusit dhe u mbyll një gropë e madhe në rrugën Bradashesh–Shirgjan. Faleminderit që raportoni.' },
  ];

  // ---- Authored historical clerk overrides on real cases ----------------
  // (routing + priority; moderation/duplicate ones live on their flags)
  var HISTORICAL_OVERRIDES = [
    { kind: 'routing', reportId: '02470', from: 'Shërbime Publike', to: 'Mjedis', by: 'Ermal K.', reason: 'Hedhje e paligjshme pranë lumit — kompetencë e inspektimit mjedisor.', hoursAfterSubmit: 0.5 },
    { kind: 'priority', reportId: '02472', from: 'E mesme', to: 'E ulët', by: 'Ermal K.', reason: 'Gropë e vogël në rrugë me trafik të ulët; rreziku nuk konfirmohet.', hoursAfterSubmit: 0.4 },
  ];
  // the automatic priority the historical priority override reversed
  byId('02472').ai.suggestedPriority = 'E mesme';

  // =====================================================================
  // ---- Performanca: 90-day case history (ILLUSTRATIVE) ------------------
  // =====================================================================
  // The live seed rows above are an ~8-day snapshot of what's open on the
  // desk right now — far too short to show performance *over time*. This
  // block generates a deterministic (seeded) history of CLOSED cases for the
  // 90 days before NOW, in the same role as ZONE_COORDS/KREU_ILLUSTRATIVE:
  // demo content, never presented as real municipal statistics (Performanca
  // labels it). Every KPI, trend, insight and drill-down on that page is then
  // computed from these records + the live reports — nothing is typed in.
  //
  // Built-in dynamics (so the analysis has something true to find):
  //   · Ndriçim publik volume +~28% in the last 30 days
  //   · Infrastrukturë slowing down from ~day −35 (resolution time up, more
  //     SLA breaches, a handful of >24h assignment delays)
  //   · Papër has a higher share of reappearing problems
  //   · Mbetje concentrated in Shushicë in the last 30 days
  // All history rows are closed (Mbyllur / Dublikatë / Refuzuar), so "active"
  // and "unassigned" everywhere still come from the live reports only.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(20260923);
  function gauss() { var u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function pickW(pairs) { var tot = 0, i; for (i = 0; i < pairs.length; i++) tot += pairs[i][1]; var x = rnd() * tot; for (i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x <= 0) return pairs[i][0]; } return pairs[pairs.length - 1][0]; }
  var SLA_H = { 'Urgjente': 4, 'E lartë': 24, 'E mesme': 48, 'E ulët': 72 };
  var TITLES = {
    gropa: ['Gropë në rrugë', 'Gropë e thellë pranë kryqëzimit', 'Asfalt i dëmtuar pas shirave', 'Gropa të shumta në rrugë dytësore'],
    infra: ['Kapak kanalizimi i dëmtuar', 'Trotuar i dëmtuar', 'Parmakë të thyer', 'Kanal i hapur', 'Mur mbajtës i çarë'],
    mbetje: ['Kontejner i mbushur', 'Mbetje të pambledhura', 'Hedhje e paligjshme mbetjesh', 'Kontejner i dëmtuar'],
    ndricim: ['Poçe e djegur', 'Rrugë pa ndriçim', 'Shtyllë ndriçimi e dëmtuar', 'Ndriçim që pulson'],
    hapesira: ['Bangë parku e thyer', 'Lulishte e pakujdesur', 'Kënd lojërash i dëmtuar', 'Barishte në trotuar'],
  };
  var BASE_RATE = { mbetje: 3.1, gropa: 2.2, infra: 1.6, ndricim: 1.7, hapesira: 1.0 };
  var DEPT_SPEED = { infra: 1.0, ndricim: 0.78, sherbime: 0.85, mjedis: 1.05, uje: 0.8 };
  var DEPT_RESPONSE_H = { infra: 5.0, ndricim: 3.0, sherbime: 7.0, mjedis: 6.0, uje: 4.0 };
  var ZONE_W = [['Qendër', 30], ['Bradashesh', 11], ['Shirgjan', 9], ['Papër', 12], ['Shushicë', 11], ['Gjinar', 9], ['Labinot', 8], ['Zavalinë', 10]];
  var hist = [];
  var dayStart = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  for (var d = -90; d <= 0; d++) {
    var day0 = new Date(dayStart.getTime() + d * 86400000);
    var weekend = day0.getDay() === 0 || day0.getDay() === 6;
    Object.keys(BASE_RATE).forEach(function (cat) {
      var rate = BASE_RATE[cat] * (weekend ? 0.8 : 1);
      if (d > -30 && cat === 'ndricim') rate *= 1.3;
      if (d > -30 && (cat === 'gropa' || cat === 'infra')) rate *= 1.18;
      var n = Math.floor(rate + rnd());
      for (var k = 0; k < n; k++) {
        var catObj = CATEGORIES.filter(function (c) { return c.id === cat; })[0];
        var zone = (d > -30 && cat === 'mbetje' && rnd() < 0.3) ? 'Shushicë' : pickW(ZONE_W);
        var dept = catObj.dept;
        if (cat === 'mbetje' && rnd() < 0.08) dept = 'mjedis';
        if (cat === 'infra' && rnd() < 0.06) dept = 'uje';
        var base = catObj.defaultPriority;
        var prio = pickW([[base, 70], ['Urgjente', cat === 'infra' || cat === 'gropa' ? 10 : 4], ['E ulët', 10], ['E lartë', 8], ['E mesme', 8]]);
        var sub = new Date(day0.getTime() + (6 + rnd() * 15) * 3600000);
        if (sub > NOW) continue;
        var slaH = SLA_H[prio];
        var ramp = (dept === 'infra' && d > -36) ? 1 + 0.55 * ((d + 36) / 36) : (dept === 'sherbime' && d > -20 ? 1.08 : 1);
        var f = Math.exp(Math.log(0.6) + 0.45 * gauss()) * DEPT_SPEED[dept] * ramp;
        var resolveH = Math.max(0.6, slaH * f);
        var assignH = Math.max(0.1, 0.4 + Math.abs(gauss()) * 2.2);
        if ((dept === 'infra' && d > -30 && rnd() < 0.06) || rnd() < 0.015) assignH = 24 + rnd() * 20;
        var responseH = Math.min(resolveH * 0.9, Math.max(assignH, DEPT_RESPONSE_H[dept] * Math.exp(0.45 * gauss())));
        var startH = Math.min(resolveH * 0.95, Math.max(responseH, assignH + 0.5 + rnd() * 6));
        var status = 'Mbyllur';
        var r = rnd();
        if (r < 0.04) status = 'Dublikatë'; else if (r < 0.06) status = 'Refuzuar';
        var resolvedAt = new Date(sub.getTime() + resolveH * 3600000);
        if (status === 'Mbyllur' && resolvedAt > NOW) continue;
        var emps = EMPLOYEES.filter(function (e) { return e.dept === dept; });
        hist.push({
          live: false, category: cat, dept: dept, zone: zone, priority: prio, basePriority: base, submittedAt: sub, slaH: slaH,
          assignH: status === 'Mbyllur' ? assignH : null, responseH: status === 'Mbyllur' ? responseH : (0.5 + rnd() * 3), startH: status === 'Mbyllur' ? startH : null,
          resolveH: status === 'Mbyllur' ? resolveH : null, status: status,
          slaMet: status === 'Mbyllur' ? resolveH <= slaH : null,
          reappeared: status === 'Mbyllur' && rnd() < (zone === 'Papër' ? 0.14 : 0.055),
          reopened: status === 'Mbyllur' && rnd() < 0.03,
          verified: status === 'Mbyllur' ? rnd() < 0.9 : null,
          responsible: status === 'Mbyllur' && emps.length ? pick(emps).id : null,
          title: pick(TITLES[cat]),
        });
      }
    });
  }
  hist.sort(function (a, b) { return a.submittedAt - b.submittedAt; });
  hist.forEach(function (h0, i) {
    var num = 2457 - (hist.length - 1 - i);
    var id = ('0000' + num).slice(-5);
    h0.id = id; h0.displayId = '#' + id;
  });

  // ---- Shared performance engine ---------------------------------------
  // ONE definition of the service metrics, used by Kreu, Departamentet and
  // Performanca so the same figure can never read differently on two pages.
  // Records = the illustrative closed history + the live reports (with the
  // session's case overrides applied).
  var PERF_CLOSED = ['Zgjidhur', 'Mbyllur', 'Dublikatë', 'Refuzuar'];
  function perfRecords(overrides) {
    overrides = overrides || {};
    var H = 3600000;
    var live = reports.map(function (r) {
      var ov = overrides[r.id] || {};
      var status = ov.status || r.status;
      var dept = ov.department || r.department;
      var resp = ov.responsible !== undefined ? ov.responsible : r.responsible;
      var resolved = status === 'Zgjidhur' || status === 'Mbyllur';
      var slaH = (r.slaDeadline - r.submittedAt) / H;
      var resolveH = resolved ? (r.resolutionHours != null ? r.resolutionHours : (NOW - r.submittedAt) / H) : null;
      var open = PERF_CLOSED.indexOf(status) === -1;
      return {
        live: true, id: r.id, displayId: r.displayId, title: r.title, category: r.category, dept: dept, zone: r.zone, priority: ov.priority || r.priority,
        submittedAt: r.submittedAt, slaH: slaH, assignH: resp ? 0.5 : null, responseH: resp ? 0.4 : null, startH: ['Në punë', 'Zgjidhur', 'Mbyllur'].indexOf(status) !== -1 ? 2 : null,
        resolveH: resolveH, status: status, slaMet: resolved ? resolveH <= slaH : null, reappeared: !!r.reappeared, reopened: !!(ov.reopenLog && ov.reopenLog.length),
        verified: resolved ? status === 'Mbyllur' : null, responsible: resp, open: open,
        slaBreached: open && r.slaDeadline < NOW, slaAtRisk: open && r.slaDeadline >= NOW && (r.slaDeadline - NOW) / H <= 4,
      };
    });
    var histRecs = hist.map(function (r) { return Object.assign({ open: false, slaBreached: false, slaAtRisk: false }, r); });
    return histRecs.concat(live);
  }
  function perfWindow(days, shift) {
    shift = shift || 0;
    return { from: new Date(NOW.getTime() - days * (shift + 1) * 86400000), to: new Date(NOW.getTime() - days * shift * 86400000 + 1) };
  }
  function perfCohort(recs, f, days, shift) {
    var w = perfWindow(days, shift);
    return recs.filter(function (r) {
      return r.submittedAt >= w.from && r.submittedAt < w.to && (!f.dept || r.dept === f.dept) && (!f.category || r.category === f.category) && (!f.zone || r.zone === f.zone);
    });
  }
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  var PERF = {
    records: perfRecords, window: perfWindow, cohort: perfCohort,
    slaRate: function (recs, f, days, shift) { var R = perfCohort(recs, f || {}, days, shift).filter(function (r) { return r.resolveH != null; }); return R.length ? (R.filter(function (r) { return r.slaMet; }).length / R.length) * 100 : null; },
    avgResponse: function (recs, f, days, shift) { return avg(perfCohort(recs, f || {}, days, shift).filter(function (r) { return r.responseH != null; }).map(function (r) { return r.responseH; })); },
    avgResolution: function (recs, f, days, shift) { return avg(perfCohort(recs, f || {}, days, shift).filter(function (r) { return r.resolveH != null; }).map(function (r) { return r.resolveH; })); },
    newCount: function (recs, f, days, shift) { return perfCohort(recs, f || {}, days, shift).length; },
  };

  window.SINJAL = {
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
    reports: reports,
    notifications: notifications,
    automations: automations,
    byId: byId,
    deptName: deptName,
    empName: empName,
    catLabel: catLabel,
    fmtDateTime: fmtDateTime,
    fmtTime: fmtTime,
    fmtSLA: fmtSLA,
    fmtDuration: fmtDuration,
    fmtHours: fmtHours,
    history: hist,
    perf: PERF,
    slaHours: SLA_H,
    automation: {
      clerks: CLERKS, intake: INTAKE, teams: TEAMS, routingRules: ROUTING_RULES, matchRule: matchRule,
      confTier: confTier, tierMeta: TIER_META, types: AUTOMATION_TYPES, autonomyMeta: AUTONOMY_META,
      priorityReasons: priorityReasons, duplicateCandidates: DUPLICATE_CANDIDATES,
      moderationTypes: MODERATION_TYPES, moderationFlags: MODERATION_FLAGS,
      missingFields: MISSING_FIELDS, missingInfo: MISSING_INFO,
      slaRules: SLA_RULES, slaTargets: SLA_TARGETS, verifyVisual: VERIFY_VISUAL,
      publications: PUBLICATIONS, historicalOverrides: HISTORICAL_OVERRIDES,
    },
  };
})();
