import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { CaseOverrides, DeptId, Report } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, remove, writeJSON, writeString } from '../../lib/storage';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export interface Filters {
  statuses: string[];
  priorities: string[];
  categories: string[];
  departments: string[];
  zones: string[];
  slaStates: string[];
  flags: string[];
  unassigned: boolean;
  periodPreset: string;
  periodFrom: string;
  periodTo: string;
}
type ListKey = 'statuses' | 'priorities' | 'categories' | 'departments' | 'zones' | 'slaStates' | 'flags';

/** A point on the map, in percent of the map frame. */
export interface Point {
  x: number;
  y: number;
}

type Layer = 'raporte' | 'intensiteti' | 'departamentet' | 'sla';
type ZonaMode = 'all' | 'lagje' | 'custom';
type TierKey = 'urgent' | 'progress' | 'new' | 'review' | 'resolved' | 'reappeared';

interface State {
  filtersOpen: boolean;
  filters: Filters;
  layer: Layer;
  layersMenuOpen: boolean;
  zoom: number;
  selectedId: string | null;
  selectedClusterKey: string | null;
  zonaMode: ZonaMode;
  drawMode: boolean;
  drawPoints: Point[];
  customPolygon: Point[] | null;
  comparePeriod: boolean;
  overrides: CaseOverrides;
}

/** One-shot deep link from Performanca (sinjal_harta_focus). */
interface HartaFocus {
  zones?: string[];
  categories?: string[];
  departments?: string[];
}

/** A report with the session's overrides applied. */
type Row = Report & { baseId: string; routingChanged: boolean };

interface ClusterSegment {
  color: string;
  dasharray: string;
  dashoffset: string;
}

interface Pin {
  key: string;
  left: string;
  top: string;
  color: string;
  title: string;
  onClick: () => void;
}

interface Cluster {
  key: string;
  left: string;
  top: string;
  size: string;
  fontSize: string;
  count: number;
  zoneLabel: string;
  title: string;
  ring: ClusterSegment[];
  onClick: () => void;
}

type Props = Record<string, never>;

/** Port of the Harta.dc.html logic: pins/clusters, layers, filters, zone drawing, side panel. */
export class HartaLogic extends DCLogic<Props, State> {
  _lastWheelAt = 0;

  state: State = {
    filtersOpen: true,
    filters: {
      statuses: [],
      priorities: [],
      categories: [],
      departments: [],
      zones: [],
      slaStates: [],
      flags: [],
      unassigned: false,
      periodPreset: '',
      periodFrom: '',
      periodTo: '',
    },
    layer: 'raporte',
    layersMenuOpen: false,
    zoom: 2,
    selectedId: null,
    selectedClusterKey: null,
    zonaMode: 'all',
    drawMode: false,
    drawPoints: [],
    customPolygon: null,
    comparePeriod: false,
    overrides: {},
  };

  componentDidMount() {
    const overrides = readJSON<CaseOverrides>(STORAGE_KEYS.caseOverrides, {});
    const patch: Partial<State> = { overrides };
    // one-shot deep link from Performanca: { zones, categories, departments }
    const focus = readJSON<HartaFocus | null>(STORAGE_KEYS.hartaFocus, null);
    remove(STORAGE_KEYS.hartaFocus);
    if (focus) {
      patch.filters = Object.assign({}, this.state.filters, {
        zones: focus.zones || [],
        categories: focus.categories || [],
        departments: focus.departments || [],
      });
      patch.filtersOpen = true;
      if (focus.zones && focus.zones.length) patch.zoom = 3;
    }
    this.setState(patch);
  }

  _select(id: string) {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }
  _filterLink(f: Record<string, string>) {
    return () => writeJSON(STORAGE_KEYS.incomingFilter, f);
  }
  _toggleFilters() {
    this.setState({ filtersOpen: !this.state.filtersOpen });
  }
  _setFilters(patch: Partial<Filters>) {
    this.setState({ filters: Object.assign({}, this.state.filters, patch) });
  }
  _toggleInList(key: ListKey, value: string) {
    const cur = this.state.filters[key] || [];
    const next = cur.indexOf(value) === -1 ? cur.concat([value]) : cur.filter((v) => v !== value);
    this._setFilters({ [key]: next });
  }
  _toggleFlag(value: string) {
    this._toggleInList('flags', value);
  }
  _clearAllFilters() {
    this.setState({
      filters: { statuses: [], priorities: [], categories: [], departments: [], zones: [], slaStates: [], flags: [], unassigned: false, periodPreset: '', periodFrom: '', periodTo: '' },
      zonaMode: 'all',
      customPolygon: null,
      drawMode: false,
      drawPoints: [],
      comparePeriod: false,
    });
  }
  _setLayer(l: Layer) {
    this.setState({ layer: l, layersMenuOpen: false });
  }
  _toggleLayersMenu() {
    this.setState({ layersMenuOpen: !this.state.layersMenuOpen });
  }
  _setZoom(z: number) {
    this.setState({ zoom: Math.max(1, Math.min(3, z)) });
  }
  _zoomIn() {
    this._setZoom(this.state.zoom + 1);
  }
  _zoomOut() {
    this._setZoom(this.state.zoom - 1);
  }
  /** Called from a native, non-passive wheel listener (see Harta.tsx). */
  _onWheel(e: { preventDefault(): void; deltaY: number }) {
    e.preventDefault();
    const now = Date.now();
    if (this._lastWheelAt && now - this._lastWheelAt < 350) return;
    this._lastWheelAt = now;
    if (e.deltaY < 0) this._zoomIn();
    else if (e.deltaY > 0) this._zoomOut();
  }
  _onMapDoubleClick() {
    if (!this.state.drawMode) this._zoomIn();
  }
  _selectReport(id: string) {
    this.setState({ selectedId: id, selectedClusterKey: null });
  }
  _selectCluster(key: string, zoomTo: number) {
    this.setState({ selectedClusterKey: key, selectedId: null, zoom: Math.max(this.state.zoom, zoomTo || this.state.zoom) });
  }
  /** Closing a cluster's drill-in also backs the grouping tier out again, so a
   * click-to-drill-in doesn't strand the map showing individual pins forever
   * (zoom/pan gestures no longer change this tier — only a cluster click does). */
  _closeSidePanel() {
    const wasCluster = !!this.state.selectedClusterKey;
    this.setState({ selectedId: null, selectedClusterKey: null, zoom: wasCluster ? 2 : this.state.zoom });
  }
  _setZonaMode(mode: ZonaMode) {
    if (mode === 'all') this.setState({ zonaMode: 'all', filters: Object.assign({}, this.state.filters, { zones: [] }), customPolygon: null, drawMode: false, drawPoints: [] });
    else if (mode === 'lagje') this.setState({ zonaMode: 'lagje', customPolygon: null, drawMode: false, drawPoints: [] });
    else this.setState({ zonaMode: 'custom' });
  }
  _startDraw() {
    this.setState({ drawMode: true, drawPoints: [], customPolygon: null });
  }
  _cancelDraw() {
    this.setState({ drawMode: false, drawPoints: [] });
  }
  _finishDraw() {
    if (this.state.drawPoints.length < 3) return;
    this.setState({ customPolygon: this.state.drawPoints.slice(), drawMode: false, drawPoints: [] });
  }
  _clearCustomZone() {
    this.setState({ customPolygon: null, zonaMode: 'all' });
  }
  _addVertex(e: ReactMouseEvent<HTMLElement>) {
    if (!this.state.drawMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    this.setState({ drawPoints: this.state.drawPoints.concat([{ x, y }]) });
  }
  _toggleCompare() {
    this.setState({ comparePeriod: !this.state.comparePeriod });
  }

  renderVals() {
    const S = SINJAL;
    const reports = S.reports || [];
    const NOW = S.now || new Date();
    const f = this.state.filters;
    const overrides = this.state.overrides;

    const all: Row[] = reports.map((r) => {
      const ov = overrides[r.id] || {};
      const eff = Object.assign({}, r, ov) as Report;
      return Object.assign({}, eff, {
        baseId: r.id,
        departmentName: S.deptName(eff.department),
        routingChanged: r.ai.suggestedDepartment !== S.deptName(eff.department),
      });
    });

    const zoneCoords = S.zoneCoords || {};
    const hashOf = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h;
    };
    const pinXY = (r: Row): Point => {
      const base = zoneCoords[r.zone] || { x: 50, y: 50 };
      const angle = (hashOf(r.id + 'a') % 360) * (Math.PI / 180);
      const radius = 4 + ((hashOf(r.id + 'r') % 100) / 100) * 6;
      const x = Math.min(95, Math.max(5, base.x + Math.cos(angle) * radius));
      const y = Math.min(93, Math.max(6, base.y + Math.sin(angle) * radius * 1.85));
      return { x: x, y: y };
    };

    const autoAssigned = (r: Row) => !!r.responsible && r.ai.confidence >= 80 && !r.routingChanged;
    const flagTest: Record<string, (r: Row) => boolean> = {
      reappeared: (r) => r.reappeared,
      duplicateCandidate: (r) => !!r.duplicateCandidateId,
      lowConfidence: (r) => r.ai.confidence < 60,
      routingChanged: (r) => r.routingChanged,
      autoAssigned: autoAssigned,
    };
    const slaTest: Record<string, (r: Row) => boolean> = {
      onTrack: (r) => r.slaRemainingHours !== null && !r.slaAtRisk && !r.slaBreached,
      atRisk: (r) => r.slaAtRisk,
      breached: (r) => r.slaBreached,
    };
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
      if (preset === '3m') {
        const start = new Date(NOW);
        start.setMonth(start.getMonth() - 3);
        return d >= start;
      }
      if (preset === 'custom') {
        if (fromStr && d < new Date(fromStr + 'T00:00:00')) return false;
        if (toStr && d > new Date(toStr + 'T23:59:59')) return false;
        return true;
      }
      return true;
    };

    const customPolygon = this.state.customPolygon;
    const pointInPolygon = (pt: Point, poly: Point[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x,
          yi = poly[i].y,
          xj = poly[j].x,
          yj = poly[j].y;
        const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const filtered = all.filter((r) => {
      if (f.statuses.length && f.statuses.indexOf(r.status) === -1) return false;
      if (f.priorities.length && f.priorities.indexOf(r.priority) === -1) return false;
      if (f.categories.length && f.categories.indexOf(r.category) === -1) return false;
      if (f.departments.length && f.departments.indexOf(r.department) === -1) return false;
      if (f.zones.length && f.zones.indexOf(r.zone) === -1) return false;
      if (f.slaStates.length && !f.slaStates.some((s) => slaTest[s] && slaTest[s](r))) return false;
      if (f.flags.length && !f.flags.some((fl) => flagTest[fl] && flagTest[fl](r))) return false;
      if (f.unassigned && (r.responsible || r.status === 'Dublikatë' || r.status === 'Refuzuar')) return false;
      if (f.periodPreset && !inPreset(r.submittedAt, f.periodPreset, f.periodFrom, f.periodTo)) return false;
      if (customPolygon && customPolygon.length >= 3 && !pointInPolygon(pinXY(r), customPolygon)) return false;
      return true;
    });

    // Map tiers use the app-wide status vocabulary (S.tone / S.statusMeta),
    // so a pin is the same colour as that case's status pill everywhere else.
    const T = S.tone;
    const TIER_COLORS: Record<TierKey, string> = { reappeared: T.reappeared, urgent: T.critical, new: T.fresh, progress: T.warning, resolved: T.success, review: T.pending };
    const TIER_LABELS: Record<TierKey, string> = {
      urgent: 'Urgjente / SLA në rrezik',
      new: 'Të reja',
      progress: 'Në punë / në pritje',
      resolved: 'Zgjidhura',
      reappeared: 'Rishfaqur',
      review: 'Në shqyrtim / caktuar',
    };
    const TIER_ORDER: TierKey[] = ['urgent', 'progress', 'new', 'review', 'resolved', 'reappeared'];
    const mapTierKey = (r: Row): TierKey => {
      if (r.reappeared) return 'reappeared';
      if (r.slaBreached || r.priority === 'Urgjente') return 'urgent';
      const meta = S.statusMeta[r.status];
      return (meta && meta.tier) || 'review';
    };
    const DEPT_COLORS: Record<DeptId, string> = { infra: '#B5533E', sherbime: '#3B6FA8', mjedis: '#4E8C5B', ndricim: '#C9932B', uje: '#6B5CA5' };
    const layer = this.state.layer;
    const pinColor = (r: Row) => {
      if (layer === 'departamentet') return DEPT_COLORS[r.department] || '#6B665F';
      if (layer === 'sla') {
        if (r.slaBreached) return '#C23B31';
        if (r.slaAtRisk) return '#B8860B';
        return r.slaRemainingHours === null ? '#8A847C' : '#2E7D4F';
      }
      return TIER_COLORS[mapTierKey(r)];
    };

    let legendItems: { color: string; label: string; count: number }[] = [];
    if (layer === 'departamentet') {
      legendItems = S.departments.map((d) => ({ color: DEPT_COLORS[d.id] || '#6B665F', label: d.name, count: filtered.filter((r) => r.department === d.id).length }));
    } else if (layer === 'sla') {
      legendItems = [
        { color: '#C23B31', label: 'Tejkaluar', count: filtered.filter((r) => r.slaBreached).length },
        { color: '#B8860B', label: 'Në rrezik', count: filtered.filter((r) => r.slaAtRisk).length },
        { color: '#2E7D4F', label: 'Brenda afatit', count: filtered.filter((r) => r.slaRemainingHours !== null && !r.slaAtRisk && !r.slaBreached).length },
      ];
    } else if (layer !== 'intensiteti') {
      legendItems = TIER_ORDER.map((k) => ({ color: TIER_COLORS[k], label: TIER_LABELS[k], count: filtered.filter((r) => mapTierKey(r) === k).length }));
    }

    const zoom = this.state.zoom;
    const heatLayerShow = layer === 'intensiteti';
    const pinsLayerShow = !heatLayerShow;

    // A cluster marker is a small donut: one arc per color group present in
    // the group, sized to that group's share — so "10 raporte" reads as,
    // say, a mostly-red ring (urgent-heavy) at a glance, instead of a flat
    // number that hides what's actually grouped there. It groups by
    // pinColor(r), the same function that colors individual pins, so the
    // ring always matches whichever layer (status tier / department / SLA)
    // is active rather than being locked to one scheme. Built with the SVG
    // pathLength=100 trick (same points-string-through-a-hole pattern
    // already used for the draw-a-zone polygon below).
    const clusterRing = (list: Row[]): ClusterSegment[] => {
      const byColor: Record<string, number> = {};
      const order: string[] = [];
      list.forEach((r) => {
        const c = pinColor(r);
        if (!byColor[c]) {
          byColor[c] = 0;
          order.push(c);
        }
        byColor[c]++;
      });
      const total = list.length || 1;
      let acc = 0;
      return order.map((c) => {
        const pct = (byColor[c] / total) * 100;
        const seg = { color: c, dasharray: pct.toFixed(2) + ' 100', dashoffset: (-acc).toFixed(2) };
        acc += pct;
        return seg;
      });
    };
    const clusterFontSize = (sizePx: number) => Math.max(12, Math.min(20, Math.round(sizePx * 0.32))) + 'px';

    let pins: Pin[] = [];
    const clusters: Cluster[] = [];
    if (pinsLayerShow) {
      if (zoom >= 3) {
        pins = filtered.map((r) => {
          const xy = pinXY(r);
          return { key: r.baseId, left: xy.x.toFixed(1) + '%', top: xy.y.toFixed(1) + '%', color: pinColor(r), title: r.displayId + ' · ' + r.title, onClick: () => this._selectReport(r.baseId) };
        });
      } else if (zoom === 2) {
        const byZone: Record<string, Row[]> = {};
        filtered.forEach((r) => {
          (byZone[r.zone] = byZone[r.zone] || []).push(r);
        });
        Object.keys(byZone).forEach((zone) => {
          const list = byZone[zone];
          if (list.length === 1) {
            const r = list[0];
            const xy = pinXY(r);
            pins.push({
              key: r.baseId,
              left: xy.x.toFixed(1) + '%',
              top: xy.y.toFixed(1) + '%',
              color: pinColor(r),
              title: r.displayId + ' · ' + r.title,
              onClick: () => this._selectReport(r.baseId),
            });
          } else {
            const coord = zoneCoords[zone] || { x: 50, y: 50 };
            const size = Math.min(78, 46 + Math.round(Math.sqrt(list.length) * 7));
            const key = 'zone:' + zone;
            clusters.push({
              key: key,
              left: coord.x + '%',
              top: coord.y + '%',
              size: size + 'px',
              fontSize: clusterFontSize(size),
              count: list.length,
              zoneLabel: zone,
              title: list.length + ' raporte · ' + zone,
              ring: clusterRing(list),
              onClick: () => this._selectCluster(key, 3),
            });
          }
        });
      } else {
        if (filtered.length > 0) {
          let sx = 0,
            sy = 0;
          filtered.forEach((r) => {
            const c = zoneCoords[r.zone] || { x: 50, y: 50 };
            sx += c.x;
            sy += c.y;
          });
          const cx = sx / filtered.length,
            cy = sy / filtered.length;
          const size = Math.min(96, 56 + Math.round(Math.sqrt(filtered.length) * 6));
          clusters.push({
            key: 'city',
            left: cx + '%',
            top: cy + '%',
            size: size + 'px',
            fontSize: clusterFontSize(size),
            count: filtered.length,
            zoneLabel: 'Elbasan',
            title: filtered.length + ' raporte · Elbasan',
            ring: clusterRing(filtered),
            onClick: () => this._selectCluster('city', 2),
          });
        }
      }
    }

    let heatBlobs: { key: string; left: string; top: string; size: string; bg: string }[] = [];
    if (heatLayerShow) {
      const severity = (r: Row) => (S.priorityMeta[r.priority] ? S.priorityMeta[r.priority].weight : 0) + (r.slaBreached ? 2 : 0) + (r.slaAtRisk ? 1 : 0) + 1;
      const scores: Record<string, number> = {};
      S.zones.forEach((z) => {
        scores[z] = 0;
      });
      filtered.forEach((r) => {
        scores[r.zone] = (scores[r.zone] || 0) + severity(r);
      });
      const maxScore = Math.max(
        1,
        Math.max.apply(
          null,
          S.zones.map((z) => scores[z]),
        ),
      );
      heatBlobs = S.zones
        .filter((z) => scores[z] > 0)
        .map((z) => {
          const t = scores[z] / maxScore;
          const coord = zoneCoords[z] || { x: 50, y: 50 };
          const size = Math.round(20 + t * 36);
          const alpha = (0.18 + t * 0.5).toFixed(2);
          return { key: z, left: coord.x + '%', top: coord.y + '%', size: size + '%', bg: 'radial-gradient(circle, rgba(194,59,49,' + alpha + ') 0%, rgba(194,59,49,0) 70%)' };
        });
    }

    const zoomLabels: Record<number, string> = { 1: 'Qyteti', 2: 'Zonat', 3: 'Detaje' };
    const zoomLabel = zoomLabels[zoom] || '';
    const zoomInDisabledClass = zoom >= 3 ? 'is-disabled' : '';
    const zoomOutDisabledClass = zoom <= 1 ? 'is-disabled' : '';
    const mapScale = zoom === 1 ? 1 : zoom === 2 ? 1.05 : 1.1;
    const mapTransform = 'scale(' + mapScale + ')';

    const mkGroup = (key: ListKey, options: { value: string; label: string }[]) =>
      options.map((o) => {
        const isOn = (f[key] || []).indexOf(o.value) !== -1;
        return { value: o.value, label: o.label, isOn: isOn, onClass: isOn ? 'is-on' : '', onClick: () => this._toggleInList(key, o.value) };
      });

    const statusItems = [
      { value: 'I ri', label: 'Të reja' },
      { value: 'Në shqyrtim', label: 'Në shqyrtim' },
      { value: 'Në punë', label: 'Në punë' },
      { value: 'Zgjidhur', label: 'Zgjidhur' },
      { value: 'Mbyllur', label: 'Mbyllur' },
    ].map((o) => {
      const isOn = f.statuses.indexOf(o.value) !== -1;
      return { value: o.value, label: o.label, isOn: isOn, onClass: isOn ? 'is-on' : '', onClick: () => this._toggleInList('statuses', o.value) };
    });
    const reappearedOn = f.flags.indexOf('reappeared') !== -1;
    statusItems.push({ value: 'reappeared', label: 'Rishfaqur', isOn: reappearedOn, onClass: reappearedOn ? 'is-on' : '', onClick: () => this._toggleFlag('reappeared') });
    statusItems.push({ value: 'unassigned', label: 'Pa caktuar', isOn: f.unassigned, onClass: f.unassigned ? 'is-on' : '', onClick: () => this._setFilters({ unassigned: !f.unassigned }) });

    const priorityItems = mkGroup(
      'priorities',
      S.priorityOrder.map((p) => ({ value: p, label: p })),
    );
    const departmentItems = mkGroup(
      'departments',
      S.departments.map((d) => ({ value: d.id, label: d.name })),
    );
    const catSource = f.departments.length ? S.categories.filter((c) => f.departments.indexOf(c.dept) !== -1) : S.categories;
    const categoryItems = mkGroup(
      'categories',
      catSource.map((c) => ({ value: c.id, label: c.label })),
    );
    const slaItems = mkGroup('slaStates', [
      { value: 'onTrack', label: 'Brenda afatit' },
      { value: 'atRisk', label: 'Në rrezik' },
      { value: 'breached', label: 'Tejkaluar' },
    ]);

    const automationDefs = [
      { value: 'autoAssigned', label: 'Caktuar automatikisht' },
      { value: 'routingChanged', label: 'Rishpërndarë nga stafi' },
      { value: 'duplicateCandidate', label: 'Dublikatë e mundshme' },
      { value: 'lowConfidence', label: 'Kërkon shqyrtim njerëzor' },
      { value: 'reappeared', label: 'Rishfaqur' },
    ];
    const automationItems = automationDefs.map((o) => {
      const isOn = f.flags.indexOf(o.value) !== -1;
      return { value: o.value, label: o.label, isOn: isOn, onClass: isOn ? 'is-on' : '', onClick: () => this._toggleFlag(o.value) };
    });

    const periodPresets = [
      { value: '', label: 'Gjithmonë' },
      { value: 'today', label: 'Sot' },
      { value: '7d', label: '7 ditë' },
      { value: '30d', label: '30 ditë' },
      { value: '3m', label: '3 muaj' },
      { value: 'custom', label: 'Personalizuar' },
    ].map((o) => ({ value: o.value, label: o.label, onClass: f.periodPreset === o.value ? 'is-on' : '', onClick: () => this._setFilters({ periodPreset: o.value }) }));

    const zonaModes = [
      { value: 'all', label: 'Gjithë qyteti' },
      { value: 'lagje', label: 'Lagjja' },
      { value: 'custom', label: 'Zonë e personalizuar' },
    ].map((o) => ({ value: o.value, label: o.label, onClass: this.state.zonaMode === o.value ? 'is-on' : '', onClick: () => this._setZonaMode(o.value as ZonaMode) }));
    const zoneItems = mkGroup(
      'zones',
      S.zones.map((z) => ({ value: z, label: z })),
    );

    const drawMode = this.state.drawMode;
    const drawPoints = this.state.drawPoints;
    const drawPointsStr = drawPoints.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const drawDots = drawPoints.map((p) => ({ cx: p.x.toFixed(1), cy: p.y.toFixed(1) }));
    const customPolygonStr = customPolygon ? customPolygon.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') : '';

    const activeFilterN =
      f.statuses.length +
      f.priorities.length +
      f.categories.length +
      f.departments.length +
      f.zones.length +
      f.slaStates.length +
      f.flags.length +
      (f.unassigned ? 1 : 0) +
      (f.periodPreset ? 1 : 0) +
      (customPolygon ? 1 : 0);

    const summary = {
      total: filtered.length,
      progress: filtered.filter((r) => r.status === 'Në punë' || r.status === 'Caktuar').length,
      urgent: filtered.filter((r) => r.priority === 'Urgjente').length,
      slaRisk: filtered.filter((r) => r.slaAtRisk || r.slaBreached).length,
      resolved: filtered.filter((r) => r.status === 'Zgjidhur' || r.status === 'Mbyllur').length,
    };

    let compare = { show: false, hasData: false, text: '', color: '#8A847C' };
    if (this.state.comparePeriod && f.periodPreset && f.periodPreset !== 'custom') {
      const spans: Record<string, number> = { today: 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000, '3m': 90 * 86400000 };
      const spanMs = spans[f.periodPreset] || 0;
      if (spanMs) {
        const curStart = new Date(NOW.getTime() - spanMs);
        const prevStart = new Date(NOW.getTime() - spanMs * 2);
        const curCount = all.filter((r) => r.submittedAt >= curStart && r.submittedAt <= NOW).length;
        const prevCount = all.filter((r) => r.submittedAt >= prevStart && r.submittedAt < curStart).length;
        if (prevCount > 0) {
          const pct = Math.round(((curCount - prevCount) / prevCount) * 100);
          compare = { show: true, hasData: true, text: (pct >= 0 ? '+' : '') + pct + '% raporte krahasuar me periudhën e mëparshme', color: pct > 0 ? '#C23B31' : pct < 0 ? '#2E7D4F' : '#6B665F' };
        } else {
          compare = { show: true, hasData: false, text: 'S’ka mjaftueshëm të dhëna historike për krahasim.', color: '#8A847C' };
        }
      }
    }

    let sidePanelShow = false,
      sidePanelIsReport = false,
      sidePanelIsCluster = false;
    let sidePanelReport = {
      id: '',
      title: '',
      zone: '',
      address: '',
      statusBg: '',
      statusInk: '',
      statusDot: '',
      status: '',
      priority: '',
      priorityColor: '',
      department: '',
      responsible: '',
      sla: '',
      slaColor: '',
      description: '',
      photo: '',
      submittedLabel: '',
      onOpen: () => {},
    };
    let sidePanelCluster: { label: string; count: number; breakdown: { color: string; label: string; count: number }[]; onViewList: () => void } = {
      label: '',
      count: 0,
      breakdown: [],
      onViewList: () => {},
    };
    let nearby: { key: string; id: string; title: string; onClick: () => void }[] = [];
    if (this.state.selectedId) {
      const r = all.filter((x) => x.baseId === this.state.selectedId)[0];
      if (r) {
        sidePanelShow = true;
        sidePanelIsReport = true;
        const xy = pinXY(r);
        const near = all
          .filter((x) => x.baseId !== r.baseId)
          .map((x) => ({ r: x, d: Math.sqrt(Math.pow(pinXY(x).x - xy.x, 2) + Math.pow(pinXY(x).y - xy.y, 2)) }))
          .filter((o) => o.d <= 12)
          .sort((a, b) => a.d - b.d)
          .slice(0, 4);
        nearby = near.map((n) => ({ key: n.r.baseId, id: n.r.displayId, title: n.r.title, onClick: this._select(n.r.baseId) }));
        sidePanelReport = {
          id: r.displayId,
          title: r.title,
          zone: r.zone,
          address: r.address,
          statusBg: S.statusMeta[r.status].bg,
          statusInk: S.statusMeta[r.status].ink,
          statusDot: S.statusMeta[r.status].dot,
          status: r.status,
          priority: r.priority,
          priorityColor: S.priorityMeta[r.priority].color,
          department: r.departmentName,
          responsible: r.responsibleName || 'Pa caktuar',
          sla: r.slaLabel,
          slaColor: r.slaBreached ? '#C23B31' : r.slaAtRisk ? '#B8860B' : '#6B665F',
          description: r.description,
          photo: r.photo,
          submittedLabel: r.submittedLabel,
          onOpen: this._select(r.baseId),
        };
      }
    } else if (this.state.selectedClusterKey) {
      const key = this.state.selectedClusterKey;
      let list: Row[] = [];
      let label = '';
      if (key === 'city') {
        list = filtered;
        label = 'Elbasan';
      } else {
        const zone = key.slice(5);
        list = filtered.filter((r) => r.zone === zone);
        label = zone;
      }
      if (list.length > 0) {
        sidePanelShow = true;
        sidePanelIsCluster = true;
        const breakdown = TIER_ORDER.map((k) => ({ color: TIER_COLORS[k], label: TIER_LABELS[k], count: list.filter((r) => mapTierKey(r) === k).length })).filter((b) => b.count > 0);
        sidePanelCluster = { label: label, count: list.length, breakdown: breakdown, onViewList: this._filterLink(key === 'city' ? {} : { zone: label }) };
      }
    }

    const layers = [
      { value: 'raporte', label: 'Raporte' },
      { value: 'intensiteti', label: 'Intensiteti' },
      { value: 'departamentet', label: 'Departamentet' },
      { value: 'sla', label: 'SLA' },
    ].map((o) => ({
      value: o.value,
      label: o.label,
      isActive: layer === o.value,
      onClass: layer === o.value ? 'is-on' : '',
      isRaporte: o.value === 'raporte',
      isIntensiteti: o.value === 'intensiteti',
      isDepartamentet: o.value === 'departamentet',
      isSla: o.value === 'sla',
      onClick: () => this._setLayer(o.value as Layer),
    }));

    return {
      filtersOpen: this.state.filtersOpen,
      filtersClosed: !this.state.filtersOpen,
      onToggleFilters: () => this._toggleFilters(),
      onClearAllFilters: () => this._clearAllFilters(),
      activeFilterBadge: { show: activeFilterN > 0, n: activeFilterN },

      statusItems: statusItems,
      priorityItems: priorityItems,
      departmentItems: departmentItems,
      categoryItems: categoryItems,
      slaItems: slaItems,
      automationItems: automationItems,

      periodPresets: periodPresets,
      periodCustomShow: f.periodPreset === 'custom',
      periodFrom: f.periodFrom,
      periodTo: f.periodTo,
      onPeriodFrom: (e: InputEvent) => this._setFilters({ periodFrom: e.target.value }),
      onPeriodTo: (e: InputEvent) => this._setFilters({ periodTo: e.target.value }),
      comparePeriod: this.state.comparePeriod,
      compareClass: this.state.comparePeriod ? 'is-on' : '',
      onToggleCompare: () => this._toggleCompare(),

      zonaModes: zonaModes,
      zonaListShow: this.state.zonaMode === 'lagje',
      zonaDrawShow: this.state.zonaMode === 'custom',
      zoneItems: zoneItems,
      drawMode: drawMode,
      drawModeOff: !drawMode,
      drawHint: drawMode
        ? 'Kliko në hartë për të shtuar pika, pastaj "Përfundo zonën".'
        : customPolygon
          ? 'Zona e personalizuar është aktive.'
          : 'Vizato një zonë të lirë në hartë për të filtruar raportet brenda saj.',
      onStartDraw: () => this._startDraw(),
      onCancelDraw: () => this._cancelDraw(),
      onFinishDraw: () => this._finishDraw(),
      finishDisabledClass: drawPoints.length < 3 ? 'is-disabled' : '',
      customZoneActiveShow: !!customPolygon,
      onClearCustomZone: () => this._clearCustomZone(),

      legendItems: legendItems,
      zoomLabel: zoomLabel,
      zoomInDisabledClass: zoomInDisabledClass,
      zoomOutDisabledClass: zoomOutDisabledClass,
      onZoomIn: () => this._zoomIn(),
      onZoomOut: () => this._zoomOut(),
      onZoomWrapClick: (e: ReactMouseEvent) => e.stopPropagation(),

      mapTransform: mapTransform,
      onMapClick: (e: ReactMouseEvent<HTMLElement>) => this._addVertex(e),
      onMapWheel: (e: WheelEvent) => this._onWheel(e),
      onMapDoubleClick: () => this._onMapDoubleClick(),
      heatLayerShow: heatLayerShow,
      heatBlobs: heatBlobs,
      pinsLayerShow: pinsLayerShow,
      pins: pins,
      clusters: clusters,
      drawOverlayShow: drawMode,
      drawPolylineShow: drawPoints.length >= 2,
      drawPointsStr: drawPointsStr,
      drawDots: drawDots,
      drawPointCount: drawPoints.length,
      drawBannerShow: drawMode,
      customPolygonShow: !!customPolygon && customPolygon.length >= 3,
      customPolygonStr: customPolygonStr,
      customPolygonPoints: customPolygon || [],

      layers: layers,
      layersMenuShow: this.state.layersMenuOpen,
      layersMenuBtnClass: this.state.layersMenuOpen ? 'is-on' : '',
      onToggleLayersMenu: () => this._toggleLayersMenu(),

      sidePanelShow: sidePanelShow,
      sidePanelIsReport: sidePanelIsReport,
      sidePanelIsCluster: sidePanelIsCluster,
      sidePanelReport: sidePanelReport,
      sidePanelCluster: sidePanelCluster,
      nearby: nearby,
      nearbyShow: nearby.length > 0,
      onCloseSidePanel: () => this._closeSidePanel(),

      summary: summary,
      compare: compare,
    };
  }
}
