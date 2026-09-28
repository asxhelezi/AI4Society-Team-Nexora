import type { ChangeEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { CaseOverride, CaseOverrides, Priority, Report } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, readString, remove, writeJSON, writeString } from '../../lib/storage';
import { REAL_STAFF, isDatabaseCase, saveCase } from '../../api/staff';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

type Tab = 'permbledhje' | 'raportet' | 'ekipi' | 'rregullat';

/** A clerk-added routing rule (sinjal_custom_rules). */
export interface CustomRule {
  id: string;
  category: string;
  department: string;
  priority: string;
}

interface RuleDraft {
  category: string;
  department: string;
  priority: string;
}

interface State {
  view: 'overview' | 'detail';
  selectedDept: string | null;
  detailTab: Tab;
  selectedEmployee: string | null;
  overrides: CaseOverrides;
  customRules: CustomRule[];
  addRuleOpen: boolean;
  addRuleDraft: RuleDraft;
}

type Props = Record<string, never>;

/** A report with the session's overrides applied. */
type Row = Report & { baseId: string; routingChanged: boolean };

type Handler = () => void;

interface ExceptionGroup {
  color: string;
  label: string;
  count: number;
  onClick: Handler;
  actionLabel: string;
  example: { id: string; title: string; meta: string; onClick: Handler };
}

interface CaseChip {
  id: string;
  title: string;
  status: string;
  statusBg: string;
  statusInk: string;
  statusDot: string;
  onClick: Handler;
}

interface EmployeeDetail {
  active: number;
  categoryBreakdown: { label: string; count: number }[];
  zones: string[];
  cases: CaseChip[];
  hasCases: boolean;
}

/** Port of the Departamentet.dc.html logic: overview, department workspace, team drill-down, workload balancing. */
export class DepartamentetLogic extends DCLogic<Props, State> {
  state: State = {
    view: 'overview',
    selectedDept: null,
    detailTab: 'permbledhje',
    selectedEmployee: null,
    overrides: {},
    customRules: [],
    addRuleOpen: false,
    addRuleDraft: { category: '', department: '', priority: 'E mesme' },
  };

  componentDidMount() {
    const overrides = readJSON<CaseOverrides>(STORAGE_KEYS.caseOverrides, {});
    const customRules = readJSON<CustomRule[]>(STORAGE_KEYS.customRules, []);
    // one-shot deep link from Kreu's department table
    const focus = readString(STORAGE_KEYS.deptFocus);
    if (focus) remove(STORAGE_KEYS.deptFocus);
    const S = SINJAL;
    const validFocus = focus && S.departments.some((d) => d.id === focus) ? focus : null;
    this.setState({
      overrides: overrides,
      customRules: customRules,
      view: validFocus ? 'detail' : 'overview',
      selectedDept: validFocus,
    });
  }

  _select(id: string) {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }
  _filterLink(f: Record<string, string | boolean>) {
    return () => writeJSON(STORAGE_KEYS.incomingFilter, f);
  }
  _openDept(id: string) {
    this.setState({ view: 'detail', selectedDept: id, detailTab: 'permbledhje', selectedEmployee: null });
  }
  _backToOverview() {
    this.setState({ view: 'overview', selectedDept: null, selectedEmployee: null });
  }
  _setTab(tab: Tab) {
    this.setState({ detailTab: tab, selectedEmployee: null });
  }
  _selectEmployee(id: string) {
    this.setState({ selectedEmployee: this.state.selectedEmployee === id ? null : id });
  }

  _persistOverrides(overrides: CaseOverrides) {
    writeJSON(STORAGE_KEYS.caseOverrides, overrides);
  }
  _patchOverride(id: string, patch: CaseOverride) {
    if (REAL_STAFF || isDatabaseCase(id)) {
      void saveCase(id, patch).then(() => this.onChange?.()).catch((err: unknown) => window.alert(err instanceof Error ? err.message : String(err)));
      return;
    }
    const overrides = Object.assign({}, this.state.overrides);
    overrides[id] = Object.assign({}, overrides[id], patch);
    this._persistOverrides(overrides);
    this.setState({ overrides: overrides });
  }
  _assignCase(reportId: string, empId: string) {
    const S = SINJAL;
    const ov = this.state.overrides[reportId] || {};
    const assignLog = (ov.assignLog || []).concat([{ at: S.now.toISOString(), employee: S.empName(empId), by: 'Drita K.' }]);
    this._patchOverride(reportId, { responsible: empId, assignLog: assignLog });
  }

  _persistRules(rules: CustomRule[]) {
    writeJSON(STORAGE_KEYS.customRules, rules);
  }
  _openAddRule() {
    if (REAL_STAFF) { window.alert('Rregullat e routing-ut nuk kanë ende API ruajtjeje.'); return; }
    this.setState({ addRuleOpen: true, addRuleDraft: { category: '', department: '', priority: 'E mesme' } });
  }
  _cancelAddRule() {
    this.setState({ addRuleOpen: false, addRuleDraft: { category: '', department: '', priority: 'E mesme' } });
  }
  _setRuleDraft(patch: Partial<RuleDraft>) {
    this.setState({ addRuleDraft: Object.assign({}, this.state.addRuleDraft, patch) });
  }
  _saveRule() {
    if (REAL_STAFF) { window.alert('Rregullat e routing-ut nuk kanë ende API ruajtjeje.'); return; }
    const d = this.state.addRuleDraft;
    if (!d.category || !d.department) return;
    const rules = this.state.customRules.concat([{ id: 'custom-' + Date.now(), category: d.category, department: d.department, priority: d.priority || 'E mesme' }]);
    this._persistRules(rules);
    this.setState({ customRules: rules, addRuleOpen: false, addRuleDraft: { category: '', department: '', priority: 'E mesme' } });
  }
  _removeRule(id: string) {
    if (REAL_STAFF) { window.alert('Rregullat e routing-ut nuk kanë ende API ruajtjeje.'); return; }
    const rules = this.state.customRules.filter((r) => r.id !== id);
    this._persistRules(rules);
    this.setState({ customRules: rules });
  }

  renderVals() {
    const S = SINJAL;
    const reports = S.reports || [];
    const NOW = S.now || new Date();
    const HOUR_MS = 3600000;
    const overrides = this.state.overrides;

    const all: Row[] = reports.map((r) => {
      const ov = overrides[r.id] || {};
      const eff = Object.assign({}, r, ov) as Report;
      return Object.assign({}, eff, {
        baseId: r.id,
        departmentName: S.deptName(eff.department),
        responsibleName: eff.responsible ? S.empName(eff.responsible) : null,
        routingChanged: r.ai.suggestedDepartment !== S.deptName(eff.department),
      });
    });

    const isOpenCase = (r: Row) => r.status !== 'Zgjidhur' && r.status !== 'Mbyllur' && r.status !== 'Refuzuar' && r.status !== 'Dublikatë';
    const isSlaFlagged = (r: Row) => r.slaAtRisk || r.slaBreached;
    const initialsOf = (full: string) =>
      (full || '')
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // ---- Org-wide department stats — one real Aktive/Në-SLA/Urgjente/
    // SLA-rrezik split per department, shared by the overview cards, the
    // workload bars and (filtered to one department) the detail workspace.
    const perfRecs = S.perf.records(this.state.overrides);
    const deptStats = S.departments.map((d) => {
      const deptAll = all.filter((r) => r.department === d.id);
      const active = deptAll.filter(isOpenCase);
      const atRisk = active.filter(isSlaFlagged);
      const urgent = active.filter((r) => r.priority === 'Urgjente');
      const onSlaCount = active.length - atRisk.length;
      // SLA compliance = resolved within SLA / resolved, last 30 days — the
      // shared S.perf definition, so it matches Kreu and Performanca.
      const sla30 = S.perf.slaRate(perfRecs, { dept: d.id }, 30);
      const slaRate = sla30 == null ? '—' : Math.round(sla30);
      return {
        id: d.id,
        name: d.name,
        deptAll: deptAll,
        active: active,
        activeCount: active.length,
        atRiskCount: atRisk.length,
        onSlaCount: onSlaCount,
        urgentCount: urgent.length,
        slaRate: slaRate,
      };
    });
    const byDeptId: Record<string, (typeof deptStats)[number]> = {};
    deptStats.forEach((d) => {
      byDeptId[d.id] = d;
    });

    const orgSummary = {
      deptCount: S.departments.length,
      activeTotal: deptStats.reduce((s, d) => s + d.activeCount, 0),
      slaRiskTotal: deptStats.reduce((s, d) => s + d.atRiskCount, 0),
    };

    const deptCards = deptStats.map((d) => ({
      id: d.id,
      name: d.name,
      active: d.activeCount,
      atRisk: d.atRiskCount,
      onSla: d.onSlaCount,
      slaRate: d.slaRate,
      atRiskColor: d.atRiskCount > 0 ? '#C23B31' : '#8A847C',
      onClick: () => this._openDept(d.id),
    }));

    const maxActive = Math.max(1, ...deptStats.map((d) => d.activeCount));
    const workloadRows = deptStats
      .slice()
      .sort((a, b) => b.activeCount - a.activeCount)
      .map((d) => ({
        name: d.name,
        active: d.activeCount,
        urgent: d.urgentCount,
        atRisk: d.atRiskCount,
        widthPct: Math.round((d.activeCount / maxActive) * 100) + '%',
      }));

    // ---- Assignment rules — the real category→department routing already
    // used for automatic routing everywhere else, plus the default
    // priority/exception each rule carries, with any clerk-added rules
    // (persisted to localStorage) appended after the seed rules.
    interface RuleRow {
      id: string;
      category: string;
      department: string;
      departmentId: string;
      priority: string;
      priorityColor: string;
      exception: string;
      removable: boolean;
      removableOff: boolean;
      onRemove: Handler;
    }
    const seedRules: RuleRow[] = S.categories.map((c) => ({
      id: 'seed-' + c.id,
      category: c.label,
      department: S.deptName(c.dept),
      departmentId: c.dept,
      priority: c.defaultPriority,
      priorityColor: S.priorityMeta[c.defaultPriority].color,
      exception: c.exception,
      removable: false,
      removableOff: true,
      onRemove: () => {},
    }));
    const customRuleVals: RuleRow[] = this.state.customRules.map((r) => ({
      id: r.id,
      category: S.catLabel(r.category),
      department: S.deptName(r.department),
      departmentId: r.department,
      priority: r.priority,
      priorityColor: (S.priorityMeta[r.priority as Priority] || {}).color || '#4A4640',
      exception: 'Rregull i shtuar nga nëpunësi',
      removable: true,
      removableOff: false,
      onRemove: () => this._removeRule(r.id),
    }));
    const rules = seedRules.concat(customRuleVals);

    const categoryOptions = S.categories.map((c) => ({ value: c.id, label: c.label }));
    const deptOptions = S.departments.map((d) => ({ value: d.id, label: d.name }));
    const priorityOptions = S.priorityOrder.map((p) => ({ value: p, label: p }));
    const draft = this.state.addRuleDraft;

    // ---- Department detail workspace — only computed when a department is
    // open, kept as safe empty defaults otherwise (never a bare null on a
    // dot-path the template reads, per the app's established convention).
    let detail: {
      name: string;
      active: number;
      urgent: number;
      atRisk: number;
      slaRate: number | string;
      avgResponse: string;
      avgResolution: string;
      priorityBreakdown: { label: string; color: string; count: number }[];
      statusBreakdown: { label: string; color: string; count: number }[];
      exceptionGroups: ExceptionGroup[];
      exceptionsNone: boolean;
      caseRows: (Omit<CaseChip, 'status'> & { key: string; status: string; priority: string; priorityColor: string; responsibleLabel: string; slaLabel: string; slaColor: string })[];
      team: {
        id: string;
        name: string;
        initials: string;
        active: number;
        urgent: number;
        slaRisk: number;
        statusColor: string;
        isSelected: boolean;
        onClass: string;
        onClick: Handler;
        detail: EmployeeDetail;
      }[];
      hasUnassigned: boolean;
      unassignedCases: {
        key: string;
        id: string;
        title: string;
        category: string;
        priority: string;
        candidates: { id: string; name: string; initials: string; active: number; isTop: boolean; onClass: string; onAssign: Handler }[];
        reasonText: string;
      }[];
      history: { time: string; label: string; color: string }[];
      historyNone: boolean;
      rules: typeof rules;
      rulesNone: boolean;
    } = {
      name: '',
      active: 0,
      urgent: 0,
      atRisk: 0,
      slaRate: 100,
      avgResponse: '—',
      avgResolution: '—',
      priorityBreakdown: [],
      statusBreakdown: [],
      exceptionGroups: [],
      exceptionsNone: true,
      caseRows: [],
      team: [],
      hasUnassigned: false,
      unassignedCases: [],
      history: [],
      historyNone: true,
      rules: [],
      rulesNone: true,
    };
    const selectedDept = this.state.selectedDept;
    if (selectedDept && byDeptId[selectedDept]) {
      const d = byDeptId[selectedDept];
      const deptName = d.name;

      const priorityBreakdown = S.priorityOrder
        .slice()
        .reverse()
        .map((p) => ({
          label: p,
          color: S.priorityMeta[p].color,
          count: d.active.filter((r) => r.priority === p).length,
        }));
      const reja = d.active.filter((r) => r.status === 'I ri').length;
      const nePune = d.active.filter((r) => r.status === 'Në punë' || r.status === 'Caktuar').length;
      const nePritje = d.active.filter((r) => r.status === 'Në shqyrtim' || r.status === 'Kërkon informacion').length;
      const statusBreakdown = [
        { label: 'Të reja', color: '#8A847C', count: reja },
        { label: 'Në punë', color: '#B8860B', count: nePune },
        { label: 'Në pritje verifikimi', color: '#6B665F', count: nePritje },
      ];

      // 30-day averages from the shared S.perf engine (same as Performanca)
      const avgResponseHours = S.perf.avgResponse(perfRecs, { dept: d.id }, 30);
      const avgResolutionHours = S.perf.avgResolution(perfRecs, { dept: d.id }, 30);

      // ---- Exceptions — the same shape as Kreu's "Kërkojnë vëmendjen",
      // scoped to this department: SLA risk/breach, unassigned, reappeared,
      // and stuck (still new/assigned with no progress after 48h).
      const fmtWaitHours = (r: Row) => Math.max(1, Math.round((NOW.getTime() - r.submittedAt.getTime()) / HOUR_MS));
      const slaFlagged = d.active.filter(isSlaFlagged);
      const unassigned = d.active.filter((r) => !r.responsible);
      const reappeared = d.active.filter((r) => r.reappeared);
      const stuck = d.active.filter((r) => (r.status === 'I ri' || r.status === 'Caktuar') && (NOW.getTime() - r.submittedAt.getTime()) / HOUR_MS > 48);
      const exceptionGroups: ExceptionGroup[] = [];
      if (slaFlagged.length > 0) {
        const worst = slaFlagged.slice().sort((a, b) => (a.slaRemainingHours as number) - (b.slaRemainingHours as number))[0];
        exceptionGroups.push({
          color: '#C23B31',
          label: 'në rrezik SLA',
          count: slaFlagged.length,
          onClick: this._filterLink({ department: selectedDept, slaFlag: true }),
          actionLabel: 'Shiko raportin',
          example: {
            id: worst.displayId,
            title: worst.title,
            meta: worst.slaBreached ? 'SLA e shkelur (' + worst.slaLabel + ')' : worst.slaLabel + ' deri në SLA',
            onClick: this._select(worst.baseId),
          },
        });
      }
      if (unassigned.length > 0) {
        const oldest = unassigned.slice().sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())[0];
        exceptionGroups.push({
          color: '#B8860B',
          label: 'raporte pa përgjegjës',
          count: unassigned.length,
          onClick: this._filterLink({ department: selectedDept, unassigned: true }),
          actionLabel: 'Cakto',
          example: { id: oldest.displayId, title: oldest.title, meta: fmtWaitHours(oldest) + ' orë pa përgjegjës', onClick: this._select(oldest.baseId) },
        });
      }
      if (stuck.length > 0) {
        const oldestStuck = stuck.slice().sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())[0];
        exceptionGroups.push({
          color: '#8A847C',
          label: 'raste të bllokuara (pa ndryshim > 48h)',
          count: stuck.length,
          onClick: this._filterLink({ department: selectedDept }),
          actionLabel: 'Shiko raportin',
          example: { id: oldestStuck.displayId, title: oldestStuck.title, meta: fmtWaitHours(oldestStuck) + ' orë pa ndryshim statusi', onClick: this._select(oldestStuck.baseId) },
        });
      }
      if (reappeared.length > 0) {
        const rep = reappeared[0];
        exceptionGroups.push({
          color: '#8E5FB0',
          label: 'raporte të rishfaqura',
          count: reappeared.length,
          onClick: this._filterLink({ department: selectedDept, reappeared: true }),
          actionLabel: 'Shiko raportin',
          example: { id: rep.displayId, title: rep.title, meta: 'I ngjashëm me një rast të mbyllur më parë.', onClick: this._select(rep.baseId) },
        });
      }

      const caseRows = d.deptAll
        .slice()
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .map((r) => ({
          key: r.baseId,
          id: r.displayId,
          title: r.title,
          status: r.status,
          statusBg: S.statusMeta[r.status].bg,
          statusInk: S.statusMeta[r.status].ink,
          statusDot: S.statusMeta[r.status].dot,
          priority: r.priority,
          priorityColor: S.priorityMeta[r.priority].color,
          responsibleLabel: r.responsibleName || 'Pa caktuar',
          slaLabel: r.slaLabel,
          slaColor: r.slaBreached ? '#C23B31' : r.slaAtRisk ? '#B8860B' : '#6B665F',
          onClick: this._select(r.baseId),
        }));

      // ---- Ekipi — one row per department employee, real active/urgent/
      // SLA-risk counts from `all`, with an inline drill-down for whichever
      // employee is selected (category mix, coverage zones, actual cases).
      const deptEmployees = S.employees.filter((e) => e.dept === selectedDept);
      const team = deptEmployees.map((e) => {
        const empCases = all.filter((r) => r.responsible === e.id);
        const activeCases = empCases.filter(isOpenCase);
        const urgent = activeCases.filter((r) => r.priority === 'Urgjente').length;
        const slaRisk = activeCases.filter(isSlaFlagged).length;
        const isSelected = this.state.selectedEmployee === e.id;
        let empDetail: EmployeeDetail = { active: 0, categoryBreakdown: [], zones: e.coverageZones || [], cases: [], hasCases: false };
        if (isSelected) {
          const catCounts: Record<string, number> = {};
          activeCases.forEach((r) => {
            catCounts[r.categoryLabel] = (catCounts[r.categoryLabel] || 0) + 1;
          });
          const categoryBreakdown = Object.keys(catCounts).map((k) => ({ label: k, count: catCounts[k] }));
          const cases = activeCases
            .slice()
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
            .map((r) => ({
              id: r.displayId,
              title: r.title,
              status: r.status,
              statusBg: S.statusMeta[r.status].bg,
              statusInk: S.statusMeta[r.status].ink,
              statusDot: S.statusMeta[r.status].dot,
              onClick: this._select(r.baseId),
            }));
          empDetail = { active: activeCases.length, categoryBreakdown: categoryBreakdown, zones: e.coverageZones || [], cases: cases, hasCases: cases.length > 0 };
        }
        return {
          id: e.id,
          name: e.full,
          initials: initialsOf(e.full),
          active: activeCases.length,
          urgent: urgent,
          slaRisk: slaRisk,
          statusColor: slaRisk > 0 ? '#B8860B' : '#2E7D4F',
          isSelected: isSelected,
          onClass: isSelected ? 'is-on' : '',
          onClick: () => this._selectEmployee(e.id),
          detail: empDetail,
        };
      });

      // ---- Workload balancing — for every unassigned active case, rank
      // this department's employees by current active load, preferring
      // whoever's coverage zone includes the report's own zone, and expose
      // a real "Cakto" action (writes to sinjal_case_overrides, same
      // mechanism Raporti.dc.html uses for reassignment).
      const unassignedActive = d.active.filter((r) => !r.responsible);
      const unassignedCases = unassignedActive
        .slice()
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
        .map((r) => {
          const ranked = deptEmployees
            .map((e) => {
              const activeCount = all.filter((x) => x.responsible === e.id && isOpenCase(x)).length;
              const zoneMatch = (e.coverageZones || []).indexOf(r.zone) !== -1;
              return { emp: e, activeCount: activeCount, zoneMatch: zoneMatch };
            })
            .sort((a2, b2) => {
              if (a2.zoneMatch !== b2.zoneMatch) return a2.zoneMatch ? -1 : 1;
              return a2.activeCount - b2.activeCount;
            });
          const top = ranked[0];
          const reasonParts = top ? ['më pak raste aktive (' + top.activeCount + ')'] : [];
          if (top && top.zoneMatch) reasonParts.push('zona e raportit (' + r.zone + ') brenda zonës së saj të mbulimit');
          const candidates = ranked.slice(0, 3).map((c, idx) => ({
            id: c.emp.id,
            name: c.emp.name,
            initials: initialsOf(c.emp.full),
            active: c.activeCount,
            isTop: idx === 0,
            onClass: idx === 0 ? 'is-recommended' : '',
            onAssign: () => this._assignCase(r.baseId, c.emp.id),
          }));
          return {
            key: r.baseId,
            id: r.displayId,
            title: r.title,
            category: r.categoryLabel,
            priority: r.priority,
            candidates: candidates,
            reasonText: reasonParts.length ? reasonParts.join(' + ') : 'asnjë punonjës i disponueshëm në këtë departament.',
          };
        });

      // ---- Historiku i caktimeve — real routing/assignment events only:
      // AI's original department suggestion (when it differs from where
      // the case ended up), and every real assignLog/reassignLog entry this
      // session's actions have written — nothing invented.
      const historyEvents: { time: Date; label: string; color: string }[] = [];
      d.deptAll.forEach((r) => {
        if (r.routingChanged) {
          historyEvents.push({ time: r.submittedAt, label: 'AI sugjeroi departamentin ' + r.ai.suggestedDepartment + ' për ' + r.displayId + '.', color: '#B8860B' });
        }
        const ov = overrides[r.baseId] || {};
        (ov.assignLog || []).forEach((e) => {
          historyEvents.push({ time: new Date(e.at), label: r.displayId + ' u caktua te ' + e.employee + ' (nga ' + e.by + ').', color: '#C23B31' });
        });
        (ov.reassignLog || []).forEach((e) => {
          if (e.to === deptName || e.from === deptName) {
            historyEvents.push({ time: new Date(e.at), label: r.displayId + ' u rikalua nga ' + e.from + ' në ' + e.to + '. Arsye: ' + e.reason, color: '#C23B31' });
          }
        });
      });
      historyEvents.sort((a, b) => b.time.getTime() - a.time.getTime());
      const history = historyEvents.slice(0, 10).map((e) => ({ time: S.fmtTime(e.time), label: e.label, color: e.color }));

      const deptRules = rules.filter((r) => r.departmentId === selectedDept);

      detail = {
        name: deptName,
        active: d.activeCount,
        urgent: d.urgentCount,
        atRisk: d.atRiskCount,
        slaRate: d.slaRate,
        avgResponse: S.fmtDuration(avgResponseHours),
        avgResolution: S.fmtDuration(avgResolutionHours),
        priorityBreakdown: priorityBreakdown,
        statusBreakdown: statusBreakdown,
        exceptionGroups: exceptionGroups,
        exceptionsNone: exceptionGroups.length === 0,
        caseRows: caseRows,
        team: team,
        hasUnassigned: unassignedCases.length > 0,
        unassignedCases: unassignedCases,
        history: history,
        historyNone: history.length === 0,
        rules: deptRules,
        rulesNone: deptRules.length === 0,
      };
    }

    const tabDefs: { key: Tab; label: string }[] = [
      { key: 'permbledhje', label: 'Përmbledhje' },
      { key: 'raportet', label: 'Raportet' },
      { key: 'ekipi', label: 'Ekipi' },
      { key: 'rregullat', label: 'Rregullat' },
    ];
    const tabs = tabDefs.map((o) => ({ label: o.label, onClass: this.state.detailTab === o.key ? 'is-on' : '', onClick: () => this._setTab(o.key) }));

    return {
      isOverview: this.state.view === 'overview',
      isDetail: this.state.view === 'detail',
      orgSummary: orgSummary,
      deptCards: deptCards,
      workloadRows: workloadRows,
      rules: rules,
      categoryOptions: categoryOptions,
      deptOptions: deptOptions,
      priorityOptions: priorityOptions,
      addRuleOpen: this.state.addRuleOpen,
      addRuleDraft: draft,
      saveRuleDisabledClass: !draft.category || !draft.department ? 'is-disabled' : '',
      onOpenAddRule: () => this._openAddRule(),
      onCancelAddRule: () => this._cancelAddRule(),
      onSaveRule: () => this._saveRule(),
      onRuleCategory: (e: InputEvent) => this._setRuleDraft({ category: e.target.value }),
      onRuleDept: (e: InputEvent) => this._setRuleDraft({ department: e.target.value }),
      onRulePriority: (e: InputEvent) => this._setRuleDraft({ priority: e.target.value }),

      onBack: () => this._backToOverview(),
      tabs: tabs,
      isTabPermbledhje: this.state.detailTab === 'permbledhje',
      isTabRaportet: this.state.detailTab === 'raportet',
      isTabEkipi: this.state.detailTab === 'ekipi',
      isTabRregullat: this.state.detailTab === 'rregullat',
      detail: detail,
    };
  }
}
