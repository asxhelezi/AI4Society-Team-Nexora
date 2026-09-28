const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..', 'design');

function makeLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _dump: () => store,
  };
}

function extractComponentScript(src) {
  const m = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no component script found');
  return m[1];
}

function extractDataProps(src) {
  const m = src.match(/data-props='([^']*)'/);
  if (!m) return {};
  const raw = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const props = JSON.parse(raw);
  const out = {};
  Object.keys(props).forEach((k) => { if (k !== '$preview' && props[k] && 'default' in props[k]) out[k] = props[k].default; });
  return out;
}

function loadComponent(file, sandbox) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const code = extractComponentScript(src);
  const ctx = vm.createContext(sandbox);
  vm.runInContext('class DCLogic { constructor(props){ this.props = props || {}; this.state = this.state || {}; } setState(p){ this.state = Object.assign({}, this.state, typeof p === "function" ? p(this.state) : p); } }\n' + code + '\n this._Component = Component;', ctx);
  return { Component: ctx._Component, props: extractDataProps(src) };
}

function run(label, fn) {
  try {
    fn();
    console.log('PASS  ' + label);
  } catch (e) {
    console.log('FAIL  ' + label + '  ->  ' + (e && e.stack ? e.stack.split('\n').slice(0,3).join(' | ') : e));
    process.exitCode = 1;
  }
}

// shared window w/ mock-data loaded
function freshWindow() {
  const w = { localStorage: makeLocalStorage() };
  const ctx = vm.createContext({ window: w });
  const dataSrc = fs.readFileSync(path.join(DIR, 'mock-data.js'), 'utf8');
  vm.runInContext(dataSrc, ctx);
  return w;
}

// ---- Sidebar ----
run('Sidebar renders for each active key', () => {
  const w = freshWindow();
  const { Component, props } = loadComponent('Sidebar.dc.html', { window: w });
  ['kreu','raportet','harta','departamentet','automatizimet','performanca'].forEach((k) => {
    const inst = new Component(Object.assign({}, props, { active: k }));
    const vals = inst.renderVals();
    if (!vals.navKreu || !vals.navRaportet) throw new Error('missing nav state for ' + k);
  });
});

// ---- NotificationBell ----
run('NotificationBell renders, tabs, mark-all-read', () => {
  const w = freshWindow();
  const { Component, props } = loadComponent('NotificationBell.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount && inst.componentDidMount();
  let vals = inst.renderVals();
  if (typeof vals.unreadCount !== 'number' && vals.unreadCount !== '9+') throw new Error('bad unreadCount: ' + vals.unreadCount);
  vals.onToggle();
  vals = inst.renderVals();
  if (!vals.open) throw new Error('bell did not open');
  vals.onTabAction();
  vals = inst.renderVals();
  if (vals.rows.some((r) => !r.linkable && !r.notLinkable)) throw new Error('row linkable flags broken');
  const beforeAll = vals.rows.filter((r) => r.unread).length;
  vals.onMarkAll();
  vals = inst.renderVals();
  const afterAll = vals.rows.filter((r) => r.unread).length;
  if (afterAll !== 0) throw new Error('mark-all-read did not clear unread, still ' + afterAll);
  if (beforeAll === 0) throw new Error('test fixture had nothing unread to begin with');
});

// ---- Sidebar profile menu ----
run('Sidebar profile menu toggles open state', () => {
  const w = freshWindow();
  const { Component, props } = loadComponent('Sidebar.dc.html', { window: w });
  const inst = new Component(props);
  let vals = inst.renderVals();
  if (vals.menuOpen) throw new Error('should start closed');
  vals.onToggleMenu();
  vals = inst.renderVals();
  if (!vals.menuOpen || vals.menuOpenAttr !== 'true') throw new Error('did not open');
  vals.onCloseMenu();
  vals = inst.renderVals();
  if (vals.menuOpen) throw new Error('did not close');
});

// ---- Kreu (Main.dc.html) ----
run('Kreu KPIs and attention items compute without throwing, counts sane', () => {
  const w = freshWindow();
  const { Component, props } = loadComponent('Main.dc.html', { window: w });
  const inst = new Component(props);
  const vals = inst.renderVals();
  const S = w.SINJAL;
  if (vals.kpiNew.count !== S.reports.filter((r) => r.status === 'I ri').length) throw new Error('kpiNew mismatch');
  if (typeof vals.kpiSla.sub !== 'string' || !vals.kpiSla.sub) throw new Error('kpiSla.sub missing');
  if (typeof vals.kpiDone.sub !== 'string' || !vals.kpiDone.sub) throw new Error('kpiDone.sub missing');
  if (!Array.isArray(vals.exceptionGroups)) throw new Error('exceptionGroups not an array');
  vals.exceptionGroups.forEach((g) => {
    if (typeof g.count !== 'number' || g.count <= 0) throw new Error('exception group count invalid: ' + JSON.stringify(g));
    if (!g.example || !g.example.id || typeof g.example.onClick !== 'function') throw new Error('exception group example malformed: ' + JSON.stringify(g));
  });
  if (vals.exceptionsNone !== (vals.exceptionGroups.length === 0)) throw new Error('exceptionsNone inconsistent with exceptionGroups');
  if (!Array.isArray(vals.deptTable) || vals.deptTable.length === 0) throw new Error('no deptTable rendered');
  vals.deptTable.forEach((d) => {
    if (d.active !== d.onSla + d.atRisk) throw new Error('deptTable active != onSla+atRisk: ' + JSON.stringify(d));
  });
  if (!Array.isArray(vals.trendDays) || vals.trendDays.length !== 7) throw new Error('trendDays should have 7 buckets');
  vals.trendDays.forEach((t) => {
    if (typeof t.pct !== 'number' || t.pct < 0 || t.pct > 100) throw new Error('trendDays pct out of range: ' + JSON.stringify(t));
  });
  if (!Array.isArray(vals.activityFeed) || vals.activityFeed.length === 0) throw new Error('no activityFeed rendered');
  // click a KPI, verify it writes the incoming filter
  vals.kpiUnassigned.onClick();
  const stored = JSON.parse(w.localStorage.getItem('sinjal_incoming_filter'));
  if (!stored.unassigned) throw new Error('kpi click did not persist filter');
  // click an activity row, verify selected-report persisted
  const firstActivity = vals.activityFeed[0];
  firstActivity.onClick();
  const sel = w.localStorage.getItem('sinjal_selected_report');
  if (!sel) throw new Error('activity row click did not persist selected report');

  // clicking a department-workload row (or the focus-department callout) should
  // persist sinjal_dept_focus so Departamentet.dc.html can deep-link straight in
  if (!Array.isArray(vals.deptTable) || !vals.deptTable[0].onClick) throw new Error('dept table row missing onClick handler');
  vals.deptTable[0].onClick();
  if (w.localStorage.getItem('sinjal_dept_focus') !== vals.deptTable[0].id) throw new Error('dept row click did not persist sinjal_dept_focus, got ' + w.localStorage.getItem('sinjal_dept_focus'));
  if (vals.focusDept) {
    if (!vals.focusDept.onClick) throw new Error('focus-dept callout missing onClick handler');
    w.localStorage.removeItem('sinjal_dept_focus');
    vals.focusDept.onClick();
    if (w.localStorage.getItem('sinjal_dept_focus') !== vals.focusDept.id) throw new Error('focus-dept callout click did not persist sinjal_dept_focus');
  }
});

// ---- Raportet ----
run('Raportet filters, sorts, search, incoming-filter, saved filters, bulk actions, persisted-state all work', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  w.localStorage.setItem('sinjal_incoming_filter', JSON.stringify({ slaBreached: true }));
  const { Component, props } = loadComponent('Raportet.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let vals = inst.renderVals();
  if ((inst.state.filters.slaStates || []).join(',') !== 'breached') throw new Error('incoming filter not translated: ' + JSON.stringify(inst.state.filters));
  const expectedBreached = S.reports.filter((r) => r.slaBreached).length;
  if (vals.filteredCount !== expectedBreached) throw new Error('breach filter row count mismatch: got ' + vals.filteredCount + ' expected ' + expectedBreached);
  if (w.localStorage.getItem('sinjal_incoming_filter') !== null) throw new Error('incoming filter was not cleared');
  if (!vals.activeFilterBadge.show || vals.activeFilterBadge.n !== 1) throw new Error('active filter badge wrong: ' + JSON.stringify(vals.activeFilterBadge));

  // clear, search
  vals.onClearAll();
  vals = inst.renderVals();
  if (vals.hasAnyFilter) throw new Error('clear-all left filters set');
  vals.onSearch({ target: { value: 'gropë'.toLowerCase() } });
  vals = inst.renderVals();
  if (vals.filteredCount === 0) throw new Error('search "gropë" matched nothing, expected some');
  vals.onSearch({ target: { value: '' } });
  vals = inst.renderVals();

  // sort: a custom button + panel (not a native select) — default is
  // "newest"; opening it and picking "oldest" must reverse the order and
  // close the panel, with the active row's class following the selection.
  // The list is paginated, so collect ids across every page to compare
  // the full sorted order, not just the first page's worth.
  const collectAllIds = () => {
    let v = inst.renderVals();
    const ids = v.rows.map((r) => r.id);
    while (v.pagination.canNext) {
      v.pagination.onNext();
      v = inst.renderVals();
      ids.push(...v.rows.map((r) => r.id));
    }
    return ids;
  };
  if (vals.sortLabel !== 'Më i riu') throw new Error('expected default sort label "Më i riu", got ' + vals.sortLabel);
  const idsNewest = collectAllIds();
  vals = inst.renderVals(); // collectAllIds walked to the last page; page number doesn't matter for opening the sort panel
  vals.onToggleSort();
  vals = inst.renderVals();
  if (!vals.sortOpen) throw new Error('sort panel did not open');
  const oldestOpt = vals.sortOptions.filter((o) => o.value === 'oldest')[0];
  if (!oldestOpt) throw new Error('missing "oldest" sort option');
  oldestOpt.onClick();
  vals = inst.renderVals();
  if (vals.sortOpen) throw new Error('choosing a sort option should close the panel');
  if (vals.sortLabel !== 'Më i vjetri') throw new Error('sort label did not update, got ' + vals.sortLabel);
  if (vals.pagination.page !== 1) throw new Error('changing sort did not reset to page 1, got ' + vals.pagination.page);
  const idsOldest = collectAllIds();
  if (idsNewest.join(',') === idsOldest.join(',')) throw new Error('sort change did not change order');
  if (idsOldest[0] !== idsNewest[idsNewest.length - 1]) throw new Error('oldest sort did not reverse newest sort: ' + idsOldest[0] + ' vs ' + idsNewest[idsNewest.length - 1]);
  vals = inst.renderVals();
  vals.sortOptions.filter((o) => o.value === 'newest')[0].onClick();
  vals = inst.renderVals();

  // row click persists selection
  vals.rows[0].onClick();
  if (!w.localStorage.getItem('sinjal_selected_report')) throw new Error('row click did not persist selected id');

  // quick chip "Rishfaqur" -> exactly the one seeded reappeared report
  const reappearedChip = vals.quickChips.filter((c) => c.label === 'Rishfaqur')[0];
  if (!reappearedChip) throw new Error('missing "Rishfaqur" quick chip');
  reappearedChip.onClick();
  vals = inst.renderVals();
  const expectedReappeared = S.reports.filter((r) => r.reappeared).length;
  if (vals.filteredCount !== expectedReappeared) throw new Error('reappeared chip row count mismatch: got ' + vals.filteredCount + ' expected ' + expectedReappeared);

  // persisted-state restore on a fresh mount (new component instance, same window/localStorage)
  const inst2 = new Component(props);
  inst2.componentDidMount();
  const vals2 = inst2.renderVals();
  if (vals2.filteredCount !== expectedReappeared) throw new Error('persisted filter state not restored on remount: got ' + vals2.filteredCount + ' expected ' + expectedReappeared);
  vals2.onClearAll();

  // saved filters: 3 defaults seeded on first mount, with live result counts
  if (vals2.savedFilterRows.length !== 3) throw new Error('expected 3 default saved filters, got ' + vals2.savedFilterRows.length);
  const slaRow = vals2.savedFilterRows.filter((sf) => sf.name === 'SLA në rrezik')[0];
  const expectedSlaFlagged = S.reports.filter((r) => r.slaAtRisk || r.slaBreached).length;
  if (!slaRow || slaRow.resultLabel !== expectedSlaFlagged + ' rezultate') throw new Error('saved-filter live count wrong: ' + JSON.stringify(slaRow) + ' expected ' + expectedSlaFlagged);
  slaRow.onApply();
  let v2b = inst2.renderVals();
  if (v2b.filteredCount !== expectedSlaFlagged) throw new Error('applying saved filter did not filter rows: got ' + v2b.filteredCount);
  v2b.onClearAll();
  v2b = inst2.renderVals();

  // bulk actions: select two rows, bulk-assign department, then bulk-resolve (confirm-gated)
  const id1 = v2b.rows[0].id.replace('#', '');
  const id2 = v2b.rows[1].id.replace('#', '');
  v2b.rows[0].onToggleSelect();
  v2b.rows[1].onToggleSelect();
  v2b = inst2.renderVals();
  if (!v2b.bulkBar.show || v2b.bulkBar.count !== 2) throw new Error('bulk bar did not show for 2 selected rows: ' + JSON.stringify(v2b.bulkBar));
  v2b.bulkBar.onDept({ target: { value: 'ndricim' } });
  v2b = inst2.renderVals();
  const afterDept = v2b.rows.filter((r) => [id1, id2].indexOf(r.id.replace('#', '')) !== -1);
  if (afterDept.some((r) => r.department !== S.deptName('ndricim'))) throw new Error('bulk department assignment did not apply: ' + JSON.stringify(afterDept.map((r) => r.department)));
  const overridesAfterDept = JSON.parse(w.localStorage.getItem('sinjal_case_overrides') || '{}');
  if (overridesAfterDept[id1].department !== 'ndricim' || overridesAfterDept[id2].department !== 'ndricim') throw new Error('bulk department override not persisted to sinjal_case_overrides');

  v2b.bulkBar.onStatus({ target: { value: 'Zgjidhur' } });
  v2b = inst2.renderVals();
  if (!v2b.bulkBar.confirmShow) throw new Error('resolving status via bulk bar should require confirmation, got no confirm prompt');
  const beforeConfirmStatuses = v2b.rows.filter((r) => [id1, id2].indexOf(r.id.replace('#', '')) !== -1).map((r) => r.status);
  if (beforeConfirmStatuses.some((s) => s === 'Zgjidhur')) throw new Error('status changed before bulk-resolve confirmation was given');
  v2b.bulkBar.onConfirm();
  v2b = inst2.renderVals();
  const afterConfirm = v2b.rows.filter((r) => [id1, id2].indexOf(r.id.replace('#', '')) !== -1);
  if (afterConfirm.some((r) => r.status !== 'Zgjidhur')) throw new Error('bulk-resolve did not apply after confirm: ' + JSON.stringify(afterConfirm.map((r) => r.status)));

  // export notice
  v2b.bulkBar.onExport();
  v2b = inst2.renderVals();
  if (!v2b.exportNotice) throw new Error('export did not set exportNotice');
  v2b.onDismissExport();
  v2b = inst2.renderVals();
  if (v2b.exportNotice) throw new Error('export notice did not dismiss');

  // select-all toggles every currently filtered row
  v2b.onToggleSelectAll();
  v2b = inst2.renderVals();
  if (!v2b.allSelected || v2b.rows.some((r) => !r.isSelected)) throw new Error('select-all did not select every row');
  v2b.onToggleSelectAll();
  v2b = inst2.renderVals();
  if (v2b.allSelected || v2b.rows.some((r) => r.isSelected)) throw new Error('select-all toggle-off did not clear selection');

  // pagination: 24 seeded reports over a 12-per-page list -> 2 pages of 12
  if (v2b.filteredCount !== 24) throw new Error('expected 24 unfiltered reports, got ' + v2b.filteredCount);
  if (v2b.rows.length !== 12) throw new Error('expected 12 rows on page 1, got ' + v2b.rows.length);
  if (!v2b.pagination.show || v2b.pagination.totalPages !== 2) throw new Error('expected pagination over 2 pages, got ' + JSON.stringify(v2b.pagination));
  if (v2b.pagination.page !== 1 || v2b.pagination.canPrev || !v2b.pagination.canNext) throw new Error('page-1 pagination state wrong: ' + JSON.stringify(v2b.pagination));
  const page1Ids = v2b.rows.map((r) => r.id);
  v2b.pagination.onNext();
  v2b = inst2.renderVals();
  if (v2b.pagination.page !== 2 || v2b.rows.length !== 12) throw new Error('page 2 wrong: ' + JSON.stringify(v2b.pagination) + ' rows=' + v2b.rows.length);
  const page2Ids = v2b.rows.map((r) => r.id);
  if (page1Ids.join(',') === page2Ids.join(',')) throw new Error('page 2 shows the same rows as page 1');
  if (v2b.pagination.canNext || !v2b.pagination.canPrev) throw new Error('last-page pagination state wrong: ' + JSON.stringify(v2b.pagination));
  v2b.pagination.onNext(); // should clamp, staying on page 2
  v2b = inst2.renderVals();
  if (v2b.pagination.page !== 2) throw new Error('next past last page should clamp, got ' + v2b.pagination.page);

  // any filter/search/sort change resets back to page 1
  v2b.onSearch({ target: { value: 'rrugë' } });
  v2b = inst2.renderVals();
  if (v2b.pagination.page !== 1) throw new Error('changing search did not reset to page 1, got ' + v2b.pagination.page);
  v2b.onClearAll();
  v2b = inst2.renderVals();
});

// ---- Raporti ----
run('Raporti: contextual actions, reassignment (reason-gated), status, escalate, reopen, accept, requests, duplicate, linked nav', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  w.localStorage.setItem('sinjal_selected_report', '02481');
  const { Component, props } = loadComponent('Raporti.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let vals = inst.renderVals();
  if (vals.r.id !== '#02481') throw new Error('did not load selected report, got ' + vals.r.id);
  if (vals.actions.map((a) => a.label).indexOf('Rishpërndaj') === -1) throw new Error('expected "Rishpërndaj" action for an in-progress report: ' + JSON.stringify(vals.actions.map((a) => a.label)));

  // assignment: reassigning an already-assigned report requires a reason —
  // saving without one must be a no-op (form stays open, nothing persists).
  vals.assign.onOpen();
  vals = inst.renderVals();
  if (!vals.assign.open) throw new Error('assign form did not open');
  vals.assign.onDept({ target: { value: 'mjedis' } });
  vals = inst.renderVals();
  if (vals.assign.department !== 'mjedis') throw new Error('assign draft dept did not update');
  if (!vals.assign.reasonRequired) throw new Error('expected a reason to be required when reassigning an already-assigned report');
  if (vals.assign.respOptions.some((o) => S.employees.filter((e) => e.id === o.value)[0].dept !== 'mjedis')) throw new Error('resp options not filtered to new dept');
  vals.assign.onSave();
  vals = inst.renderVals();
  if (!vals.assign.open) throw new Error('save without a reason should not have closed the form / persisted anything');
  vals.assign.onReason({ target: { value: 'Kategoria fillestare ishte e pasaktë.' } });
  vals = inst.renderVals();
  vals.assign.onSave();
  vals = inst.renderVals();
  if (vals.assign.open) throw new Error('save with a reason should have closed the form');
  const overridesRaw = w.localStorage.getItem('sinjal_case_overrides');
  const ov481 = overridesRaw && JSON.parse(overridesRaw)['02481'];
  if (!ov481 || ov481.department !== 'mjedis') throw new Error('assignment save did not persist');
  if (!ov481.reassignLog || ov481.reassignLog.length !== 1 || !ov481.reassignLog[0].reason) throw new Error('reassignment audit log was not recorded: ' + JSON.stringify(ov481.reassignLog));
  if (!vals.ai.reassignNote.show || vals.ai.reassignNote.to !== 'Mjedis') throw new Error('AI-processing card did not surface the reassignment note: ' + JSON.stringify(vals.ai.reassignNote));
  if (!vals.timeline.some((ev) => ev.label.indexOf('Caktimi u ndryshua') !== -1)) throw new Error('reassignment did not appear in the merged timeline');

  // status change + save (plain forward move, no reason needed)
  vals.statusCtl.onChange({ target: { value: 'Zgjidhur' } });
  vals = inst.renderVals();
  vals.statusCtl.onSave();
  vals = inst.renderVals();
  if (vals.r.status !== 'Zgjidhur') throw new Error('status save did not reflect, got ' + vals.r.status);
  if (!vals.verify.show) throw new Error('resolution-verification card should show once status is Zgjidhur');

  // reopen requires a reason too, and moves status back to "Në punë"
  vals.verify.onReopen();
  vals = inst.renderVals();
  if (!vals.reopenOpen) throw new Error('reopen panel did not open');
  vals.onConfirmReopen();
  vals = inst.renderVals();
  if (!vals.reopenOpen || vals.r.status !== 'Zgjidhur') throw new Error('confirming reopen without a reason should be a no-op');
  vals.onReopenReason({ target: { value: 'Problemi është rishfaqur.' } });
  vals = inst.renderVals();
  vals.onConfirmReopen();
  vals = inst.renderVals();
  if (vals.reopenOpen || vals.r.status !== 'Në punë') throw new Error('reopen with a reason should set status back to "Në punë": got ' + vals.r.status);
  if (!vals.timeline.some((ev) => ev.label.indexOf('u rihap') !== -1)) throw new Error('reopen did not appear in the merged timeline');

  // escalate toggles and is reflected in the action bar + SLA card
  const escalateBtn = vals.actions.filter((a) => a.label.indexOf('scalo') !== -1)[0];
  if (!escalateBtn) throw new Error('expected an Escalo action for an SLA-breached report');
  escalateBtn.onClick();
  vals = inst.renderVals();
  if (vals.actions.map((a) => a.label).indexOf('Anulo përshkallëzimin') === -1) throw new Error('escalate did not flip the action label');
  if (vals.sla.escalateLabel !== 'U përshkallëzua') throw new Error('SLA card did not reflect the escalation');

  // request-info template sends a real, timestamped thread message
  vals.onOpenRequest();
  vals = inst.renderVals();
  vals.requestTemplates[0].onClick();
  vals = inst.renderVals();
  if (vals.thread.length === 0 || vals.thread[vals.thread.length - 1].text.indexOf('foto') === -1) throw new Error('info request did not land in the communication thread');

  // accept-resolution flow on a separately-resolved report
  w.localStorage.setItem('sinjal_selected_report', '02466');
  const instAccept = new Component(props);
  instAccept.componentDidMount();
  let vA = instAccept.renderVals();
  if (vA.r.status !== 'Zgjidhur' || !vA.verify.show) throw new Error('expected 02466 to be Zgjidhur with a verification card');
  vA.verify.onAccept();
  vA = instAccept.renderVals();
  if (vA.r.status !== 'Mbyllur') throw new Error('accepting resolution did not close the case, got ' + vA.r.status);

  // duplicate flow on a report that has a candidate
  w.localStorage.setItem('sinjal_selected_report', '02459');
  const inst3 = new Component(props);
  inst3.componentDidMount();
  let v3 = inst3.renderVals();
  if (!v3.dup.show) throw new Error('expected duplicate panel to show for 02459');
  v3.dup.onConfirm();
  v3 = inst3.renderVals();
  if (v3.r.status !== 'Dublikatë') throw new Error('duplicate confirm did not set status');

  // linked-report internal navigation (no remount) for a report with links
  w.localStorage.setItem('sinjal_selected_report', '02480');
  const inst4 = new Component(props);
  inst4.componentDidMount();
  let v4 = inst4.renderVals();
  if (!v4.linked.show || v4.linked.items.length === 0) throw new Error('expected linked reports for 02480');
  const targetId = v4.linked.items[0].id;
  v4.linked.items[0].onClick();
  v4 = inst4.renderVals();
  if (v4.r.id !== targetId) throw new Error('internal linked-report nav did not switch report, got ' + v4.r.id + ' expected ' + targetId);

  // department-work intervention note add (formerly "evidence")
  w.localStorage.setItem('sinjal_selected_report', '02465');
  const inst5 = new Component(props);
  inst5.componentDidMount();
  let v5 = inst5.renderVals();
  v5.dept.onDraft({ target: { value: 'U verifikua në terren.' } });
  v5 = inst5.renderVals();
  v5.dept.onAdd();
  v5 = inst5.renderVals();
  if (v5.dept.notes.length !== 1 || v5.dept.notes[0].text !== 'U verifikua në terren.') throw new Error('intervention note not added');
  if (!v5.timeline.some((ev) => ev.label.indexOf('U verifikua në terren') !== -1)) throw new Error('intervention note did not appear in the merged timeline');

  // reappeared report: banner/exceptions surface it, and the dedicated card links back
  w.localStorage.setItem('sinjal_selected_report', '02467');
  const inst6 = new Component(props);
  inst6.componentDidMount();
  const v6 = inst6.renderVals();
  if (!v6.reappear.show || v6.reappear.prevId !== '#02465') throw new Error('reappear card did not link to the previous case, got ' + JSON.stringify(v6.reappear));
  if (!v6.exceptions.some((e) => e.text.indexOf('rishfaqur') !== -1)) throw new Error('reappeared report should surface in the exceptions list');

  // branch statuses (outside the main lifecycle chain) render all steps pending + a branch note
  w.localStorage.setItem('sinjal_selected_report', '02461');
  const inst7 = new Component(props);
  inst7.componentDidMount();
  const v7 = inst7.renderVals();
  if (!v7.lifecycle.isBranch || v7.lifecycle.branchNote !== 'Refuzuar') throw new Error('expected branch lifecycle for a Refuzuar report: ' + JSON.stringify(v7.lifecycle));
  if (v7.lifecycle.steps.some((s) => s.stepClass !== '')) throw new Error('branch status should leave every main-chain step pending');
});

// ---- Harta ----
run('Harta: pins/clusters, layers, filters, zone-draw, side panel', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  const { Component, props } = loadComponent('Harta.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let vals = inst.renderVals();

  // default: zoom 2 (per-zone clustering) — every filtered report is
  // accounted for exactly once, either as a standalone pin (a zone with
  // just 1 report) or inside a cluster's count.
  if (vals.summary.total !== 24) throw new Error('expected 24 reports unfiltered, got ' + vals.summary.total);
  const coveredAtZoom2 = vals.pins.length + vals.clusters.reduce((sum, c) => sum + c.count, 0);
  if (coveredAtZoom2 !== 24) throw new Error('pins+clusters should cover all 24 reports at zoom 2, got ' + coveredAtZoom2);
  if (vals.clusters.some((c) => c.count < 2)) throw new Error('a cluster bubble should never represent fewer than 2 reports (that should render as a standalone pin instead)');

  // zoom out to the single city-level cluster
  vals.onZoomOut();
  vals = inst.renderVals();
  if (vals.clusters.length !== 1 || vals.clusters[0].key !== 'city' || vals.clusters[0].count !== 24) throw new Error('zoom 1 should collapse to one city cluster of 24: ' + JSON.stringify(vals.clusters));
  if (!vals.zoomOutDisabledClass) throw new Error('zoom-out should be disabled at the minimum zoom level');

  // zoom in twice from city -> zone -> individual pins
  vals.onZoomIn(); vals = inst.renderVals();
  vals.onZoomIn(); vals = inst.renderVals();
  if (vals.pins.length !== 24 || vals.clusters.length !== 0) throw new Error('zoom 3 should render every report as a standalone pin: ' + vals.pins.length + ' pins, ' + vals.clusters.length + ' clusters');
  if (!vals.zoomInDisabledClass) throw new Error('zoom-in should be disabled at the maximum zoom level');

  // clicking a pin opens the report side panel with nearby reports and a working "open" link
  const somePin = vals.pins[0];
  somePin.onClick();
  vals = inst.renderVals();
  if (!vals.sidePanelShow || !vals.sidePanelIsReport) throw new Error('clicking a pin should open the report side panel');
  if (!vals.sidePanelReport.id || !vals.sidePanelReport.title) throw new Error('side panel report is missing basic fields: ' + JSON.stringify(vals.sidePanelReport));
  vals.sidePanelReport.onOpen();
  if (w.localStorage.getItem('sinjal_selected_report') === null) throw new Error('opening a report from the side panel did not persist the selected id');
  vals.onCloseSidePanel();
  vals = inst.renderVals();
  if (vals.sidePanelShow) throw new Error('close button did not hide the side panel');

  // zoom back to 2 and click a cluster: it should zoom to 3 AND show a cluster breakdown that sums to its count
  vals.onZoomOut(); vals = inst.renderVals();
  const clusterBefore = vals.clusters[0];
  clusterBefore.onClick();
  vals = inst.renderVals();
  if (vals.zoomLabel !== 'Detaje') throw new Error('clicking a zone cluster should zoom in to the individual-pins level, got ' + vals.zoomLabel);
  if (!vals.sidePanelShow || !vals.sidePanelIsCluster) throw new Error('clicking a cluster should open the cluster side panel');
  const breakdownSum = vals.sidePanelCluster.breakdown.reduce((sum, b) => sum + b.count, 0);
  if (breakdownSum !== vals.sidePanelCluster.count) throw new Error('cluster breakdown counts should sum to the cluster total: ' + breakdownSum + ' vs ' + vals.sidePanelCluster.count);
  vals.onCloseSidePanel(); vals = inst.renderVals();

  // layer switching changes legend shape without throwing or losing reports
  vals = (() => { vals.layers.filter((l) => l.value === 'departamentet')[0].onClick(); return inst.renderVals(); })();
  if (vals.legendItems.length !== S.departments.length) throw new Error('departamentet layer legend should list every department, got ' + vals.legendItems.length);
  const deptCounts = vals.legendItems.reduce((sum, l) => sum + l.count, 0);
  if (deptCounts !== 24) throw new Error('department legend counts should sum to all 24 reports, got ' + deptCounts);

  vals.layers.filter((l) => l.value === 'sla')[0].onClick(); vals = inst.renderVals();
  if (vals.legendItems.length !== 3) throw new Error('sla layer should show exactly 3 legend tiers, got ' + vals.legendItems.length);

  vals.layers.filter((l) => l.value === 'intensiteti')[0].onClick(); vals = inst.renderVals();
  if (!vals.heatLayerShow || vals.pinsLayerShow) throw new Error('intensiteti layer should show the heat layer, not pins');
  if (vals.heatBlobs.length === 0) throw new Error('intensiteti layer should render at least one heat blob for the unfiltered set');

  vals.layers.filter((l) => l.value === 'raporte')[0].onClick(); vals = inst.renderVals();

  // status/priority/department filters narrow the map the same way they narrow the summary bar
  const urgentOnly = vals.priorityItems.filter((p) => p.value === 'Urgjente')[0];
  urgentOnly.onClick();
  vals = inst.renderVals();
  const expectedUrgent = S.reports.filter((r) => r.priority === 'Urgjente').length;
  if (vals.summary.total !== expectedUrgent) throw new Error('priority filter should narrow the map, got ' + vals.summary.total + ' expected ' + expectedUrgent);
  if (vals.summary.urgent !== expectedUrgent) throw new Error('summary.urgent should match the filtered set once filtered to only Urgjente');
  vals.onClearAllFilters();
  vals = inst.renderVals();
  if (vals.summary.total !== 24 || vals.activeFilterBadge.n !== 0) throw new Error('clear-all should reset filters back to the unfiltered 24-report set');

  // draw-a-zone: three clicks define a triangle; finishing it should filter
  // the map down to whatever falls inside it (point-in-polygon), and never
  // throw even with a degenerate/empty result.
  const zonaCustom = vals.zonaModes.filter((z) => z.value === 'custom')[0];
  zonaCustom.onClick();
  vals = inst.renderVals();
  if (!vals.zonaDrawShow) throw new Error('selecting the custom-zone mode should reveal the draw controls');
  vals.onStartDraw();
  vals = inst.renderVals();
  if (!vals.drawMode) throw new Error('onStartDraw should enter draw mode');
  const clickAt = (x, y) => inst._addVertex({ currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }) }, clientX: x * 10, clientY: y * 10 });
  clickAt(0, 0); clickAt(100, 0); clickAt(100, 100); clickAt(0, 100); // a triangle covering nearly the whole map
  vals = inst.renderVals();
  if (vals.drawPointCount !== 4) throw new Error('4 clicks should record 4 draw points, got ' + vals.drawPointCount);
  vals.onFinishDraw();
  vals = inst.renderVals();
  if (vals.drawMode) throw new Error('finishing the zone should exit draw mode');
  if (!vals.customPolygonShow) throw new Error('finishing a >=3-point zone should activate the custom polygon');
  if (vals.summary.total !== 24) throw new Error('a polygon covering the whole 0-100 square should still include all 24 reports, got ' + vals.summary.total);

  vals.onClearCustomZone();
  vals = inst.renderVals();
  if (vals.customPolygonShow || vals.summary.total !== 24) throw new Error('clearing the custom zone should remove the polygon filter');

  // a degenerate draw (fewer than 3 points) should not be finishable
  zonaCustom.onClick(); vals = inst.renderVals();
  vals.onStartDraw(); vals = inst.renderVals();
  clickAt(10, 10); clickAt(90, 90);
  vals = inst.renderVals();
  if (!vals.finishDisabledClass) throw new Error('finishing a zone with only 2 points should be disabled');
  vals.onFinishDraw();
  vals = inst.renderVals();
  if (vals.customPolygonShow) throw new Error('a 2-point draw should not have produced a polygon');
});

// ---- Departamentet ----
run('Departamentet: overview cards/workload/rules, department workspace tabs, team drill-down, workload-balancing assignment, history', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  const { Component, props } = loadComponent('Departamentet.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let vals = inst.renderVals();

  // overview: dept cards cover every department, and workload rows sum to the same active total
  if (!Array.isArray(vals.deptCards) || vals.deptCards.length !== S.departments.length) throw new Error('expected one dept card per department, got ' + (vals.deptCards || []).length);
  const cardsActiveSum = vals.deptCards.reduce((sum, d) => sum + d.active, 0);
  const rowsActiveSum = vals.workloadRows.reduce((sum, r) => sum + r.active, 0);
  if (cardsActiveSum !== rowsActiveSum) throw new Error('dept card active total should match workload row total: ' + cardsActiveSum + ' vs ' + rowsActiveSum);
  vals.workloadRows.forEach((r) => {
    if (typeof r.widthPct !== 'string' || r.widthPct.indexOf('%') === -1) throw new Error('workload row missing a bar width: ' + JSON.stringify(r));
  });
  if (!Array.isArray(vals.rules) || vals.rules.length === 0) throw new Error('expected seed assignment rules to render');

  // add-rule: disabled until both category+department chosen, then saves and persists
  if (vals.addRuleOpen) throw new Error('add-rule form should start closed');
  vals.onOpenAddRule();
  vals = inst.renderVals();
  if (!vals.addRuleOpen) throw new Error('add-rule form did not open');
  if (!vals.saveRuleDisabledClass) throw new Error('save should start disabled with an empty draft');
  vals.onRuleCategory({ target: { value: 'mbetje' } });
  vals = inst.renderVals();
  if (!vals.saveRuleDisabledClass) throw new Error('save should still be disabled with only a category chosen');
  vals.onRuleDept({ target: { value: 'sherbime' } });
  vals = inst.renderVals();
  if (vals.saveRuleDisabledClass) throw new Error('save should be enabled once category+department are both chosen');
  const rulesBefore = vals.rules.length;
  vals.onSaveRule();
  vals = inst.renderVals();
  if (vals.addRuleOpen) throw new Error('saving a rule should close the form');
  if (vals.rules.length !== rulesBefore + 1) throw new Error('new rule did not get added: ' + rulesBefore + ' -> ' + vals.rules.length);
  const storedRules = JSON.parse(w.localStorage.getItem('sinjal_custom_rules') || '[]');
  if (storedRules.length !== 1) throw new Error('custom rule was not persisted to localStorage');
  const newRule = vals.rules.filter((r) => r.removable)[0];
  if (!newRule) throw new Error('new rule should be marked removable');
  newRule.onRemove();
  vals = inst.renderVals();
  if (vals.rules.length !== rulesBefore) throw new Error('removing the rule did not bring the count back down');

  // department workspace: open a department, walk every tab, then back out
  const deptId = vals.deptCards[0].id;
  vals.deptCards[0].onClick();
  vals = inst.renderVals();
  if (inst.state.detailTab !== 'permbledhje' || !vals.isTabPermbledhje) throw new Error('opening a department should default to the Përmbledhje tab');
  if (!vals.detail || vals.detail.name !== S.deptName(deptId)) throw new Error('detail did not populate for the opened department');
  if (vals.detail.active !== vals.detail.priorityBreakdown.reduce((s, p) => s + p.count, 0)) throw new Error('priority breakdown should sum to the active count');
  if (vals.detail.active !== vals.detail.statusBreakdown.reduce((s, st) => s + st.count, 0)) throw new Error('status breakdown should sum to the active count');

  inst._setTab('raportet');
  vals = inst.renderVals();
  if (inst.state.detailTab !== 'raportet' || !vals.isTabRaportet || !Array.isArray(vals.detail.caseRows) || vals.detail.caseRows.length === 0) throw new Error('Raportet tab did not populate case rows');

  inst._setTab('rregullat');
  vals = inst.renderVals();
  if (inst.state.detailTab !== 'rregullat' || !vals.isTabRregullat) throw new Error('Rregullat tab did not activate');
  if (vals.detail.rules.some((r) => r.departmentId !== deptId)) throw new Error('per-department rules tab leaked a rule from another department: ' + JSON.stringify(vals.detail.rules));

  inst._setTab('ekipi');
  vals = inst.renderVals();
  if (inst.state.detailTab !== 'ekipi' || !vals.isTabEkipi || !Array.isArray(vals.detail.team) || vals.detail.team.length === 0) throw new Error('Ekipi tab did not populate team rows');

  // team drill-down: selecting an employee reveals their per-case detail, toggling again collapses it
  const emp = vals.detail.team[0];
  if (!emp.onClick) throw new Error('team row missing onClick handler');
  emp.onClick();
  vals = inst.renderVals();
  const empAfter = vals.detail.team.filter((e) => e.id === emp.id)[0];
  if (!empAfter.isSelected || !empAfter.detail || !empAfter.detail.hasCases) throw new Error('selecting a team member should reveal their case detail: ' + JSON.stringify(empAfter));
  empAfter.onClick();
  vals = inst.renderVals();
  const empCollapsed = vals.detail.team.filter((e) => e.id === emp.id)[0];
  if (empCollapsed.isSelected) throw new Error('selecting the same team member again should collapse the detail');

  // workload-balancing: find a department with an unassigned case, assign it via a ranked
  // candidate's real onAssign closure, and confirm the case count drops + history records it
  let target = null;
  vals.deptCards.forEach((d) => {
    inst._openDept(d.id);
    const v = inst.renderVals();
    if (!target && v.detail.hasUnassigned) target = d.id;
  });
  if (!target) throw new Error('expected at least one department with an unassigned case in the seed data');
  inst._openDept(target);
  vals = inst.renderVals();
  const unassignedBefore = vals.detail.unassignedCases.length;
  const uc = vals.detail.unassignedCases[0];
  if (!Array.isArray(uc.candidates) || uc.candidates.length === 0) throw new Error('unassigned case has no ranked candidates: ' + JSON.stringify(uc));
  const top = uc.candidates.filter((c) => c.isTop)[0];
  if (!top) throw new Error('unassigned case candidates should mark a top recommendation');
  if (typeof top.onAssign !== 'function') throw new Error('candidate missing onAssign handler');
  top.onAssign();
  vals = inst.renderVals();
  if (vals.detail.unassignedCases.length !== unassignedBefore - 1) throw new Error('assigning a case should remove it from the unassigned list: ' + unassignedBefore + ' -> ' + vals.detail.unassignedCases.length);
  if (!vals.detail.history.length || vals.detail.history[0].label.indexOf(top.name) === -1) throw new Error('assignment should be recorded at the top of the history log: ' + JSON.stringify(vals.detail.history));
  const overridesAfterAssign = JSON.parse(w.localStorage.getItem('sinjal_case_overrides') || '{}');
  const assignedIds = Object.keys(overridesAfterAssign).filter((k) => (overridesAfterAssign[k].assignLog || []).length > 0);
  if (assignedIds.length === 0) throw new Error('assignment did not persist an assignLog to sinjal_case_overrides');

  // back to overview clears the department selection
  inst._backToOverview();
  vals = inst.renderVals();
  if (inst.state.view !== 'overview' || inst.state.selectedDept || !vals.isOverview || vals.isDetail) throw new Error('back-to-overview should clear the selected department: ' + JSON.stringify({ view: inst.state.view, selectedDept: inst.state.selectedDept }));

  // sinjal_dept_focus one-shot deep link: written by another page, read once on mount, then cleared
  w.localStorage.setItem('sinjal_dept_focus', target);
  const inst2 = new Component(props);
  inst2.componentDidMount();
  const vals2 = inst2.renderVals();
  if (inst2.state.view !== 'detail' || inst2.state.selectedDept !== target || !vals2.isDetail) throw new Error('sinjal_dept_focus should open straight into that department, got ' + JSON.stringify({ view: inst2.state.view, selectedDept: inst2.state.selectedDept }));
  if (w.localStorage.getItem('sinjal_dept_focus') !== null) throw new Error('sinjal_dept_focus should be cleared after being consumed (one-shot)');
});

// ---- Automatizimet ----
run('Automatizimet: health/loop/attention, routing tiers + reassign, priority, duplicates, moderation, missing info, verification, publications, overrides/audit, rules & settings, deep link', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  const { Component, props } = loadComponent('Automatizimet.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let v = inst.renderVals();
  const ov = () => JSON.parse(w.localStorage.getItem('sinjal_case_overrides') || '{}');

  // categorization is a case field, not an AI automation
  S.reports.forEach((r) => { if (r.timeline.some((t) => t.label.indexOf('klasifikoi') !== -1)) throw new Error('timeline still presents categorization as AI for ' + r.id); });
  if (A_hasCategoryAutomation(v)) throw new Error('categorization must not appear as an automation type');

  // overview
  if (v.statusRows.length !== 8) throw new Error('expected 8 automation status rows, got ' + v.statusRows.length);
  if (v.health.unchanged + v.health.overrides > v.health.auto + v.health.overrides) throw new Error('health strip inconsistent: ' + JSON.stringify(v.health));
  if (v.health.unchanged > v.health.auto) throw new Error('unchanged cannot exceed automatic actions');
  if (v.loop.length !== 5 || v.loop[0].k !== 'Automatizo' || v.loop[4].k !== 'Përmirëso') throw new Error('feedback loop band malformed');
  if (v.loop[0].n !== v.health.auto) throw new Error('loop Automatizo should equal automatic actions in the period');
  if (v.trend.length !== 7) throw new Error('trend should have 7 days');
  if (!v.attentionAll.some((a) => a.isPattern && a.text.indexOf('Shërbime Publike') !== -1)) throw new Error('expected the Shërbime Publike reassignment pattern to be detected');
  v.periods[1].onClick(); v = inst.renderVals();
  if (v.health.periodLabel !== '7 ditët e fundit' || v.health.overrides < 4) throw new Error('7-day period should include the 4 seeded overrides: ' + JSON.stringify(v.health));
  v.periods[0].onClick(); v = inst.renderVals();
  const autoToday = v.health.auto, unchangedToday = v.health.unchanged, overridesToday = v.health.overrides;

  // routing: confidence tiers
  inst.setState({ screen: 'routing', routingFilter: 'all' }); v = inst.renderVals();
  S.reports.forEach((r) => {
    const row = v.routing.rowsAll.filter((x) => x.id === r.displayId)[0];
    if (r.ai.confidence < 55 && row.target !== 'Pranimi i përgjithshëm') throw new Error('low-confidence routing must go to general intake: ' + r.id);
  });
  if (v.routing.rows.length !== 10 || v.routing.rowsPg.pages !== 3) throw new Error('routing table should paginate 24 rows into 3 pages of 10');
  v.routing.rowsPg.nums[2].onClick(); v = inst.renderVals();
  if (v.routing.rows.length !== 4 || v.routing.rowsPg.page !== 3) throw new Error('last routing page should hold 4 rows');
  v.routing.filters[2].onClick(); v = inst.renderVals();
  if (v.routing.rowsPg.page !== 1) throw new Error('changing the filter should start from page 1');
  v.routing.filters[0].onClick(); v = inst.renderVals();
  const reviewBefore = v.routing.filters.filter((f) => f.label === 'Shqyrtim')[0].n;
  inst.setState({ selRouting: '02458' }); v = inst.renderVals();
  if (!v.routing.detail.canConfirm) throw new Error('02458 (73%, unassigned) should be awaiting routing confirmation');
  v.routing.detail.onConfirm(); v = inst.renderVals();
  if (v.routing.filters.filter((f) => f.label === 'Shqyrtim')[0].n !== reviewBefore - 1) throw new Error('confirming a medium-confidence routing should remove it from review');
  // reassign: reason required
  inst.setState({ selRouting: '02479' }); v = inst.renderVals();
  v.routing.detail.onOpenReassign(); v = inst.renderVals();
  v.routing.detail.onReassignDept({ target: { value: 'infra' } }); v = inst.renderVals();
  v.routing.detail.onSaveReassign(); v = inst.renderVals();
  if (ov()['02479'] && ov()['02479'].department) throw new Error('reassign without a reason must not persist');
  v.routing.detail.onReassignReason({ target: { value: 'Problemi lidhet me shtyllën fizike.' } }); v = inst.renderVals();
  v.routing.detail.onSaveReassign(); v = inst.renderVals();
  const o479 = ov()['02479'];
  if (!o479 || o479.department !== 'infra' || !o479.reassignLog || o479.reassignLog[0].from !== 'Ndriçim') throw new Error('reassign did not persist with its audit entry: ' + JSON.stringify(o479));
  if (v.routing.detail.stateLabel !== 'Ndërhyrje njerëzore' || !v.routing.detail.hasOverride) throw new Error('reassigned routing should show as a human override');
  inst.setState({ screen: 'overview' }); v = inst.renderVals();
  if (v.health.overrides !== overridesToday + 1 || v.health.unchanged !== unchangedToday - 1) throw new Error('today\'s health should count the new override and one fewer unchanged action: ' + JSON.stringify(v.health));

  // priority: reason required, persisted with a log
  inst.setState({ screen: 'priority', selPriority: '02480' }); v = inst.renderVals();
  v.priority.detail.onOpen(); v = inst.renderVals();
  v.priority.detail.onDraft({ target: { value: 'E lartë' } }); v = inst.renderVals();
  if (!v.priority.detail.saveDisabledClass) throw new Error('priority save should be disabled without a reason');
  v.priority.detail.onReason({ target: { value: 'Rreziku nuk konfirmohet.' } }); v = inst.renderVals();
  v.priority.detail.onSave(); v = inst.renderVals();
  if (ov()['02480'].priority !== 'E lartë' || ov()['02480'].priorityLog[0].from !== 'Urgjente') throw new Error('priority override not persisted');
  if (v.priority.detail.history.length !== 2) throw new Error('priority history should show automatic + human entries');

  // duplicates
  inst.setState({ screen: 'duplicates' }); v = inst.renderVals();
  const pendingBefore = v.dup.pendingCount;
  const d0 = v.dup.pending[0];
  d0.onSeparate(); v = inst.renderVals();
  v.dup.pending[0].onSubmit(); v = inst.renderVals();
  if (v.dup.pendingCount !== pendingBefore) throw new Error('keeping separate without a reason should be a no-op');
  v.dup.pending[0].onReason({ target: { value: 'Dy probleme të ndryshme në të njëjtën zonë.' } }); v = inst.renderVals();
  v.dup.pending[0].onSubmit(); v = inst.renderVals();
  if (v.dup.pendingCount !== pendingBefore - 1) throw new Error('keep-separate decision should resolve the candidate');
  const linkTarget = v.dup.pending[0];
  const dupeId = linkTarget.a.id.replace('#', '');
  linkTarget.onLink(); v = inst.renderVals();
  if (ov()[dupeId].status !== 'Dublikatë') throw new Error('linking should mark the newer case Dublikatë');
  v.dup.auto[0].onUndo(); v = inst.renderVals();
  v.dup.auto[0].onReason({ target: { value: 'Probleme të ndryshme.' } }); v = inst.renderVals();
  v.dup.auto[0].onSubmit(); v = inst.renderVals();
  if (ov()['02460'].status !== 'Në shqyrtim' || ov()['02460'].duplicateOf !== null) throw new Error('undoing the automatic link should restore 02460');

  // moderation
  inst.setState({ screen: 'moderation', selModeration: 'm2' }); v = inst.renderVals();
  v.mod.detail.actions[0].onClick(); v = inst.renderVals();  // Lejo
  v.mod.detail.onSubmit(); v = inst.renderVals();
  if (!v.mod.detail.undecided) throw new Error('allowing a held item requires a reason');
  v.mod.detail.onReason({ target: { value: 'Fals pozitiv.' } }); v = inst.renderVals();
  v.mod.detail.onSubmit(); v = inst.renderVals();
  if (!v.mod.detail.decided || v.mod.detail.decisionLabel !== 'U lejua') throw new Error('allow decision not recorded');
  inst.setState({ selModeration: 'm1' }); v = inst.renderVals();
  v.mod.detail.actions[1].onClick(); v = inst.renderVals();  // Redakto
  v.mod.detail.onEdit({ target: { value: '…e hedh çdo natë fqinji.' } }); v = inst.renderVals();
  v.mod.detail.onSubmit(); v = inst.renderVals();
  if (v.mod.detail.decisionEdited !== '…e hedh çdo natë fqinji.') throw new Error('redaction not recorded');

  // missing information
  inst.setState({ screen: 'missing', selMissing: '02472' }); v = inst.renderVals();
  const blockedBefore = v.nav[1].items.filter((i) => i.key === 'missing')[0].count;
  v.miss.detail.onSend(); v = inst.renderVals();
  if (!(ov()['02472'].citizenRequests || []).length) throw new Error('resending the request should land in the case thread');
  v.miss.detail.onProceed(); v = inst.renderVals();
  if (v.nav[1].items.filter((i) => i.key === 'missing')[0].count !== blockedBefore - 1) throw new Error('proceeding without info should unblock the case');

  // verification
  inst.setState({ screen: 'verification', selVerification: '02465' }); v = inst.renderVals();
  if (!v.ver.detail.isReview) throw new Error('02465 should require review (visual consistency)');
  v.ver.detail.onOpenReopen(); v = inst.renderVals();
  v.ver.detail.onReopen(); v = inst.renderVals();
  if (ov()['02465'] && ov()['02465'].status) throw new Error('reopen without a reason must not persist');
  v.ver.detail.onReason({ target: { value: 'Fotoja nuk tregon mbulesën e re.' } }); v = inst.renderVals();
  v.ver.detail.onReopen(); v = inst.renderVals();
  if (ov()['02465'].status !== 'Në punë' || !ov()['02465'].reopenLog.length) throw new Error('reopen not persisted');
  inst.setState({ selVerification: '02468' }); v = inst.renderVals();
  v.ver.detail.onAccept(); v = inst.renderVals();
  if (ov()['02468'].status !== 'Mbyllur') throw new Error('accepting a verified resolution should close it');

  // publications
  inst.setState({ screen: 'publications', pubSelected: [] }); v = inst.renderVals();
  if (!v.pub.blocked) throw new Error('publishing with no selection should be blocked');
  v.pub.candidates.filter((c) => c.id === '#02466')[0].onClick(); v = inst.renderVals();
  if (v.pub.blocked || v.pub.draft.indexOf('Papër') === -1) throw new Error('selecting a resolved case should generate a publishable draft mentioning its zone');
  const histBefore = v.pub.history.length;
  v.pub.onPublish(); v = inst.renderVals();
  if (v.pub.history.length !== histBefore + 1 || !v.pub.hasNotice) throw new Error('publishing should add to the history');

  // overrides + audit
  inst.setState({ screen: 'overrides' }); v = inst.renderVals();
  if (!v.ov.rows.some((r) => r.id === '#02479' && r.reason.indexOf('shtyllën') !== -1)) throw new Error('the routing override should appear with its reason');
  v.ov.onType({ target: { value: 'priority' } }); v = inst.renderVals();
  if (v.ov.rows.some((r) => r.type !== 'Prioriteti')) throw new Error('override type filter broken');
  inst.setState({ screen: 'audit' }); v = inst.renderVals();
  v.au.actorChips[2].onClick(); v = inst.renderVals();
  if (v.au.rows.some((r) => r.actor === 'SINJAL')) throw new Error('human filter leaked automated rows');
  v.au.onSearch({ target: { value: '02479' } }); v = inst.renderVals();
  if (!v.au.rows.length || v.au.rows.some((r) => r.id !== '#02479')) throw new Error('audit case search broken');

  // rules & configuration
  inst.setState({ screen: 'config', configTab: 'rules', ruleGroup: 'routing' }); v = inst.renderVals();
  const firstId = v.cfg.routingRules[0].id;
  v.cfg.routingRules[0].onDown(); v = inst.renderVals();
  if (v.cfg.routingRules[1].id !== firstId) throw new Error('moving a rule down did not reorder');
  v.cfg.routingRules[1].onToggle(); v = inst.renderVals();
  if (v.cfg.routingRules[1].switchClass) throw new Error('toggling a rule did not deactivate it');
  inst._openRule('rr11'); v = inst.renderVals();
  if (!v.cfg.isBuilder) throw new Error('opening a rule should show the builder');
  v.cfg.builder.onTest(); v = inst.renderVals();
  const mbetje = S.reports.filter((r) => r.category === 'mbetje').length;
  if (v.cfg.builder.testSummary.indexOf(mbetje + ' raporte') === -1) throw new Error('rule test should count every matching report: ' + v.cfg.builder.testSummary);
  v.cfg.builder.onEdit(); v = inst.renderVals();
  v.cfg.builder.onDept({ target: { value: 'mjedis' } }); v = inst.renderVals();
  if (v.cfg.builder.draftTeam !== 'Inspektimi mjedisor') throw new Error('changing department should reset the team to one of that department\'s teams');
  v.cfg.builder.onSave(); v = inst.renderVals();
  if (JSON.parse(w.localStorage.getItem('sinjal_routing_rules')).filter((r) => r.id === 'rr11')[0].dept !== 'mjedis') throw new Error('rule edit not persisted');
  v.cfg.builder.onHistory(); v = inst.renderVals();
  if (!v.cfg.builder.history.some((h) => h.label.indexOf('departamenti → Mjedis') !== -1)) throw new Error('rule history should record the edit');
  const nRules = JSON.parse(w.localStorage.getItem('sinjal_routing_rules')).length;
  v.cfg.builder.onDuplicate(); v = inst.renderVals();
  if (JSON.parse(w.localStorage.getItem('sinjal_routing_rules')).length !== nRules + 1) throw new Error('duplicate rule not created');
  inst.setState({ ruleGroup: 'duplicates', selRule: null }); v = inst.renderVals();
  v.cfg.onDupLink({ target: { value: '95' } }); v = inst.renderVals();
  if (v.cfg.dupEffect.indexOf('0 nga') === -1) throw new Error('raising the link threshold to 95% should auto-link none of the current candidates: ' + v.cfg.dupEffect);
  inst.setState({ configTab: 'settings' }); v = inst.renderVals();
  v.cfg.settings[3].onToggle(); v = inst.renderVals();
  inst.setState({ screen: 'overview' }); v = inst.renderVals();
  if (v.statusRows[3].statusLabel !== 'Paaktiv') throw new Error('disabling moderation should show it Paaktiv on the overview');

  // Raporti links into the routing decision
  {
    const r = loadComponent('Raporti.dc.html', { window: w });
    w.localStorage.setItem('sinjal_selected_report', '02481');
    const ri = new r.Component(r.props); ri.componentDidMount();
    ri.renderVals().ai.onAutomation();
    const f = JSON.parse(w.localStorage.getItem('sinjal_auto_focus'));
    if (f.screen !== 'routing' || f.caseId !== '02481') throw new Error('Raporti should deep-link into the routing decision');
    const i3 = new Component(props); i3.componentDidMount();
    const v3 = i3.renderVals();
    if (!v3.isRouting || v3.routing.detail.displayId !== '#02481') throw new Error('routing deep link did not select 02481');
  }
  // one-shot deep link
  w.localStorage.setItem('sinjal_auto_focus', JSON.stringify({ screen: 'verification', caseId: '02466' }));
  const inst2 = new Component(props);
  inst2.componentDidMount();
  const v2 = inst2.renderVals();
  if (!v2.isVerification || v2.ver.detail.displayId !== '#02466') throw new Error('sinjal_auto_focus deep link did not open the verification screen on 02466');
  if (w.localStorage.getItem('sinjal_auto_focus') !== null) throw new Error('sinjal_auto_focus should be one-shot');
});
function A_hasCategoryAutomation(v) { return v.statusRows.some((r) => /kategor/i.test(r.label)); }

// ---- Performanca ----
run('Performanca: role views, KPI header + targets, indicator builder, library pins, drill-down to cases, trends + causes, insights, zones, team/SLA, reports + schedules, deep links', () => {
  const w = freshWindow();
  const S = w.SINJAL;
  const { Component, props } = loadComponent('Performanca.dc.html', { window: w });
  const inst = new Component(props);
  inst.componentDidMount();
  let v = inst.renderVals();

  // history is deterministic, closed, and numbered before the live reports
  if (S.history.length < 500) throw new Error('expected a 90-day history, got ' + S.history.length);
  if (S.history.some((r) => ['Mbyllur', 'Dublikatë', 'Refuzuar'].indexOf(r.status) === -1)) throw new Error('history rows must all be closed');
  if (S.history.some((r) => parseInt(r.id, 10) >= 2458)) throw new Error('history ids must not collide with live ids');

  // municipal header
  if (v.title !== 'Performanca e Bashkisë' || v.nav.length !== 7) throw new Error('municipal view should have 7 sections');
  if (v.kpis.length !== 6 || v.kpisPg.show) throw new Error('expected the 6 default KPIs on a single page');
  const sla = v.kpis.filter((k) => k.name === 'Përmbushja e SLA')[0];
  if (!sla || !/%$/.test(sla.value) || !sla.hasTarget) throw new Error('SLA KPI should show a % value against its target: ' + JSON.stringify(sla));
  // SLA value is really resolved-within-SLA / resolved over the window
  const from = new Date(S.now.getTime() - 30 * 86400000);
  const hist = S.history.filter((r) => r.submittedAt >= from && r.resolveH != null);
  const liveRes = S.reports.filter((r) => r.submittedAt >= from && (r.status === 'Zgjidhur' || r.status === 'Mbyllur'));
  const met = hist.filter((r) => r.slaMet).length + liveRes.filter((r) => r.resolutionHours <= (r.slaDeadline - r.submittedAt) / 3600000).length;
  const expected = Math.round(met / (hist.length + liveRes.length) * 100) + '%';
  if (sla.value !== expected) throw new Error('SLA KPI should be computed from the records: got ' + sla.value + ' expected ' + expected);

  // period switch changes the numbers
  v.periods[2].onClick(); v = inst.renderVals();
  if (v.kpis.filter((k) => k.name === 'Raporte të përfunduara')[0].value === sla.value) throw new Error('noop');
  v.periods[1].onClick(); v = inst.renderVals();

  // targets
  inst._setTarget('k_sla', { value: '80' }); v = inst.renderVals();
  if (v.kpis.filter((k) => k.name === 'Përmbushja e SLA')[0].tLabel !== 'Brenda objektivit') throw new Error('lowering the SLA target to 80% should put it within target');
  inst._setTarget('k_sla', { value: '90' }); v = inst.renderVals();

  // indicator builder: custom ratio
  v.builder.onOpen(); v = inst.renderVals();
  if (!v.builder.open || v.builder.formula.indexOf('brenda SLA') === -1) throw new Error('builder should open with the SLA ratio pre-filled');
  v.builder.onName({ target: { value: 'Urgjente brenda SLA — Infrastrukturë' } });
  v = inst.renderVals(); v.builder.onDept({ target: { value: 'infra' } });
  v = inst.renderVals(); v.builder.onBase({ target: { value: 'urgent' } });
  v = inst.renderVals();
  if (v.builder.formula !== 'Raportet brenda SLA / raportet urgjente') throw new Error('builder formula wrong: ' + v.builder.formula);
  v.builder.onSave(); v = inst.renderVals();
  if (v.kpisAll.length !== 7 || v.kpisAll[6].name !== 'Urgjente brenda SLA — Infrastrukturë') throw new Error('saved indicator should be pinned to the header');
  if (JSON.parse(w.localStorage.getItem('sinjal_perf_custom_indicators')).length !== 1) throw new Error('custom indicator not persisted');

  // library pin/unpin
  inst.setState({ screen: 'indicators' }); v = inst.renderVals();
  const reopen = v.library.filter((g) => g.label === 'Cilësia e zgjidhjes')[0].items.filter((i) => i.name === '% e rasteve të rihapura')[0];
  reopen.onPin(); v = inst.renderVals();
  if (v.kpisAll.length !== 8) throw new Error('pinning from the library should add a KPI');
  if (v.kpis.length !== 6 || !v.kpisPg.show || v.kpisPg.pages !== 2) throw new Error('KPI header should paginate at 6 cards');
  v.kpisPg.onNext(); v = inst.renderVals();
  if (v.kpis.length !== 2 || v.kpisPg.page !== 2) throw new Error('KPI page 2 should hold the remaining 2 cards');
  v.kpisPg.onPrev(); v = inst.renderVals();

  // drill-down: Bashkia → Departamenti → Zona → Kategoria → Raportet
  inst.setState({ screen: 'summary' }); v = inst.renderVals();
  v.kpis.filter((k) => k.name === 'Përmbushja e SLA')[0].onClick(); v = inst.renderVals();
  if (!v.isExplore || v.explore.levelLabel !== 'Sipas departamentit') throw new Error('clicking a KPI should open the department level');
  const infra = v.explore.rows.filter((r) => r.label === 'Infrastrukturë')[0];
  infra.onClick(); v = inst.renderVals();
  if (v.explore.levelLabel !== 'Sipas zonës') throw new Error('next level should be zones');
  v.explore.rows.filter((r) => r.label === 'Papër')[0].onClick(); v = inst.renderVals();
  v.explore.rows[0].onClick(); v = inst.renderVals();
  if (!v.explore.isCases || v.explore.cases.some((c) => c.dept !== 'Infrastrukturë' || c.zone !== 'Papër')) throw new Error('drill-down should end at the matching cases');
  v.explore.onToggleBad(); v = inst.renderVals();
  if (v.explore.cases.some((c) => c.sla !== 'Jashtë')) throw new Error('problematic filter should keep only SLA misses');
  v.explore.onRaportet();
  const inc = JSON.parse(w.localStorage.getItem('sinjal_incoming_filter'));
  if (inc.department !== 'infra' || inc.zone !== 'Papër' || !inc.slaBreached) throw new Error('drill-down should hand Raportet the same filter: ' + JSON.stringify(inc));
  v.explore.onBack(); v = inst.renderVals();
  if (v.isExplore || !v.isSummary) throw new Error('back should return to the summary');

  // departments: no ranking, every cell drills
  inst.setState({ screen: 'departments' }); v = inst.renderVals();
  if (v.deptRows.length !== 5) throw new Error('all departments should be listed');
  v.deptRows[0].sla.onClick(); v = inst.renderVals();
  if (!v.isExplore) throw new Error('department cells should drill down');
  inst.setState({ explore: null });

  // trends + causes
  inst.setState({ screen: 'trends', trendMetric: 'k_sla' }); v = inst.renderVals();
  if (v.trend.weekVals.length !== 12 || !v.trend.line) throw new Error('trend should show 12 weekly points');
  if (v.trend.insight.indexOf('Përmbushja e SLA') !== 0) throw new Error('trend insight missing');
  v.trend.onCauses(); v = inst.renderVals();
  if (!v.trend.causes.length || v.trend.causes[0].label !== 'Infrastrukturë') throw new Error('biggest SLA driver should be Infrastrukturë: ' + JSON.stringify(v.trend.causes.map((c) => c.label)));

  // insights are traceable and link out
  inst.setState({ screen: 'summary' }); v = inst.renderVals();
  const nd = v.insights.filter((x) => x.title.indexOf('ndriçim publik') !== -1)[0];
  if (!nd || nd.source.indexOf('Burimi:') !== 0) throw new Error('expected a traceable ndriçim volume insight');
  nd.actions[0].onClick();
  if (JSON.parse(w.localStorage.getItem('sinjal_harta_focus')).categories[0] !== 'ndricim') throw new Error('insight map link should focus Harta on the category');

  // zones diagnosis
  inst.setState({ screen: 'zones', zoneSel: 'Papër' }); v = inst.renderVals();
  if (!v.zone.diag.some((d) => d.kind === 'Përqendrim gjeografik')) throw new Error('Papër should be diagnosed as a geographic concentration');

  // reports: generate, CSV
  inst.setState({ screen: 'reports' }); v = inst.renderVals();
  v.reportForm.onGenerate(); v = inst.renderVals();
  if (!v.generated.show || v.generated.tRows.length !== 5 || v.generated.tCols.length !== 4) throw new Error('report should have 5 indicators × 3 departments + total');
  if (decodeURIComponent(v.generated.csvHref.split(',').slice(1).join(',')).indexOf('Infrastrukturë') === -1) throw new Error('CSV export missing data');
  v.generated.onSave(); v = inst.renderVals();
  if (!v.hasSaved) throw new Error('saved report not listed');
  v.onOpenSchedule(); v = inst.renderVals();
  const nSched = v.schedulesAll.length;
  v.onSaveSchedule(); v = inst.renderVals();
  if (v.schedulesAll.length !== nSched + 1 || !v.schedulesPg.show) throw new Error('schedule not saved');

  // department role
  inst._setRole('dept', 'infra'); v = inst.renderVals();
  if (v.title !== 'Performanca e Departamentit të Infrastrukturës' || v.nav.length !== 5) throw new Error('department view should have 5 sections');
  inst.setState({ screen: 'team' }); v = inst.renderVals();
  if (v.team.length !== S.employees.filter((e) => e.dept === 'infra').length) throw new Error('team should list the department staff');
  inst.setState({ screen: 'sla' }); v = inst.renderVals();
  if (v.sla.byPrio.length !== 4 || !v.sla.breaches.length) throw new Error('SLA view incomplete');
  v.sla.breaches.forEach((b) => { if (b.id && !b.title) throw new Error('breach row malformed'); });
  inst.setState({ screen: 'departments' }); v = inst.renderVals();
  if (!v.isSummary) throw new Error('a municipal-only section should fall back to summary in the department view');
  const inst2 = new Component(props); inst2.componentDidMount();
  if (inst2.renderVals().title.indexOf('Infrastrukturës') === -1) throw new Error('role choice should persist');
});

// ---- Harta/Raportet deep links used by Performanca ----
run('Harta accepts sinjal_harta_focus; Raportet accepts a category filter', () => {
  const w = freshWindow();
  w.localStorage.setItem('sinjal_harta_focus', JSON.stringify({ categories: ['gropa'], zones: ['Qendër'] }));
  const h = loadComponent('Harta.dc.html', { window: w });
  const hi = new h.Component(h.props); hi.componentDidMount();
  if (hi.state.filters.categories[0] !== 'gropa' || hi.state.filters.zones[0] !== 'Qendër') throw new Error('Harta did not apply the focus');
  if (w.localStorage.getItem('sinjal_harta_focus') !== null) throw new Error('Harta focus should be one-shot');
  w.localStorage.setItem('sinjal_incoming_filter', JSON.stringify({ category: 'ndricim' }));
  const r = loadComponent('Raportet.dc.html', { window: w });
  const ri = new r.Component(r.props); ri.componentDidMount();
  if ((ri.state.filters.categories || [])[0] !== 'ndricim') throw new Error('Raportet did not apply the category filter');
});

console.log('\nDone.');
