import type { ChangeEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { CaseOverride, CaseOverrides, DeptId, Priority, Report, ReportFilter, Status } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, readString, remove, writeJSON, writeString } from '../../lib/storage';
import { REAL_STAFF, isDatabaseCase, saveCase } from '../../api/staff';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement>;

export interface Filters {
  statuses: string[];
  priorities: string[];
  categories: string[];
  departments: string[];
  zones: string[];
  slaStates: string[];
  flags: string[];
  unassigned: boolean;
  reportedPreset: string;
  reportedFrom: string;
  reportedTo: string;
  updatedPreset: string;
  updatedFrom: string;
  updatedTo: string;
}

type ListKey = 'statuses' | 'priorities' | 'categories' | 'departments' | 'zones' | 'slaStates' | 'flags';
type PresetKey = 'reportedPreset' | 'updatedPreset';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Partial<Filters>;
  search: string;
  isDefault: boolean;
}

type SortKey = 'urgency' | 'priority' | 'newest' | 'oldest' | 'slaSoon' | 'updated' | 'resolutionTime';

interface State {
  search: string;
  filters: Filters | null;
  sortKey: SortKey;
  page: number;
  panelOpen: boolean;
  sortOpen: boolean;
  selected: Record<string, boolean>;
  overrides: CaseOverrides;
  savedFilters: SavedFilter[];
  savingOpen: boolean;
  savingName: string;
  savingDefault: boolean;
  bulkDeptDraft: string;
  bulkStatusDraft: string;
  bulkPriorityDraft: string;
  bulkConfirmPending: string | null;
  exportNotice: boolean;
}

/** A report with the session's clerk overrides applied, plus derived fields. */
type Row = Report & {
  baseId: string;
  lastActivityAt: Date;
  routingChanged: boolean;
};

/** Port of the Raportet.dc.html logic: filters, sort, search, saved filters, bulk actions. */
export class RaportetLogic extends DCLogic<Record<string, never>, State> {
  state: State = {
    search: '',
    filters: null,
    sortKey: 'newest',
    page: 1,
    panelOpen: false,
    sortOpen: false,
    selected: {},
    overrides: {},
    savedFilters: [],
    savingOpen: false,
    savingName: '',
    savingDefault: false,
    bulkDeptDraft: '',
    bulkStatusDraft: '',
    bulkPriorityDraft: '',
    bulkConfirmPending: null,
    exportNotice: false,
  };

  _emptyFilters(): Filters {
    return {
      statuses: [],
      priorities: [],
      categories: [],
      departments: [],
      zones: [],
      slaStates: [],
      flags: [],
      unassigned: false,
      reportedPreset: '',
      reportedFrom: '',
      reportedTo: '',
      updatedPreset: '',
      updatedFrom: '',
      updatedTo: '',
    };
  }

  componentDidMount() {
    const overrides = readJSON<CaseOverrides>(STORAGE_KEYS.caseOverrides, {});

    let savedFilters = readJSON<SavedFilter[] | null>(STORAGE_KEYS.raportetSavedFilters, null);
    if (!savedFilters) {
      savedFilters = this._defaultSavedFilters();
      this._persistSavedFilters(savedFilters);
    }
    this.setState({ overrides, savedFilters, filters: this._emptyFilters() });

    // 1) an incoming filter from Kreu (sinjal_incoming_filter) or the
    // notification bell (sinjal_report_filter) always wins.
    const incomingRaw = readString(STORAGE_KEYS.incomingFilter) || readString(STORAGE_KEYS.reportFilter);
    if (incomingRaw) {
      try {
        remove(STORAGE_KEYS.incomingFilter);
        remove(STORAGE_KEYS.reportFilter);
        const f = this._translateIncoming(JSON.parse(incomingRaw) as ReportFilter);
        this.setState({ filters: f, search: '' });
        this._persistState(f, '', this.state.sortKey);
        return;
      } catch {
        /* malformed hand-off: fall through */
      }
    }

    // 2) otherwise restore whatever was last on screen.
    const saved = readJSON<{ search?: string; filters?: Partial<Filters>; sortKey?: SortKey } | null>(STORAGE_KEYS.raportetState, null);
    if (saved) {
      this.setState({
        search: saved.search || '',
        filters: Object.assign(this._emptyFilters(), saved.filters || {}),
        sortKey: saved.sortKey || 'newest',
      });
      return;
    }

    // 3) first-ever visit: apply the default saved filter, if one is set.
    const def = savedFilters.filter((sf) => sf.isDefault)[0];
    if (def) {
      this.setState({ filters: Object.assign(this._emptyFilters(), def.filters), search: def.search || '' });
    }
  }

  _translateIncoming(incoming: ReportFilter): Filters {
    const f = this._emptyFilters();
    if (incoming.status) f.statuses = [incoming.status];
    if (incoming.done) f.statuses = ['Zgjidhur', 'Mbyllur'];
    if (incoming.zone) f.zones = [incoming.zone as string];
    if (incoming.department) f.departments = [incoming.department as string];
    if (incoming.category) f.categories = [incoming.category];
    if (incoming.unassigned) f.unassigned = true;
    if (incoming.slaAtRisk) f.slaStates = ['atRisk'];
    if (incoming.slaBreached) f.slaStates = ['breached'];
    if (incoming.slaFlag) f.slaStates = ['atRisk', 'breached'];
    if (incoming.duplicateCandidate) f.flags = ['duplicateCandidate'];
    if (incoming.lowConfidence) f.flags = ['lowConfidence'];
    if (incoming.reappeared) f.flags = ['reappeared'];
    if (incoming.pendingClosure) f.flags = ['pendingClosure'];
    return f;
  }

  _defaultSavedFilters(): SavedFilter[] {
    return [
      { id: 'sf1', name: 'SLA në rrezik', filters: Object.assign(this._emptyFilters(), { slaStates: ['atRisk', 'breached'] }), search: '', isDefault: false },
      { id: 'sf2', name: 'Infrastrukturë — Të reja', filters: Object.assign(this._emptyFilters(), { departments: ['infra'], statuses: ['I ri'] }), search: '', isDefault: false },
      { id: 'sf3', name: 'Raporte të rishfaqura', filters: Object.assign(this._emptyFilters(), { flags: ['reappeared'] }), search: '', isDefault: false },
    ];
  }

  _persistState(filters?: Filters, search?: string, sortKey?: SortKey) {
    writeJSON(STORAGE_KEYS.raportetState, {
      search: search !== undefined ? search : this.state.search,
      filters: filters !== undefined ? filters : this.state.filters,
      sortKey: sortKey !== undefined ? sortKey : this.state.sortKey,
    });
  }
  _persistSavedFilters(list: SavedFilter[]) {
    writeJSON(STORAGE_KEYS.raportetSavedFilters, list);
  }
  _persistOverrides(overrides: CaseOverrides) {
    writeJSON(STORAGE_KEYS.caseOverrides, overrides);
  }

  _setFilters(patch: Partial<Filters>) {
    const f = Object.assign({}, this.state.filters, patch) as Filters;
    this.setState({ filters: f, page: 1 });
    this._persistState(f, undefined, undefined);
  }
  _toggleInList(key: ListKey, value: string) {
    const cur = (this.state.filters as Filters)[key] || [];
    const next = cur.indexOf(value) === -1 ? cur.concat([value]) : cur.filter((v) => v !== value);
    this._setFilters({ [key]: next });
  }
  _quickSet(target: Filters) {
    this.setState({ filters: target, search: '', page: 1 });
    this._persistState(target, '', undefined);
  }
  _clearAll() {
    const f0 = this._emptyFilters();
    this.setState({ filters: f0, search: '', page: 1 });
    this._persistState(f0, '', undefined);
  }
  _setSearch(v: string) {
    this.setState({ search: v, page: 1 });
    this._persistState(undefined, v, undefined);
  }
  _setSort(key: SortKey) {
    this.setState({ sortKey: key, sortOpen: false, page: 1 });
    this._persistState(undefined, undefined, key);
  }
  _setPage(p: number) {
    this.setState({ page: p });
  }

  _saveCurrentFilter() {
    const name = (this.state.savingName || '').trim();
    if (!name) return;
    const entry: SavedFilter = { id: 'sf' + Date.now(), name, filters: this.state.filters as Filters, search: this.state.search, isDefault: !!this.state.savingDefault };
    let list = this.state.savedFilters.slice();
    if (entry.isDefault) list = list.map((sf) => Object.assign({}, sf, { isDefault: false }));
    list = list.concat([entry]);
    this._persistSavedFilters(list);
    this.setState({ savedFilters: list, savingOpen: false, savingName: '', savingDefault: false });
  }
  _applySavedFilter(sf: SavedFilter) {
    const f = Object.assign(this._emptyFilters(), sf.filters);
    this.setState({ filters: f, search: sf.search || '', page: 1 });
    this._persistState(f, sf.search || '', undefined);
  }
  _deleteSavedFilter(id: string) {
    const list = this.state.savedFilters.filter((sf) => sf.id !== id);
    this._persistSavedFilters(list);
    this.setState({ savedFilters: list });
  }

  _toggleSelect(id: string) {
    const sel = Object.assign({}, this.state.selected);
    if (sel[id]) delete sel[id];
    else sel[id] = true;
    this.setState({ selected: sel });
  }
  _clearSelection() {
    this.setState({ selected: {} });
  }

  _patchOverrideMany(ids: string[], patch: CaseOverride) {
    if (REAL_STAFF) {
      void (async () => {
        for (const id of ids) await saveCase(id, patch);
        this.onChange?.();
      })().catch((err: unknown) => { this.onChange?.(); window.alert(err instanceof Error ? err.message : String(err)); });
      return;
    }
    const liveIds = ids.filter(isDatabaseCase);
    if (liveIds.length) {
      void (async () => {
        for (const id of liveIds) await saveCase(id, patch);
        this.onChange?.();
      })().catch((err: unknown) => window.alert(err instanceof Error ? err.message : String(err)));
    }
    const overrides = Object.assign({}, this.state.overrides);
    ids.filter((id) => !isDatabaseCase(id)).forEach((id) => {
      overrides[id] = Object.assign({}, overrides[id], patch);
    });
    this._persistOverrides(overrides);
    this.setState({ overrides });
  }
  _applyBulkDept(deptId: string) {
    const ids = Object.keys(this.state.selected);
    if (!ids.length || !deptId) {
      this.setState({ bulkDeptDraft: '' });
      return;
    }
    this._patchOverrideMany(ids, { department: deptId as DeptId, responsible: null });
    this.setState({ bulkDeptDraft: '' });
  }
  _applyBulkPriority(pr: string) {
    const ids = Object.keys(this.state.selected);
    if (!ids.length || !pr) {
      this.setState({ bulkPriorityDraft: '' });
      return;
    }
    this._patchOverrideMany(ids, { priority: pr as Priority });
    this.setState({ bulkPriorityDraft: '' });
  }
  _requestBulkStatus(status: string) {
    if (!status) {
      this.setState({ bulkStatusDraft: '' });
      return;
    }
    const resolving = status === 'Zgjidhur' || status === 'Mbyllur';
    if (resolving) {
      this.setState({ bulkConfirmPending: status });
      return;
    }
    this._applyBulkStatus(status);
  }
  _applyBulkStatus(status: string | null) {
    const ids = Object.keys(this.state.selected);
    if (ids.length) this._patchOverrideMany(ids, { status: status as Status });
    this.setState({ bulkStatusDraft: '', bulkConfirmPending: null });
  }
  _exportSelected() {
    this.setState({ exportNotice: true });
  }

  _select(id: string) {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }

  renderVals() {
    const S = SINJAL;
    const NOW = S.now || new Date();
    const base = S.reports || [];
    const overrides = this.state.overrides || {};
    // componentDidMount always sets filters (useLogic runs it before the first render)
    const f = this.state.filters || this._emptyFilters();
    const q = (this.state.search || '').trim().toLowerCase();

    // Merge each report with any override (the same sinjal_case_overrides
    // layer Raporti writes to), and derive: last-activity time (the latest
    // timeline event), resolution time (the same 75%-of-window formula
    // buildTimeline uses), and whether routing ended up different from what
    // SINJAL originally suggested.
    const all: Row[] = base.map((r) => {
      const ov = overrides[r.id] || {};
      const eff = Object.assign({}, r, ov) as Report;
      const timeline = r.timeline || [];
      const lastActivityAt = timeline.length ? timeline[timeline.length - 1].time : r.submittedAt;
      const resolutionHours = eff.status === 'Zgjidhur' || eff.status === 'Mbyllur' ? ((r.slaDeadline.getTime() - r.submittedAt.getTime()) / 3600000) * 0.75 : null;
      return Object.assign({}, eff, {
        baseId: r.id,
        departmentName: S.deptName(eff.department),
        lastActivityAt,
        resolutionHours,
        routingChanged: r.ai.suggestedDepartment !== S.deptName(eff.department),
      });
    });

    const inPreset = (d: Date, preset: string, fromStr: string, toStr: string) => {
      if (!preset) return true;
      if (preset === 'today') return d.getFullYear() === NOW.getFullYear() && d.getMonth() === NOW.getMonth() && d.getDate() === NOW.getDate();
      if (preset === '7d') {
        const start = new Date(NOW);
        start.setDate(start.getDate() - 7);
        return d >= start;
      }
      if (preset === '30d') {
        const start = new Date(NOW);
        start.setDate(start.getDate() - 30);
        return d >= start;
      }
      if (preset === 'custom') {
        if (fromStr && d < new Date(fromStr + 'T00:00:00')) return false;
        if (toStr && d > new Date(toStr + 'T23:59:59')) return false;
        return true;
      }
      return true;
    };
    const flagTest: Record<string, (r: Row) => boolean> = {
      reappeared: (r) => r.reappeared,
      duplicateCandidate: (r) => !!r.duplicateCandidateId,
      lowConfidence: (r) => r.ai.confidence < 60,
      routingChanged: (r) => r.routingChanged,
      pendingClosure: (r) => r.status === 'Zgjidhur' && r.resolutionEvidence && r.resolutionEvidence.length > 0,
    };
    const slaTest: Record<string, (r: Row) => boolean> = {
      onTrack: (r) => r.slaRemainingHours !== null && !r.slaAtRisk && !r.slaBreached,
      atRisk: (r) => r.slaAtRisk,
      breached: (r) => r.slaBreached,
    };
    const applyFilters = (list: Row[], ff: Filters, qq: string) =>
      list.filter((r) => {
        if (ff.statuses.length && ff.statuses.indexOf(r.status) === -1) return false;
        if (ff.priorities.length && ff.priorities.indexOf(r.priority) === -1) return false;
        if (ff.categories.length && ff.categories.indexOf(r.category) === -1) return false;
        if (ff.departments.length && ff.departments.indexOf(r.department) === -1) return false;
        if (ff.zones.length && ff.zones.indexOf(r.zone) === -1) return false;
        if (ff.slaStates.length && !ff.slaStates.some((s) => slaTest[s] && slaTest[s](r))) return false;
        if (ff.flags.length && !ff.flags.some((fl) => flagTest[fl] && flagTest[fl](r))) return false;
        if (ff.unassigned && (r.responsible || r.status === 'Dublikatë' || r.status === 'Refuzuar')) return false;
        if (ff.reportedPreset && !inPreset(r.submittedAt, ff.reportedPreset, ff.reportedFrom, ff.reportedTo)) return false;
        if (ff.updatedPreset && !inPreset(r.lastActivityAt, ff.updatedPreset, ff.updatedFrom, ff.updatedTo)) return false;
        if (qq) {
          const hay = (r.id + ' ' + r.title + ' ' + r.description + ' ' + r.zone + ' ' + r.address).toLowerCase();
          if (hay.indexOf(qq) === -1) return false;
        }
        return true;
      });

    const orNever = (h: number | null) => (h === null ? 999999 : h);
    const SORTERS: Record<SortKey, (a: Row, b: Row) => number> = {
      urgency: (a, b) => S.priorityMeta[b.priority].weight - S.priorityMeta[a.priority].weight || orNever(a.slaRemainingHours) - orNever(b.slaRemainingHours),
      priority: (a, b) => S.priorityMeta[b.priority].weight - S.priorityMeta[a.priority].weight,
      newest: (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
      oldest: (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
      slaSoon: (a, b) => orNever(a.slaRemainingHours) - orNever(b.slaRemainingHours),
      updated: (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
      resolutionTime: (a, b) => orNever(a.resolutionHours) - orNever(b.resolutionHours),
    };
    const sorter = SORTERS[this.state.sortKey] || SORTERS.newest;
    const filtered = applyFilters(all, f, q).slice().sort(sorter);

    // "Rendit sipas" is a custom .panel dropdown, not a native select, so the
    // opened option list keeps the app's own typography.
    const SORT_LABELS: { value: SortKey; label: string }[] = [
      { value: 'urgency', label: 'Urgjenca' },
      { value: 'priority', label: 'Prioriteti' },
      { value: 'newest', label: 'Më i riu' },
      { value: 'oldest', label: 'Më i vjetri' },
      { value: 'slaSoon', label: 'SLA që skadon së shpejti' },
      { value: 'updated', label: 'Përditësuar së fundmi' },
      { value: 'resolutionTime', label: 'Koha e zgjidhjes' },
    ];
    const sortOptions = SORT_LABELS.map((o) => ({ value: o.value, label: o.label, onClass: o.value === this.state.sortKey ? 'is-on' : '', onClick: () => this._setSort(o.value) }));
    const currentSortLabel = (SORT_LABELS.filter((o) => o.value === this.state.sortKey)[0] || SORT_LABELS[2]).label;

    const relTime = (d: Date) => {
      const mins = Math.max(0, Math.round((NOW.getTime() - d.getTime()) / 60000));
      if (mins < 1) return 'tani';
      if (mins < 60) return mins + ' min më parë';
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + ' orë më parë';
      const days = Math.round(hrs / 24);
      return days + ' ditë më parë';
    };

    const PAGE_SIZE = 12;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, this.state.page || 1), totalPages);
    const pagedFiltered = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const rows = pagedFiltered.map((r) => {
      const isSelected = !!this.state.selected[r.baseId];
      return {
        key: r.baseId,
        id: r.displayId,
        title: r.title,
        zone: r.zone,
        address: r.address,
        category: r.categoryLabel,
        department: r.departmentName,
        status: r.status,
        statusBg: S.statusMeta[r.status].bg,
        statusInk: S.statusMeta[r.status].ink,
        statusDot: S.statusMeta[r.status].dot,
        priority: r.priority,
        priorityColor: S.priorityMeta[r.priority].color,
        sla: r.slaLabel,
        slaColor: r.slaBreached ? '#C23B31' : r.slaAtRisk ? '#B8860B' : '#6B665F',
        updatedLabel: relTime(r.lastActivityAt),
        reappeared: r.reappeared,
        isSelected,
        checkClass: isSelected ? 'is-on' : '',
        onToggleSelect: () => this._toggleSelect(r.baseId),
        onClick: this._select(r.baseId),
      };
    });

    const allIds = filtered.map((r) => r.baseId);
    const allSelected = allIds.length > 0 && allIds.every((id) => !!this.state.selected[id]);
    const onToggleSelectAll = () => {
      const sel = Object.assign({}, this.state.selected);
      if (allSelected)
        allIds.forEach((id) => {
          delete sel[id];
        });
      else
        allIds.forEach((id) => {
          sel[id] = true;
        });
      this.setState({ selected: sel });
    };

    // ---- filter groups (advanced panel) ------------------------------
    const mkGroup = (key: ListKey, options: { value: string; label: string }[]) =>
      options.map((o) => {
        const isOn = (f[key] || []).indexOf(o.value) !== -1;
        return { value: o.value, label: o.label, isOn, onClass: isOn ? 'is-on' : '', onClick: () => this._toggleInList(key, o.value) };
      });
    const filterGroups = [
      {
        title: 'Statusi',
        items: mkGroup(
          'statuses',
          S.statusOrder.map((s) => ({ value: s, label: s })),
        ),
      },
      {
        title: 'Prioriteti',
        items: mkGroup(
          'priorities',
          S.priorityOrder.map((p) => ({ value: p, label: p })),
        ),
      },
      {
        title: 'Kategoria',
        items: mkGroup(
          'categories',
          S.categories.map((c) => ({ value: c.id, label: c.label })),
        ),
      },
      {
        title: 'Departamenti',
        items: mkGroup(
          'departments',
          S.departments.map((d) => ({ value: d.id, label: d.name })),
        ),
      },
      {
        title: 'SLA',
        items: mkGroup('slaStates', [
          { value: 'onTrack', label: 'Brenda afatit' },
          { value: 'atRisk', label: 'Në rrezik' },
          { value: 'breached', label: 'Tejkaluar' },
        ]),
      },
      {
        title: 'Zona',
        items: mkGroup(
          'zones',
          S.zones.map((z) => ({ value: z, label: z })),
        ),
      },
      {
        title: 'AI / Sinjalizime',
        items: mkGroup('flags', [
          { value: 'reappeared', label: 'Rishfaqur' },
          { value: 'duplicateCandidate', label: 'Dublikatë e mundshme' },
          { value: 'lowConfidence', label: 'Kërkon verifikim njerëzor' },
          { value: 'routingChanged', label: 'Routing i ndryshuar' },
        ]),
      },
    ];

    const mkPreset = (key: PresetKey, options: { value: string; label: string }[]) =>
      options.map((o) => ({
        value: o.value,
        label: o.label,
        onClass: f[key] === o.value ? 'is-on' : '',
        onClick: () => this._setFilters({ [key]: f[key] === o.value ? '' : o.value }),
      }));
    const reportedPresets = mkPreset('reportedPreset', [
      { value: 'today', label: 'Sot' },
      { value: '7d', label: '7 ditët e fundit' },
      { value: '30d', label: '30 ditët e fundit' },
      { value: 'custom', label: 'Personalizuar' },
    ]);
    const updatedPresets = mkPreset('updatedPreset', [
      { value: 'today', label: 'Sot' },
      { value: '7d', label: '7 ditët e fundit' },
      { value: 'custom', label: 'Personalizuar' },
    ]);

    const activeFilterN =
      f.statuses.length +
      f.priorities.length +
      f.categories.length +
      f.departments.length +
      f.zones.length +
      f.slaStates.length +
      f.flags.length +
      (f.reportedPreset ? 1 : 0) +
      (f.updatedPreset ? 1 : 0) +
      (f.unassigned ? 1 : 0);
    const hasAnyFilter = activeFilterN > 0 || !!q;

    // ---- quick filter chips: each is a one-click reset to a specific,
    // narrow filter shape (not additive with whatever else was set) ----
    const isFiltersEqual = (a: Filters, b: Filters) => JSON.stringify(a) === JSON.stringify(b);
    const targetAll = this._emptyFilters();
    const targetNew = Object.assign(this._emptyFilters(), { statuses: ['I ri'] });
    const targetInProgress = Object.assign(this._emptyFilters(), { statuses: ['Në punë'] });
    const targetResolved = Object.assign(this._emptyFilters(), { statuses: ['Zgjidhur'] });
    const targetReappeared = Object.assign(this._emptyFilters(), { flags: ['reappeared'] });
    const targetSlaRisk = Object.assign(this._emptyFilters(), { slaStates: ['atRisk', 'breached'] });
    const mkChip = (label: string, target: Filters) => ({ label, onClass: isFiltersEqual(f, target) && !q ? 'is-on' : '', onClick: () => this._quickSet(target) });
    const quickChips = [
      mkChip('Të gjitha', targetAll),
      mkChip('Të reja', targetNew),
      mkChip('Në punë', targetInProgress),
      mkChip('Të zgjidhura', targetResolved),
      mkChip('Rishfaqur', targetReappeared),
      mkChip('SLA në rrezik', targetSlaRisk),
    ];

    const incomingChips: { label: string; onClear: () => void }[] = [];
    if (f.unassigned) incomingChips.push({ label: 'Pa caktuar ×', onClear: () => this._setFilters({ unassigned: false }) });
    if (f.flags.indexOf('pendingClosure') !== -1)
      incomingChips.push({ label: 'Pret verifikim përfundimtar ×', onClear: () => this._setFilters({ flags: f.flags.filter((x) => x !== 'pendingClosure') }) });

    // ---- saved filters (with live result counts) ---------------------
    const savedFilterRows = (this.state.savedFilters || []).map((sf) => {
      const count = applyFilters(all, Object.assign(this._emptyFilters(), sf.filters), (sf.search || '').trim().toLowerCase()).length;
      return {
        id: sf.id,
        name: sf.name,
        count,
        resultLabel: count === 1 ? '1 rezultat' : count + ' rezultate',
        onApply: () => this._applySavedFilter(sf),
        onDelete: () => this._deleteSavedFilter(sf.id),
      };
    });

    // ---- bulk selection bar -------------------------------------------
    const selectedIds = Object.keys(this.state.selected);
    const selectedCount = selectedIds.length;
    const bulkBar = {
      show: selectedCount > 0,
      count: selectedCount,
      deptDraft: this.state.bulkDeptDraft,
      onDept: (e: InputEvent) => {
        const v = e.target.value;
        this.setState({ bulkDeptDraft: v });
        this._applyBulkDept(v);
      },
      deptOptions: S.departments.map((d) => ({ value: d.id, label: d.name })),
      statusDraft: this.state.bulkStatusDraft,
      onStatus: (e: InputEvent) => {
        const v = e.target.value;
        this.setState({ bulkStatusDraft: v });
        this._requestBulkStatus(v);
      },
      statusOptions: S.statusOrder.map((s) => ({ value: s, label: s })),
      priorityDraft: this.state.bulkPriorityDraft,
      onPriority: (e: InputEvent) => {
        const v = e.target.value;
        this.setState({ bulkPriorityDraft: v });
        this._applyBulkPriority(v);
      },
      priorityOptions: S.priorityOrder.map((p) => ({ value: p, label: p })),
      confirmShow: !!this.state.bulkConfirmPending,
      confirmLabel: this.state.bulkConfirmPending ? 'Shëno ' + selectedCount + ' raporte si "' + this.state.bulkConfirmPending + '"?' : '',
      onConfirm: () => this._applyBulkStatus(this.state.bulkConfirmPending),
      onCancelConfirm: () => this.setState({ bulkConfirmPending: null, bulkStatusDraft: '' }),
      onExport: () => this._exportSelected(),
      onClearSelection: () => this._clearSelection(),
    };

    const total = base.length;
    const shown = filtered.length;

    type PageNum = { n: number | string; isNum: boolean; isGap: boolean; onClass: string; onClick: () => void };
    const nums: PageNum[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1)
        nums.push({ n: i, isNum: true, isGap: false, onClass: i === currentPage ? 'is-on' : '', onClick: () => this._setPage(i) });
      else if (nums.length && !nums[nums.length - 1].isGap) nums.push({ n: '…', isNum: false, isGap: true, onClass: '', onClick: () => {} });
    }
    const pagination = {
      show: totalPages > 1,
      page: currentPage,
      totalPages,
      label: filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 + '–' + Math.min(filtered.length, currentPage * PAGE_SIZE) + ' nga ' + filtered.length : '0',
      nums,
      canPrev: currentPage > 1,
      canNext: currentPage < totalPages,
      prevClass: currentPage > 1 ? '' : 'is-disabled',
      nextClass: currentPage < totalPages ? '' : 'is-disabled',
      onPrev: () => this._setPage(Math.max(1, currentPage - 1)),
      onNext: () => this._setPage(Math.min(totalPages, currentPage + 1)),
    };

    return {
      search: this.state.search,
      onSearch: (e: InputEvent) => this._setSearch(e && e.target ? e.target.value : ''),
      onClearAll: () => this._clearAll(),
      hasAnyFilter,

      panelOpen: this.state.panelOpen,
      panelBtnClass: this.state.panelOpen ? 'is-on' : '',
      onTogglePanel: () => this.setState({ panelOpen: !this.state.panelOpen }),
      activeFilterBadge: { show: activeFilterN > 0, n: activeFilterN },
      filterGroups,
      reportedPresets,
      reportedCustomShow: f.reportedPreset === 'custom',
      reportedFrom: f.reportedFrom,
      reportedTo: f.reportedTo,
      onReportedFrom: (e: InputEvent) => this._setFilters({ reportedFrom: e.target.value }),
      onReportedTo: (e: InputEvent) => this._setFilters({ reportedTo: e.target.value }),
      updatedPresets,
      updatedCustomShow: f.updatedPreset === 'custom',
      updatedFrom: f.updatedFrom,
      updatedTo: f.updatedTo,
      onUpdatedFrom: (e: InputEvent) => this._setFilters({ updatedFrom: e.target.value }),
      onUpdatedTo: (e: InputEvent) => this._setFilters({ updatedTo: e.target.value }),

      savedFilterRows,
      savedFiltersEmpty: savedFilterRows.length === 0,
      savingOpen: this.state.savingOpen,
      onOpenSaving: () => this.setState({ savingOpen: true }),
      onCancelSaving: () => this.setState({ savingOpen: false, savingName: '', savingDefault: false }),
      savingName: this.state.savingName,
      onSavingNameChange: (e: InputEvent) => this.setState({ savingName: e.target.value }),
      savingDefault: this.state.savingDefault,
      savingDefaultClass: this.state.savingDefault ? 'is-on' : '',
      onToggleSavingDefault: () => this.setState({ savingDefault: !this.state.savingDefault }),
      onSaveCurrent: () => this._saveCurrentFilter(),

      quickChips,
      incomingChips,

      sortOptions,
      sortLabel: currentSortLabel,
      sortOpen: this.state.sortOpen,
      onToggleSort: () => this.setState({ sortOpen: !this.state.sortOpen }),
      sortKey: this.state.sortKey,

      exportNotice: this.state.exportNotice,
      exportNoticeText: 'U përgatit eksporti i ' + selectedCount + ' raporteve.',
      onDismissExport: () => this.setState({ exportNotice: false }),
      bulkBar,

      allSelected,
      allSelectedClass: allSelected ? 'is-on' : '',
      onToggleSelectAll,

      rows,
      filteredCount: shown,
      emptyState: filtered.length === 0,
      resultsLabel: (shown === 1 ? '1 raport' : shown + ' raporte') + (hasAnyFilter ? ' nga ' + total : ''),
      pagination,
    };
  }
}
