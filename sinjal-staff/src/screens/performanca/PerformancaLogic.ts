import type { ChangeEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { CaseOverrides, Priority } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, writeJSON, writeString } from '../../lib/storage';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

// Performanca builds many ad-hoc shapes (indicator definitions, drill-down
// rows, chart series, report sections) inside one render pass. Those
// intermediate records are typed loosely so the design's logic stays
// unchanged; state, storage and handlers are typed, and every rendered value
// is checked against the design by tests/parity.test.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = any;

type Role = 'bashkia' | 'dept' | string;

/** A drill-down into the cases behind a number. */
export interface Explore {
  measure: string;
  dept: string | null;
  zone: string | null;
  category: string | null;
  emp: string | null;
  onlyBad: boolean;
  back: string;
  [key: string]: unknown;
}

interface State {
  pages: Record<string, number>;
  role: Role;
  roleDept: string;
  screen: string;
  period: number;
  compare: boolean;
  overrides: CaseOverrides;
  kpiIds: string[];
  customIndicators: Rec[];
  targets: Record<string, Rec> | null;
  editKpisOpen: boolean;
  builderOpen: boolean;
  builderDraft: Rec | null;
  builderError: string;
  trendMetric: string;
  causesOpen: boolean;
  explore: Explore | null;
  zoneSel: string;
  reportDraft: Rec | null;
  generated: Rec | null;
  savedReports: Rec[];
  schedules: Rec[] | null;
  scheduleOpen: boolean;
  scheduleDraft: Rec | null;
  caseLimit: number;
}

type Props = Record<string, never>;

/** Port of the Performanca.dc.html logic: municipal and department scopes, indicator builder, drill-down, trends, insights and scheduled reports. */
export class PerformancaLogic extends DCLogic<Props, State> {
  state: State = {
    pages: {},
    role: 'bashkia',
    roleDept: 'infra',
    screen: 'summary',
    period: 30,
    compare: true,
    overrides: {},
    kpiIds: ['k_closed', 'k_response', 'k_resolution', 'k_sla', 'k_reappear', 'k_unassigned'],
    customIndicators: [],
    targets: null,
    editKpisOpen: false,
    builderOpen: false,
    builderDraft: null,
    builderError: '',
    trendMetric: 'k_sla',
    causesOpen: false,
    explore: null,
    zoneSel: 'Papër',
    reportDraft: null,
    generated: null,
    savedReports: [],
    schedules: null,
    scheduleOpen: false,
    scheduleDraft: null,
    caseLimit: 40,
  };

  _setPage(key: string, p: number) {
    this.setState({ pages: Object.assign({}, this.state.pages, { [key]: p }) });
  }
  componentDidMount() {
    const read = readJSON;
    const role = read<{ role?: Role; dept?: string } | null>(STORAGE_KEYS.perfRole, null);
    const patch: Partial<State> = {
      overrides: read(STORAGE_KEYS.caseOverrides, {}),
      kpiIds: read(STORAGE_KEYS.perfKpis, this.state.kpiIds),
      customIndicators: read(STORAGE_KEYS.perfCustomIndicators, []),
      targets: read(STORAGE_KEYS.perfTargets, null),
      schedules: read(STORAGE_KEYS.perfSchedules, null),
      savedReports: read(STORAGE_KEYS.perfReports, []),
    };
    if (role && role.role) {
      patch.role = role.role;
      patch.roleDept = role.dept || 'infra';
    }
    this.setState(patch);
  }

  _save(k: string, v: unknown) {
    writeJSON(k, v);
  }
  _setRole(role: Role, dept?: string) {
    const d = dept || this.state.roleDept;
    this._save(STORAGE_KEYS.perfRole, { role: role, dept: d });
    this.setState({ role: role, roleDept: d, screen: 'summary', explore: null, generated: null, reportDraft: null, causesOpen: false });
  }
  _go(screen: string, extra?: Partial<State>) {
    this.setState(Object.assign({ screen: screen, explore: null }, extra || {}));
  }
  _explore(e: Partial<Explore>) {
    this.setState({
      explore: Object.assign({ measure: 'slaRate', dept: null, zone: null, category: null, emp: null, onlyBad: false }, e, { back: this.state.explore ? this.state.explore.back : this.state.screen }),
      caseLimit: 40,
    });
  }
  _select(id: string) {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }
  _toRaportet(f: Record<string, unknown>) {
    return () => writeJSON(STORAGE_KEYS.incomingFilter, f);
  }
  _toHarta(f: { zones?: string[]; categories?: string[]; departments?: string[] }) {
    return () => writeJSON(STORAGE_KEYS.hartaFocus, f);
  }
  _togglePin(id: string) {
    const ids = this.state.kpiIds.indexOf(id) === -1 ? this.state.kpiIds.concat([id]) : this.state.kpiIds.filter((x) => x !== id);
    this._save(STORAGE_KEYS.perfKpis, ids);
    this.setState({ kpiIds: ids });
  }
  _movePin(id: string, dir: number) {
    const ids = this.state.kpiIds.slice();
    const i = ids.indexOf(id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const t = ids[i];
    ids[i] = ids[j];
    ids[j] = t;
    this._save(STORAGE_KEYS.perfKpis, ids);
    this.setState({ kpiIds: ids });
  }
  _setTarget(id: string, patch: Rec) {
    const t: Rec = Object.assign({}, this._targets());
    t[id] = Object.assign({}, t[id], patch);
    this._save(STORAGE_KEYS.perfTargets, t);
    this.setState({ targets: t });
  }
  _targets(): Record<string, Rec> {
    return this.state.targets || { k_sla: { value: 90 }, k_resolution: { value: 3 }, k_reappear: { value: 7 }, k_response: { value: 8 } };
  }
  _openBuilder() {
    this.setState({
      builderOpen: true,
      builderError: '',
      builderDraft: { name: 'Përmbushja e SLA', measure: 'custom', base: 'resolved', cond: 'slaMet', dept: 'all', category: 'all', period: '30', compare: 'prev', display: '%' },
    });
  }
  _setDraft(p: Rec) {
    this.setState({ builderDraft: Object.assign({}, this.state.builderDraft, p), builderError: '' });
  }
  _saveBuilder() {
    const d = this.state.builderDraft;
    if (!d || !(d.name || '').trim()) {
      this.setState({ builderError: 'Jepni një emër për indikatorin.' });
      return;
    }
    const ind = Object.assign({}, d, { id: 'c_' + (this.state.customIndicators.length + 1) + '_' + Math.round((SINJAL.now.getTime() / 1000) % 100000), name: d.name.trim(), custom: true });
    const list = this.state.customIndicators.concat([ind]);
    const ids = this.state.kpiIds.concat([ind.id]);
    this._save(STORAGE_KEYS.perfCustomIndicators, list);
    this._save(STORAGE_KEYS.perfKpis, ids);
    this.setState({ customIndicators: list, kpiIds: ids, builderOpen: false, builderDraft: null });
  }
  _deleteCustom(id: string) {
    const list = this.state.customIndicators.filter((x) => x.id !== id);
    const ids = this.state.kpiIds.filter((x) => x !== id);
    this._save(STORAGE_KEYS.perfCustomIndicators, list);
    this._save(STORAGE_KEYS.perfKpis, ids);
    this.setState({ customIndicators: list, kpiIds: ids });
  }
  _defaultReportDraft() {
    const S = SINJAL;
    const to = S.now;
    const from = new Date(to.getTime() - 29 * 86400000);
    const iso = (d: Date) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    const deptOnly = this.state.role === 'dept';
    return {
      title: deptOnly ? 'Performanca e departamentit — ' + S.deptName(this.state.roleDept) : 'Performanca e shërbimeve komunale — 30 ditët e fundit',
      from: iso(from),
      to: iso(to),
      depts: deptOnly ? [this.state.roleDept] : ['infra', 'ndricim', 'sherbime'],
      indicators: ['slaRate', 'avgResponse', 'avgResolution', 'reappearRate', 'activeCount'],
      compare: true,
    };
  }
  _draftR(): Rec {
    return this.state.reportDraft || this._defaultReportDraft();
  }
  _setReportDraft(p: Rec) {
    this.setState({ reportDraft: Object.assign({}, this._draftR(), p), generated: null });
  }
  _toggleInDraft(key: string, v: string) {
    const d = this._draftR();
    const cur = d[key];
    this._setReportDraft({ [key]: cur.indexOf(v) === -1 ? cur.concat([v]) : cur.filter((x: Rec) => x !== v) });
  }
  _generate() {
    this.setState({ generated: Object.assign({}, this._draftR()) });
  }
  _saveReport(g: Rec) {
    const list = this.state.savedReports.concat([
      {
        id: 'rep' + (this.state.savedReports.length + 1),
        title: g.title,
        from: g.from,
        to: g.to,
        at: SINJAL.now.toISOString(),
        by: 'Drita K.',
        depts: g.depts,
        indicators: g.indicators,
        compare: g.compare,
      },
    ]);
    this._save(STORAGE_KEYS.perfReports, list);
    this.setState({ savedReports: list });
  }
  _defaultSchedules(): Rec[] {
    return [
      {
        id: 'sch1',
        name: 'Raporti mujor i performancës',
        freq: 'monthly',
        scope: 'bashkia',
        recipients: 'Menaxhimi i Bashkisë',
        active: true,
        contents: ['kpis', 'depts', 'trends', 'sla', 'zones', 'unresolved', 'changes'],
      },
      {
        id: 'sch2',
        name: 'Raporti mujor — Infrastrukturë',
        freq: 'monthly',
        scope: 'infra',
        recipients: 'Menaxheri i Infrastrukturës',
        active: true,
        contents: ['kpis', 'trends', 'sla', 'unresolved'],
      },
      { id: 'sch3', name: 'Përmbledhja javore SLA — Ndriçim', freq: 'weekly', scope: 'ndricim', recipients: 'Menaxheri i Ndriçimit', active: false, contents: ['sla', 'unresolved'] },
    ];
  }
  _schedules(): Rec[] {
    return this.state.schedules || this._defaultSchedules();
  }
  _toggleSchedule(id: string) {
    const list = this._schedules().map((s) => (s.id === id ? Object.assign({}, s, { active: !s.active }) : s));
    this._save(STORAGE_KEYS.perfSchedules, list);
    this.setState({ schedules: list });
  }
  _openSchedule() {
    const deptOnly = this.state.role === 'dept';
    this.setState({
      scheduleOpen: true,
      scheduleDraft: {
        name: deptOnly ? 'Raporti mujor — ' + SINJAL.deptName(this.state.roleDept) : 'Raporti javor i performancës',
        freq: deptOnly ? 'monthly' : 'weekly',
        scope: deptOnly ? this.state.roleDept : 'bashkia',
        contents: ['kpis', 'sla', 'unresolved'],
      },
    });
  }
  _setScheduleDraft(p: Rec) {
    this.setState({ scheduleDraft: Object.assign({}, this.state.scheduleDraft, p) });
  }
  _toggleScheduleContent(c: string) {
    const cur = this.state.scheduleDraft.contents;
    this._setScheduleDraft({ contents: cur.indexOf(c) === -1 ? cur.concat([c]) : cur.filter((x: Rec) => x !== c) });
  }
  _saveSchedule() {
    const S = SINJAL;
    const d = this.state.scheduleDraft;
    if (!d || !(d.name || '').trim() || !d.contents.length) return;
    const list = this._schedules().concat([
      Object.assign({}, d, {
        id: 'sch' + (this._schedules().length + 1),
        name: d.name.trim(),
        active: true,
        recipients: d.scope === 'bashkia' ? 'Menaxhimi i Bashkisë' : 'Menaxheri i ' + S.deptName(d.scope),
      }),
    ]);
    this._save(STORAGE_KEYS.perfSchedules, list);
    this.setState({ schedules: list, scheduleOpen: false, scheduleDraft: null });
  }

  renderVals() {
    const S = SINJAL;
    const NOW = S.now;
    const H = 3600000,
      D = 86400000;
    const st = this.state;
    const overrides = st.overrides || {};

    // ---- pagination: every list/table shows a fixed page, so cards keep
    // their size and side-by-side panels stay balanced ---------------------
    const pager = (key: Rec, list: Rec, size: Rec) => {
      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / size));
      const p = Math.min(pages, Math.max(1, (this.state.pages || {})[key] || 1));
      const start = (p - 1) * size;
      const nums: Rec[] = [];
      for (let i = 1; i <= pages; i++) {
        if (pages <= 7 || i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push({ n: i, isNum: true, isGap: false, onClass: i === p ? 'is-on' : '', onClick: () => this._setPage(key, i) });
        else if (nums.length && !nums[nums.length - 1].isGap) nums.push({ n: '…', isNum: false, isGap: true, onClass: '', onClick: () => {} });
      }
      return {
        items: list.slice(start, start + size),
        pg: {
          show: pages > 1,
          label: total ? start + 1 + '–' + Math.min(total, start + size) + ' nga ' + total : '0',
          page: p,
          pages: pages,
          nums: nums,
          prevClass: p <= 1 ? 'is-disabled' : '',
          nextClass: p >= pages ? 'is-disabled' : '',
          onPrev: () => this._setPage(key, p - 1),
          onNext: () => this._setPage(key, p + 1),
        },
      };
    };
    const isDeptRole = st.role === 'dept';
    const roleDept = st.roleDept;
    const GEN: Record<string, Rec> = { infra: 'të Infrastrukturës', sherbime: 'të Shërbimeve Publike', mjedis: 'të Mjedisit', ndricim: 'të Ndriçimit', uje: 'të Ujësjellësit' };

    // ======================================================================
    // 1. Records: 90-day illustrative history + the live reports (with the
    //    session's case overrides applied, so actions on other pages count)
    // ======================================================================
    // shared engine in mock-data.js — the same records Kreu and Departamentet use
    const ALL = S.perf.records(overrides);
    const isRes = (r: Rec) => r.resolveH != null;
    const resolvedAt = (r: Rec) => new Date(r.submittedAt.getTime() + r.resolveH * H);

    // ======================================================================
    // 2. Measures — every number on the page is one of these, computed
    // ======================================================================
    const mean = (a: Rec) => (a.length ? a.reduce((s: Rec, x: Rec) => s + x, 0) / a.length : null);
    const median = (a: Rec) => {
      if (!a.length) return null;
      const b = a.slice().sort((x: Rec, y: Rec) => x - y);
      const m = Math.floor(b.length / 2);
      return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
    };
    const cohort = (c: Rec) => c.scope.filter((r: Rec) => r.submittedAt >= c.from && r.submittedAt < c.to);
    const pctOf = (num: Rec, den: Rec) => (den ? (num / den) * 100 : null);
    const staffCount = (depts: Rec) => S.employees.filter((e) => depts.indexOf(e.dept) !== -1).length;
    const M: Record<string, Rec> = {
      avgResponse: {
        label: 'Koha mesatare e reagimit',
        group: 'resp',
        unit: 'dur',
        better: 'down',
        formula: 'Mesatarja e kohës nga dërgimi deri te reagimi i parë i stafit',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => r.responseH != null);
          return { value: mean(R.map((r: Rec) => r.responseH)), n: R.length, cases: R, bad: (r: Rec) => r.responseH > 8 };
        },
      },
      medianResponse: {
        label: 'Koha mediane e reagimit',
        group: 'resp',
        unit: 'dur',
        better: 'down',
        formula: 'Mediana e kohës nga dërgimi deri te reagimi i parë',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => r.responseH != null);
          return { value: median(R.map((r: Rec) => r.responseH)), n: R.length, cases: R, bad: (r: Rec) => r.responseH > 8 };
        },
      },
      avgResolution: {
        label: 'Koha mesatare e zgjidhjes',
        group: 'resp',
        unit: 'dur',
        better: 'down',
        formula: 'Mesatarja e kohës nga dërgimi deri te zgjidhja, për raportet e zgjidhura',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          return { value: mean(R.map((r: Rec) => r.resolveH)), n: R.length, cases: R, bad: (r: Rec) => r.slaMet === false };
        },
      },
      medianResolution: {
        label: 'Koha mediane e zgjidhjes',
        group: 'resp',
        unit: 'dur',
        better: 'down',
        formula: 'Mediana e kohës deri te zgjidhja',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          return { value: median(R.map((r: Rec) => r.resolveH)), n: R.length, cases: R, bad: (r: Rec) => r.slaMet === false };
        },
      },
      slaRate: {
        label: 'Përmbushja e SLA',
        group: 'resp',
        unit: 'pct',
        better: 'up',
        formula: 'Raportet e zgjidhura brenda SLA / të gjitha raportet e zgjidhura',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          const n = R.filter((r: Rec) => r.slaMet).length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => r.slaMet === false };
        },
      },
      slaBreachRate: {
        label: '% e raporteve që tejkalojnë SLA',
        group: 'resp',
        unit: 'pct',
        better: 'down',
        formula: '(Të zgjidhura pas afatit + aktive me SLA të shkelur) / (të zgjidhura + aktive)',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => isRes(r) || r.open);
          const n = R.filter((r: Rec) => r.slaMet === false || r.slaBreached).length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => r.slaMet === false || r.slaBreached };
        },
      },
      newCount: {
        label: 'Raporte të reja',
        group: 'case',
        unit: 'count',
        better: 'none',
        formula: 'Raportet e dërguara në periudhë',
        compute: (c: Rec) => {
          const R = cohort(c);
          return { value: R.length, n: R.length, cases: R, bad: (r: Rec) => r.open };
        },
      },
      closedCount: {
        label: 'Raporte të përfunduara',
        group: 'case',
        unit: 'count',
        better: 'up',
        formula: 'Raportet e zgjidhura gjatë periudhës (sipas datës së zgjidhjes)',
        compute: (c: Rec) => {
          const R = c.scope.filter((r: Rec) => isRes(r) && resolvedAt(r) >= c.from && resolvedAt(r) < c.to);
          return { value: R.length, n: R.length, cases: R, bad: (r: Rec) => r.slaMet === false };
        },
      },
      activeCount: {
        label: 'Raporte aktive',
        group: 'case',
        unit: 'count',
        better: 'down',
        snapshot: true,
        formula: 'Raportet e hapura tani',
        compute: (c: Rec) => {
          const R = c.scope.filter((r: Rec) => r.open);
          return { value: R.length, n: R.length, cases: R, bad: (r: Rec) => r.slaBreached || r.slaAtRisk };
        },
      },
      unassignedCount: {
        label: 'Raporte pa caktuar',
        group: 'case',
        unit: 'count',
        better: 'down',
        snapshot: true,
        formula: 'Raportet e hapura pa punonjës përgjegjës tani',
        compute: (c: Rec) => {
          const R = c.scope.filter((r: Rec) => r.open && !r.responsible);
          return { value: R.length, n: R.length, cases: R, bad: () => true };
        },
      },
      unassignedPct: {
        label: 'Raporte të mbetura pa caktuar',
        group: 'case',
        unit: 'pct',
        better: 'down',
        snapshot: true,
        formula: 'Raportet aktive pa përgjegjës / të gjitha raportet aktive (tani)',
        compute: (c: Rec) => {
          const A = c.scope.filter((r: Rec) => r.open);
          const R = A.filter((r: Rec) => !r.responsible);
          return { value: pctOf(R.length, A.length), num: R.length, n: A.length, cases: A, bad: (r: Rec) => !r.responsible };
        },
      },
      avgToAssign: {
        label: 'Koha mesatare deri në caktim',
        group: 'case',
        unit: 'dur',
        better: 'down',
        formula: 'Mesatarja e kohës nga dërgimi deri te caktimi i punonjësit',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => r.assignH != null);
          return { value: mean(R.map((r: Rec) => r.assignH)), n: R.length, cases: R, bad: (r: Rec) => r.assignH > 24 };
        },
      },
      avgToStart: {
        label: 'Koha mesatare deri në fillimin e punës',
        group: 'case',
        unit: 'dur',
        better: 'down',
        formula: 'Mesatarja e kohës nga dërgimi deri te statusi "Në punë"',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => r.startH != null);
          return { value: mean(R.map((r: Rec) => r.startH)), n: R.length, cases: R, bad: (r: Rec) => r.startH > 24 };
        },
      },
      reappearRate: {
        label: '% e raporteve të rishfaqura',
        group: 'quality',
        unit: 'pct',
        better: 'down',
        formula: 'Raportet e zgjidhura ku problemi u rishfaq / të gjitha raportet e zgjidhura',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          const n = R.filter((r: Rec) => r.reappeared).length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => r.reappeared };
        },
      },
      reopenRate: {
        label: '% e rasteve të rihapura',
        group: 'quality',
        unit: 'pct',
        better: 'down',
        formula: 'Rastet e rihapura pas zgjidhjes / të gjitha rastet e zgjidhura',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          const n = R.filter((r: Rec) => r.reopened).length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => r.reopened };
        },
      },
      verifiedRate: {
        label: '% e zgjidhjeve të verifikuara',
        group: 'quality',
        unit: 'pct',
        better: 'up',
        formula: 'Zgjidhjet që kaluan verifikimin / të gjitha zgjidhjet',
        compute: (c: Rec) => {
          const R = cohort(c).filter(isRes);
          const n = R.filter((r: Rec) => r.verified).length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => !r.verified };
        },
      },
      duplicateCount: {
        label: 'Raporte të lidhura / dublikate',
        group: 'quality',
        unit: 'count',
        better: 'none',
        formula: 'Raportet e shënuara si dublikatë në periudhë',
        compute: (c: Rec) => {
          const R = cohort(c).filter((r: Rec) => r.status === 'Dublikatë');
          return { value: R.length, n: R.length, cases: R, bad: () => false };
        },
      },
      workloadPerStaff: {
        label: 'Ngarkesa për punonjës',
        group: 'dept',
        unit: 'ratio',
        better: 'down',
        snapshot: true,
        formula: 'Raportet aktive / numri i punonjësve të departamentit',
        compute: (c: Rec) => {
          const A = c.scope.filter((r: Rec) => r.open);
          const n = staffCount(c.depts);
          return { value: n ? A.length / n : null, n: A.length, cases: A, bad: (r: Rec) => r.slaBreached };
        },
      },
      urgentShare: {
        label: 'Pesha e rasteve urgjente',
        group: 'dept',
        unit: 'pct',
        better: 'none',
        formula: 'Raportet urgjente / të gjitha raportet e periudhës (kontekst, jo cilësi)',
        compute: (c: Rec) => {
          const R = cohort(c);
          const n = R.filter((r: Rec) => r.priority === 'Urgjente').length;
          return { value: pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => r.priority === 'Urgjente' };
        },
      },
      urgentOpen: {
        label: 'Raporte urgjente aktive',
        group: 'geo',
        unit: 'count',
        better: 'down',
        snapshot: true,
        formula: 'Raportet urgjente të hapura tani',
        compute: (c: Rec) => {
          const R = c.scope.filter((r: Rec) => r.open && r.priority === 'Urgjente');
          return { value: R.length, n: R.length, cases: R, bad: () => true };
        },
      },
      density: {
        label: 'Dendësia e problemeve',
        group: 'geo',
        unit: 'rate',
        better: 'down',
        formula: 'Raporte të reja për ditë në periudhë',
        compute: (c: Rec) => {
          const R = cohort(c);
          const days = Math.max(1, (c.to - c.from) / D);
          return { value: R.length / days, n: R.length, cases: R, bad: (r: Rec) => r.open };
        },
      },
    };
    // custom ratio builder vocabulary
    const BASES: Record<string, Rec> = {
      all: { label: 'të gjitha raportet e dërguara', get: (c: Rec) => cohort(c) },
      resolved: { label: 'raportet e zgjidhura', get: (c: Rec) => cohort(c).filter(isRes) },
      open: { label: 'raportet aktive tani', get: (c: Rec) => c.scope.filter((r: Rec) => r.open) },
      urgent: { label: 'raportet urgjente', get: (c: Rec) => cohort(c).filter((r: Rec) => r.priority === 'Urgjente') },
    };
    const CONDS: Record<string, Rec> = {
      slaMet: { label: 'brenda SLA', f: (r: Rec) => r.slaMet === true },
      slaMissed: { label: 'jashtë SLA', f: (r: Rec) => r.slaMet === false || r.slaBreached },
      reappeared: { label: 'të rishfaqura', f: (r: Rec) => r.reappeared },
      reopened: { label: 'të rihapura', f: (r: Rec) => r.reopened },
      verified: { label: 'të verifikuara', f: (r: Rec) => r.verified },
      urgent: { label: 'urgjente', f: (r: Rec) => r.priority === 'Urgjente' },
      lateAssign: { label: 'caktuar pas > 24 orësh', f: (r: Rec) => r.assignH != null && r.assignH > 24 },
      resolved: { label: 'të zgjidhura', f: isRes },
    };
    const measureOf = (ind: Rec) => {
      if (ind.measure !== 'custom') return M[ind.measure];
      const b = BASES[ind.base] || BASES.resolved,
        cd = CONDS[ind.cond] || CONDS.slaMet;
      const unit = ind.display === 'numër' ? 'count' : 'pct';
      return {
        label: ind.name,
        group: 'custom',
        unit: unit,
        better: 'none',
        snapshot: ind.base === 'open',
        formula: 'Raportet ' + cd.label + ' / ' + b.label,
        compute: (c: Rec) => {
          const R = b.get(c);
          const n = R.filter(cd.f).length;
          return { value: unit === 'count' ? n : pctOf(n, R.length), num: n, n: R.length, cases: R, bad: (r: Rec) => !cd.f(r) };
        },
      };
    };

    // ---- formatting ------------------------------------------------------
    const fmtDur = (h: Rec) => S.fmtHours(h); // shared app-wide duration format
    const fmtPct = (v: Rec) => (v == null ? '—' : (v < 10 ? (Math.round(v * 10) / 10).toString().replace('.', ',') : Math.round(v)) + '%');
    const fmtNum = (v: Rec) => (v == null ? '—' : Math.round(v).toLocaleString('de-DE'));
    const fmtVal = (unit: Rec, v: Rec) =>
      unit === 'dur'
        ? fmtDur(v)
        : unit === 'pct'
          ? fmtPct(v)
          : unit === 'ratio'
            ? v == null
              ? '—'
              : (Math.round(v * 10) / 10).toString().replace('.', ',')
            : unit === 'rate'
              ? v == null
                ? '—'
                : (Math.round(v * 10) / 10).toString().replace('.', ',') + '/ditë'
              : fmtNum(v);
    const fmtDelta = (unit: Rec, cur: Rec, prev: Rec) => {
      if (cur == null || prev == null) return '';
      const d = cur - prev;
      if (unit === 'pct') return (d >= 0 ? '+' : '−') + (Math.round(Math.abs(d) * 10) / 10).toString().replace('.', ',') + ' pp';
      if (unit === 'dur') return (d >= 0 ? '+' : '−') + fmtDur(Math.abs(d));
      if (!prev) return '';
      const p = (d / prev) * 100;
      return (p >= 0 ? '+' : '−') + Math.round(Math.abs(p)) + '%';
    };
    const deltaColor = (m: Rec, cur: Rec, prev: Rec) => {
      if (cur == null || prev == null || m.better === 'none' || Math.abs(cur - prev) < 1e-9) return '#8A847C';
      const up = cur > prev;
      return up === (m.better === 'up') ? '#2E7D4F' : '#C23B31';
    };
    const dstr = (d: Rec) => ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2);
    const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

    // ---- scope + windows --------------------------------------------------
    const P = st.period;
    const win = (days: Rec, shift: Rec) => ({ from: new Date(NOW.getTime() - days * (shift + 1) * D), to: new Date(NOW.getTime() - days * shift * D + 1) });
    const scopeCache: Rec = {};
    const scopeOf = (f: Rec) => {
      const key = [f.dept || '', f.category || '', f.zone || '', f.emp || ''].join('|');
      if (!scopeCache[key]) scopeCache[key] = scopeOf0(f);
      return scopeCache[key];
    };
    const scopeOf0 = (f: Rec) =>
      ALL.filter(
        (r) =>
          (!isDeptRole || r.dept === roleDept) &&
          (!f.dept || f.dept === 'all' || r.dept === f.dept) &&
          (!f.category || f.category === 'all' || r.category === f.category) &&
          (!f.zone || r.zone === f.zone) &&
          (!f.emp || r.responsible === f.emp),
      );
    const deptsOf = (f: Rec) => (isDeptRole ? [roleDept] : f.dept && f.dept !== 'all' ? [f.dept] : S.departments.map((d) => d.id));
    const run = (m: Rec, f: Rec, days: Rec, shift: Rec) => {
      const w = win(days, shift || 0);
      return m.compute({ scope: scopeOf(f), from: w.from, to: w.to, depts: deptsOf(f) });
    };
    const weekly = (m: Rec, f: Rec) => {
      if (m.snapshot) return null;
      const out = [];
      for (let i = 11; i >= 0; i--) out.push(run(m, f, 7, i).value);
      return out;
    };
    const curWin = win(P, 0),
      prevWin = win(P, 1);
    const periodText = dstr(curWin.from) + '–' + dstr(NOW);
    const prevText = dstr(prevWin.from) + '–' + dstr(new Date(prevWin.to.getTime() - 1));

    // ---- indicators (built-in + custom) ----------------------------------
    const BUILTIN = [
      { id: 'k_closed', name: 'Raporte të përfunduara', measure: 'closedCount' },
      { id: 'k_response', name: 'Koha mesatare e reagimit', measure: 'avgResponse' },
      { id: 'k_resolution', name: 'Koha mesatare e zgjidhjes', measure: 'avgResolution' },
      { id: 'k_sla', name: 'Përmbushja e SLA', measure: 'slaRate' },
      { id: 'k_reappear', name: 'Raporte të rishfaqura', measure: 'reappearRate' },
      { id: 'k_unassigned', name: 'Raporte të mbetura pa caktuar', measure: 'unassignedPct' },
    ].map((x) => Object.assign({ dept: 'all', category: 'all', period: 'global', compare: 'prev' }, x));
    Object.keys(M).forEach((k) => {
      if (!BUILTIN.some((b) => b.measure === k)) BUILTIN.push({ id: 'k_' + k, name: M[k].label, measure: k, dept: 'all', category: 'all', period: 'global', compare: 'prev' });
    });
    const INDS: Rec[] = (BUILTIN as Rec[]).concat(st.customIndicators);
    const indById: Rec = {};
    INDS.forEach((i) => {
      indById[i.id] = i;
    });
    const targets = this._targets();
    const svgLine = (vals: Rec, w: Rec, h: Rec, pad: Rec, tgt: Rec) => {
      const v = (vals || []).map((x: Rec) => (x == null ? null : x));
      const nums = v.filter((x: Rec) => x != null).concat(tgt != null ? [tgt] : []);
      if (!nums.length) return { points: '', tgtY: -10, dots: [] };
      let lo = Math.min.apply(null, nums),
        hi = Math.max.apply(null, nums);
      if (hi - lo < 1e-6) {
        hi += 1;
        lo -= 1;
      }
      const span = hi - lo;
      lo -= span * 0.12;
      hi += span * 0.12;
      const X = (i: Rec) => pad + (i * (w - 2 * pad)) / Math.max(1, v.length - 1);
      const Y = (x: Rec) => h - pad - ((x - lo) / (hi - lo)) * (h - 2 * pad);
      const pts = v
        .map((x: Rec, i: Rec) => (x == null ? null : X(i).toFixed(1) + ',' + Y(x).toFixed(1)))
        .filter(Boolean)
        .join(' ');
      return {
        points: pts,
        tgtY: tgt != null ? Y(tgt).toFixed(1) : -10,
        dots: v.map((x: Rec, i: Rec) => (x == null ? null : { i: i, cx: X(i).toFixed(1), cy: Y(x).toFixed(1) })).filter(Boolean),
        last: v.length ? { cx: X(v.length - 1).toFixed(1), cy: v[v.length - 1] != null ? Y(v[v.length - 1]).toFixed(1) : -10 } : { cx: -10, cy: -10 },
      };
    };
    const evalInd = (ind: Rec, extraF?: Rec, opts?: Rec): Rec => {
      const m = measureOf(ind);
      const f = Object.assign({ dept: ind.dept, category: ind.category }, extraF || {});
      const days = ind.period === 'global' ? P : parseInt(ind.period, 10);
      const cur = run(m, f, days, 0);
      const prev = ind.compare === 'prev' && !m.snapshot ? run(m, f, days, 1) : null;
      const series = opts && opts.noSeries ? null : weekly(m, f);
      const tgt = targets[ind.id] && targets[ind.id].value !== '' && targets[ind.id].value != null ? parseFloat(targets[ind.id].value) : null;
      const tgtVal = tgt == null ? null : m.unit === 'dur' && ind.measure === 'avgResolution' ? tgt * 24 : tgt;
      let tStatus = null;
      if (tgtVal != null && cur.value != null && m.better !== 'none') {
        const ok = m.better === 'up' ? cur.value >= tgtVal : cur.value <= tgtVal;
        tStatus = {
          ok: ok,
          label: ok ? 'Brenda objektivit' : m.better === 'up' ? 'Nën objektiv' : 'Mbi objektiv',
          color: ok ? '#2E7D4F' : '#C23B31',
          gap: m.unit === 'pct' ? fmtDelta('pct', cur.value, tgtVal) : fmtDelta(m.unit, cur.value, tgtVal),
          target: (m.better === 'up' ? '≥ ' : '≤ ') + (ind.measure === 'avgResolution' ? tgt + ' ditë' : m.unit === 'dur' ? tgt + ' orë' : fmtVal(m.unit, tgtVal)),
        };
      }
      return {
        ind: ind,
        m: m,
        f: f,
        days: days,
        cur: cur,
        prev: prev,
        series: series,
        tgtVal: tgtVal,
        tStatus: tStatus,
        value: fmtVal(m.unit, cur.value),
        prevValue: prev ? fmtVal(m.unit, prev.value) : '',
        delta: prev ? fmtDelta(m.unit, cur.value, prev.value) : '',
        dColor: prev ? deltaColor(m, cur.value, prev.value) : '#8A847C',
      };
    };
    const exploreFor = (ind: Rec, f?: Rec) => () => this._explore(Object.assign({ ind: ind.id }, f || {}));

    const SCREENS_OK = isDeptRole ? ['summary', 'team', 'sla', 'reports', 'trends'] : ['summary', 'departments', 'services', 'zones', 'trends', 'indicators', 'reports'];
    const curScreen = st.explore ? 'explore' : SCREENS_OK.indexOf(st.screen) !== -1 ? st.screen : 'summary';
    const need = (list: Rec) => list.indexOf(curScreen) !== -1;
    // ======================================================================
    // 3. KPI header
    // ======================================================================
    const kpis = st.kpiIds
      .map((id) => indById[id])
      .filter(Boolean)
      .map((ind) => {
        const e = evalInd(ind);
        const sp = svgLine(e.series, 120, 30, 3, e.tgtVal);
        return {
          id: ind.id,
          name: ind.name,
          value: e.value,
          delta: e.delta,
          hasDelta: !!e.delta,
          dColor: e.dColor,
          prevValue: e.prevValue,
          custom: !!ind.custom,
          sub: (e.m.snapshot ? 'tani' : ind.period === 'global' ? P + ' ditë' : ind.period + ' ditë') + ' · n=' + e.cur.n,
          n: e.cur.n,
          spark: sp.points,
          hasSpark: !!sp.points,
          tgtY: sp.tgtY,
          hasTarget: !!e.tStatus,
          noTarget: !e.tStatus,
          tLabel: e.tStatus ? e.tStatus.label : '',
          tColor: e.tStatus ? e.tStatus.color : '',
          tTarget: e.tStatus ? e.tStatus.target : '',
          tGap: e.tStatus ? e.tStatus.gap : '',
          scope:
            (ind.dept && ind.dept !== 'all' ? S.deptName(ind.dept) : '') + (ind.category && ind.category !== 'all' ? (ind.dept && ind.dept !== 'all' ? ' · ' : '') + S.catLabel(ind.category) : ''),
          onClick: exploreFor(ind),
        };
      });

    // ======================================================================
    // 4. Department + service + zone comparison (no ranking, no score)
    // ======================================================================
    const cellsFor = (f: Rec): Record<string, Rec> => {
      const g = (mk: Rec) => evalInd({ id: 'tmp', measure: mk, dept: 'all', category: 'all', period: 'global', compare: 'prev' }, f, { noSeries: true });
      return {
        newC: g('newCount'),
        active: g('activeCount'),
        sla: g('slaRate'),
        resp: g('avgResponse'),
        res: g('avgResolution'),
        reap: g('reappearRate'),
        urgent: g('urgentShare'),
        load: g('workloadPerStaff'),
      };
    };
    const kFor: Record<string, string> = {
      newC: 'k_newCount',
      active: 'k_activeCount',
      sla: 'k_sla',
      resp: 'k_response',
      res: 'k_resolution',
      reap: 'k_reappear',
      urgent: 'k_urgentShare',
      load: 'k_workloadPerStaff',
    };
    const rowCells = (f: Rec) => {
      const c = cellsFor(f);
      const o: Rec = {};
      Object.keys(kFor).forEach((k) => {
        o[k] = { v: c[k].value, d: c[k].delta, hasD: !!c[k].delta, dColor: c[k].dColor, onClick: () => this._explore(Object.assign({ ind: kFor[k] }, f)) };
      });
      return { o: o, c: c };
    };
    const deptRows = !need(['departments'])
      ? []
      : (isDeptRole ? S.departments.filter((d) => d.id === roleDept) : S.departments).map((d) => {
          const rc = rowCells({ dept: d.id });
          const sp = svgLine(weekly(M.slaRate, { dept: d.id }), 96, 26, 3, targets.k_sla ? parseFloat(targets.k_sla.value) : null);
          const small = rc.c.newC.cur.n < 10;
          return Object.assign(
            {
              name: d.name,
              id: d.id,
              smallNote: small ? (d.name === '' ? '' : staffCount([d.id]) + ' punonjës · mostër e vogël') : staffCount([d.id]) + ' punonjës',
              spark: sp.points,
              tgtY: sp.tgtY,
              staff: staffCount([d.id]),
              onOpen: () => this._explore({ ind: 'k_sla', dept: d.id }),
            },
            rc.o,
          );
        });
    const catRows = !need(['services', 'sla'])
      ? []
      : S.categories.map((c) => {
          const rc = rowCells({ category: c.id });
          return Object.assign({ name: c.label, id: c.id, dept: S.deptName(c.dept), onOpen: () => this._explore({ ind: 'k_sla', category: c.id }) }, rc.o);
        });

    // zones
    const zoneStats = S.zones.map((z) => {
      const sc = scopeOf({ zone: z });
      const cur = sc.filter((r: Rec) => r.submittedAt >= curWin.from);
      const res = cur.filter(isRes);
      const reap = res.length ? (res.filter((r: Rec) => r.reappeared).length / res.length) * 100 : 0;
      const active = sc.filter((r: Rec) => r.open);
      const atRisk = active.filter((r: Rec) => r.slaBreached || r.slaAtRisk).length;
      const cats: Rec = {};
      cur.forEach((r: Rec) => {
        cats[r.category] = (cats[r.category] || 0) + 1;
      });
      const topCat = Object.keys(cats).sort((a, b) => cats[b] - cats[a])[0];
      const sla = res.length ? (res.filter((r: Rec) => r.slaMet).length / res.length) * 100 : null;
      return { z: z, n: cur.length, active: active.length, atRisk: atRisk, reap: reap, sla: sla, topCat: topCat, cats: cats, cur: cur };
    });
    const allRes = scopeOf({}).filter((r: Rec) => r.submittedAt >= curWin.from && isRes(r));
    const overallReap = allRes.length ? (allRes.filter((r: Rec) => r.reappeared).length / allRes.length) * 100 : 0;
    const overallSla = allRes.length ? (allRes.filter((r: Rec) => r.slaMet).length / allRes.length) * 100 : 0;
    const maxZoneN = Math.max(1, ...zoneStats.map((z) => z.n));
    const zoneRows = zoneStats
      .slice()
      .sort((a, b) => b.n - a.n)
      .map((z) => ({
        zone: z.z,
        n: fmtNum(z.n),
        active: z.active,
        atRisk: z.atRisk,
        atRiskColor: z.atRisk ? '#C23B31' : '#8A847C',
        reap: fmtPct(z.reap),
        reapColor: z.reap >= overallReap * 1.6 ? '#C23B31' : '#4A4640',
        sla: fmtPct(z.sla),
        topCat: z.topCat ? S.catLabel(z.topCat) : '—',
        barW: Math.round((z.n / maxZoneN) * 100) + '%',
        onClass: st.zoneSel === z.z ? 'is-on' : '',
        onClick: () => this.setState({ zoneSel: z.z }),
      }));
    const zSel = zoneStats.filter((z) => z.z === st.zoneSel)[0] || zoneStats[0];
    const zDept: Rec = {};
    zSel.cur.forEach((r: Rec) => {
      zDept[r.dept] = (zDept[r.dept] || 0) + 1;
    });
    const zDeptList = Object.keys(zDept).sort((a, b) => zDept[b] - zDept[a]);
    const zCatList = Object.keys(zSel.cats).sort((a, b) => zSel.cats[b] - zSel.cats[a]);
    const diag: Rec[] = [];
    if (zSel.n) {
      const topCatShare = zCatList.length ? zSel.cats[zCatList[0]] / zSel.n : 0;
      if (topCatShare >= 0.45) diag.push({ kind: 'Problem kategorie', text: Math.round(topCatShare * 100) + '% e raporteve në ' + zSel.z + ' janë ' + S.catLabel(zCatList[0]).toLowerCase() + '.' });
      if (zSel.reap >= overallReap * 1.6 && zSel.reap > 0)
        diag.push({
          kind: 'Përqendrim gjeografik',
          text:
            'Rishfaqja në ' +
            zSel.z +
            ' është ' +
            fmtPct(zSel.reap) +
            ' kundrejt ' +
            fmtPct(overallReap) +
            ' në gjithë ' +
            (isDeptRole ? 'departamentin' : 'bashkinë') +
            ' — problemet kthehen në të njëjtat vende.',
        });
      zDeptList.forEach((dd) => {
        const inZone = zSel.cur.filter((r: Rec) => r.dept === dd && isRes(r));
        const elsewhere = scopeOf({ dept: dd }).filter((r: Rec) => r.submittedAt >= curWin.from && r.zone !== zSel.z && isRes(r));
        if (inZone.length >= 5 && elsewhere.length >= 5) {
          const a = (inZone.filter((r: Rec) => r.slaMet).length / inZone.length) * 100,
            b = (elsewhere.filter((r: Rec) => r.slaMet).length / elsewhere.length) * 100;
          if (b - a >= 8) diag.push({ kind: 'Problem vendor', text: S.deptName(dd) + ' ka SLA ' + fmtPct(a) + ' në ' + zSel.z + ' kundrejt ' + fmtPct(b) + ' në zonat e tjera.' });
          else if (a < 88 && b < 88)
            diag.push({ kind: 'Problem departamenti', text: S.deptName(dd) + ' ka SLA të ulët kudo (' + fmtPct(a) + ' këtu, ' + fmtPct(b) + ' gjetkë) — jo vetëm në këtë zonë.' });
        }
      });
      if (!diag.length) diag.push({ kind: 'Pa përqendrim të veçantë', text: 'Treguesit e ' + zSel.z + ' janë afër mesatares.' });
    }
    const zoneDetail = {
      zone: zSel.z,
      n: zSel.n,
      active: zSel.active,
      atRisk: zSel.atRisk,
      reap: fmtPct(zSel.reap),
      sla: fmtPct(zSel.sla),
      depts: zDeptList.map((dd) => ({ label: S.deptName(dd), n: zDept[dd], w: Math.round((zDept[dd] / Math.max(1, zSel.n)) * 100) + '%' })),
      cats: zCatList.map((cc) => ({ label: S.catLabel(cc), n: zSel.cats[cc], w: Math.round((zSel.cats[cc] / Math.max(1, zSel.n)) * 100) + '%' })),
      diag: diag,
      onHarta: this._toHarta({ zones: [zSel.z], departments: isDeptRole ? [roleDept] : [] }),
      onCases: () => this._explore({ ind: 'k_newCount', zone: zSel.z, dept: isDeptRole ? null : null, level: 'cases' }),
      onRaportet: this._toRaportet(Object.assign({ zone: zSel.z }, isDeptRole ? { department: roleDept } : {})),
    };

    // ======================================================================
    // 5. Trends + "what caused it"
    // ======================================================================
    const trendChoices = ['k_sla', 'k_resolution', 'k_response', 'k_reappear', 'k_closed', 'k_newCount'].concat(st.customIndicators.map((c) => c.id)).filter((id) => indById[id]);
    const tInd = indById[st.trendMetric] || indById.k_sla;
    const tEval = evalInd(tInd, null, { noSeries: !need(['trends']) });
    const bigLine = svgLine(tEval.series, 640, 180, 18, tEval.tgtVal);
    const weekLabels: Rec[] = [];
    for (let i = 11; i >= 0; i--) {
      const w0 = win(7, i).from;
      weekLabels.push(dstr(w0));
    }
    const trendInsight = (() => {
      if (tEval.m.snapshot) return tInd.name + ' është tregues i çastit — nuk ka trend historik.';
      if (tEval.cur.value == null || !tEval.prev || tEval.prev.value == null) return 'Nuk ka të dhëna të mjaftueshme për krahasim.';
      const d = tEval.cur.value - tEval.prev.value;
      const dir = d > 0 ? 'është rritur' : d < 0 ? 'ka rënë' : 'ka mbetur i pandryshuar';
      const mag =
        tEval.m.unit === 'pct'
          ? (Math.round(Math.abs(d) * 10) / 10).toString().replace('.', ',') + ' pikë përqindje'
          : tEval.m.unit === 'dur'
            ? 'nga ' + fmtDur(tEval.prev.value) + ' në ' + fmtDur(tEval.cur.value)
            : Math.round(Math.abs(d / Math.max(1e-9, tEval.prev.value)) * 100) + '%';
      return tInd.name + ' ' + dir + ' ' + mag + ' gjatë ' + P + ' ditëve të fundit (' + periodText + ', krahasuar me ' + prevText + ').';
    })();
    const causeRows = (() => {
      if (tEval.m.snapshot || !st.causesOpen || !need(['trends'])) return [];
      const dims = [
        { key: 'dept', label: 'Departamenti', items: isDeptRole ? [] : S.departments.map((d) => ({ v: d.id, label: d.name, f: { dept: d.id } })) },
        { key: 'category', label: 'Kategoria', items: S.categories.map((c) => ({ v: c.id, label: c.label, f: { category: c.id } })) },
        { key: 'zone', label: 'Zona', items: S.zones.map((z) => ({ v: z, label: z, f: { zone: z } })) },
        { key: 'priority', label: 'Prioriteti', items: S.priorityOrder.map((p) => ({ v: p, label: p, f: { priority: p } })) },
      ];
      const out: Rec[] = [];
      const totalCur = tEval.cur.n || 1;
      dims.forEach((dim) =>
        dim.items.forEach((it) => {
          const scope =
            dim.key === 'priority'
              ? ALL.filter(
                  (r) => (!isDeptRole || r.dept === roleDept) && (tInd.dept === 'all' || r.dept === tInd.dept) && (tInd.category === 'all' || r.category === tInd.category) && r.priority === it.v,
                )
              : null;
          const calc = (shift: Rec) => {
            const w = win(P, shift);
            return tEval.m.compute({ scope: scope || scopeOf(Object.assign({ dept: tInd.dept, category: tInd.category }, it.f)), from: w.from, to: w.to, depts: deptsOf(it.f) });
          };
          const a = calc(0),
            b = calc(1);
          if (a.value == null || b.value == null || a.n < 4) return;
          const delta = a.value - b.value;
          const share = a.n / totalCur;
          const impact = delta * share;
          out.push({
            dim: dim.label,
            label: it.label,
            cur: fmtVal(tEval.m.unit, a.value),
            prev: fmtVal(tEval.m.unit, b.value),
            delta: fmtDelta(tEval.m.unit, a.value, b.value),
            dColor: deltaColor(tEval.m, a.value, b.value),
            n: a.n,
            impact: impact,
            bad: tEval.m.better === 'up' ? delta < 0 : tEval.m.better === 'down' ? delta > 0 : false,
            onClick: dim.key === 'priority' ? () => this._explore({ ind: tInd.id }) : () => this._explore(Object.assign({ ind: tInd.id }, it.f)),
          });
        }),
      );
      return out
        .filter((x) => x.bad)
        .sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact))
        .slice(0, 6);
    })();
    const vol = (f: Rec, shift: Rec) => run(M.newCount, f, P, shift).value;
    const tf = { dept: tInd.dept, category: tInd.category };
    const volCur = vol(tf, 0),
      volPrev = vol(tf, 1);
    const lateCur = run(M.avgToAssign, tf, P, 0).cases.filter((r: Rec) => r.assignH > 24).length,
      latePrev = run(M.avgToAssign, tf, P, 1).cases.filter((r: Rec) => r.assignH > 24).length;
    const assignCur = run(M.avgToAssign, tf, P, 0).value,
      assignPrev = run(M.avgToAssign, tf, P, 1).value;
    const trendContext = [
      {
        label: 'Ngarkesa (raporte të reja)',
        value: fmtNum(volCur) + ' nga ' + fmtNum(volPrev),
        delta: fmtDelta('count', volCur, volPrev),
        dColor: volCur > volPrev ? '#B8860B' : '#8A847C',
        onClick: () => this._explore({ ind: 'k_newCount' }),
      },
      {
        label: 'Vonesa në caktim (> 24 orë)',
        value: lateCur + ' raste nga ' + latePrev,
        delta: lateCur - latePrev > 0 ? '+' + (lateCur - latePrev) : String(lateCur - latePrev),
        dColor: lateCur > latePrev ? '#C23B31' : '#2E7D4F',
        onClick: () => this._explore({ ind: 'k_avgToAssign', onlyBad: true, level: 'cases' }),
      },
      {
        label: 'Koha mesatare deri në caktim',
        value: fmtDur(assignCur) + ' nga ' + fmtDur(assignPrev),
        delta: fmtDelta('dur', assignCur, assignPrev),
        dColor: assignCur > assignPrev ? '#C23B31' : '#2E7D4F',
        onClick: () => this._explore({ ind: 'k_avgToAssign' }),
      },
    ];
    const trendScreen: Rec = {
      chips: trendChoices.map((id) => ({ label: indById[id].name, onClass: tInd.id === id ? 'is-on' : '', onClick: () => this.setState({ trendMetric: id, causesOpen: false }) })),
      name: tInd.name,
      value: tEval.value,
      delta: tEval.delta,
      hasDelta: !!tEval.delta,
      dColor: tEval.dColor,
      prevValue: tEval.prevValue,
      formula: tEval.m.formula,
      line: bigLine.points,
      dots: bigLine.dots.map((d: Rec) => Object.assign({ tip: 'Java nga ' + weekLabels[d.i] + ': ' + fmtVal(tEval.m.unit, tEval.series[d.i]) }, d)),
      tgtY: bigLine.tgtY,
      hasTarget: tEval.tgtVal != null,
      targetLabel: tEval.tStatus ? 'Objektivi ' + tEval.tStatus.target : '',
      weekVals: (tEval.series || []).map((v: Rec, i: Rec) => ({ label: weekLabels[i], v: fmtVal(tEval.m.unit, v) })),
      isSnapshot: !!tEval.m.snapshot,
      hasSeries: !tEval.m.snapshot,
      insight: trendInsight,
      causesOpen: st.causesOpen,
      onCauses: () => this.setState({ causesOpen: !st.causesOpen }),
      causes: causeRows,
      causesNone: causeRows.length === 0,
      context: trendContext,
      onExplore: () => this._explore({ ind: tInd.id }),
    };

    // ======================================================================
    // 6. Traceable management insights
    // ======================================================================
    const insights: Rec[] = [];
    const periodLine = 'Periudha: ' + periodText + ' · krahasuar me: ' + prevText;
    S.categories.forEach((c) => {
      const a = vol({ category: c.id }, 0),
        b = vol({ category: c.id }, 1);
      if (b >= 8 && Math.abs(a - b) / b >= 0.2) {
        const up = a > b;
        insights.push({
          key: 'cat-' + c.id,
          sev: up ? 'amber' : 'neutral',
          title: (up ? 'Rritje' : 'Rënie') + ' e raporteve për ' + c.label.toLowerCase() + ' me ' + Math.round((Math.abs(a - b) / b) * 100) + '% në ' + P + ' ditët e fundit.',
          source: 'Burimi: ' + a + ' raporte (nga ' + b + ')',
          period: periodLine,
          causes: [],
          actions: [
            { label: 'Shiko në hartë →', href: 'Harta.dc.html', onClick: this._toHarta({ categories: [c.id] }) },
            { label: 'Shiko rastet', href: '', onClick: () => this._explore({ ind: 'k_newCount', category: c.id }) },
          ],
        });
      }
    });
    (isDeptRole ? S.departments.filter((d) => d.id === roleDept) : S.departments).forEach((d) => {
      const a = run(M.avgResolution, { dept: d.id }, P, 0),
        b = run(M.avgResolution, { dept: d.id }, P, 1);
      if (a.value != null && b.value != null && b.n >= 8 && (a.value - b.value) / b.value >= 0.2) {
        const va = vol({ dept: d.id }, 0),
          vb = vol({ dept: d.id }, 1);
        const breaches = run(M.slaRate, { dept: d.id }, P, 0).cases.filter((r: Rec) => r.slaMet === false).length;
        const late = run(M.avgToAssign, { dept: d.id }, P, 0).cases.filter((r: Rec) => r.assignH > 24).length;
        insights.push({
          key: 'res-' + d.id,
          sev: 'red',
          title: 'Koha mesatare e zgjidhjes për ' + d.name + ' është rritur nga ' + fmtDur(b.value) + ' në ' + fmtDur(a.value) + '.',
          source: 'Burimi: ' + a.n + ' raporte të zgjidhura',
          period: periodLine,
          causes: [{ t: fmtDelta('count', va, vb) + ' volum raportesh (' + va + ' nga ' + vb + ')' }, { t: breaches + ' raste me SLA të tejkaluar' }, { t: late + ' raste pa caktim > 24 orë' }],
          actions: [
            { label: 'Shiko çfarë e shkaktoi', href: '', onClick: () => this.setState({ screen: 'trends', trendMetric: 'k_resolution', causesOpen: true, explore: null }) },
            { label: 'Shiko rastet', href: '', onClick: () => this._explore({ ind: 'k_resolution', dept: d.id, onlyBad: true }) },
          ],
        });
      }
    });
    const slaA = run(M.slaRate, {}, P, 0),
      slaB = run(M.slaRate, {}, P, 1);
    if (slaA.value != null && slaB.value != null && Math.abs(slaA.value - slaB.value) >= 3) {
      insights.push({
        key: 'sla',
        sev: slaA.value < slaB.value ? 'red' : 'green',
        title:
          'Përmbushja e SLA ' +
          (slaA.value < slaB.value ? 'ka rënë ' : 'është rritur ') +
          (Math.round(Math.abs(slaA.value - slaB.value) * 10) / 10).toString().replace('.', ',') +
          ' pikë përqindje gjatë ' +
          P +
          ' ditëve të fundit.',
        source: 'Burimi: ' + slaA.n + ' raporte të zgjidhura, ' + slaA.cases.filter((r: Rec) => r.slaMet === false).length + ' jashtë afatit',
        period: periodLine,
        causes: [],
        actions: [
          { label: 'Shiko çfarë e shkaktoi', href: '', onClick: () => this.setState({ screen: 'trends', trendMetric: 'k_sla', causesOpen: true, explore: null }) },
          { label: 'Shiko rastet', href: '', onClick: () => this._explore({ ind: 'k_sla', onlyBad: true }) },
        ],
      });
    }
    zoneStats.forEach((z) => {
      const res = z.cur.filter(isRes);
      if (res.length >= 10 && z.reap >= overallReap * 1.8 && z.reap >= 8)
        insights.push({
          key: 'z-' + z.z,
          sev: 'amber',
          title:
            z.z +
            ' ka ' +
            fmtPct(z.reap) +
            ' raporte të rishfaqura — ' +
            (Math.round((z.reap / Math.max(0.1, overallReap)) * 10) / 10).toString().replace('.', ',') +
            ' herë mesataren (' +
            fmtPct(overallReap) +
            ').',
          source: 'Burimi: ' + res.filter((r: Rec) => r.reappeared).length + ' nga ' + res.length + ' raporte të zgjidhura',
          period: 'Periudha: ' + periodText,
          causes: [],
          actions: [
            { label: 'Hap në Harta →', href: 'Harta.dc.html', onClick: this._toHarta({ zones: [z.z] }) },
            { label: 'Analizo zonën', href: '', onClick: () => this.setState({ screen: 'zones', zoneSel: z.z, explore: null }) },
          ],
        });
    });
    const SEV: Record<string, Rec> = { red: '#C23B31', amber: '#B8860B', green: '#2E7D4F', neutral: '#6B665F' };
    const insightRows = insights.map((x) =>
      Object.assign(x, { color: SEV[x.sev], hasCauses: x.causes.length > 0, actions: x.actions.map((a: Rec) => Object.assign(a, { isLink: !!a.href, isBtn: !a.href })) }),
    );

    // ======================================================================
    // 7. Drill-down: Bashkia → Departamenti → Zona → Kategoria → Raportet
    // ======================================================================
    const ex = st.explore;
    let explore: Rec = { show: false, crumbs: [], rows: [], cases: [], isCases: false, isGroups: false };
    if (ex) {
      const ind = indById[ex.ind as string] || indById.k_sla;
      const m = measureOf(ind);
      const baseF = { dept: ex.dept || (ind.dept !== 'all' ? ind.dept : null), zone: ex.zone, category: ex.category || (ind.category !== 'all' ? ind.category : null), emp: ex.emp };
      const days = ind.period === 'global' ? P : parseInt(ind.period, 10);
      const levelKey = ex.level === 'cases' ? 'cases' : !baseF.dept && !isDeptRole ? 'dept' : !baseF.zone ? 'zone' : !baseF.category ? 'category' : 'cases';
      const total = run(m, baseF, days, 0);
      const totalPrev = m.snapshot ? null : run(m, baseF, days, 1);
      const crumbs: Rec[] = [];
      const set = (patch: Rec) => () => this.setState({ explore: Object.assign({}, ex, patch), caseLimit: 40 });
      if (!isDeptRole) crumbs.push({ label: 'Bashkia', onClick: set({ dept: null, zone: null, category: null, level: null }), isLast: false });
      crumbs.push({
        label: baseF.dept ? S.deptName(baseF.dept) : isDeptRole ? S.deptName(roleDept) : 'Departamenti',
        onClick: set({ zone: null, category: null, level: null }),
        isLast: false,
        muted: !baseF.dept && !isDeptRole,
      });
      crumbs.push({ label: baseF.zone || 'Zona', onClick: set({ category: null, level: null }), isLast: false, muted: !baseF.zone });
      crumbs.push({ label: baseF.category ? S.catLabel(baseF.category) : 'Kategoria', onClick: set({ level: null }), isLast: false, muted: !baseF.category });
      crumbs.push({ label: 'Raportet', onClick: set({ level: 'cases' }), isLast: true, muted: levelKey !== 'cases' });
      crumbs.forEach((c, i) => {
        c.color = c.muted ? '#B8B2A9' : '#1B1917';
        c.notLast = i < crumbs.length - 1;
      });
      let rows: Rec[] = [];
      if (levelKey !== 'cases') {
        const items =
          levelKey === 'dept'
            ? S.departments.map((d) => ({ v: d.id, label: d.name }))
            : levelKey === 'zone'
              ? S.zones.map((z) => ({ v: z, label: z }))
              : S.categories.map((c) => ({ v: c.id, label: c.label }));
        rows = items
          .map((it) => {
            const f = Object.assign({}, baseF, { [levelKey]: it.v });
            const a = run(m, f, days, 0);
            const b = m.snapshot ? null : run(m, f, days, 1);
            return {
              label: it.label,
              value: fmtVal(m.unit, a.value),
              raw: a.value,
              n: a.n,
              bad: a.cases.filter(a.bad).length,
              delta: b ? fmtDelta(m.unit, a.value, b.value) : '',
              dColor: b ? deltaColor(m, a.value, b.value) : '#8A847C',
              onClick: () => this.setState({ explore: Object.assign({}, ex, { [levelKey]: it.v, level: null }), caseLimit: 40 }),
            };
          })
          .filter((r) => r.n > 0);
        const maxRaw = Math.max(1e-9, ...rows.map((r) => (r.raw == null ? 0 : r.raw)));
        rows.forEach((r) => {
          r.w = Math.max(2, Math.round(((r.raw || 0) / maxRaw) * 100)) + '%';
        });
      }
      let cases: Rec[] = [];
      let caseTotal = 0;
      if (levelKey === 'cases') {
        let cs = total.cases.slice().sort((a: Rec, b: Rec) => b.submittedAt - a.submittedAt);
        if (ex.onlyBad) cs = cs.filter(total.bad);
        caseTotal = cs.length;
        cases = cs.map((r: Rec) => ({
          id: r.displayId,
          title: r.title,
          dept: S.deptName(r.dept),
          zone: r.zone,
          category: S.catLabel(r.category),
          priority: r.priority,
          submitted: S.fmtDateTime(r.submittedAt),
          status: r.status,
          resolution: r.resolveH != null ? fmtDur(r.resolveH) : r.open ? 'aktiv' : '—',
          sla: r.slaMet === true ? 'Brenda' : r.slaMet === false || r.slaBreached ? 'Jashtë' : '—',
          slaColor: r.slaMet === true ? '#2E7D4F' : r.slaMet === false || r.slaBreached ? '#C23B31' : '#8A847C',
          flag: total.bad(r),
          rowBg: total.bad(r) ? '#FBF3F1' : 'transparent',
          live: r.live,
          archived: !r.live,
          onOpen: this._select(r.id),
        }));
      }
      const liveInScope = total.cases.filter((r: Rec) => r.live).length;
      const rf: Rec = {};
      if (baseF.dept || isDeptRole) rf.department = baseF.dept || roleDept;
      if (baseF.zone) rf.zone = baseF.zone;
      if (baseF.category) rf.category = baseF.category;
      if (ex.onlyBad && (ind.measure === 'slaRate' || ind.measure === 'slaBreachRate')) rf.slaBreached = true;
      explore = {
        show: true,
        name: ind.name,
        formula: m.formula,
        value: fmtVal(m.unit, total.value),
        n: total.n,
        delta: totalPrev ? fmtDelta(m.unit, total.value, totalPrev.value) : '',
        dColor: totalPrev ? deltaColor(m, total.value, totalPrev.value) : '#8A847C',
        hasDelta: !!totalPrev,
        period: m.snapshot ? 'tani' : periodText,
        crumbs: crumbs,
        isGroups: levelKey !== 'cases',
        isCases: levelKey === 'cases',
        levelLabel: { dept: 'Sipas departamentit', zone: 'Sipas zonës', category: 'Sipas kategorisë', cases: 'Raportet' }[levelKey],
        rows: rows,
        rowsNone: levelKey !== 'cases' && rows.length === 0,
        cases: cases,
        caseTotal: caseTotal,
        casesNone: levelKey === 'cases' && caseTotal === 0,
        canMore: caseTotal > st.caseLimit,
        onMore: () => this.setState({ caseLimit: st.caseLimit + 40 }),
        badCount: total.cases.filter(total.bad).length,
        onlyBad: !!ex.onlyBad,
        onlyBadClass: ex.onlyBad ? 'is-on' : '',
        onToggleBad: () => this.setState({ explore: Object.assign({}, ex, { onlyBad: !ex.onlyBad }) }),
        onCasesNow: set({ level: 'cases' }),
        showCasesBtn: levelKey !== 'cases',
        liveCount: liveInScope,
        hasLive: liveInScope > 0,
        onRaportet: this._toRaportet(rf),
        onHarta: this._toHarta({ zones: baseF.zone ? [baseF.zone] : [], categories: baseF.category ? [baseF.category] : [], departments: rf.department ? [rf.department] : [] }),
        onBack: () => this.setState({ explore: null, screen: ex.back || 'summary' }),
      };
    }

    // ======================================================================
    // 8. Indicator library + builder + targets
    // ======================================================================
    const GROUPS = [
      { key: 'resp', label: 'Reagimi', items: ['avgResponse', 'medianResponse', 'avgResolution', 'medianResolution', 'slaRate', 'slaBreachRate'] },
      { key: 'case', label: 'Menaxhimi i rasteve', items: ['newCount', 'closedCount', 'activeCount', 'unassignedCount', 'unassignedPct', 'avgToAssign', 'avgToStart'] },
      { key: 'quality', label: 'Cilësia e zgjidhjes', items: ['reappearRate', 'reopenRate', 'verifiedRate', 'duplicateCount'] },
      { key: 'dept', label: 'Performanca e departamenteve', items: ['workloadPerStaff', 'urgentShare'], by: 'dept' },
      { key: 'geo', label: 'Treguesit gjeografikë', items: ['urgentOpen', 'density'], by: 'zone' },
    ];
    const libInd = (mk: Rec) => INDS.filter((i) => !i.custom && i.measure === mk)[0];
    const library = !need(['indicators'])
      ? []
      : GROUPS.map((g) => ({
          label: g.label,
          byLabel: g.by === 'dept' ? 'Shiko sipas departamentit' : g.by === 'zone' ? 'Shiko sipas zonës' : '',
          items: g.items.map((mk) => {
            const ind = libInd(mk);
            const e = evalInd(ind, null, { noSeries: true });
            const pinned = st.kpiIds.indexOf(ind.id) !== -1;
            return {
              name: M[mk].label,
              formula: M[mk].formula,
              value: e.value,
              delta: e.delta,
              dColor: e.dColor,
              pinLabel: pinned ? 'Në panel ✓' : '+ Shto në panel',
              pinClass: pinned ? 'is-on' : '',
              onPin: () => this._togglePin(ind.id),
              onView: () => this._explore({ ind: ind.id }),
            };
          }),
        }));
    const d0 = st.builderDraft || { name: '', measure: 'custom', base: 'resolved', cond: 'slaMet', dept: 'all', category: 'all', period: '30', compare: 'prev', display: '%' };
    const previewInd = Object.assign({ id: 'preview' }, d0);
    const previewEval = st.builderOpen ? evalInd(previewInd, null, { noSeries: true }) : { value: '', delta: '', dColor: '#8A847C', cur: { n: 0 } };
    const builder = {
      open: st.builderOpen,
      draft: d0,
      error: st.builderError,
      hasError: !!st.builderError,
      isCustom: d0.measure === 'custom',
      measureOptions: [{ value: 'custom', label: 'Raport i personalizuar (numërues / emërues)' }].concat(Object.keys(M).map((k) => ({ value: k, label: M[k].label }))),
      baseOptions: Object.keys(BASES).map((k) => ({ value: k, label: BASES[k].label })),
      condOptions: Object.keys(CONDS).map((k) => ({ value: k, label: CONDS[k].label })),
      deptOptions: [{ value: 'all', label: 'Të gjitha' }].concat(S.departments.map((d) => ({ value: d.id, label: d.name }))),
      catOptions: [{ value: 'all', label: 'Të gjitha' }].concat(S.categories.map((c) => ({ value: c.id, label: c.label }))),
      periodOptions: [
        { value: '7', label: '7 ditët e fundit' },
        { value: '30', label: '30 ditët e fundit' },
        { value: '90', label: '90 ditët e fundit' },
        { value: 'global', label: 'Sipas periudhës së panelit' },
      ],
      compareOptions: [
        { value: 'prev', label: 'Periudhën paraardhëse' },
        { value: 'none', label: 'Pa krahasim' },
      ],
      displayOptions: [
        { value: '%', label: '%' },
        { value: 'numër', label: 'Numër' },
      ],
      formula: measureOf(previewInd).formula,
      preview: previewEval.value,
      previewDelta: previewEval.delta,
      previewColor: previewEval.dColor,
      previewN: previewEval.cur.n,
      onOpen: () => this._openBuilder(),
      onCancel: () => this.setState({ builderOpen: false, builderDraft: null }),
      onSave: () => this._saveBuilder(),
      onName: (e: InputEvent) => this._setDraft({ name: e.target.value }),
      onMeasure: (e: InputEvent) => this._setDraft({ measure: e.target.value }),
      onBase: (e: InputEvent) => this._setDraft({ base: e.target.value }),
      onCond: (e: InputEvent) => this._setDraft({ cond: e.target.value }),
      onDept: (e: InputEvent) => this._setDraft({ dept: e.target.value }),
      onCategory: (e: InputEvent) => this._setDraft({ category: e.target.value }),
      onPeriod: (e: InputEvent) => this._setDraft({ period: e.target.value }),
      onCompare: (e: InputEvent) => this._setDraft({ compare: e.target.value }),
      onDisplay: (e: InputEvent) => this._setDraft({ display: e.target.value }),
    };
    const customList = st.customIndicators.map((c) => {
      const e = evalInd(c, null, { noSeries: true });
      return {
        name: c.name,
        formula: e.m.formula,
        value: e.value,
        delta: e.delta,
        dColor: e.dColor,
        scope:
          (c.dept === 'all' ? 'Të gjitha departamentet' : S.deptName(c.dept)) +
          ' · ' +
          (c.category === 'all' ? 'të gjitha kategoritë' : S.catLabel(c.category)) +
          ' · ' +
          (c.period === 'global' ? 'periudha e panelit' : c.period + ' ditë'),
        onDelete: () => this._deleteCustom(c.id),
        onView: () => this._explore({ ind: c.id }),
      };
    });
    const pinnedRows = st.kpiIds
      .map((id) => indById[id])
      .filter(Boolean)
      .map((ind, i, arr) => {
        const m = measureOf(ind);
        const t = targets[ind.id] || {};
        return {
          name: ind.name,
          unitNote: m.unit === 'pct' ? '%' : ind.measure === 'avgResolution' ? 'ditë' : m.unit === 'dur' ? 'orë' : '',
          dirLabel: m.better === 'up' ? '≥' : m.better === 'down' ? '≤' : '',
          canTarget: m.better !== 'none',
          noTarget: m.better === 'none',
          target: t.value != null ? String(t.value) : '',
          onTarget: (e: InputEvent) => this._setTarget(ind.id, { value: e.target.value }),
          onUp: () => this._movePin(ind.id, -1),
          onDown: () => this._movePin(ind.id, 1),
          onRemove: () => this._togglePin(ind.id),
          upClass: i === 0 ? 'is-disabled' : '',
          downClass: i === arr.length - 1 ? 'is-disabled' : '',
        };
      });

    // ======================================================================
    // 9. Department views: team + SLA
    // ======================================================================
    const teamRows = !need(['team'])
      ? []
      : S.employees
          .filter((e) => e.dept === roleDept)
          .map((e) => {
            const sc = scopeOf({ emp: e.id });
            const cur = sc.filter((r: Rec) => r.submittedAt >= curWin.from);
            const res = cur.filter(isRes);
            return {
              name: e.full,
              initials: e.full
                .split(' ')
                .map((x) => x[0])
                .join(''),
              zones: (e.coverageZones || []).join(', '),
              active: sc.filter((r: Rec) => r.open).length,
              resolved: res.length,
              avgRes: fmtDur(mean(res.map((r: Rec) => r.resolveH))),
              sla: fmtPct(res.length ? (res.filter((r: Rec) => r.slaMet).length / res.length) * 100 : null),
              reap: fmtPct(res.length ? (res.filter((r: Rec) => r.reappeared).length / res.length) * 100 : null),
              onOpen: () => this._explore({ ind: 'k_resolution', emp: e.id, level: 'cases' }),
            };
          });
    const slaByPrio = S.priorityOrder
      .slice()
      .reverse()
      .map((p) => {
        const sc = ALL.filter((r) => (!isDeptRole || r.dept === roleDept) && r.priority === p && r.submittedAt >= curWin.from && isRes(r));
        const met = sc.filter((r) => r.slaMet).length;
        return { priority: p, color: (S.priorityMeta[p] || {}).color, target: S.slaHours[p] + ' orë', n: sc.length, sla: fmtPct(sc.length ? (met / sc.length) * 100 : null), late: sc.length - met };
      });
    const breaches = scopeOf({})
      .filter((r: Rec) => (r.submittedAt >= curWin.from && r.slaMet === false) || r.slaBreached)
      .sort((a: Rec, b: Rec) => b.submittedAt - a.submittedAt);
    const slaEval = evalInd(indById.k_sla, null, { noSeries: !need(['sla']) });
    const slaLine = svgLine(slaEval.series, 640, 150, 16, slaEval.tgtVal);
    const slaScreen: Rec = {
      value: slaEval.value,
      delta: slaEval.delta,
      dColor: slaEval.dColor,
      hasTarget: !!slaEval.tStatus,
      tLabel: slaEval.tStatus ? slaEval.tStatus.label : '',
      tColor: slaEval.tStatus ? slaEval.tStatus.color : '',
      tTarget: slaEval.tStatus ? slaEval.tStatus.target : '',
      tGap: slaEval.tStatus ? slaEval.tStatus.gap : '',
      line: slaLine.points,
      dots: slaLine.dots.map((d: Rec) => Object.assign({ tip: 'Java nga ' + weekLabels[d.i] + ': ' + fmtPct(slaEval.series[d.i]) }, d)),
      tgtY: slaLine.tgtY,
      weekVals: (slaEval.series || []).map((v: Rec, i: Rec) => ({ label: weekLabels[i], v: fmtPct(v) })),
      byPrio: slaByPrio,
      byCat: catRows.filter((c) => S.categories.filter((x) => x.id === c.id)[0] && scopeOf({ category: c.id }).length > 0),
      breachCount: breaches.length,
      openBreaches: breaches.filter((r: Rec) => r.open).length,
      breaches: breaches.map((r: Rec) => ({
        id: r.displayId,
        title: r.title,
        zone: r.zone,
        priority: r.priority,
        prioColor: (S.priorityMeta[r.priority as Priority] || {}).color,
        when: S.fmtDateTime(r.submittedAt),
        state: r.open ? 'Aktiv · SLA e shkelur' : 'Zgjidhur pas afatit · ' + fmtDur(r.resolveH),
        stateColor: r.open ? '#C23B31' : '#B8860B',
        live: r.live,
        archived: !r.live,
        onOpen: this._select(r.id),
      })),
      onAll: () => this._explore({ ind: 'k_slaBreachRate', onlyBad: true, level: 'cases' }),
      onRaportet: this._toRaportet({ department: roleDept, slaBreached: true }),
    };

    // ======================================================================
    // 10. Management reports: builder, export, schedules
    // ======================================================================
    const rd = this._draftR();
    const reportInds = ['slaRate', 'avgResponse', 'avgResolution', 'reappearRate', 'activeCount', 'closedCount', 'unassignedPct', 'avgToAssign', 'verifiedRate'];
    const reportForm = {
      title: rd.title,
      from: rd.from,
      to: rd.to,
      compareClass: rd.compare ? 'is-on' : '',
      compare: rd.compare,
      depts: (isDeptRole ? S.departments.filter((d) => d.id === roleDept) : S.departments).map((d) => ({
        label: d.name,
        checkClass: rd.depts.indexOf(d.id) !== -1 ? 'is-on' : '',
        checked: rd.depts.indexOf(d.id) !== -1,
        onClick: () => (isDeptRole ? null : this._toggleInDraft('depts', d.id)),
      })),
      inds: reportInds.map((k) => ({
        label: M[k].label,
        checkClass: rd.indicators.indexOf(k) !== -1 ? 'is-on' : '',
        checked: rd.indicators.indexOf(k) !== -1,
        onClick: () => this._toggleInDraft('indicators', k),
      })),
      onTitle: (e: InputEvent) => this._setReportDraft({ title: e.target.value }),
      onFrom: (e: InputEvent) => this._setReportDraft({ from: e.target.value }),
      onTo: (e: InputEvent) => this._setReportDraft({ to: e.target.value }),
      onCompare: () => this._setReportDraft({ compare: !rd.compare }),
      onGenerate: () => this._generate(),
      genDisabledClass: rd.depts.length && rd.indicators.length && rd.from && rd.to && rd.from <= rd.to ? '' : 'is-disabled',
    };
    let generated: Rec = { show: false, notShown: true, rows: [], cols: [] };
    if (st.generated) {
      const g = st.generated;
      const from = new Date(g.from + 'T00:00:00'),
        to = new Date(new Date(g.to + 'T00:00:00').getTime() + D);
      const len = to.getTime() - from.getTime();
      const pFrom = new Date(from.getTime() - len);
      const calc = (mk: Rec, f: Rec, a: Rec, b: Rec) => M[mk].compute({ scope: scopeOf(f), from: a, to: b, depts: deptsOf(f) });
      const cols = g.indicators.map((k: Rec) => ({ key: k, label: M[k].label }));
      const mkRow = (label: Rec, f: Rec) => ({
        label: label,
        cells: g.indicators.map((k: Rec) => {
          const cur = calc(k, f, from, to);
          const prev = g.compare && !M[k].snapshot ? calc(k, f, pFrom, from) : null;
          return {
            v: fmtVal(M[k].unit, cur.value),
            prev: prev ? fmtVal(M[k].unit, prev.value) : '',
            d: prev ? fmtDelta(M[k].unit, cur.value, prev.value) : '',
            dColor: prev ? deltaColor(M[k], cur.value, prev.value) : '#8A847C',
            raw: cur.value,
            prevRaw: prev ? prev.value : null,
          };
        }),
      });
      const rows = g.depts.map((dd: Rec) => mkRow(S.deptName(dd), { dept: dd }));
      const totalRow = isDeptRole || g.depts.length < 2 ? null : mkRow('Gjithsej', {});
      if (totalRow) {
        totalRow.cells = g.indicators.map((k: Rec) => {
          const sc = ALL.filter((r) => g.depts.indexOf(r.dept) !== -1);
          const cur = M[k].compute({ scope: sc, from: from, to: to, depts: g.depts });
          const prev = g.compare && !M[k].snapshot ? M[k].compute({ scope: sc, from: pFrom, to: from, depts: g.depts }) : null;
          return {
            v: fmtVal(M[k].unit, cur.value),
            prev: prev ? fmtVal(M[k].unit, prev.value) : '',
            d: prev ? fmtDelta(M[k].unit, cur.value, prev.value) : '',
            dColor: prev ? deltaColor(M[k], cur.value, prev.value) : '#8A847C',
            raw: cur.value,
            prevRaw: prev ? prev.value : null,
          };
        });
      }
      const allRows = rows.concat(totalRow ? [totalRow] : []);
      const csvEsc = (s: Rec) => '"' + String(s).replace(/"/g, '""') + '"';
      const csvLines = [
        [g.title],
        ['Periudha', g.from + ' → ' + g.to].concat(g.compare ? ['Krahasuar me', dstr(pFrom) + '–' + dstr(new Date(from.getTime() - 1))] : []),
        [],
        ['Departamenti'].concat(cols.map((c: Rec) => c.label + (g.compare ? ' (tani)' : '')).concat(g.compare ? cols.map((c: Rec) => c.label + ' (më parë)') : [])),
      ]
        .concat(allRows.map((r: Rec) => [r.label].concat(r.cells.map((c: Rec) => c.v)).concat(g.compare ? r.cells.map((c: Rec) => c.prev) : [])))
        .concat([[], ['Burimi: SINJAL · të dhëna historike demonstruese + raportet aktuale']]);
      const csv = csvLines.map((l) => l.map(csvEsc).join(',')).join('\n');
      generated = {
        show: true,
        notShown: false,
        title: g.title,
        period: g.from.split('-').reverse().join('.') + ' → ' + g.to.split('-').reverse().join('.'),
        compareText: g.compare ? 'Krahasuar me ' + dstr(pFrom) + '–' + dstr(new Date(from.getTime() - 1)) : 'Pa krahasim',
        cols: cols,
        rows: allRows,
        tCols: allRows.map((r: Rec) => ({ label: r.label })),
        tRows: cols.map((c: Rec, ci: Rec) => ({ label: c.label, cells: allRows.map((r: Rec) => r.cells[ci]) })),
        csvHref: 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv),
        csvName:
          g.title
            .replace(/[^\wëçËÇ -]+/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 60) + '.csv',
        onPrint: () => {
          try {
            window.print();
          } catch (e) {}
        },
        onSave: () => this._saveReport(g),
        saved: this.state.savedReports.some((s) => s.title === g.title && s.from === g.from && s.to === g.to),
      };
    }
    const nextSend = (freq: Rec) => {
      if (freq === 'weekly') {
        const d = new Date(NOW);
        d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
        return 'E hënë, ' + dstr(d);
      }
      const d = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);
      return '1 ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    };
    const CONTENTS = [
      { id: 'kpis', label: 'KPI të bashkisë / departamentit' },
      { id: 'depts', label: 'Treguesit e departamenteve' },
      { id: 'trends', label: 'Trendet' },
      { id: 'sla', label: 'Performanca SLA' },
      { id: 'zones', label: 'Zonat me përqendrim' },
      { id: 'unresolved', label: 'Rastet e pazgjidhura' },
      { id: 'changes', label: 'Ndryshimet e rëndësishme' },
    ];
    const schedules = this._schedules()
      .filter((s) => !isDeptRole || s.scope === roleDept)
      .map((s) => ({
        name: s.name,
        recipients: s.recipients,
        freq: s.freq === 'weekly' ? 'Çdo të hënë' : 'Më 1 të çdo muaji',
        next: s.active ? 'Dërgimi i radhës: ' + nextSend(s.freq) : 'Joaktiv',
        scope: s.scope === 'bashkia' ? 'Bashkia' : S.deptName(s.scope),
        contents: s.contents.map((c: Rec) => ({ label: (CONTENTS.filter((x) => x.id === c)[0] || {}).label })),
        switchClass: s.active ? 'is-on' : '',
        onToggle: () => this._toggleSchedule(s.id),
      }));
    const sd = st.scheduleDraft;
    const scheduleForm = sd
      ? {
          name: sd.name,
          freq: sd.freq,
          scope: sd.scope,
          onName: (e: InputEvent) => this._setScheduleDraft({ name: e.target.value }),
          onFreq: (e: InputEvent) => this._setScheduleDraft({ freq: e.target.value }),
          onScope: (e: InputEvent) => this._setScheduleDraft({ scope: e.target.value }),
          freqOptions: [
            { value: 'weekly', label: 'Javor (e hënë)' },
            { value: 'monthly', label: 'Mujor (1 i muajit)' },
          ],
          scopeOptions: (isDeptRole ? [] : [{ value: 'bashkia', label: 'Bashkia (e gjithë)' }]).concat(
            (isDeptRole ? S.departments.filter((d) => d.id === roleDept) : S.departments).map((d) => ({ value: d.id, label: d.name })),
          ),
          contents: CONTENTS.map((c) => ({
            label: c.label,
            checkClass: sd.contents.indexOf(c.id) !== -1 ? 'is-on' : '',
            checked: sd.contents.indexOf(c.id) !== -1,
            onClick: () => this._toggleScheduleContent(c.id),
          })),
          saveDisabledClass: (sd.name || '').trim() && sd.contents.length ? '' : 'is-disabled',
        }
      : { name: '', freq: '', scope: '', freqOptions: [], scopeOptions: [], contents: [], saveDisabledClass: 'is-disabled' };
    const savedReports = this.state.savedReports
      .filter((r) => !isDeptRole || (r.depts.length === 1 && r.depts[0] === roleDept))
      .slice()
      .reverse()
      .map((r) => ({
        title: r.title,
        meta: r.from.split('-').reverse().join('.') + ' → ' + r.to.split('-').reverse().join('.') + ' · ruajtur nga ' + r.by,
        onOpen: () =>
          this.setState({
            reportDraft: { title: r.title, from: r.from, to: r.to, depts: r.depts, indicators: r.indicators, compare: r.compare },
            generated: { title: r.title, from: r.from, to: r.to, depts: r.depts, indicators: r.indicators, compare: r.compare },
          }),
      }));

    // ======================================================================
    // 11. Navigation (role-based)
    // ======================================================================
    const MUNI = [
      ['summary', 'Përmbledhje'],
      ['departments', 'Departamentet'],
      ['services', 'Shërbimet'],
      ['zones', 'Zonat'],
      ['trends', 'Trendet'],
      ['indicators', 'Indikatorët'],
      ['reports', 'Raportet'],
    ];
    const DEPT = [
      ['summary', 'Përmbledhje'],
      ['team', 'Ekipi'],
      ['sla', 'SLA'],
      ['reports', 'Raportet'],
      ['trends', 'Trendet'],
    ];
    const screens = isDeptRole ? DEPT : MUNI;
    const screen = screens.some((s) => s[0] === st.screen) ? st.screen : 'summary';
    const nav = screens.map((s) => ({ label: s[1], onClass: !ex && screen === s[0] ? 'is-on' : '', onClick: () => this._go(s[0]) }));
    const is = (k: Rec) => !ex && screen === k;

    const exKey = ex ? ['ex', ex.ind, ex.dept, ex.zone, ex.category, ex.emp, ex.onlyBad ? 1 : 0].join('|') : 'ex';
    const kpiP = pager('kpis', kpis, 6);
    const insP = pager('insights', insightRows, 3);
    const casesP = pager(exKey + ':cases', explore.cases || [], 10);
    const exRowsP = pager(exKey + ':rows', explore.rows || [], 8);
    const pinP = pager('pinned', pinnedRows, 6);
    const custP = pager('custom', customList, 5);
    const breachP = pager('breaches', slaScreen.breaches, 6);
    const schedP = pager('sched', schedules, 3);
    const savedP = pager('saved', savedReports, 4);
    const zoneP = pager('zones', zoneRows, 8);
    const causeP = pager('causes:' + (st.trendMetric || ''), trendScreen.causes, 6);
    explore.cases = casesP.items;
    explore.casesPg = casesP.pg;
    explore.rows = exRowsP.items;
    explore.rowsPg = exRowsP.pg;
    slaScreen.breaches = breachP.items;
    slaScreen.breachesPg = breachP.pg;
    trendScreen.causes = causeP.items;
    trendScreen.causesPg = causeP.pg;
    const SUB: Record<string, Rec> = {
      summary: isDeptRole ? 'Si po performon ekipi — dhe ku duhet ndërhyrë.' : 'Si po u përgjigjet bashkia qytetarëve, ku janë pengesat dhe çfarë duhet të ndjekë menaxhimi.',
      departments: 'Treguesit krah për krah — pa renditje dhe pa pikë të vetme.',
      services: 'Performanca sipas llojit të shërbimit.',
      zones: 'Ku janë të përqendruara problemet e shërbimit?',
      trends: 'Si ndryshon çdo tregues në kohë — dhe pse.',
      indicators: 'Biblioteka e treguesve, indikatorët e personalizuar dhe objektivat.',
      reports: 'Raporte për menaxhimin dhe dërgime të planifikuara.',
      team: 'Ngarkesa dhe rezultatet e ekipit — si kontekst, jo renditje.',
      sla: 'Përmbushja e afateve të shërbimit.',
    };

    return {
      isMuni: !isDeptRole,
      isDept: isDeptRole,
      title: isDeptRole ? 'Performanca e Departamentit ' + GEN[roleDept] : 'Performanca e Bashkisë',
      lede: ex ? 'Eksploro: ' + explore.name : SUB[screen],
      roleChips: [
        { key: 'bashkia', label: 'Nivel bashkiak' },
        { key: 'dept', label: 'Nivel departamenti' },
      ].map((r) => ({ label: r.label, onClass: st.role === r.key ? 'is-on' : '', onClick: () => this._setRole(r.key) })),
      roleDept: roleDept,
      deptOptions: S.departments.map((d) => ({ value: d.id, label: d.name })),
      onRoleDept: (e: InputEvent) => this._setRole('dept', e.target.value),
      periods: [7, 30, 90].map((p) => ({ label: p + ' ditë', onClass: st.period === p ? 'is-on' : '', onClick: () => this.setState({ period: p, generated: st.generated }) })),
      periodText: periodText,
      prevText: prevText,
      nav: nav,
      navTitle: isDeptRole ? 'Performanca e departamentit' : 'Performanca e bashkisë',
      isSummary: is('summary'),
      isDepartments: is('departments'),
      isServices: is('services'),
      isZones: is('zones'),
      isTrends: is('trends'),
      isIndicators: is('indicators'),
      isReports: is('reports'),
      isTeam: is('team'),
      isSla: is('sla'),
      isExplore: !!ex,
      kpis: kpiP.items,
      kpisAll: kpis,
      kpisPg: kpiP.pg,
      editKpisOpen: st.editKpisOpen,
      onEditKpis: () => this.setState({ editKpisOpen: !st.editKpisOpen }),
      pinnedRows: pinP.items,
      pinnedPg: pinP.pg,
      pinnedAll: pinnedRows,
      insights: insP.items,
      insightsPg: insP.pg,
      insightsAll: insightRows,
      insightsNone: insightRows.length === 0,
      deptRows: deptRows,
      catRows: catRows,
      zoneRows: zoneP.items,
      zonePg: zoneP.pg,
      zone: zoneDetail,
      overallReap: fmtPct(overallReap),
      overallSla: fmtPct(overallSla),
      trend: trendScreen,
      explore: explore,
      library: library,
      builder: builder,
      customList: custP.items,
      customPg: custP.pg,
      hasCustom: customList.length > 0,
      team: teamRows,
      sla: slaScreen,
      reportForm: reportForm,
      generated: generated,
      schedules: schedP.items,
      schedulesPg: schedP.pg,
      schedulesAll: schedules,
      scheduleOpen: st.scheduleOpen,
      scheduleForm: scheduleForm,
      onOpenSchedule: () => this._openSchedule(),
      onCancelSchedule: () => this.setState({ scheduleOpen: false, scheduleDraft: null }),
      onSaveSchedule: () => this._saveSchedule(),
      savedReports: savedP.items,
      savedPg: savedP.pg,
      hasSaved: savedReports.length > 0,
      goTrends: () => this._go('trends'),
      goDepartments: () => this._go('departments'),
      goZones: () => this._go('zones'),
      goIndicators: () => this._go('indicators'),
      histNote: 'Historiku 90-ditor (' + S.history.length + ' raste të mbyllura) është demonstrues; raportet aktive janë ato të SINJAL.',
      recordCount: fmtNum(ALL.length),
    };
  }
}
