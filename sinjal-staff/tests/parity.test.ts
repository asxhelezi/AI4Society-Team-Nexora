// Compares each ported logic class with the design's own logic: for the same
// storage state, the port's renderVals() must carry every value the design's
// renderVals() produces (the port may add fields, such as React keys).
import { beforeEach, describe, it } from 'vitest';
import { NotificationBellLogic } from '../src/components/notifications/NotificationBellLogic';
import { type NavKey, SidebarLogic } from '../src/components/sidebar/SidebarLogic';
import { AutomatizimetLogic } from '../src/screens/automatizimet/AutomatizimetLogic';
import { DepartamentetLogic } from '../src/screens/departamentet/DepartamentetLogic';
import { HartaLogic } from '../src/screens/harta/HartaLogic';
import { KreuLogic } from '../src/screens/kreu/KreuLogic';
import { PerformancaLogic } from '../src/screens/performanca/PerformancaLogic';
import { RaportiLogic } from '../src/screens/raporti/RaportiLogic';
import { RaportetLogic } from '../src/screens/raportet/RaportetLogic';
import { designComponent, designWindow, expectSuperset, type Loose } from './design-harness';

beforeEach(() => window.localStorage.clear());

/** Writes the same storage entry for both the app and the design sandbox. */
function setBoth(w: Loose, key: string, value: unknown) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  window.localStorage.setItem(key, raw);
  w.localStorage.setItem(key, raw);
}

const OVERRIDES = { '02481': { status: 'Zgjidhur' }, '02479': { responsible: 'dsula', department: 'ndricim' }, '02472': { priority: 'Urgjente' } };

describe('parity with design logic', () => {
  it('Sidebar', () => {
    const w = designWindow();
    const Design = designComponent('Sidebar.dc.html', w);
    for (const k of ['kreu', 'harta', 'performanca'] as NavKey[]) {
      expectSuperset(new SidebarLogic({ active: k }).renderVals(), new Design({ active: k }).renderVals());
    }
  });

  it('NotificationBell, across tabs and after mark-all', () => {
    const w = designWindow();
    const Design = designComponent('NotificationBell.dc.html', w);
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new NotificationBellLogic();
    ours.componentDidMount();
    for (const action of ['onTabAll', 'onTabAction', 'onTabUnread', 'onMarkAll'] as const) {
      theirs.renderVals()[action]();
      ours.renderVals()[action]();
      expectSuperset(ours.renderVals(), theirs.renderVals());
    }
  });

  it('Kreu, with and without case overrides', () => {
    const w = designWindow();
    const Design = designComponent('Main.dc.html', w);
    expectSuperset(new KreuLogic().renderVals(), new Design({}).renderVals());
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    expectSuperset(new KreuLogic().renderVals(), new Design({}).renderVals());
  });

  it('Raportet, through incoming filters, sorting, paging and bulk edits', () => {
    const w = designWindow();
    const Design = designComponent('Raportet.dc.html', w);
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    setBoth(w, 'sinjal_incoming_filter', { slaFlag: true });
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new RaportetLogic();
    ours.componentDidMount();
    const check = () => expectSuperset(ours.renderVals(), theirs.renderVals());
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      check();
    };
    check();
    both((v) => v.onClearAll());
    for (const key of ['urgency', 'priority', 'oldest', 'slaSoon', 'updated', 'resolutionTime']) {
      both((v) => v.sortOptions.find((o: Loose) => o.value === key).onClick());
      both((v) => v.pagination.onNext());
    }
    both((v) => v.onSearch({ target: { value: 'rrugë' } }));
    both((v) => v.onClearAll());
    both((v) => v.filterGroups[4].items[1].onClick());
    both((v) => v.reportedPresets[1].onClick());
    both((v) => v.onClearAll());
    both((v) => v.rows[0].onToggleSelect());
    both((v) => v.rows[3].onToggleSelect());
    both((v) => v.bulkBar.onPriority({ target: { value: 'E ulët' } }));
    both((v) => v.bulkBar.onStatus({ target: { value: 'Mbyllur' } }));
    both((v) => v.bulkBar.onConfirm());
  });

  it('Raporti, for every seeded case and through its actions', () => {
    const w = designWindow();
    const Design = designComponent('Raporti.dc.html', w);
    for (const r of w.SINJAL.reports) {
      setBoth(w, 'sinjal_selected_report', r.id);
      const theirs = new Design({});
      theirs.componentDidMount();
      const ours = new RaportiLogic();
      ours.componentDidMount();
      expectSuperset(ours.renderVals(), theirs.renderVals());
    }

    setBoth(w, 'sinjal_selected_report', '02480');
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new RaportiLogic();
    ours.componentDidMount();
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      expectSuperset(ours.renderVals(), theirs.renderVals());
    };
    both((v) => v.assign.onOpen());
    both((v) => v.assign.onDept({ target: { value: 'ndricim' } }));
    both((v) => v.assign.onResp({ target: { value: 'dsula' } }));
    both((v) => v.assign.onReason({ target: { value: 'Shtylla e ndriçimit' } }));
    both((v) => v.assign.onSave());
    both((v) => v.sla.onEscalate());
    both((v) => v.onOpenRequest());
    both((v) => v.requestTemplates[0].onClick());
    both((v) => v.dept.onDraft({ target: { value: 'Ekipi në terren' } }));
    both((v) => v.dept.onAdd());
    both((v) => v.statusCtl.onChange({ target: { value: 'Zgjidhur' } }));
    both((v) => v.statusCtl.onSave());
    both((v) => v.verify.onAccept());
    both((v) => v.actions[0].onClick());
    both((v) => v.onReopenReason({ target: { value: 'Problemi u rishfaq' } }));
    both((v) => v.onConfirmReopen());
    both((v) => v.linked.items[0].onClick());
  });

  it('Harta, across zoom levels, layers, filters, a drawn zone and the side panel', () => {
    const w = designWindow();
    const Design = designComponent('Harta.dc.html', w);
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    setBoth(w, 'sinjal_harta_focus', { zones: ['Qendër'], categories: ['gropa'] });
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new HartaLogic();
    ours.componentDidMount();
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      expectSuperset(ours.renderVals(), theirs.renderVals());
    };
    expectSuperset(ours.renderVals(), theirs.renderVals());
    both((v) => v.onClearAllFilters());
    for (const zoomStep of ['onZoomOut', 'onZoomOut', 'onZoomIn', 'onZoomIn']) {
      both((v) => v[zoomStep]());
      for (const layer of [1, 2, 3, 0]) both((v) => v.layers[layer].onClick());
    }
    both((v) => v.pins[0].onClick());
    both((v) => v.onCloseSidePanel());
    both((v) => v.onZoomOut());
    both((v) => v.clusters[0].onClick());
    both((v) => v.statusItems[5].onClick());
    both((v) => v.priorityItems[3].onClick());
    both((v) => v.onClearAllFilters());
    both((v) => v.periodPresets[3].onClick());
    both((v) => v.onToggleCompare());
    both((v) => v.zonaModes[2].onClick());
    both((v) => v.onStartDraw());
    const rect = { left: 0, top: 0, width: 1000, height: 1000 };
    for (const [x, y] of [
      [300, 300],
      [700, 300],
      [700, 700],
      [300, 700],
    ]) {
      both((v) => v.onMapClick({ clientX: x, clientY: y, currentTarget: { getBoundingClientRect: () => rect } }));
    }
    both((v) => v.onFinishDraw());
  });

  it('Departamentet, overview and every department workspace, with actions', () => {
    const w = designWindow();
    const Design = designComponent('Departamentet.dc.html', w);
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new DepartamentetLogic();
    ours.componentDidMount();
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      expectSuperset(ours.renderVals(), theirs.renderVals());
    };
    expectSuperset(ours.renderVals(), theirs.renderVals());
    both((v) => v.onOpenAddRule());
    both((v) => v.onRuleCategory({ target: { value: 'gropa' } }));
    both((v) => v.onRuleDept({ target: { value: 'uje' } }));
    both((v) => v.onRulePriority({ target: { value: 'Urgjente' } }));
    // the new rule's id comes from Date.now(); compare before saving only
    for (let i = 0; i < 5; i++) {
      both((v) => v.deptCards[i].onClick());
      for (const tab of [0, 1, 2, 3]) both((v) => v.tabs[tab].onClick());
      both((v) => v.tabs[2].onClick());
      both((v) => v.detail.team.length && v.detail.team[0].onClick());
      both((v) => v.detail.unassignedCases.length && v.detail.unassignedCases[0].candidates[0].onAssign());
      both((v) => v.onBack());
    }
  });

  it('Automatizimet, on every sub-screen and period, with case overrides', () => {
    const w = designWindow();
    const Design = designComponent('Automatizimet.dc.html', w);
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new AutomatizimetLogic();
    ours.componentDidMount();
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      expectSuperset(ours.renderVals(), theirs.renderVals());
    };
    expectSuperset(ours.renderVals(), theirs.renderVals());
    const nav: [number, number][] = theirs.renderVals().nav.flatMap((grp: Loose, g: number) => grp.items.map((_: Loose, i: number) => [g, i]));
    for (const period of [0, 1]) {
      both((v) => v.periods[period].onClick());
      for (const [g, i] of nav) both((v) => v.nav[g].items[i].onClick());
    }
  });

  it('Performanca, for both roles, every period and every sub-screen', () => {
    const w = designWindow();
    const Design = designComponent('Performanca.dc.html', w);
    setBoth(w, 'sinjal_case_overrides', OVERRIDES);
    const theirs = new Design({});
    theirs.componentDidMount();
    const ours = new PerformancaLogic();
    ours.componentDidMount();
    const both = (f: (v: Loose) => void) => {
      f(theirs.renderVals());
      f(ours.renderVals());
      expectSuperset(ours.renderVals(), theirs.renderVals());
    };
    expectSuperset(ours.renderVals(), theirs.renderVals());
    const roles = theirs.renderVals().roleChips.length;
    for (let role = 0; role < roles; role++) {
      both((v) => v.roleChips[role].onClick());
      const periods = theirs.renderVals().periods.length;
      for (let p = 0; p < periods; p++) {
        both((v) => v.periods[p].onClick());
        const navCount = theirs.renderVals().nav.length;
        for (let n = 0; n < navCount; n++) both((v) => v.nav[n].onClick());
      }
    }
  }, 30_000);
});
