import type { ChangeEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { AutonomyId, CaseOverride, CaseOverrides, ConfTier, Priority, DuplicateCandidate, MissingInfoRequest, ModerationFlag, Report, RoutingRule } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, remove, writeJSON, writeString } from '../../lib/storage';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

// The operations center derives many ad-hoc record shapes from the seed data
// (automation events, review items, rule rows, audit entries) inside one
// render pass. Those intermediate records are typed loosely so the design's
// logic stays unchanged; state, storage and handlers are typed, and every
// rendered value is checked against the design by tests/parity.test.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = any;

export type AutoScreen =
  'overview' | 'activity' | 'routing' | 'priority' | 'duplicates' | 'moderation' | 'missing' | 'sla' | 'verification' | 'publications' | 'overrides' | 'audit' | 'config' | string;

/** A decision the clerk recorded on an automation item (sinjal_automation_decisions). */
export interface AutoDecision {
  at: string;
  by: string;
  decision: string;
  reason?: string;
  editedText?: string;
  message?: string;
}

export interface TypeSetting {
  active?: boolean;
  autonomy?: AutonomyId;
}

/** One entry in the rules change log (sinjal_rule_changes). */
export interface RuleChange {
  at: string;
  by: string;
  ruleId: string;
  label: string;
}

/** A published or returned citizen-facing publication (sinjal_publications). */
export interface SessionPublication {
  id: string;
  caseIds: string[];
  at: string;
  by: string;
  status: string;
  text: string;
}

/** A duplicate candidate with its pair resolved into older/newer cases. */
type DupPair = DuplicateCandidate & { newer: string; older: string };

interface State {
  pages: Record<string, number>;
  screen: AutoScreen;
  period: string;
  overrides: CaseOverrides;
  decisions: Record<string, AutoDecision>;
  routingRules: RoutingRule[] | null;
  settings: Record<string, TypeSetting>;
  config: Rec;
  publications: SessionPublication[];
  ruleLog: RuleChange[];
  routingFilter: string;
  selRouting: string | null;
  reassignOpen: boolean;
  reassignDept: string;
  reassignReason: string;
  priorityFilter: string;
  selPriority: string | null;
  priorityOpen: boolean;
  priorityDraft: string;
  priorityReason: string;
  dupFormFor: string | null;
  dupFormKind: string | null;
  dupReason: string;
  selModeration: string | null;
  modAction: string | null;
  modReason: string;
  modEdit: string;
  selMissing: string | null;
  missEditOpen: boolean;
  missDraft: string;
  selVerification: string | null;
  verifyReopenOpen: boolean;
  verifyReason: string;
  pubSelected: string[];
  pubEditing: boolean;
  pubDraft: string | null;
  pubNotice: string;
  actType: string;
  actLimit: number;
  ovType: string;
  ovClerk: string;
  ovDept: string;
  ovSearch: string;
  auActor: string;
  auType: string;
  auClerk: string;
  auSearch: string;
  auLimit: number;
  configTab: string;
  ruleGroup: string;
  selRule: string | null;
  ruleEditing: boolean;
  ruleDraft: (RoutingRule & { exception: string | null }) | null;
  ruleTested: boolean;
  ruleHistoryOpen: boolean;
}

type Props = Record<string, never>;

/** Port of the Automatizimet.dc.html logic: the automation operations center and its sub-screens. */
export class AutomatizimetLogic extends DCLogic<Props, State> {
  state: State = {
    pages: {},
    screen: 'overview',
    period: 'today',
    overrides: {},
    decisions: {},
    routingRules: null,
    settings: {},
    config: {},
    publications: [],
    ruleLog: [],
    // routing
    routingFilter: 'all',
    selRouting: null,
    reassignOpen: false,
    reassignDept: '',
    reassignReason: '',
    // priority
    priorityFilter: 'all',
    selPriority: null,
    priorityOpen: false,
    priorityDraft: '',
    priorityReason: '',
    // duplicates
    dupFormFor: null,
    dupFormKind: null,
    dupReason: '',
    // moderation
    selModeration: null,
    modAction: null,
    modReason: '',
    modEdit: '',
    // missing information
    selMissing: null,
    missEditOpen: false,
    missDraft: '',
    // verification
    selVerification: null,
    verifyReopenOpen: false,
    verifyReason: '',
    // publications
    pubSelected: ['02468', '02466'],
    pubEditing: false,
    pubDraft: null,
    pubNotice: '',
    // activity / overrides / audit filters
    actType: '',
    actLimit: 30,
    ovType: '',
    ovClerk: '',
    ovDept: '',
    ovSearch: '',
    auActor: 'all',
    auType: '',
    auClerk: '',
    auSearch: '',
    auLimit: 40,
    // rules & configuration
    configTab: 'rules',
    ruleGroup: 'routing',
    selRule: null,
    ruleEditing: false,
    ruleDraft: null,
    ruleTested: false,
    ruleHistoryOpen: false,
  };

  _setPage(key: string, p: number) {
    this.setState({ pages: Object.assign({}, this.state.pages, { [key]: p }) });
  }
  componentDidMount() {
    const read = readJSON;
    const patch: Partial<State> = {
      overrides: read(STORAGE_KEYS.caseOverrides, {}),
      decisions: read(STORAGE_KEYS.automationDecisions, {}),
      routingRules: read(STORAGE_KEYS.routingRules, null),
      settings: read(STORAGE_KEYS.automationSettings, {}),
      config: read(STORAGE_KEYS.automationConfig, {}),
      publications: read(STORAGE_KEYS.publications, []),
      ruleLog: read(STORAGE_KEYS.ruleChanges, []),
    };
    // one-shot deep link from another page: { screen, caseId }
    const focus = read<{ screen?: AutoScreen; caseId?: string } | null>(STORAGE_KEYS.autoFocus, null);
    if (focus && focus.screen) {
      patch.screen = focus.screen;
      if (focus.caseId) {
        if (focus.screen === 'routing') patch.selRouting = focus.caseId;
        if (focus.screen === 'priority') patch.selPriority = focus.caseId;
        if (focus.screen === 'verification') patch.selVerification = focus.caseId;
        if (focus.screen === 'missing') patch.selMissing = focus.caseId;
      }
      remove(STORAGE_KEYS.autoFocus);
    }
    this.setState(patch);
  }

  // ---- persistence helpers ------------------------------------------------
  _save(key: string, value: unknown) {
    writeJSON(key, value);
  }
  _patchOverride(id: string, patch: CaseOverride) {
    const overrides = Object.assign({}, this.state.overrides);
    overrides[id] = Object.assign({}, overrides[id], patch);
    this._save(STORAGE_KEYS.caseOverrides, overrides);
    this.setState({ overrides: overrides });
  }
  _decide(key: string, value: Partial<AutoDecision> & { decision: string }) {
    const decisions = Object.assign({}, this.state.decisions);
    decisions[key] = Object.assign({ at: SINJAL.now.toISOString(), by: 'Drita K.' }, value);
    this._save(STORAGE_KEYS.automationDecisions, decisions);
    this.setState({ decisions: decisions });
  }
  _rules(): RoutingRule[] {
    return this.state.routingRules || SINJAL.automation.routingRules.map((r) => Object.assign({}, r));
  }
  _saveRules(rules: RoutingRule[], logEntry?: { ruleId: string; label: string }) {
    this._save(STORAGE_KEYS.routingRules, rules);
    const patch: Partial<State> = { routingRules: rules };
    if (logEntry) {
      const log = this.state.ruleLog.concat([Object.assign({ at: SINJAL.now.toISOString(), by: 'Drita K.' }, logEntry)]);
      this._save(STORAGE_KEYS.ruleChanges, log);
      patch.ruleLog = log;
    }
    this.setState(patch);
  }
  _setSetting(type: string, patch: TypeSetting) {
    const settings = Object.assign({}, this.state.settings);
    settings[type] = Object.assign({}, settings[type], patch);
    this._save(STORAGE_KEYS.automationSettings, settings);
    const log = this.state.ruleLog.concat([
      {
        at: SINJAL.now.toISOString(),
        by: 'Drita K.',
        ruleId: 'setting:' + type,
        label: patch.active === undefined ? 'Niveli i autonomisë u ndryshua' : patch.active ? 'Automatizimi u aktivizua' : 'Automatizimi u çaktivizua',
      },
    ]);
    this._save(STORAGE_KEYS.ruleChanges, log);
    this.setState({ settings: settings, ruleLog: log });
  }
  _setConfig(patch: Rec) {
    const config = Object.assign({}, this.state.config, patch);
    this._save(STORAGE_KEYS.automationConfig, config);
    this.setState({ config: config });
  }
  _select(id: string) {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }
  _go(screen: AutoScreen, extra?: Partial<State>) {
    this.setState(Object.assign({ screen: screen }, extra || {}));
  }

  // ---- routing actions ----------------------------------------------------
  _confirmRouting(id: string) {
    this._decide('route:' + id, { decision: 'confirm' });
  }
  _saveReassign(id: string, fromName: string) {
    const S = SINJAL;
    const reason = (this.state.reassignReason || '').trim();
    const dept = this.state.reassignDept;
    if (!dept || !reason) return;
    const ov = this.state.overrides[id] || {};
    const log = (ov.reassignLog || []).concat([{ at: S.now.toISOString(), from: fromName, to: S.deptName(dept), by: 'Drita K.', reason: reason }]);
    this._patchOverride(id, { department: dept as Report['department'], responsible: null, reassignLog: log });
    this.setState({ reassignOpen: false, reassignDept: '', reassignReason: '' });
  }
  // ---- priority actions ---------------------------------------------------
  _savePriority(id: string, fromPriority: string) {
    const S = SINJAL;
    const reason = (this.state.priorityReason || '').trim();
    const to = this.state.priorityDraft;
    if (!to || to === fromPriority || !reason) return;
    const ov = this.state.overrides[id] || {};
    const log = ((ov.priorityLog as Rec[]) || []).concat([{ at: S.now.toISOString(), from: fromPriority, to: to, by: 'Drita K.', reason: reason }]);
    this._patchOverride(id, { priority: to as Report['priority'], priorityLog: log });
    this.setState({ priorityOpen: false, priorityDraft: '', priorityReason: '' });
  }
  // ---- duplicate actions --------------------------------------------------
  _dupLink(c: DupPair) {
    this._decide('dup:' + c.id, { decision: 'link' });
    this._patchOverride(c.newer, { status: 'Dublikatë', duplicateOf: c.older });
  }
  _dupSubmit(c: DupPair) {
    const reason = (this.state.dupReason || '').trim();
    if (!reason) return;
    if (this.state.dupFormKind === 'undo') {
      this._decide('dup:' + c.id, { decision: 'undo', reason: reason });
      this._patchOverride(c.newer, { status: 'Në shqyrtim', duplicateOf: null });
    } else {
      this._decide('dup:' + c.id, { decision: 'separate', reason: reason });
    }
    this.setState({ dupFormFor: null, dupFormKind: null, dupReason: '' });
  }
  // ---- moderation actions -------------------------------------------------
  _modSubmit(flag: ModerationFlag) {
    const act = this.state.modAction;
    const reason = (this.state.modReason || '').trim();
    if (act === 'edit') {
      const txt = (this.state.modEdit || '').trim();
      if (!txt) return;
      this._decide('mod:' + flag.id, { decision: 'edit', editedText: txt, reason: reason || 'Përmbajtja u redaktua para publikimit.' });
    } else if (act === 'allow' || act === 'reject') {
      if (!reason) return;
      this._decide('mod:' + flag.id, { decision: act, reason: reason });
      if (act === 'reject') this._patchOverride(flag.reportId, { status: 'Refuzuar' });
    } else return;
    this.setState({ modAction: null, modReason: '', modEdit: '' });
  }
  // ---- missing-information actions ----------------------------------------
  _missAction(item: MissingInfoRequest, kind: string) {
    const S = SINJAL;
    if (kind === 'resend') {
      const msg = (this.state.missEditOpen ? this.state.missDraft : item.message).trim();
      if (!msg) return;
      const ov = this.state.overrides[item.reportId] || {};
      this._patchOverride(item.reportId, { citizenRequests: (ov.citizenRequests || []).concat([{ at: S.now.toISOString(), label: msg }]) });
      this._decide('miss:' + item.reportId, { decision: 'resend', message: msg });
      this.setState({ missEditOpen: false, missDraft: '' });
    } else {
      this._decide('miss:' + item.reportId, { decision: kind });
    }
  }
  // ---- verification actions -----------------------------------------------
  _verifyAccept(id: string) {
    this._patchOverride(id, { status: 'Mbyllur', acceptedAt: SINJAL.now.toISOString() });
  }
  _verifyReopen(id: string, fromStatus: string) {
    const reason = (this.state.verifyReason || '').trim();
    if (!reason) return;
    const ov = this.state.overrides[id] || {};
    this._patchOverride(id, { status: 'Në punë', reopenLog: (ov.reopenLog || []).concat([{ at: SINJAL.now.toISOString(), from: fromStatus, by: 'Drita K.', reason: reason }]) });
    this.setState({ verifyReopenOpen: false, verifyReason: '' });
  }
  // ---- publication actions ------------------------------------------------
  _togglePubCase(id: string) {
    const sel = this.state.pubSelected.indexOf(id) === -1 ? this.state.pubSelected.concat([id]) : this.state.pubSelected.filter((x) => x !== id);
    this.setState({ pubSelected: sel, pubDraft: null, pubEditing: false, pubNotice: '' });
  }
  _publish(text: string | null, status: string) {
    const S = SINJAL;
    if (!text || !this.state.pubSelected.length) return;
    const pubs = this.state.publications.concat([
      { id: 'pub-' + (this.state.publications.length + 2), caseIds: this.state.pubSelected.slice(), at: S.now.toISOString(), by: 'Drita K.', status: status, text: text },
    ]);
    this._save(STORAGE_KEYS.publications, pubs);
    this.setState({
      publications: pubs,
      pubSelected: [],
      pubDraft: null,
      pubEditing: false,
      pubNotice: status === 'Publikuar' ? 'Njoftimi u publikua për qytetarët.' : 'Drafti u kthye për shqyrtim.',
    });
  }
  // ---- rule actions -------------------------------------------------------
  _toggleRule(id: string) {
    const rules = this._rules().map((r) => (r.id === id ? Object.assign({}, r, { active: !r.active }) : r));
    const r = rules.filter((x) => x.id === id)[0];
    this._saveRules(rules, { ruleId: id, label: r.active ? 'Rregulli u aktivizua' : 'Rregulli u çaktivizua' });
  }
  _moveRule(id: string, dir: number) {
    const rules = this._rules();
    const i = rules.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rules.length) return;
    const t = rules[i];
    rules[i] = rules[j];
    rules[j] = t;
    this._saveRules(rules, { ruleId: id, label: dir < 0 ? 'Rregulli u zhvendos lart në renditje' : 'Rregulli u zhvendos poshtë në renditje' });
  }
  _duplicateRule(id: string) {
    const rules = this._rules();
    const i = rules.findIndex((r) => r.id === id);
    if (i < 0) return;
    const maxNo = rules.reduce((m, r) => Math.max(m, r.no), 0);
    const copy = Object.assign({}, rules[i], { id: 'rr' + (maxNo + 1) + '-' + rules.length, no: maxNo + 1, active: false });
    rules.splice(i + 1, 0, copy);
    this._saveRules(rules, { ruleId: copy.id, label: 'Krijuar si kopje e rregullit #' + rules[i].no + ' (joaktiv)' });
    this.setState({ selRule: copy.id, ruleEditing: true, ruleDraft: Object.assign({}, copy), ruleTested: false, ruleHistoryOpen: false });
  }
  _openRule(id: string) {
    const r = this._rules().filter((x) => x.id === id)[0];
    this.setState({
      screen: 'config',
      configTab: 'rules',
      ruleGroup: 'routing',
      selRule: id,
      ruleEditing: false,
      ruleDraft: r ? Object.assign({}, r) : null,
      ruleTested: false,
      ruleHistoryOpen: false,
    });
  }
  _setRuleDraft(patch: Rec) {
    const d = Object.assign({}, this.state.ruleDraft, patch);
    if (patch.dept) {
      const teams = SINJAL.automation.teams[patch.dept as Report['department']] || [];
      d.team = teams[0] || '';
    }
    this.setState({ ruleDraft: d, ruleTested: false });
  }
  _saveRuleDraft() {
    const d = this.state.ruleDraft;
    if (!d || !d.category || !d.dept) return;
    const before = this._rules().filter((x) => x.id === d.id)[0];
    const rules = this._rules().map((r) =>
      r.id === d.id ? Object.assign({}, r, { category: d.category, zone: d.zone || null, dept: d.dept, team: d.team, exception: (d.exception || '').trim() || null }) : r,
    );
    const S = SINJAL;
    const changes = [];
    if (before.category !== d.category) changes.push('kategoria → ' + S.catLabel(d.category));
    if ((before.zone || '') !== (d.zone || '')) changes.push('zona → ' + (d.zone || 'Çdo zonë'));
    if (before.dept !== d.dept) changes.push('departamenti → ' + S.deptName(d.dept));
    if (before.team !== d.team) changes.push('ekipi → ' + d.team);
    if ((before.exception || '') !== (d.exception || '').trim()) changes.push('përjashtimi u ndryshua');
    this._saveRules(rules, { ruleId: d.id, label: changes.length ? 'U ndryshua: ' + changes.join(', ') : 'U ruajt pa ndryshime' });
    this.setState({ ruleEditing: false, ruleTested: false });
  }

  renderVals() {
    const S = SINJAL;
    // seeded ids referenced by the authored automation data always exist
    const byId = (id: string): Report => S.byId(id) as Report;
    const A = S.automation;
    const NOW = S.now;
    const HOUR = 3600000;
    const at = (base: Date, hours: number) => new Date(base.getTime() + hours * HOUR);
    const st = this.state;
    const overrides = st.overrides || {};
    const decisions = st.decisions || {};
    // ---- pagination: every list/table shows a fixed page, so cards keep
    // their size and side-by-side panels stay balanced ---------------------
    const pager = <T>(key: string, list: T[], size: number) => {
      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / size));
      const p = Math.min(pages, Math.max(1, (this.state.pages || {})[key] || 1));
      const start = (p - 1) * size;
      const nums: { n: number | string; isNum: boolean; isGap: boolean; onClass: string; onClick: () => void }[] = [];
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

    const CLOSED = ['Zgjidhur', 'Mbyllur', 'Dublikatë', 'Refuzuar'];
    const TYPE_LABEL: Record<string, string> = {
      routing: 'Routing',
      priority: 'Prioriteti',
      duplicates: 'Dublikatat',
      moderation: 'Moderimi',
      missing: 'Info e munguar',
      sla: 'SLA',
      verification: 'Verifikimi',
      publications: 'Publikimet',
      case: 'Rasti',
    };
    const OUTCOME: Record<string, { color: string; label: string }> = {
      auto: { color: '#2E7D4F', label: 'Automatik' },
      review: { color: '#B8860B', label: 'Për shqyrtim' },
      held: { color: '#C23B31', label: 'I mbajtur' },
      blocked: { color: '#C23B31', label: 'I bllokuar' },
      override: { color: '#B8860B', label: 'Ndërhyrje njerëzore' },
      human: { color: '#4A4640', label: 'Veprim njerëzor' },
      citizen: { color: '#6B665F', label: 'Qytetari' },
    };
    const eff = (r: Report): Rec => {
      const ov = overrides[r.id] || {};
      const e: Rec = Object.assign({}, r, ov);
      if (ov.status) e.status = ov.status;
      e.departmentName = S.deptName(e.department);
      e.responsibleName = e.responsible ? S.empName(e.responsible) : null;
      return e;
    };
    const effById: Record<string, Rec> = {};
    S.reports.forEach((r) => {
      effById[r.id] = eff(r);
    });
    const isOpen = (e: Rec) => CLOSED.indexOf(e.status) === -1;
    const setting = (type: string) => {
      const t = A.types.filter((x) => x.id === type)[0];
      const s = st.settings[type] || {};
      return { active: s.active === undefined ? true : s.active, autonomy: s.autonomy || t.defaultAutonomy };
    };
    const cfg = Object.assign(
      {
        dupLinkThreshold: 85,
        dupFlagThreshold: 60,
        missingRequired: { location: true, photo: true, description: true, category: false },
        resolutionRequired: { description: true, evidence: true, beforeAfter: true, location: true },
        pubRules: { draft: true, onlyClosed: true, maskSchools: true, autoPublish: false },
        priorityActive: {},
        slaActive: {},
      },
      st.config || {},
    );
    const confColor = (c: number) => A.tierMeta[A.confTier(c)].color;

    // ======================================================================
    // 1. Build every automation record + the unified event log
    // ======================================================================
    const events: Rec[] = [];
    let seq = 0;
    const push = (e: Rec) => {
      e.seq = seq++;
      events.push(e);
      return e;
    };
    const clerkFor = (r: Report) => A.clerks[(parseInt(r.id, 10) || 0) % 2];

    // ---- Routing ---------------------------------------------------------
    const routing: Rec[] = S.reports.map((r) => {
      const e = effById[r.id];
      const conf = r.ai.confidence;
      const tier = A.confTier(conf);
      const rule = A.matchRule(A.routingRules, r);
      const autoDept = rule ? rule.dept : null;
      const autoTeam = rule ? rule.team : null;
      const time = at(r.submittedAt, 0.05);
      const target = tier === 'low' ? A.intake : S.deptName(autoDept as string) + ' → ' + autoTeam;
      const hist = A.historicalOverrides.filter((h) => h.kind === 'routing' && h.reportId === r.id)[0];
      const sessionLog = (overrides[r.id] && overrides[r.id].reassignLog) || [];
      const lastSession = sessionLog.length ? sessionLog[sessionLog.length - 1] : null;
      const overridden = tier !== 'low' && e.department !== autoDept;
      let override: Rec = null;
      if (overridden) {
        if (lastSession) override = { from: lastSession.from, to: lastSession.to, by: lastSession.by, reason: lastSession.reason, time: new Date(lastSession.at) };
        else if (hist) override = { from: hist.from, to: hist.to, by: hist.by, reason: hist.reason, time: at(r.submittedAt, hist.hoursAfterSubmit) };
        else override = { from: S.deptName(autoDept as string), to: e.departmentName, by: 'Stafi', reason: 'Arsye e paregjistruar.', time: at(r.submittedAt, 0.5) };
      }
      const confirmed = decisions['route:' + r.id];
      let stateKey: string;
      if (overridden) stateKey = 'override';
      else if (tier === 'high') stateKey = 'auto';
      else if (tier === 'medium') stateKey = confirmed || e.responsible || !isOpen(e) ? 'confirmed' : 'review';
      else stateKey = e.responsible || !isOpen(e) || confirmed ? 'manual' : 'intake';
      const STATE = (
        {
          auto: { label: 'Automatik', bg: '#E1EEE5', ink: '#1E5C3A', dot: '#2E7D4F' },
          review: { label: 'Shqyrtim', bg: '#F5EBD6', ink: '#7A5A0B', dot: '#B8860B' },
          confirmed: { label: 'Konfirmuar', bg: '#EDEAE3', ink: '#4A4640', dot: '#2E7D4F' },
          intake: { label: 'Pranimi i përgjithshëm', bg: '#F6E1DE', ink: '#8E2A22', dot: '#C23B31' },
          manual: { label: 'Vendosur manualisht', bg: '#EDEAE3', ink: '#4A4640', dot: '#6B665F' },
          override: { label: 'Ndërhyrje njerëzore', bg: '#F5EBD6', ink: '#7A5A0B', dot: '#B8860B' },
        } as Record<string, { label: string; bg: string; ink: string; dot: string }>
      )[stateKey];
      push({
        key: 'routing:' + r.id,
        refKey: 'routing:' + r.id,
        time: time,
        caseId: r.id,
        type: 'routing',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: tier === 'low' ? 'Routing i pamundur me siguri' : 'Routing automatik',
        body: tier === 'low' ? 'Besueshmëri e pamjaftueshme për një vendim automatik.' : target,
        result: target,
        outcome: tier === 'high' ? 'auto' : tier === 'medium' ? 'review' : 'held',
        conf: conf,
      });
      if (override) {
        push({
          key: 'routing-ov:' + r.id,
          refKey: 'routing:' + r.id,
          time: override.time,
          caseId: r.id,
          type: 'routing',
          human: true,
          actor: override.by,
          actorKind: 'clerk',
          isOverride: true,
          title: 'Ndërhyrje njerëzore',
          body: 'SINJAL caktoi: ' + override.from + ' · ' + override.by + ' ndryshoi: ' + override.to,
          result: override.from + ' → ' + override.to,
          reason: override.reason,
          outcome: 'override',
          autoAction: override.from,
          humanAction: override.to,
          dept: e.department,
        });
      }
      // earlier session reassignments beyond the latest one are real history too
      sessionLog.slice(0, -1).forEach((l, i) =>
        push({
          key: 'routing-ovh:' + r.id + ':' + i,
          refKey: 'routing:' + r.id,
          time: new Date(l.at),
          caseId: r.id,
          type: 'routing',
          human: true,
          actor: l.by,
          actorKind: 'clerk',
          isOverride: true,
          title: 'Ndërhyrje njerëzore',
          body: l.from + ' → ' + l.to,
          result: l.from + ' → ' + l.to,
          reason: l.reason,
          outcome: 'override',
          autoAction: l.from,
          humanAction: l.to,
          dept: e.department,
        }),
      );
      if (confirmed)
        push({
          key: 'routing-ok:' + r.id,
          refKey: 'routing:' + r.id,
          time: new Date(confirmed.at),
          caseId: r.id,
          type: 'routing',
          human: true,
          actor: confirmed.by,
          actorKind: 'clerk',
          title: 'Routing u konfirmua',
          body: target,
          result: 'Konfirmuar',
          outcome: 'human',
        });
      else if (r.responsible && tier !== 'low' && !hist)
        push({
          key: 'routing-acc:' + r.id,
          refKey: 'routing:' + r.id,
          time: at(r.submittedAt, 0.4),
          caseId: r.id,
          type: 'routing',
          human: true,
          actor: clerkFor(r),
          actorKind: 'clerk',
          title: 'Caktimi u pranua',
          body: r.departmentName + ' · ' + r.responsibleName,
          result: 'Pranuar',
          outcome: 'human',
        });
      if (tier === 'low' && r.responsible)
        push({
          key: 'routing-man:' + r.id,
          refKey: 'routing:' + r.id,
          time: at(r.submittedAt, 0.5),
          caseId: r.id,
          type: 'routing',
          human: true,
          actor: clerkFor(r),
          actorKind: 'clerk',
          title: 'Departamenti u vendos manualisht',
          body: A.intake + ' → ' + r.departmentName,
          result: r.departmentName,
          outcome: 'human',
        });
      return { r: r, e: e, conf: conf, tier: tier, rule: rule, autoDept: autoDept, autoTeam: autoTeam, target: target, time: time, override: override, stateKey: stateKey, state: STATE };
    });
    const routingById: Record<string, Rec> = {};
    routing.forEach((x) => {
      routingById[x.r.id] = x;
    });

    // ---- Priority --------------------------------------------------------
    const priority: Rec[] = S.reports.map((r) => {
      const e = effById[r.id];
      const cat = S.categories.filter((c) => c.id === r.category)[0];
      const auto = r.ai.suggestedPriority;
      const base = cat ? cat.defaultPriority : auto;
      const time = at(r.submittedAt, 0.06);
      const W = S.priorityMeta;
      const dir = W[auto].weight > W[base].weight ? 'up' : W[auto].weight < W[base].weight ? 'down' : 'same';
      const all = A.priorityReasons(r);
      const riskReasons = all.filter((t) => t.indexOf('Prioriteti bazë') === -1);
      let reasons: string[];
      if (dir === 'up') reasons = (riskReasons.length ? riskReasons : ['Rregulli i përjashtimit të kategorisë u aktivizua']).concat(['Prioriteti bazë i kategorisë: ' + base]);
      else if (dir === 'down') reasons = ['Risku i vlerësuar: ' + r.ai.risk + ' — asnjë rrezik i menjëhershëm për sigurinë', 'Prioriteti bazë i kategorisë: ' + base + ', u ul një nivel'];
      else reasons = ['Përputhet me prioritetin bazë të kategorisë: ' + base].concat(riskReasons.length ? ['Faktorë të vlerësuar: ' + riskReasons.join('; ').toLowerCase()] : []);
      const hist = A.historicalOverrides.filter((h) => h.kind === 'priority' && h.reportId === r.id)[0];
      const log: Rec[] = (overrides[r.id] && (overrides[r.id].priorityLog as Rec[])) || [];
      const changes: Rec[] = [];
      if (hist) changes.push({ from: hist.from, to: hist.to, by: hist.by, reason: hist.reason, time: at(r.submittedAt, hist.hoursAfterSubmit) });
      log.forEach((l) => changes.push({ from: l.from, to: l.to, by: l.by, reason: l.reason, time: new Date(l.at) }));
      if (!changes.length && e.priority !== auto) changes.push({ from: auto, to: e.priority, by: 'Stafi', reason: 'Ndryshuar gjatë caktimit (arsye e paregjistruar).', time: at(r.submittedAt, 0.5) });
      push({
        key: 'priority:' + r.id,
        refKey: 'priority:' + r.id,
        time: time,
        caseId: r.id,
        type: 'priority',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: 'Prioritet automatik: ' + auto,
        body: dir === 'same' ? 'Sipas rregullit të kategorisë' : (dir === 'up' ? 'Ngritur nga baza ' : 'Ulur nga baza ') + base + ' → ' + auto + ' · ' + reasons[0],
        result: auto,
        outcome: 'auto',
      });
      changes.forEach((c, i) =>
        push({
          key: 'priority-ov:' + r.id + ':' + i,
          refKey: 'priority:' + r.id,
          time: c.time,
          caseId: r.id,
          type: 'priority',
          human: true,
          actor: c.by,
          actorKind: 'clerk',
          isOverride: true,
          title: 'Ndërhyrje njerëzore',
          body: c.from + ' → ' + c.to,
          result: c.from + ' → ' + c.to,
          reason: c.reason,
          outcome: 'override',
          autoAction: c.from,
          humanAction: c.to,
          dept: e.department,
        }),
      );
      return { r: r, e: e, auto: auto, base: base, dir: dir, reasons: reasons, time: time, changes: changes, overridden: e.priority !== auto };
    });
    const priorityById: Record<string, Rec> = {};
    priority.forEach((x) => {
      priorityById[x.r.id] = x;
    });

    // ---- Duplicates ------------------------------------------------------
    const dups: Rec[] = A.duplicateCandidates.map((c) => {
      const ra = byId(c.a),
        rb = byId(c.b);
      const latest = ra.submittedAt >= rb.submittedAt ? ra : rb;
      const newerR = c.dupe ? byId(c.dupe) : latest; // the case marked Dublikatë when linked
      const olderR = newerR === ra ? rb : ra; // the primary case it links to
      const gapH = Math.abs(ra.submittedAt.getTime() - rb.submittedAt.getTime()) / HOUR;
      const time = at(latest.submittedAt, 0.08);
      const seedDecision: Rec = c.decision ? { decision: c.decision.decision, by: c.decision.by, reason: c.decision.reason, time: at(latest.submittedAt, c.decision.hoursAfterNewer as number) } : null;
      const sd = decisions['dup:' + c.id];
      const decision = sd ? { decision: sd.decision, by: sd.by, reason: sd.reason, time: new Date(sd.at) } : seedDecision;
      let stateKey: string;
      if (decision && decision.decision === 'undo') stateKey = 'undone';
      else if (decision && decision.decision === 'separate') stateKey = 'separate';
      else if (decision && decision.decision === 'link') stateKey = 'linked';
      else if (c.autoLinked) stateKey = 'autolinked';
      else stateKey = 'pending';
      push({
        key: 'dup:' + c.id,
        refKey: 'dup:' + c.id,
        time: time,
        caseId: newerR.id,
        type: 'duplicates',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: c.autoLinked ? 'Lidhje automatike' : 'Dublikatë e mundshme',
        body: newerR.displayId + ' ↔ ' + olderR.displayId + ' · ' + c.similarity + '% ngjashmëri',
        result: c.autoLinked ? 'U lidhën automatikisht' : 'Sinjalizuar për shqyrtim',
        outcome: c.autoLinked ? 'auto' : 'review',
        conf: c.similarity,
      });
      if (decision) {
        const isOv = decision.decision === 'undo' || decision.decision === 'separate';
        push({
          key: 'dup-d:' + c.id,
          refKey: 'dup:' + c.id,
          time: decision.time,
          caseId: newerR.id,
          type: 'duplicates',
          human: true,
          actor: decision.by,
          actorKind: 'clerk',
          isOverride: isOv,
          title: decision.decision === 'link' ? 'Dublikata u konfirmua' : decision.decision === 'undo' ? 'Lidhja automatike u zhbë' : 'U mbajtën të ndara',
          body: newerR.displayId + ' ↔ ' + olderR.displayId,
          result: decision.decision === 'link' ? 'Lidhur' : 'Të ndara',
          reason: decision.reason,
          outcome: isOv ? 'override' : 'human',
          autoAction: c.autoLinked ? 'Lidhje automatike' : 'Dublikatë e mundshme',
          humanAction: decision.decision === 'link' ? 'Lidhur' : 'Të ndara',
          dept: effById[newerR.id].department,
        });
      }
      return {
        c: c,
        id: c.id,
        newer: newerR.id,
        older: olderR.id,
        newerR: newerR,
        olderR: olderR,
        gapH: gapH,
        time: time,
        decision: decision,
        stateKey: stateKey,
        sameCategory: ra.category === rb.category,
        sameZone: ra.zone === rb.zone,
      };
    });

    // ---- Moderation ------------------------------------------------------
    const moderation: Rec[] = A.moderationFlags.map((f) => {
      const r = byId(f.reportId);
      const time = at(r.submittedAt, f.hoursAfterSubmit);
      const typeLabel = A.moderationTypes.filter((t) => t.id === f.type)[0].label;
      const held = f.confidence >= 70;
      const seed: Rec = f.decision
        ? { decision: f.decision.decision, by: f.decision.by, reason: f.decision.reason, editedText: f.decision.editedText, time: at(r.submittedAt, f.decision.hoursAfterSubmit as number) }
        : null;
      const sd = decisions['mod:' + f.id];
      const decision = sd ? { decision: sd.decision, by: sd.by, reason: sd.reason, editedText: sd.editedText, time: new Date(sd.at) } : seed;
      push({
        key: 'mod:' + f.id,
        refKey: 'mod:' + f.id,
        time: time,
        caseId: r.id,
        type: 'moderation',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: 'Moderim: ' + typeLabel,
        body: held ? 'Publikimi publik u pezullua; rasti vazhdon përpunimin.' : 'Sinjalizuar pa veprim — besueshmëri e ulët.',
        result: held ? 'Publikimi u pezullua' : 'Sinjalizuar',
        outcome: held ? 'held' : 'review',
        conf: f.confidence,
      });
      if (decision) {
        const DEC: Record<string, string> = { allow: 'U lejua', edit: 'U redaktua', reject: 'U refuzua' };
        const isOv = decision.decision === 'allow';
        push({
          key: 'mod-d:' + f.id,
          refKey: 'mod:' + f.id,
          time: decision.time,
          caseId: r.id,
          type: 'moderation',
          human: true,
          actor: decision.by,
          actorKind: 'clerk',
          isOverride: isOv,
          title: DEC[decision.decision],
          body: typeLabel,
          result: DEC[decision.decision],
          reason: decision.reason,
          outcome: isOv ? 'override' : 'human',
          autoAction: held ? 'Pezulluar' : 'Sinjalizuar',
          humanAction: DEC[decision.decision],
          dept: effById[r.id].department,
        });
      }
      return { f: f, r: r, e: effById[r.id], time: time, typeLabel: typeLabel, held: held, decision: decision };
    });

    // ---- Missing information --------------------------------------------
    const missing: Rec[] = A.missingInfo.map((m) => {
      const r = byId(m.reportId);
      const time = at(r.submittedAt, m.hoursAfterSubmit);
      const sd = decisions['miss:' + m.reportId];
      let stateKey: string = m.state;
      if (sd && sd.decision === 'proceed') stateKey = 'proceeded';
      if (sd && sd.decision === 'escalate') stateKey = 'escalated';
      push({
        key: 'miss:' + r.id,
        refKey: 'miss:' + r.id,
        time: time,
        caseId: r.id,
        type: 'missing',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: 'Kërkesë automatike për informacion',
        body: m.problem,
        result: 'Dërguar qytetarit',
        outcome: m.state === 'waiting' ? 'blocked' : 'auto',
      });
      if (m.state === 'answered')
        push({
          key: 'miss-ans:' + r.id,
          refKey: 'miss:' + r.id,
          time: at(r.submittedAt, m.answeredHoursAfterSubmit as number),
          caseId: r.id,
          type: 'missing',
          human: false,
          actor: 'Qytetari',
          actorKind: 'citizen',
          title: 'Qytetari u përgjigj',
          body: m.answer,
          result: 'Informacioni u plotësua',
          outcome: 'citizen',
        });
      if (sd) {
        const LBL: Record<string, string> = { resend: 'Kërkesa u ridërgua', proceed: 'Vazhdoi pa informacion', escalate: 'U përshkallëzua te pranimi' };
        push({
          key: 'miss-d:' + r.id,
          refKey: 'miss:' + r.id,
          time: new Date(sd.at),
          caseId: r.id,
          type: 'missing',
          human: true,
          actor: sd.by,
          actorKind: 'clerk',
          isOverride: sd.decision === 'proceed',
          title: LBL[sd.decision],
          body: sd.message || m.problem,
          result: LBL[sd.decision],
          reason: sd.decision === 'proceed' ? 'Informacioni ekzistues mjafton për ndërhyrjen.' : null,
          outcome: sd.decision === 'proceed' ? 'override' : 'human',
          autoAction: 'Kërkesë për informacion',
          humanAction: LBL[sd.decision],
          dept: effById[r.id].department,
        });
      }
      return { m: m, r: r, e: effById[r.id], time: time, stateKey: stateKey, decision: sd || null };
    });

    // ---- SLA escalation (derived from real deadlines) --------------------
    const slaEvents: Rec[] = [];
    S.reports.forEach((r) => {
      const e = effById[r.id];
      const baseClosed = CLOSED.indexOf(r.status) !== -1;
      if (baseClosed) return;
      const slaH = (r.slaDeadline.getTime() - r.submittedAt.getTime()) / HOUR;
      const warnAt = at(r.slaDeadline, -0.25 * slaH);
      if (warnAt <= NOW)
        slaEvents.push({ rule: 's1', r: r, e: e, time: warnAt, title: 'SLA e mbetur < 25%', result: 'Njoftuar: ' + (r.responsibleName || 'përgjegjësi i ' + r.departmentName), severity: 'warn' });
      if (r.slaDeadline <= NOW)
        slaEvents.push({ rule: 's2', r: r, e: e, time: r.slaDeadline, title: 'SLA e shkelur', result: 'Përshkallëzuar te përgjegjësi i departamentit ' + r.departmentName, severity: 'breach' });
      if (!r.responsible && at(r.submittedAt, 24) <= NOW)
        slaEvents.push({ rule: 's3', r: r, e: e, time: at(r.submittedAt, 24), title: 'Pa përgjegjës > 24 orë', result: 'Përshkallëzuar te ' + A.intake, severity: 'breach' });
    });
    slaEvents.forEach((s) =>
      push({
        key: 'sla:' + s.r.id + ':' + s.rule,
        refKey: 'sla:' + s.r.id + ':' + s.rule,
        time: s.time,
        caseId: s.r.id,
        type: 'sla',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: s.title,
        body: s.result,
        result: s.result,
        outcome: s.severity === 'breach' ? 'held' : 'auto',
      }),
    );
    S.reports.forEach((r) => {
      const ov = overrides[r.id] || {};
      if (ov.escalated && ov.escalatedAt)
        push({
          key: 'sla-man:' + r.id,
          refKey: 'sla-man:' + r.id,
          time: new Date(ov.escalatedAt),
          caseId: r.id,
          type: 'sla',
          human: true,
          actor: 'Drita K.',
          actorKind: 'clerk',
          title: 'Përshkallëzim manual',
          body: 'Te përgjegjësi i departamentit ' + effById[r.id].departmentName,
          result: 'Përshkallëzuar',
          outcome: 'human',
        });
    });

    // ---- Resolution verification ----------------------------------------
    const verification: Rec[] = S.reports
      .filter((r) => r.status === 'Zgjidhur' || r.status === 'Mbyllur')
      .map((r) => {
        const e = effById[r.id];
        const ov = overrides[r.id] || {};
        const slaH = (r.slaDeadline.getTime() - r.submittedAt.getTime()) / HOUR;
        const time = at(r.submittedAt, slaH * 0.75 + 0.02);
        const hasEvidence = r.resolutionEvidence.length > 0;
        const visual: string = A.verifyVisual[r.id] || 'pass';
        const req = cfg.resolutionRequired;
        const checks = [
          { label: 'Përshkrimi i zgjidhjes', state: 'pass', required: req.description },
          { label: 'Dëshmi e zgjidhjes', state: hasEvidence ? 'pass' : 'fail', required: req.evidence },
          { label: 'Foto para / pas', state: r.photo && hasEvidence ? 'pass' : 'fail', required: req.beforeAfter },
          { label: 'Konsistenca e vendndodhjes', state: 'pass', required: req.location },
          { label: 'Konsistenca vizuale me problemin', state: visual, required: true },
        ];
        const result = checks.some((c) => c.required && c.state !== 'pass') ? 'review' : 'pass';
        let decision: Rec = null;
        if (r.status === 'Mbyllur') decision = { decision: 'accept', by: clerkFor(r), time: r.slaDeadline };
        if (ov.acceptedAt && e.status === 'Mbyllur') decision = { decision: 'accept', by: 'Drita K.', time: new Date(ov.acceptedAt) };
        if (ov.reopenLog && ov.reopenLog.length) {
          const l = ov.reopenLog[ov.reopenLog.length - 1];
          decision = { decision: 'reopen', by: l.by, reason: l.reason, time: new Date(l.at) };
        }
        push({
          key: 'ver:' + r.id,
          refKey: 'ver:' + r.id,
          time: time,
          caseId: r.id,
          type: 'verification',
          human: false,
          actor: 'SINJAL',
          actorKind: 'system',
          title: result === 'pass' ? 'Verifikimi kaloi' : 'Verifikimi kërkon shqyrtim',
          body: result === 'pass' ? 'Zgjidhja duket në përputhje me problemin.' : 'Dëshmia e dërguar mund të mos e tregojë zgjidhjen.',
          result: result === 'pass' ? 'Kaloi' : 'Shqyrtim',
          outcome: result === 'pass' ? 'auto' : 'review',
        });
        if (decision) {
          const isOv = (decision.decision === 'accept' && result === 'review') || (decision.decision === 'reopen' && result === 'pass');
          push({
            key: 'ver-d:' + r.id,
            refKey: 'ver:' + r.id,
            time: decision.time,
            caseId: r.id,
            type: 'verification',
            human: true,
            actor: decision.by,
            actorKind: 'clerk',
            isOverride: isOv,
            title: decision.decision === 'accept' ? 'Zgjidhja u pranua' : 'Raporti u rihap',
            body: r.title,
            result: decision.decision === 'accept' ? 'Mbyllur' : 'Rihapur',
            reason: decision.reason || (isOv ? 'Verifikimi në terren konfirmoi zgjidhjen.' : null),
            outcome: isOv ? 'override' : 'human',
            autoAction: result === 'pass' ? 'Kaloi' : 'Shqyrtim',
            humanAction: decision.decision === 'accept' ? 'Pranuar' : 'Rihapur',
            dept: e.department,
          });
        }
        return {
          r: r,
          e: e,
          time: time,
          checks: checks,
          result: result,
          decision: decision,
          before: r.photo,
          after: hasEvidence ? r.resolutionEvidence[0].photo : null,
          afterNote: hasEvidence ? r.resolutionEvidence[0].note : '',
        };
      });

    // ---- Publications ----------------------------------------------------
    const allPubs: Rec[] = A.publications
      .map((p) => ({ id: p.id, caseIds: p.caseIds, time: at(NOW, -p.hoursAgo), by: p.by, status: p.status, text: p.text }))
      .concat(st.publications.map((p) => ({ id: p.id, caseIds: p.caseIds, time: new Date(p.at), by: p.by, status: p.status, text: p.text })));
    allPubs.forEach((p) => {
      push({
        key: 'pub:' + p.id,
        refKey: 'pub:' + p.id,
        time: at(p.time, -0.2),
        caseId: p.caseIds[0],
        type: 'publications',
        human: false,
        actor: 'SINJAL',
        actorKind: 'system',
        title: 'Draft publikimi u gjenerua',
        body: p.caseIds.length + ' raste të zgjidhura',
        result: 'Draft',
        outcome: 'review',
      });
      push({
        key: 'pub-d:' + p.id,
        refKey: 'pub:' + p.id,
        time: p.time,
        caseId: p.caseIds[0],
        type: 'publications',
        human: true,
        actor: p.by,
        actorKind: 'clerk',
        title: p.status === 'Publikuar' ? 'Njoftimi u publikua' : 'Drafti u kthye për shqyrtim',
        body: p.caseIds.map((id: Rec) => '#' + id).join(', '),
        result: p.status,
        outcome: 'human',
      });
    });

    // ---- other human case actions (for a complete audit trail) ----------
    S.reports.forEach((r) => {
      const ov = overrides[r.id] || {};
      (ov.assignLog || []).forEach((l, i) =>
        push({
          key: 'assign:' + r.id + ':' + i,
          refKey: 'assign:' + r.id,
          time: new Date(l.at),
          caseId: r.id,
          type: 'case',
          human: true,
          actor: l.by,
          actorKind: 'clerk',
          title: 'Punonjësi u caktua',
          body: l.employee,
          result: l.employee,
          outcome: 'human',
        }),
      );
      (ov.citizenRequests || []).forEach((l, i) =>
        push({
          key: 'req:' + r.id + ':' + i,
          refKey: 'req:' + r.id,
          time: new Date(l.at),
          caseId: r.id,
          type: 'case',
          human: true,
          actor: 'Drita K.',
          actorKind: 'clerk',
          title: 'Kërkesë drejt qytetarit',
          body: l.label,
          result: 'Dërguar',
          outcome: 'human',
        }),
      );
    });

    const eventsDesc = events.slice().sort((a, b) => b.time - a.time || b.seq - a.seq);

    // ======================================================================
    // 2. Period metrics
    // ======================================================================
    const sameDay = (d: Date) => d.getFullYear() === NOW.getFullYear() && d.getMonth() === NOW.getMonth() && d.getDate() === NOW.getDate();
    const weekStart = at(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()), -24 * 6);
    const inPeriod = (d: Date) => (st.period === 'today' ? sameDay(d) : d >= weekStart && d <= at(NOW, 0.01));
    const inWeek = (d: Date) => d >= weekStart && d <= at(NOW, 0.01);
    const autoEv = events.filter((e) => e.actorKind === 'system');
    const overrideEv = events.filter((e) => e.isOverride);
    const overriddenKeys: Record<string, boolean> = {};
    overrideEv.forEach((e) => {
      overriddenKeys[e.refKey] = true;
    });
    const pAuto = autoEv.filter((e) => inPeriod(e.time));
    const pUnchanged = pAuto.filter((e) => !overriddenKeys[e.refKey]);
    const pOverrides = overrideEv.filter((e) => inPeriod(e.time));
    const unchangedPct = pAuto.length ? Math.round((pUnchanged.length / pAuto.length) * 100) : 100;

    // pending review (a live snapshot, not period-bound)
    const pendRouting = routing.filter((x) => x.stateKey === 'review');
    const pendIntake = routing.filter((x) => x.stateKey === 'intake');
    const pendDup = dups.filter((d) => d.stateKey === 'pending');
    const pendMod = moderation.filter((m) => !m.decision);
    const pendVer = verification.filter((v) => !v.decision && v.result === 'review');
    const waitVer = verification.filter((v) => !v.decision && v.result === 'pass');
    const blockedMiss = missing.filter((m) => m.stateKey === 'waiting');
    const reviewCount = pendRouting.length + pendDup.length + pendMod.length + pendVer.length;
    const blockedCount = blockedMiss.length + pendIntake.length;
    const slaBreachOpen = slaEvents.filter((s) => s.rule === 's2' && isOpen(s.e));

    const periodLabel = st.period === 'today' ? 'sot' : '7 ditët e fundit';
    const health = {
      auto: pAuto.length,
      unchanged: pUnchanged.length,
      overrides: pOverrides.length,
      review: reviewCount,
      blocked: blockedCount,
      unchangedPct: unchangedPct,
      periodLabel: periodLabel,
      autoPct: pAuto.length ? Math.round((pUnchanged.length / Math.max(1, pAuto.length)) * 100) + '%' : '0%',
      ovPct: pAuto.length ? Math.round((pOverrides.length / Math.max(1, pAuto.length)) * 100) + '%' : '0%',
    };
    const periods = [
      { key: 'today', label: 'Sot' },
      { key: 'week', label: '7 ditët e fundit' },
    ].map((p) => ({ label: p.label, onClass: st.period === p.key ? 'is-on' : '', onClick: () => this.setState({ period: p.key }) }));

    // ---- patterns: overrides turned into feedback about the rules --------
    const patterns: Rec[] = [];
    S.departments.forEach((d) => {
      const routedTo = routing.filter((x) => x.tier !== 'low' && x.autoDept === d.id && inWeek(x.time));
      const moved = events.filter((e) => e.type === 'routing' && e.isOverride && inWeek(e.time) && e.autoAction === d.name);
      if (routedTo.length && moved.length) {
        const pct = Math.round((moved.length / routedTo.length) * 100);
        if (pct >= 15) {
          const ruleCounts: Record<string, number> = {};
          moved.forEach((e) => {
            const rr = routingById[e.caseId].rule;
            if (rr) ruleCounts[rr.id] = (ruleCounts[rr.id] || 0) + 1;
          });
          const topRule = Object.keys(ruleCounts).sort((a, b) => ruleCounts[b] - ruleCounts[a])[0];
          const ruleObj = A.routingRules.filter((x) => x.id === topRule)[0];
          patterns.push({
            key: 'p-' + d.id,
            pct: pct,
            text: pct + '% e raporteve të routuara te ' + d.name + ' u rishpërndanë manualisht këtë javë',
            evidence: moved.length + ' nga ' + routedTo.length + ' raste · rregulli më i prekur: #' + (ruleObj ? ruleObj.no : '—'),
            actionLabel: 'Rishiko rregullin',
            onAction: () => this._openRule(topRule),
          });
        }
      }
    });
    const fromCounts: Record<string, number> = {};
    events
      .filter((e) => e.type === 'routing' && e.isOverride && inWeek(e.time))
      .forEach((e) => {
        fromCounts[e.autoAction] = (fromCounts[e.autoAction] || 0) + 1;
      });
    Object.keys(fromCounts).forEach((k) => {
      if (fromCounts[k] >= 3)
        patterns.push({
          key: 'pf-' + k,
          text: fromCounts[k] + ' raporte u rishpërndanë manualisht nga ' + k + ' këtë javë',
          evidence: 'Mund të tregojë një rregull routing-u që nuk përputhet me praktikën.',
          actionLabel: 'Analizo',
          onAction: () => this._go('overrides', { ovType: 'routing' }),
        });
    });

    // ---- attention items --------------------------------------------------
    const attention: Rec[] = [];
    const addAttn = (sev: string, count: number, text: string, evidence: string, actionLabel: string, onAction: () => void) => {
      if (count > 0) attention.push({ sev: sev, color: sev === 'red' ? '#C23B31' : '#B8860B', count: count, text: text, evidence: evidence, actionLabel: actionLabel, onAction: onAction });
    };
    addAttn('red', pendIntake.length, pendIntake.length + ' raporte nuk mund të routohen me siguri të mjaftueshme', 'Janë te ' + A.intake + ' dhe presin vendimin e departamentit.', 'Shiko', () =>
      this._go('routing', { routingFilter: 'intake' }),
    );
    addAttn(
      'red',
      blockedMiss.length,
      blockedMiss.length + ' automatizime janë bllokuar për shkak të të dhënave të paplota',
      blockedMiss.map((m) => m.r.displayId).join(', ') + ' · presin informacion nga qytetari.',
      'Shiko',
      () => this._go('missing', { selMissing: blockedMiss[0] ? blockedMiss[0].r.id : null }),
    );
    addAttn(
      'red',
      pendMod.filter((m) => m.held).length,
      pendMod.filter((m) => m.held).length + ' përmbajtje janë mbajtur nga moderimi',
      'Publikimi është pezulluar deri në vendimin tuaj.',
      'Shqyrto',
      () => this._go('moderation', { selModeration: (pendMod.filter((m) => m.held)[0] || {}).f ? pendMod.filter((m) => m.held)[0].f.id : null }),
    );
    addAttn(
      'red',
      slaBreachOpen.length,
      slaBreachOpen.length + ' raste me SLA të shkelur u përshkallëzuan automatikisht',
      slaBreachOpen
        .slice(0, 3)
        .map((s) => s.r.displayId)
        .join(', ') + (slaBreachOpen.length > 3 ? '…' : ''),
      'Shiko',
      () => this._go('sla'),
    );
    addAttn('amber', pendRouting.length, pendRouting.length + ' vendime routing me besueshmëri mesatare presin konfirmim', 'U routuan automatikisht, por janë shënuar për shqyrtim.', 'Shqyrto', () =>
      this._go('routing', { routingFilter: 'review', selRouting: pendRouting[0] ? pendRouting[0].r.id : null }),
    );
    addAttn('amber', pendVer.length, pendVer.length + ' zgjidhje nuk kaluan verifikimin automatik', 'Dëshmia mund të mos e tregojë zgjidhjen.', 'Shqyrto', () =>
      this._go('verification', { selVerification: pendVer[0] ? pendVer[0].r.id : null }),
    );
    addAttn('amber', pendDup.length, pendDup.length + ' dublikate të mundshme presin vendim', 'Nën pragun e lidhjes automatike (' + cfg.dupLinkThreshold + '%).', 'Shqyrto', () =>
      this._go('duplicates'),
    );
    const patternAttn = patterns.map((p) => ({ sev: 'amber', color: '#B8860B', text: p.text, evidence: p.evidence, actionLabel: p.actionLabel, onAction: p.onAction, isPattern: true }));
    const attentionAll = attention.concat(patternAttn);

    // ---- feedback loop band ----------------------------------------------
    const ruleChangesWeek = st.ruleLog.length;
    const loop = [
      { k: 'Automatizo', n: pAuto.length, d: 'veprime automatike ' + periodLabel, onClick: () => this._go('activity') },
      { k: 'Monitoro', n: reviewCount + blockedCount, d: 'për shqyrtim ose të bllokuara tani', onClick: () => this._go('attention') },
      { k: 'Ndërhy', n: pOverrides.length, d: 'ndërhyrje njerëzore ' + periodLabel, onClick: () => this._go('overrides') },
      { k: 'Regjistro', n: pOverrides.filter((e) => e.reason).length, d: 'me arsye të regjistruar', onClick: () => this._go('audit', { auActor: 'human' }) },
      {
        k: 'Përmirëso',
        n: patterns.length + ruleChangesWeek,
        d:
          (patterns.length === 1 ? '1 model i zbuluar' : patterns.length + ' modele të zbuluara') + ' · ' + (ruleChangesWeek === 1 ? '1 ndryshim rregulli' : ruleChangesWeek + ' ndryshime rregullash'),
        onClick: () => this._go(patterns.length ? 'attention' : 'config'),
      },
    ].map((x, i, arr) => Object.assign(x, { hasArrow: i < arr.length - 1 }));

    // ---- automation status table ----------------------------------------
    const pendingByType: Record<string, number> = {
      routing: pendRouting.length + pendIntake.length,
      priority: 0,
      duplicates: pendDup.length,
      moderation: pendMod.length,
      missing: blockedMiss.length,
      sla: slaBreachOpen.length,
      verification: pendVer.length + waitVer.length,
      publications: 0,
    };
    const screenOf: Record<string, string> = {
      routing: 'routing',
      priority: 'priority',
      duplicates: 'duplicates',
      moderation: 'moderation',
      missing: 'missing',
      sla: 'sla',
      verification: 'verification',
      publications: 'publications',
    };
    const statusRows = A.types.map((t) => {
      const s = setting(t.id);
      const count = pAuto.filter((e) => e.type === t.id).length;
      return {
        id: t.id,
        label: t.label,
        count: count,
        active: s.active,
        statusLabel: s.active ? 'Aktiv' : 'Paaktiv',
        statusColor: s.active ? '#2E7D4F' : '#8A847C',
        autonomy: A.autonomyMeta[s.autonomy].label,
        pending: pendingByType[t.id],
        pendingLabel: pendingByType[t.id] ? pendingByType[t.id] + ' në pritje' : '—',
        pendingColor: pendingByType[t.id] ? '#B8860B' : '#8A847C',
        onClick: () => this._go(screenOf[t.id]),
      };
    });

    // ---- 7-day trend ----------------------------------------------------
    const DAY = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    const days: { start: Date; end: Date; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d0 = at(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()), -24 * i);
      days.push({ start: d0, end: at(d0, 24), label: i === 0 ? 'Sot' : DAY[d0.getDay()] });
    }
    const trendRaw = days.map((d) => {
      const inD = (e: Rec) => e.time >= d.start && e.time < d.end;
      const autoD = autoEv.filter(inD);
      return {
        label: d.label,
        total: autoD.length,
        unchanged: autoD.filter((e) => e.outcome === 'auto' && !overriddenKeys[e.refKey]).length,
        held: autoD.filter((e) => e.outcome === 'review' || e.outcome === 'held').length,
        blocked: autoD.filter((e) => e.outcome === 'blocked').length,
        overrides: overrideEv.filter(inD).length,
      };
    });
    const trendMax = Math.max(1, ...trendRaw.map((t) => t.total + t.overrides));
    const px = (n: number) => Math.round((n / trendMax) * 92) + 'px';
    const trend = trendRaw.map((t) => ({
      label: t.label,
      total: t.total,
      overrides: t.overrides,
      hUnchanged: px(Math.max(0, t.total - t.held - t.blocked)),
      hHeld: px(t.held),
      hBlocked: px(t.blocked),
      hOverride: px(t.overrides),
    }));
    const trendTotals = {
      total: trendRaw.reduce((s, t) => s + t.total, 0),
      overrides: trendRaw.reduce((s, t) => s + t.overrides, 0),
      held: trendRaw.reduce((s, t) => s + t.held, 0),
      blocked: trendRaw.reduce((s, t) => s + t.blocked, 0),
    };
    const busiest = trendRaw.slice().sort((a, b) => b.total - a.total)[0];
    const trendNote = trendTotals.total
      ? 'Ndërhyrjet njerëzore janë ' +
        Math.round((trendTotals.overrides / trendTotals.total) * 100) +
        '% e veprimeve automatike këtë javë. Dita më e ngarkuar: ' +
        busiest.label +
        ' (' +
        busiest.total +
        ').'
      : 'Nuk ka veprime automatike këtë javë.';

    // ======================================================================
    // 3. Feed rows (shared by overview, Aktiviteti and case links)
    // ======================================================================
    const screenForType: Record<string, string> = {
      routing: 'routing',
      priority: 'priority',
      duplicates: 'duplicates',
      moderation: 'moderation',
      missing: 'missing',
      sla: 'sla',
      verification: 'verification',
      publications: 'publications',
      case: 'audit',
    };
    const feedRow = (e: Rec) => {
      const r = byId(e.caseId);
      const o = OUTCOME[e.outcome];
      const extra: Partial<State> = {};
      if (e.type === 'routing') extra.selRouting = e.caseId;
      if (e.type === 'priority') extra.selPriority = e.caseId;
      if (e.type === 'verification') extra.selVerification = e.caseId;
      if (e.type === 'missing') extra.selMissing = e.caseId;
      if (e.type === 'moderation') {
        const m = moderation.filter((x) => x.r.id === e.caseId)[0];
        if (m) extra.selModeration = m.f.id;
      }
      return {
        key: e.key,
        caseLabel: r ? r.displayId : '',
        typeLabel: TYPE_LABEL[e.type],
        title: e.title,
        body: e.body,
        reason: e.reason || '',
        hasReason: !!e.reason,
        color: o.color,
        kind: o.label,
        time: sameDay(e.time) ? S.fmtTime(e.time) : S.fmtDateTime(e.time),
        actor: e.actor,
        confLabel: e.conf ? e.conf + '%' : '',
        hasConf: !!e.conf,
        onClick: () => this._go(screenForType[e.type], extra),
      };
    };
    const recentFeed = eventsDesc
      .filter((e) => e.actorKind !== 'citizen')
      .slice(0, 7)
      .map(feedRow);
    const actTypes = [{ id: '', label: 'Të gjitha' }].concat(A.types.map((t) => ({ id: t.id, label: t.short })));
    const actFiltered = eventsDesc.filter((e) => !st.actType || e.type === st.actType);
    const activity: Rec = {
      chips: actTypes.map((t) => ({ label: t.label, onClass: st.actType === t.id ? 'is-on' : '', onClick: () => this.setState({ actType: t.id, actLimit: 30 }) })),
      rows: actFiltered.map(feedRow),
      total: actFiltered.length,
      canMore: actFiltered.length > st.actLimit,
      onMore: () => this.setState({ actLimit: st.actLimit + 30 }),
    };

    // ======================================================================
    // 4. Screen: Routing
    // ======================================================================
    const routingFilters = [
      { key: 'all', label: 'Të gjitha', n: routing.length },
      { key: 'auto', label: 'Automatik', n: routing.filter((x) => x.stateKey === 'auto' || x.stateKey === 'confirmed').length },
      { key: 'review', label: 'Shqyrtim', n: pendRouting.length },
      { key: 'intake', label: A.intake, n: routing.filter((x) => x.tier === 'low').length },
      { key: 'override', label: 'Ndërhyrje', n: routing.filter((x) => x.stateKey === 'override').length },
    ];
    const rfMatch = (x: Rec) =>
      st.routingFilter === 'all' ||
      (st.routingFilter === 'auto' && (x.stateKey === 'auto' || x.stateKey === 'confirmed')) ||
      (st.routingFilter === 'intake' && x.tier === 'low') ||
      x.stateKey === st.routingFilter;
    const routingList = routing.filter(rfMatch).sort((a, b) => b.time - a.time);
    const selR = routingById[st.selRouting as string] || routingList[0] || routing[0];
    const workloadOf = (deptId: string) => S.reports.filter((r) => effById[r.id].department === deptId && isOpen(effById[r.id])).length;
    const coverOf = (deptId: string, zone: string) => S.employees.filter((e) => e.dept === deptId && (e.coverageZones || []).indexOf(zone) !== -1).map((e) => e.name);
    const routingDetail = (() => {
      const x = selR;
      const cov = x.autoDept ? coverOf(x.autoDept, x.r.zone) : [];
      return {
        id: x.r.id,
        displayId: x.r.displayId,
        title: x.r.title,
        target: x.target,
        conf: x.conf,
        confColor: confColor(x.conf),
        confWidth: x.conf + '%',
        tierLabel: A.tierMeta[x.tier as ConfTier].label,
        tierBg: A.tierMeta[x.tier as ConfTier].bg,
        tierInk: A.tierMeta[x.tier as ConfTier].ink,
        tierNote: x.tier === 'high' ? 'Veprim automatik.' : x.tier === 'medium' ? 'Veprim automatik + shqyrtim i theksuar.' : 'Asnjë vendim automatik me pasoja — u dërgua te ' + A.intake + '.',
        time: S.fmtDateTime(x.time),
        factors: [
          { k: 'Kategoria', v: x.r.categoryLabel },
          { k: 'Vendndodhja', v: x.r.zone + ' · ' + x.r.address },
          { k: 'Rregulli i departamentit', v: x.rule ? '#' + x.rule.no + ' · ' + S.catLabel(x.rule.category) + (x.rule.zone ? ' + ' + x.rule.zone : '') : '—' },
          { k: 'Zona e mbulimit', v: cov.length ? cov.join(', ') : 'Asnjë punonjës me këtë zonë' },
          { k: 'Ngarkesa aktuale', v: x.autoDept ? workloadOf(x.autoDept) + ' raste aktive në ' + S.deptName(x.autoDept) : '—' },
          { k: 'Prioriteti', v: x.e.priority },
        ],
        stateLabel: x.state.label,
        stateBg: x.state.bg,
        stateInk: x.state.ink,
        hasOverride: !!x.override,
        override: x.override
          ? { from: x.override.from, to: x.override.to, by: x.override.by, reason: x.override.reason, time: S.fmtDateTime(x.override.time) }
          : { from: '', to: '', by: '', reason: '', time: '' },
        canConfirm: x.stateKey === 'review',
        onConfirm: () => this._confirmRouting(x.r.id),
        canAssignIntake: x.stateKey === 'intake',
        currentDept: x.e.departmentName,
        reassignOpen: st.reassignOpen,
        onOpenReassign: () => this.setState({ reassignOpen: true, reassignDept: '', reassignReason: '' }),
        onCancelReassign: () => this.setState({ reassignOpen: false }),
        reassignDept: st.reassignDept,
        reassignReason: st.reassignReason,
        deptOptions: [{ value: '', label: 'Zgjidh departamentin…' }].concat(S.departments.filter((d) => d.id !== x.e.department).map((d) => ({ value: d.id, label: d.name }))),
        onReassignDept: (ev: InputEvent) => this.setState({ reassignDept: ev.target.value }),
        onReassignReason: (ev: InputEvent) => this.setState({ reassignReason: ev.target.value }),
        saveDisabledClass: st.reassignDept && (st.reassignReason || '').trim() ? '' : 'is-disabled',
        onSaveReassign: () => this._saveReassign(x.r.id, x.e.departmentName),
        onOpenCase: this._select(x.r.id),
      };
    })();
    const routingScreen: Rec = {
      filters: routingFilters.map((f) => ({ label: f.label, n: f.n, onClass: st.routingFilter === f.key ? 'is-on' : '', onClick: () => this.setState({ routingFilter: f.key }) })),
      rows: routingList.map((x) => ({
        id: x.r.displayId,
        category: x.r.categoryLabel,
        target: x.tier === 'low' ? A.intake : S.deptName(x.autoDept),
        team: x.tier === 'low' ? 'pa vendim automatik' : x.autoTeam,
        conf: x.conf + '%',
        confColor: confColor(x.conf),
        confWidth: x.conf + '%',
        stateLabel: x.state.label,
        stateBg: x.state.bg,
        stateInk: x.state.ink,
        stateDot: x.state.dot,
        onClass: x.r.id === selR.r.id ? 'is-on' : '',
        onClick: () => this.setState({ selRouting: x.r.id, reassignOpen: false }),
      })),
      empty: routingList.length === 0,
      detail: routingDetail,
      stats: {
        high: routing.filter((x) => x.tier === 'high').length,
        medium: routing.filter((x) => x.tier === 'medium').length,
        low: routing.filter((x) => x.tier === 'low').length,
        overrides: routing.filter((x) => x.stateKey === 'override').length,
      },
      rulesPreview: this._rules()
        .slice(0, 6)
        .map((r) => ({
          no: r.no,
          when: S.catLabel(r.category) + (r.zone ? ' · ' + r.zone : ''),
          then: S.deptName(r.dept) + ' → ' + r.team,
          activeColor: r.active ? '#2E7D4F' : '#B8B2A9',
          activeLabel: r.active ? 'Aktiv' : 'Joaktiv',
          onClick: () => this._openRule(r.id),
        })),
      onManageRules: () => this._go('config', { configTab: 'rules', ruleGroup: 'routing', selRule: null }),
    };

    // ======================================================================
    // 5. Screen: Priority
    // ======================================================================
    const pfMatch = (x: Rec) =>
      st.priorityFilter === 'all' ||
      (st.priorityFilter === 'urgent' && x.e.priority === 'Urgjente') ||
      (st.priorityFilter === 'escalated' && x.auto !== x.base) ||
      (st.priorityFilter === 'changed' && x.overridden);
    const priorityList = priority.filter(pfMatch).sort((a, b) => b.time - a.time);
    const selP = priorityById[st.selPriority as string] || priorityList[0] || priority[0];
    const pm = (p: string) => S.priorityMeta[p as Priority] || { color: '#4A4640' };
    const priorityScreen: Rec = {
      filters: [
        { key: 'all', label: 'Të gjitha' },
        { key: 'urgent', label: 'Urgjente' },
        { key: 'escalated', label: 'Ndryshuar nga baza' },
        { key: 'changed', label: 'Të ndryshuara nga stafi' },
      ].map((f) => ({ label: f.label, onClass: st.priorityFilter === f.key ? 'is-on' : '', onClick: () => this.setState({ priorityFilter: f.key }) })),
      rows: priorityList.map((x) => ({
        id: x.r.displayId,
        title: x.r.title,
        auto: x.auto,
        autoColor: pm(x.auto).color,
        current: x.e.priority,
        currentColor: pm(x.e.priority).color,
        changed: x.overridden,
        changedLabel: x.overridden ? 'Ndryshuar nga stafi' : x.dir === 'up' ? 'Ngritur nga ' + x.base : x.dir === 'down' ? 'Ulur nga ' + x.base : 'Sipas kategorisë',
        changedColor: x.overridden ? '#B8860B' : '#8A847C',
        onClass: x.r.id === selP.r.id ? 'is-on' : '',
        onClick: () => this.setState({ selPriority: x.r.id, priorityOpen: false }),
      })),
      detail: {
        displayId: selP.r.displayId,
        title: selP.r.title,
        auto: selP.auto,
        autoColor: pm(selP.auto).color,
        current: selP.e.priority,
        currentColor: pm(selP.e.priority).color,
        reasons: selP.reasons.map((t: Rec) => ({ t: t })),
        history: [
          {
            label: selP.auto !== selP.base ? selP.base + ' → ' + selP.auto : 'Vendosur: ' + selP.auto,
            who: 'Automatik',
            reason: '',
            hasReason: false,
            time: S.fmtDateTime(selP.time),
            color: '#2E7D4F',
          },
        ].concat(
          selP.changes.map((c: Rec) => ({
            label: c.from + ' → ' + c.to,
            who: 'Ndërhyrje njerëzore · ' + c.by,
            reason: c.reason,
            hasReason: !!c.reason,
            time: S.fmtDateTime(c.time),
            color: '#B8860B',
          })),
        ),
        open: st.priorityOpen,
        onOpen: () => this.setState({ priorityOpen: true, priorityDraft: selP.e.priority, priorityReason: '' }),
        onCancel: () => this.setState({ priorityOpen: false }),
        draft: st.priorityDraft,
        reason: st.priorityReason,
        options: S.priorityOrder
          .slice()
          .reverse()
          .map((p) => ({ value: p, label: p })),
        onDraft: (ev: InputEvent) => this.setState({ priorityDraft: ev.target.value }),
        onReason: (ev: InputEvent) => this.setState({ priorityReason: ev.target.value }),
        saveDisabledClass: st.priorityDraft && st.priorityDraft !== selP.e.priority && (st.priorityReason || '').trim() ? '' : 'is-disabled',
        onSave: () => this._savePriority(selP.r.id, selP.e.priority),
        onOpenCase: this._select(selP.r.id),
      },
      stats: {
        raised: priority.filter((x) => x.dir === 'up').length,
        lowered: priority.filter((x) => x.dir === 'down').length,
        urgent: priority.filter((x) => x.e.priority === 'Urgjente' && isOpen(x.e)).length,
        changed: priority.filter((x) => x.overridden).length,
      },
    };

    // ======================================================================
    // 6. Screen: Duplicates
    // ======================================================================
    const ringDash = (pct: Rec) => Math.round(pct * 1.382 * 10) / 10 + ' 200'; // r=22 → circumference 138.2
    const dupCard = (d: Rec) => {
      const decLabel = ({ pending: 'Në pritje', autolinked: 'Lidhur automatikisht', linked: 'Lidhur nga stafi', separate: 'Mbajtur të ndara', undone: 'Lidhja u zhbë' } as Record<string, string>)[
        d.stateKey
      ];
      const formOpen = st.dupFormFor === d.id;
      return {
        id: d.id,
        similarity: d.c.similarity + '%',
        dash: ringDash(d.c.similarity),
        ringColor: d.c.similarity >= cfg.dupLinkThreshold ? '#2E7D4F' : d.c.similarity >= cfg.dupFlagThreshold ? '#B8860B' : '#8A847C',
        a: { id: d.newerR.displayId, title: d.newerR.title, meta: d.newerR.zone + ' · ' + d.newerR.submittedLabel, status: effById[d.newer].status, onOpen: this._select(d.newer) },
        b: { id: d.olderR.displayId, title: d.olderR.title, meta: d.olderR.zone + ' · ' + d.olderR.submittedLabel, status: effById[d.older].status, onOpen: this._select(d.older) },
        factors: [
          { k: 'Vendndodhja', v: d.c.distanceM === 0 ? 'E njëjta adresë' : d.c.distanceM + 'm larg', ok: d.c.distanceM <= 100 },
          { k: 'Kategoria', v: d.sameCategory ? 'E njëjtë' : 'E ndryshme', ok: d.sameCategory },
          { k: 'Teksti', v: d.c.textSim + '% i ngjashëm', ok: d.c.textSim >= 50 },
          { k: 'Koha', v: d.gapH < 1 ? Math.round(d.gapH * 60) + ' min larg' : Math.round(d.gapH) + ' orë larg', ok: d.gapH <= 48 },
          { k: 'Imazhet', v: d.c.imagesSimilar ? 'Të ngjashme' : 'Të ndryshme', ok: d.c.imagesSimilar },
        ].map((f) => Object.assign(f, { color: f.ok ? '#2E7D4F' : '#8A847C', mark: f.ok ? 'po' : 'jo' })),
        stateLabel: decLabel,
        isPending: d.stateKey === 'pending',
        isAuto: d.stateKey === 'autolinked',
        isDecided: !!d.decision,
        decisionText: d.decision ? d.decision.by + ' · ' + S.fmtDateTime(d.decision.time) + (d.decision.reason ? ' · "' + d.decision.reason + '"' : '') : '',
        autoText: 'Lidhur automatikisht · ' + S.fmtDateTime(d.time) + ' (mbi pragun ' + cfg.dupLinkThreshold + '%)',
        onLink: () => this._dupLink(d),
        onSeparate: () => this.setState({ dupFormFor: d.id, dupFormKind: 'separate', dupReason: '' }),
        onUndo: () => this.setState({ dupFormFor: d.id, dupFormKind: 'undo', dupReason: '' }),
        formOpen: formOpen,
        formTitle: st.dupFormKind === 'undo' ? 'Zhbëj lidhjen automatike' : 'Mbaji të ndara',
        reason: formOpen ? st.dupReason : '',
        onReason: (ev: InputEvent) => this.setState({ dupReason: ev.target.value }),
        onCancel: () => this.setState({ dupFormFor: null, dupFormKind: null, dupReason: '' }),
        saveDisabledClass: (st.dupReason || '').trim() ? '' : 'is-disabled',
        onSubmit: () => this._dupSubmit(d),
      };
    };
    const dupScreen: Rec = {
      pending: pendDup.map(dupCard),
      pendingCount: pendDup.length,
      pendingNone: pendDup.length === 0,
      auto: dups.filter((d) => d.stateKey === 'autolinked').map(dupCard),
      autoCount: dups.filter((d) => d.stateKey === 'autolinked').length,
      decided: dups.filter((d) => d.decision).map(dupCard),
      decidedNone: dups.filter((d) => d.decision).length === 0,
      threshold: cfg.dupLinkThreshold,
      flagThreshold: cfg.dupFlagThreshold,
    };

    // ======================================================================
    // 7. Screen: Moderation
    // ======================================================================
    const selM = moderation.filter((m) => m.f.id === st.selModeration)[0] || pendMod[0] || moderation[0];
    const DEC_LBL: Record<string, string> = { allow: 'U lejua', edit: 'U redaktua', reject: 'U refuzua' };
    const modScreen: Rec = {
      types: A.moderationTypes.map((t) => ({
        label: t.label,
        n: moderation.filter((m) => m.f.type === t.id).length,
        nColor: moderation.filter((m) => m.f.type === t.id && !m.decision).length ? '#C23B31' : '#8A847C',
      })),
      rows: moderation
        .slice()
        .sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || b.time - a.time)
        .map((m) => ({
          id: m.r.displayId,
          type: m.typeLabel,
          conf: m.f.confidence + '%',
          confColor: m.f.confidence >= 70 ? '#C23B31' : '#B8860B',
          stateLabel: m.decision ? DEC_LBL[m.decision.decision] : m.held ? 'I mbajtur · në shqyrtim' : 'Sinjalizuar',
          stateColor: m.decision ? '#4A4640' : m.held ? '#C23B31' : '#B8860B',
          time: S.fmtDateTime(m.time),
          onClass: m.f.id === selM.f.id ? 'is-on' : '',
          onClick: () => this.setState({ selModeration: m.f.id, modAction: null, modReason: '', modEdit: '' }),
        })),
      pendingCount: pendMod.length,
      detail: {
        displayId: selM.r.displayId,
        title: selM.r.title,
        flag: selM.typeLabel,
        conf: selM.f.confidence + '%',
        confColor: selM.f.confidence >= 70 ? '#C23B31' : '#B8860B',
        excerpt: selM.f.excerpt,
        autoAction: selM.held
          ? 'Publikimi / përpunimi publik u pezullua. Rasti vazhdon te ' + selM.e.departmentName + '.'
          : 'Vetëm sinjalizim — besueshmëria (' + selM.f.confidence + '%) është nën pragun për pezullim (70%).',
        time: S.fmtDateTime(selM.time),
        undecided: !selM.decision,
        decided: !!selM.decision,
        decisionLabel: selM.decision ? DEC_LBL[selM.decision.decision] : '',
        decisionMeta: selM.decision ? selM.decision.by + ' · ' + S.fmtDateTime(selM.decision.time) : '',
        decisionReason: selM.decision ? selM.decision.reason || '' : '',
        decisionEdited: selM.decision && selM.decision.editedText ? selM.decision.editedText : '',
        hasEdited: !!(selM.decision && selM.decision.editedText),
        actions: [
          { key: 'allow', label: 'Lejo' },
          { key: 'edit', label: 'Redakto' },
          { key: 'reject', label: 'Refuzo' },
        ].map((a) => ({
          label: a.label,
          onClass: st.modAction === a.key ? 'is-on' : '',
          onClick: () => this.setState({ modAction: a.key, modReason: '', modEdit: a.key === 'edit' ? selM.f.excerpt : '' }),
        })),
        formOpen: !!st.modAction && !selM.decision,
        isEdit: st.modAction === 'edit',
        needsReason: st.modAction === 'allow' || st.modAction === 'reject',
        formHint:
          st.modAction === 'reject'
            ? 'Refuzimi e shënon rastin "Refuzuar". Arsyeja kërkohet.'
            : st.modAction === 'allow'
              ? 'Lejimi e zhbën pezullimin automatik — regjistrohet si ndërhyrje njerëzore. Arsyeja kërkohet.'
              : 'Redaktoni përmbajtjen para publikimit.',
        reason: st.modReason,
        edit: st.modEdit,
        onReason: (ev: InputEvent) => this.setState({ modReason: ev.target.value }),
        onEdit: (ev: InputEvent) => this.setState({ modEdit: ev.target.value }),
        saveDisabledClass: (st.modAction === 'edit' ? (st.modEdit || '').trim() : (st.modReason || '').trim()) ? '' : 'is-disabled',
        onSubmit: () => this._modSubmit(selM.f),
        onCancel: () => this.setState({ modAction: null, modReason: '', modEdit: '' }),
        onOpenCase: this._select(selM.r.id),
      },
    };

    // ======================================================================
    // 8. Screen: Missing information
    // ======================================================================
    const selMi = missing.filter((m) => m.r.id === st.selMissing)[0] || blockedMiss[0] || missing[0];
    const MISS_STATE: Record<string, { label: string; color: string }> = {
      waiting: { label: 'Pret përgjigjen e qytetarit', color: '#C23B31' },
      answered: { label: 'Qytetari u përgjigj', color: '#2E7D4F' },
      proceeded: { label: 'Vazhdoi pa informacion', color: '#4A4640' },
      escalated: { label: 'Përshkallëzuar te pranimi', color: '#B8860B' },
    };
    const missScreen: Rec = {
      rows: missing.map((m) => ({
        id: m.r.displayId,
        title: m.r.title,
        problem: m.m.problem,
        stateLabel: MISS_STATE[m.stateKey].label,
        stateColor: MISS_STATE[m.stateKey].color,
        onClass: m.r.id === selMi.r.id ? 'is-on' : '',
        onClick: () => this.setState({ selMissing: m.r.id, missEditOpen: false, missDraft: '' }),
      })),
      requiredOn: A.missingFields.filter((f) => !!cfg.missingRequired[f.id]).map((f) => ({ label: f.label })),
      detail: {
        displayId: selMi.r.displayId,
        title: selMi.r.title,
        problem: selMi.m.problem,
        fields: A.missingFields.map((f) => {
          const miss = selMi.m.missing.indexOf(f.id) !== -1;
          return {
            label: f.label,
            state: miss ? 'Mungon' : 'Në rregull',
            color: miss ? '#C23B31' : '#2E7D4F',
            bg: miss ? '#F6E1DE' : '#E1EEE5',
            mark: miss ? '!' : '✓',
            required: cfg.missingRequired[f.id] ? 'i detyrueshëm' : 'opsional',
          };
        }),
        message: selMi.m.message,
        sentAt: S.fmtDateTime(selMi.time),
        stateLabel: MISS_STATE[selMi.stateKey].label,
        stateColor: MISS_STATE[selMi.stateKey].color,
        answered: selMi.m.state === 'answered',
        answer: selMi.m.answer || '',
        answeredAt: selMi.m.state === 'answered' ? S.fmtDateTime(at(selMi.r.submittedAt, selMi.m.answeredHoursAfterSubmit)) : '',
        actionable: selMi.stateKey === 'waiting',
        lastAction: selMi.decision
          ? ({ resend: 'Kërkesa u ridërgua', proceed: 'Vazhdoi pa informacion', escalate: 'U përshkallëzua te pranimi' } as Record<string, string>)[selMi.decision.decision] +
            ' · ' +
            selMi.decision.by +
            ' · ' +
            S.fmtDateTime(new Date(selMi.decision.at))
          : '',
        hasLastAction: !!selMi.decision,
        editOpen: st.missEditOpen,
        notEditOpen: !st.missEditOpen,
        draft: st.missDraft,
        onEdit: () => this.setState({ missEditOpen: true, missDraft: selMi.m.message }),
        onDraft: (ev: InputEvent) => this.setState({ missDraft: ev.target.value }),
        onCancelEdit: () => this.setState({ missEditOpen: false, missDraft: '' }),
        onSend: () => this._missAction(selMi.m, 'resend'),
        onProceed: () => this._missAction(selMi.m, 'proceed'),
        onEscalate: () => this._missAction(selMi.m, 'escalate'),
        onOpenCase: this._select(selMi.r.id),
      },
    };

    // ======================================================================
    // 9. Screen: SLA
    // ======================================================================
    const slaScreen: Rec = {
      rules: A.slaRules.map((ru) => {
        const on = cfg.slaActive[ru.id] === undefined ? ru.active : cfg.slaActive[ru.id];
        return {
          no: ru.no,
          condition: ru.condition,
          action: ru.action,
          onClass: on ? 'is-on' : '',
          label: on ? 'Aktiv' : 'Joaktiv',
          count: slaEvents.filter((s) => s.rule === ru.id).length,
          onToggle: () => {
            const a = Object.assign({}, cfg.slaActive);
            a[ru.id] = !on;
            this._setConfig({ slaActive: a });
          },
        };
      }),
      feed: eventsDesc
        .filter((e) => e.type === 'sla')
        .map((e) => {
          const r = byId(e.caseId);
          const eE = effById[e.caseId];
          return {
            id: r.displayId,
            title: e.title,
            result: e.result,
            time: sameDay(e.time) ? 'Sot · ' + S.fmtTime(e.time) : S.fmtDateTime(e.time),
            color: e.human ? '#4A4640' : e.outcome === 'held' ? '#C23B31' : '#B8860B',
            who: e.human ? e.actor : 'SINJAL',
            status: eE.status,
            stillOpen: isOpen(eE),
            sla: eE.slaLabel,
            onOpen: this._select(e.caseId),
          };
        }),
      breachOpen: slaBreachOpen.length,
      warnOpen: slaEvents.filter((s) => s.rule === 's1' && isOpen(s.e)).length,
      unassignedOpen: slaEvents.filter((s) => s.rule === 's3' && isOpen(s.e) && !s.e.responsible).length,
      targets: A.slaTargets.map((t) => ({ priority: t.priority, color: pm(t.priority).color, hours: t.hours + ' orë' })),
    };

    // ======================================================================
    // 10. Screen: Verification
    // ======================================================================
    const selV = verification.filter((v) => v.r.id === st.selVerification)[0] || pendVer[0] || waitVer[0] || verification[0];
    const CHECK: Record<string, { mark: string; color: string; bg: string; label: string }> = {
      pass: { mark: '✓', color: '#2E7D4F', bg: '#E1EEE5', label: 'Në rregull' },
      warn: { mark: '!', color: '#B8860B', bg: '#F5EBD6', label: 'Kërkon shqyrtim' },
      fail: { mark: '✕', color: '#C23B31', bg: '#F6E1DE', label: 'Mungon' },
    };
    const verScreen: Rec = {
      rows: verification
        .slice()
        .sort((a, b) => Number(!!a.decision) - Number(!!b.decision) || b.time - a.time)
        .map((v) => ({
          id: v.r.displayId,
          title: v.r.title,
          dept: v.e.departmentName,
          resultLabel: v.result === 'pass' ? 'Kaloi' : 'Shqyrtim',
          resultBg: v.result === 'pass' ? '#E1EEE5' : '#F5EBD6',
          resultInk: v.result === 'pass' ? '#1E5C3A' : '#7A5A0B',
          decisionLabel: v.decision ? (v.decision.decision === 'accept' ? 'Pranuar' : 'Rihapur') : 'Pret vendimin',
          decisionColor: v.decision ? '#4A4640' : '#B8860B',
          onClass: v.r.id === selV.r.id ? 'is-on' : '',
          onClick: () => this.setState({ selVerification: v.r.id, verifyReopenOpen: false, verifyReason: '' }),
        })),
      counts: { pass: verification.filter((v) => v.result === 'pass').length, review: verification.filter((v) => v.result === 'review').length, waiting: pendVer.length + waitVer.length },
      detail: {
        displayId: selV.r.displayId,
        title: selV.r.title,
        dept: selV.e.departmentName + (selV.e.responsibleName ? ' · ' + selV.e.responsibleName : ''),
        before: selV.before,
        after: selV.after,
        hasAfter: !!selV.after,
        noAfter: !selV.after,
        afterNote: selV.afterNote,
        isPass: selV.result === 'pass',
        isReview: selV.result === 'review',
        checks: selV.checks.map((c: Rec) =>
          Object.assign(
            { label: c.label, optional: c.required ? '' : ' (opsional)' },
            { mark: CHECK[c.state].mark, color: CHECK[c.state].color, bg: CHECK[c.state].bg, stateLabel: CHECK[c.state].label },
          ),
        ),
        undecided: !selV.decision,
        decided: !!selV.decision,
        decisionLabel: selV.decision ? (selV.decision.decision === 'accept' ? 'Zgjidhja u pranua' : 'Raporti u rihap') : '',
        decisionMeta: selV.decision ? selV.decision.by + ' · ' + S.fmtDateTime(selV.decision.time) + (selV.decision.reason ? ' · "' + selV.decision.reason + '"' : '') : '',
        reopenOpen: st.verifyReopenOpen,
        reason: st.verifyReason,
        onReason: (ev: InputEvent) => this.setState({ verifyReason: ev.target.value }),
        onAccept: () => this._verifyAccept(selV.r.id),
        onOpenReopen: () => this.setState({ verifyReopenOpen: true, verifyReason: '' }),
        onCancelReopen: () => this.setState({ verifyReopenOpen: false }),
        reopenDisabledClass: (st.verifyReason || '').trim() ? '' : 'is-disabled',
        onReopen: () => this._verifyReopen(selV.r.id, selV.e.status),
        acceptNote: selV.result === 'review' ? 'Pranimi i një zgjidhjeje që nuk kaloi verifikimin regjistrohet si ndërhyrje njerëzore.' : 'Verifikimi kaloi; pranimi e mbyll rastin.',
        onOpenCase: this._select(selV.r.id),
      },
    };

    // ======================================================================
    // 11. Screen: Publications
    // ======================================================================
    const publishedIds: Record<string, boolean> = {};
    allPubs
      .filter((p) => p.status === 'Publikuar')
      .forEach((p) =>
        p.caseIds.forEach((id: Rec) => {
          publishedIds[id] = true;
        }),
      );
    const pubCandidates = S.reports.filter((r) => ['Zgjidhur', 'Mbyllur'].indexOf(effById[r.id].status) !== -1 || ['Zgjidhur', 'Mbyllur'].indexOf(r.status) !== -1);
    const selectedPub = st.pubSelected.map((id) => effById[id]).filter(Boolean);
    const lower1 = (s: Rec) => s.charAt(0).toLowerCase() + s.slice(1);
    const generated = selectedPub.length
      ? 'Gjatë kësaj jave, Bashkia Elbasan ka përfunduar ' +
        selectedPub.length +
        (selectedPub.length === 1 ? ' ndërhyrje' : ' ndërhyrje') +
        ' për probleme të raportuara nga qytetarët përmes SINJAL — ' +
        selectedPub.map((e) => e.categoryLabel.toLowerCase() + ' në ' + e.zone + ' ("' + lower1(e.title) + '")').join('; ') +
        '. Faleminderit që raportoni: çdo raport na ndihmon të ndërhyjmë më shpejt.'
      : '';
    const draftText = st.pubDraft !== null ? st.pubDraft : generated;
    const piiFlag = moderation.filter((m) => m.f.type === 'pii' && st.pubSelected.indexOf(m.r.id) !== -1 && !(m.decision && (m.decision.decision === 'edit' || m.decision.decision === 'allow')));
    const schoolCases = selectedPub.filter((e) => /shkoll|kopsht/i.test(e.address + ' ' + e.title));
    const notClosed = selectedPub.filter((e) => ['Zgjidhur', 'Mbyllur'].indexOf(e.status) === -1);
    const notAccepted = selectedPub.filter((e) => e.status === 'Zgjidhur');
    const mentions = selectedPub.filter((e) => draftText.toLowerCase().indexOf(e.title.toLowerCase().slice(0, 18)) !== -1).length;
    const hasDigits = /\b\d{2,}\b/.test(draftText.replace(/\d+ ndërhyrje/, ''));
    const initialsInText = selectedPub.filter((e) => e.citizenInitials && draftText.indexOf(e.citizenInitials) !== -1);
    const pubChecks = [
      {
        label: 'Rastet e përmendura janë të zgjidhura',
        state: notClosed.length ? 'fail' : notAccepted.length ? 'warn' : 'pass',
        note: notClosed.length
          ? notClosed.map((e) => e.displayId).join(', ') + ' nuk janë zgjidhur'
          : notAccepted.length
            ? notAccepted.map((e) => e.displayId).join(', ') + ' ende pa pranim përfundimtar'
            : 'Të gjitha të mbyllura ose të zgjidhura',
      },
      { label: 'ID-të e rasteve ekzistojnë', state: selectedPub.length === st.pubSelected.length ? 'pass' : 'fail', note: selectedPub.length + ' / ' + st.pubSelected.length + ' të gjetura' },
      {
        label: 'Pretendimet mbështeten nga rastet',
        state: selectedPub.length && mentions === selectedPub.length ? 'pass' : 'warn',
        note: mentions + ' nga ' + selectedPub.length + ' raste të përshkruara në tekst',
      },
      {
        label: 'Pa informacion personal',
        state: piiFlag.length || initialsInText.length ? 'fail' : 'pass',
        note: piiFlag.length
          ? 'Moderimi sinjalizoi informacion personal në ' + piiFlag.map((m) => m.r.displayId).join(', ')
          : initialsInText.length
            ? 'Teksti përmban inicialet e qytetarit'
            : 'Asnjë emër, telefon ose inicial qytetari',
      },
      {
        label: 'Pa të dhëna të ndjeshme',
        state: hasDigits ? 'warn' : 'pass',
        note: hasDigits ? 'Teksti përmban numra — kontrolloni që nuk janë adresa të sakta ose telefona' : 'Asnjë adresë e saktë ose numër',
      },
      {
        label: 'Vendndodhjet të përshtatshme për publikim',
        state: schoolCases.length && cfg.pubRules.maskSchools ? 'warn' : 'pass',
        note: schoolCases.length ? schoolCases.map((e) => e.displayId).join(', ') + ' pranë institucionit arsimor — përdoret vetëm zona' : 'Përdoren vetëm zonat, jo adresat',
      },
    ].map((c) => Object.assign(c, { mark: CHECK[c.state].mark, color: CHECK[c.state].color, bg: CHECK[c.state].bg }));
    const pubBlocked = !selectedPub.length || pubChecks.some((c) => c.state === 'fail');
    const pubScreen: Rec = {
      candidates: pubCandidates.map((r) => {
        const e = effById[r.id];
        const on = st.pubSelected.indexOf(r.id) !== -1;
        return {
          id: r.displayId,
          title: r.title,
          zone: r.zone,
          status: e.status,
          statusColor: e.status === 'Mbyllur' ? '#4A4640' : e.status === 'Zgjidhur' ? '#2E7D4F' : '#C23B31',
          published: !!publishedIds[r.id],
          checkClass: on ? 'is-on' : '',
          checked: on,
          onClick: () => this._togglePubCase(r.id),
        };
      }),
      selectedCount: selectedPub.length,
      hasSelection: selectedPub.length > 0,
      noSelection: selectedPub.length === 0,
      draft: draftText,
      editing: st.pubEditing,
      notEditing: !st.pubEditing,
      onEdit: () => this.setState({ pubEditing: true, pubDraft: draftText }),
      onDraft: (ev: InputEvent) => this.setState({ pubDraft: ev.target.value }),
      onDoneEdit: () => this.setState({ pubEditing: false }),
      onRegenerate: () => this.setState({ pubDraft: null, pubEditing: false }),
      checks: pubChecks,
      blocked: pubBlocked,
      publishDisabledClass: pubBlocked ? 'is-disabled' : '',
      blockNote: pubBlocked
        ? selectedPub.length
          ? 'Publikimi është i bllokuar derisa kontrollet me ✕ të zgjidhen.'
          : 'Zgjidhni të paktën një rast të zgjidhur.'
        : 'Nëpunësi mbetet përgjegjës për publikimin përfundimtar.',
      onPublish: () => this._publish(draftText, 'Publikuar'),
      onReturn: () => this._publish(draftText, 'Në shqyrtim'),
      notice: st.pubNotice,
      hasNotice: !!st.pubNotice,
      history: allPubs
        .slice()
        .sort((a, b) => b.time - a.time)
        .map((p) => ({
          id: p.id,
          time: S.fmtDateTime(p.time),
          by: p.by,
          status: p.status,
          statusColor: p.status === 'Publikuar' ? '#2E7D4F' : '#B8860B',
          cases: p.caseIds.map((id: Rec) => '#' + id).join(', '),
          text: p.text,
        })),
    };

    // ======================================================================
    // 12. Screen: Human overrides
    // ======================================================================
    const allOverrides = overrideEv.slice().sort((a, b) => b.time - a.time);
    const ovFiltered = allOverrides.filter(
      (e) =>
        (!st.ovType || e.type === st.ovType) &&
        (!st.ovClerk || e.actor === st.ovClerk) &&
        (!st.ovDept || e.dept === st.ovDept) &&
        (!st.ovSearch || byId(e.caseId).displayId.indexOf(st.ovSearch.replace('#', '')) !== -1 || (e.reason || '').toLowerCase().indexOf(st.ovSearch.toLowerCase()) !== -1),
    );
    const overrideScreen: Rec = {
      weekCount: allOverrides.filter((e) => inWeek(e.time)).length,
      total: allOverrides.length,
      shown: ovFiltered.length,
      rows: ovFiltered.map((e) => ({
        time: S.fmtDateTime(e.time),
        id: byId(e.caseId).displayId,
        type: TYPE_LABEL[e.type],
        auto: e.autoAction || '—',
        human: e.humanAction || e.result,
        by: e.actor,
        reason: e.reason || 'Arsye e paregjistruar',
        onOpen: this._select(e.caseId),
      })),
      none: ovFiltered.length === 0,
      typeOptions: [{ value: '', label: 'Çdo automatizim' }].concat(A.types.map((t) => ({ value: t.id, label: t.label }))),
      type: st.ovType,
      onType: (ev: InputEvent) => this.setState({ ovType: ev.target.value }),
      clerkOptions: [{ value: '', label: 'Çdo nëpunës' }].concat(A.clerks.concat(['Stafi']).map((c) => ({ value: c, label: c }))),
      clerk: st.ovClerk,
      onClerk: (ev: InputEvent) => this.setState({ ovClerk: ev.target.value }),
      deptOptions: [{ value: '', label: 'Çdo departament' }].concat(S.departments.map((d) => ({ value: d.id, label: d.name }))),
      dept: st.ovDept,
      onDept: (ev: InputEvent) => this.setState({ ovDept: ev.target.value }),
      search: st.ovSearch,
      onSearch: (ev: InputEvent) => this.setState({ ovSearch: ev.target.value }),
      byType: A.types.map((t) => ({ label: t.short, n: allOverrides.filter((e) => e.type === t.id).length })).filter((x) => x.n > 0),
      patterns: patterns.map((p) => ({ text: p.text, evidence: p.evidence, actionLabel: p.actionLabel, onAction: p.onAction })),
      hasPatterns: patterns.length > 0,
      onClear: () => this.setState({ ovType: '', ovClerk: '', ovDept: '', ovSearch: '' }),
    };

    // ======================================================================
    // 13. Screen: Audit log
    // ======================================================================
    const auFiltered = eventsDesc.filter(
      (e) =>
        (st.auActor === 'all' || (st.auActor === 'auto' && e.actorKind === 'system') || (st.auActor === 'human' && e.actorKind === 'clerk')) &&
        (!st.auType || e.type === st.auType) &&
        (!st.auClerk || e.actor === st.auClerk) &&
        (!st.auSearch || byId(e.caseId).displayId.indexOf(st.auSearch.replace('#', '')) !== -1 || e.title.toLowerCase().indexOf(st.auSearch.toLowerCase()) !== -1),
    );
    const auditScreen: Rec = {
      actorChips: [
        { key: 'all', label: 'Të gjitha' },
        { key: 'auto', label: 'Automatike' },
        { key: 'human', label: 'Njerëzore' },
      ].map((c) => ({ label: c.label, onClass: st.auActor === c.key ? 'is-on' : '', onClick: () => this.setState({ auActor: c.key, auLimit: 40 }) })),
      typeOptions: [{ value: '', label: 'Çdo automatizim' }].concat(A.types.map((t) => ({ value: t.id, label: t.label }))).concat([{ value: 'case', label: 'Veprime rasti' }]),
      type: st.auType,
      onType: (ev: InputEvent) => this.setState({ auType: ev.target.value, auLimit: 40 }),
      clerkOptions: [{ value: '', label: 'Çdo aktor' }].concat(['SINJAL'].concat(A.clerks).map((c) => ({ value: c, label: c }))),
      clerk: st.auClerk,
      onClerk: (ev: InputEvent) => this.setState({ auClerk: ev.target.value, auLimit: 40 }),
      search: st.auSearch,
      onSearch: (ev: InputEvent) => this.setState({ auSearch: ev.target.value, auLimit: 40 }),
      rows: auFiltered.map((e) => {
        const kindMeta =
          e.actorKind === 'system'
            ? { bg: '#EDEAE3', ink: '#1B1917', label: 'SINJAL' }
            : e.actorKind === 'citizen'
              ? { bg: '#EDEAE3', ink: '#6B665F', label: 'Qytetari' }
              : { bg: e.isOverride ? '#F5EBD6' : '#E4DFD6', ink: e.isOverride ? '#7A5A0B' : '#1B1917', label: e.actor };
        return {
          time: S.fmtDateTime(e.time),
          id: byId(e.caseId).displayId,
          actor: kindMeta.label,
          actorBg: kindMeta.bg,
          actorInk: kindMeta.ink,
          type: TYPE_LABEL[e.type],
          action: e.title,
          result: e.result || '—',
          reason: e.reason || '',
          hasReason: !!e.reason,
          onOpen: this._select(e.caseId),
        };
      }),
      shown: Math.min(st.auLimit, auFiltered.length),
      total: auFiltered.length,
      allTotal: events.length,
      canMore: auFiltered.length > st.auLimit,
      onMore: () => this.setState({ auLimit: st.auLimit + 40 }),
      none: auFiltered.length === 0,
      humanCount: events.filter((e) => e.actorKind === 'clerk').length,
      autoCount: autoEv.length,
    };

    // ======================================================================
    // 14. Screen: Rules & configuration (+ rule builder + autonomy settings)
    // ======================================================================
    const rules = this._rules();
    const ruleGroups = [
      { key: 'routing', label: 'Rregullat e routing-ut', q: 'Kush e merr çfarë?', n: rules.length },
      { key: 'priority', label: 'Rregullat e prioritetit', q: 'Kur bëhet një rast urgjent?', n: S.categories.length },
      { key: 'sla', label: 'Rregullat SLA', q: 'Sa kohë ka çdo shërbim?', n: A.slaTargets.length },
      { key: 'escalation', label: 'Rregullat e eskalimit', q: 'Kush njoftohet dhe kur?', n: A.slaRules.length },
      { key: 'duplicates', label: 'Pragjet e dublikatave', q: 'Kur lidhen ose sinjalizohen rastet?', n: 2 },
      { key: 'missing', label: 'Informacioni i detyrueshëm', q: 'Çfarë informacioni kërkohet?', n: A.missingFields.length },
      { key: 'resolution', label: 'Rregullat e zgjidhjes', q: 'Çfarë dëshmie kërkohet?', n: 4 },
      { key: 'publication', label: 'Rregullat e publikimit', q: 'Çfarë mund të përgatitet ose publikohet?', n: 4 },
    ];
    const selRuleObj = rules.filter((r) => r.id === st.selRule)[0] || null;
    const bRule = selRuleObj || rules[0]; // builder always computed; only shown when a rule is selected
    const draft = st.ruleDraft && st.ruleDraft.id === bRule.id ? st.ruleDraft : bRule;
    const testRule = draft;
    const affected = testRule ? S.reports.filter((r) => r.category === testRule.category && (!testRule.zone || r.zone === testRule.zone)) : [];
    const wouldChange = testRule ? affected.filter((r) => effById[r.id].department !== testRule.dept) : [];
    const precededBy = testRule
      ? rules
          .slice(
            0,
            rules.findIndex((r) => r.id === testRule.id),
          )
          .filter((r) => r.active && r.category === testRule.category && (!r.zone || r.zone === testRule.zone || !testRule.zone))
      : [];
    const ruleHistory = bRule
      ? st.ruleLog
          .filter((l) => l.ruleId === bRule.id)
          .map((l) => ({ label: l.label, meta: l.by + ' · ' + S.fmtDateTime(new Date(l.at)) }))
          .concat(
            events
              .filter((e) => e.type === 'routing' && e.isOverride && routingById[e.caseId].rule && routingById[e.caseId].rule.id === bRule.id)
              .map((e) => ({ label: 'Ndërhyrje: ' + byId(e.caseId).displayId + ' ' + e.result + ' — "' + e.reason + '"', meta: e.actor + ' · ' + S.fmtDateTime(e.time) })),
          )
      : [];
    const customRules = readJSON<Rec[]>(STORAGE_KEYS.customRules, []);
    const catOptions = S.categories.map((c) => ({ value: c.id, label: c.label }));
    const zoneOptions = [{ value: '', label: 'Çdo zonë' }].concat(S.zones.map((z) => ({ value: z, label: z })));
    const deptOpts = S.departments.map((d) => ({ value: d.id, label: d.name }));
    const toggleCfg = (group: string, id: string) => () => {
      const g = Object.assign({}, cfg[group]);
      g[id] = !g[id];
      const patch: Rec = {};
      patch[group] = g;
      this._setConfig(patch);
    };
    const configScreen: Rec = {
      tabs: [
        { key: 'rules', label: 'Rregullat' },
        { key: 'settings', label: 'Cilësimet e automatizimit' },
      ].map((t) => ({ label: t.label, onClass: st.configTab === t.key ? 'is-on' : '', onClick: () => this.setState({ configTab: t.key, selRule: null }) })),
      isRules: st.configTab === 'rules',
      isSettings: st.configTab === 'settings',
      groups: ruleGroups.map((g) => ({
        label: g.label,
        n: g.n,
        onClass: st.ruleGroup === g.key ? 'is-on' : '',
        onClick: () => this.setState({ ruleGroup: g.key, selRule: null, ruleEditing: false }),
      })),
      group: ruleGroups.filter((g) => g.key === st.ruleGroup)[0],
      isRouting: st.ruleGroup === 'routing' && !selRuleObj,
      isBuilder: st.ruleGroup === 'routing' && !!selRuleObj,
      isPriority: st.ruleGroup === 'priority',
      isSla: st.ruleGroup === 'sla',
      isEscalation: st.ruleGroup === 'escalation',
      isDuplicates: st.ruleGroup === 'duplicates',
      isMissing: st.ruleGroup === 'missing',
      isResolution: st.ruleGroup === 'resolution',
      isPublication: st.ruleGroup === 'publication',
      routingRules: rules.map((r, i) => ({
        id: r.id,
        no: r.no,
        order: i + 1,
        category: S.catLabel(r.category),
        zone: r.zone || 'Çdo zonë',
        dept: S.deptName(r.dept),
        team: r.team,
        exception: r.exception || '',
        hasException: !!r.exception,
        switchClass: r.active ? 'is-on' : '',
        dim: r.active ? '1' : '.55',
        onToggle: () => this._toggleRule(r.id),
        onUp: () => this._moveRule(r.id, -1),
        onDown: () => this._moveRule(r.id, 1),
        upClass: i === 0 ? 'is-disabled' : '',
        downClass: i === rules.length - 1 ? 'is-disabled' : '',
        onDuplicate: () => this._duplicateRule(r.id),
        onOpen: () => this._openRule(r.id),
        matches: S.reports.filter((x) => x.category === r.category && (!r.zone || x.zone === r.zone)).length,
      })),
      customRules: customRules.map((c: Rec) => ({ category: S.catLabel(c.category), dept: S.deptName(c.department), priority: c.priority })),
      hasCustomRules: customRules.length > 0,
      builder: {
        no: bRule.no,
        editing: st.ruleEditing,
        viewing: !st.ruleEditing,
        category: S.catLabel(draft.category),
        zone: draft.zone || 'Çdo zonë',
        dept: S.deptName(draft.dept),
        team: draft.team,
        exception: draft.exception || 'Asnjë përjashtim',
        hasZone: true,
        active: bRule.active,
        switchClass: bRule.active ? 'is-on' : '',
        activeLabel: bRule.active ? 'Aktiv' : 'Joaktiv',
        onToggle: () => this._toggleRule(bRule.id),
        onEdit: () => this.setState({ ruleEditing: true, ruleDraft: Object.assign({}, bRule), ruleTested: false }),
        onCancelEdit: () => this.setState({ ruleEditing: false, ruleDraft: Object.assign({}, bRule), ruleTested: false }),
        onSave: () => this._saveRuleDraft(),
        onBack: () => this.setState({ selRule: null, ruleEditing: false }),
        draftCategory: draft.category,
        draftZone: draft.zone || '',
        draftDept: draft.dept,
        draftTeam: draft.team,
        draftException: draft.exception || '',
        catOptions: catOptions,
        zoneOptions: zoneOptions,
        deptOptions: deptOpts,
        teamOptions: (A.teams[draft.dept] || []).map((t) => ({ value: t, label: t })),
        onCategory: (ev: InputEvent) => this._setRuleDraft({ category: ev.target.value }),
        onZone: (ev: InputEvent) => this._setRuleDraft({ zone: ev.target.value || null }),
        onDept: (ev: InputEvent) => this._setRuleDraft({ dept: ev.target.value }),
        onTeam: (ev: InputEvent) => this._setRuleDraft({ team: ev.target.value }),
        onException: (ev: InputEvent) => this._setRuleDraft({ exception: ev.target.value }),
        tested: st.ruleTested,
        onTest: () => this.setState({ ruleTested: true }),
        onHideTest: () => this.setState({ ruleTested: false }),
        testSummary: 'Nëse ky rregull do të ishte aktiv, ' + affected.length + ' raporte ekzistuese do të ishin prekur.',
        testDetail: wouldChange.length
          ? wouldChange.length + ' prej tyre sot janë në një departament tjetër dhe do të kishin shkuar te ' + S.deptName(testRule.dept) + '.'
          : 'Asnjë prej tyre nuk do të ndryshonte departament.',
        testShadow: precededBy.length ? 'Kujdes: rregulli #' + precededBy.map((r) => r.no).join(', #') + ' vjen më parë në renditje dhe kap të njëjtat raste.' : '',
        hasShadow: precededBy.length > 0,
        testCases: affected.slice(0, 8).map((r) => ({
          id: r.displayId,
          title: r.title,
          zone: r.zone,
          current: effById[r.id].departmentName,
          changes: effById[r.id].department !== testRule.dept,
          changeColor: effById[r.id].department !== testRule.dept ? '#C23B31' : '#8A847C',
          changeLabel: effById[r.id].department !== testRule.dept ? '→ ' + S.deptName(testRule.dept) : 'pa ndryshim',
        })),
        moreCases: affected.length > 8 ? '+ ' + (affected.length - 8) + ' të tjera' : '',
        hasMore: affected.length > 8,
        historyOpen: st.ruleHistoryOpen,
        onHistory: () => this.setState({ ruleHistoryOpen: !st.ruleHistoryOpen }),
        history: ruleHistory,
        historyNone: ruleHistory.length === 0,
        onDuplicate: () => this._duplicateRule(bRule.id),
      },
      priorityRules: S.categories.map((c) => {
        const on = cfg.priorityActive[c.id] === undefined ? true : cfg.priorityActive[c.id];
        return {
          category: c.label,
          base: c.defaultPriority,
          baseColor: pm(c.defaultPriority).color,
          exception: c.exception,
          switchClass: on ? 'is-on' : '',
          onToggle: () => {
            const a = Object.assign({}, cfg.priorityActive);
            a[c.id] = !on;
            this._setConfig({ priorityActive: a });
          },
          count: priority.filter((x) => x.r.category === c.id && x.dir === 'up').length,
        };
      }),
      slaTargets: A.slaTargets.map((t) => ({
        priority: t.priority,
        color: pm(t.priority).color,
        hours: t.hours + ' orë',
        cases: S.reports.filter((r) => r.priority === t.priority && isOpen(effById[r.id])).length,
      })),
      escalation: slaScreen.rules,
      dupLink: cfg.dupLinkThreshold,
      dupFlag: cfg.dupFlagThreshold,
      dupLinkOptions: [80, 85, 90, 95].map((v) => ({ value: String(v), label: v + '%' })),
      dupFlagOptions: [50, 60, 70].map((v) => ({ value: String(v), label: v + '%' })),
      dupLinkValue: String(cfg.dupLinkThreshold),
      dupFlagValue: String(cfg.dupFlagThreshold),
      onDupLink: (ev: InputEvent) => this._setConfig({ dupLinkThreshold: parseInt(ev.target.value, 10) }),
      onDupFlag: (ev: InputEvent) => this._setConfig({ dupFlagThreshold: parseInt(ev.target.value, 10) }),
      dupEffect:
        'Me këto pragje, ' +
        A.duplicateCandidates.filter((c) => c.similarity >= cfg.dupLinkThreshold).length +
        ' nga ' +
        A.duplicateCandidates.length +
        ' kandidatët aktualë do të lidheshin automatikisht dhe ' +
        A.duplicateCandidates.filter((c) => c.similarity >= cfg.dupFlagThreshold && c.similarity < cfg.dupLinkThreshold).length +
        ' do të sinjalizoheshin. Vendimet e kaluara nuk ndryshojnë.',
      missingRules: A.missingFields.map((f) => ({
        label: f.label,
        switchClass: cfg.missingRequired[f.id] ? 'is-on' : '',
        state: cfg.missingRequired[f.id] ? 'I detyrueshëm' : 'Opsional',
        onToggle: toggleCfg('missingRequired', f.id),
      })),
      resolutionRules: [
        { id: 'description', label: 'Përshkrimi i zgjidhjes' },
        { id: 'evidence', label: 'Dëshmi (foto) e zgjidhjes' },
        { id: 'beforeAfter', label: 'Foto para / pas' },
        { id: 'location', label: 'Konsistenca e vendndodhjes' },
      ].map((r) => ({
        label: r.label,
        switchClass: cfg.resolutionRequired[r.id] ? 'is-on' : '',
        state: cfg.resolutionRequired[r.id] ? 'E detyrueshme' : 'Opsionale',
        onToggle: toggleCfg('resolutionRequired', r.id),
      })),
      publicationRules: [
        { id: 'draft', label: 'AI përgatit draftin e njoftimit', note: 'Nga rastet e zgjedhura nga nëpunësi.' },
        { id: 'onlyClosed', label: 'Përfshi vetëm raste të zgjidhura', note: 'Rastet e hapura nuk mund të publikohen.' },
        { id: 'maskSchools', label: 'Përdor vetëm zonën pranë shkollave/kopshteve', note: 'Asnjë adresë e saktë pranë institucioneve arsimore.' },
      ].map((r) => ({ label: r.label, note: r.note, switchClass: cfg.pubRules[r.id] ? 'is-on' : '', onToggle: toggleCfg('pubRules', r.id) })),
      settings: A.types.map((t) => {
        const s = setting(t.id);
        return {
          label: t.label,
          switchClass: s.active ? 'is-on' : '',
          activeLabel: s.active ? 'Aktiv' : 'Paaktiv',
          activeColor: s.active ? '#2E7D4F' : '#8A847C',
          autonomy: s.autonomy,
          autonomyLabel: A.autonomyMeta[s.autonomy].label,
          autonomyColor: A.autonomyMeta[s.autonomy].color,
          note: A.autonomyMeta[s.autonomy].note,
          options: t.autonomyOptions.map((o) => ({ value: o, label: A.autonomyMeta[o].label })),
          locked: t.autonomyOptions.length === 1,
          unlocked: t.autonomyOptions.length > 1,
          onToggle: () => this._setSetting(t.id, { active: !s.active }),
          onAutonomy: (ev: InputEvent) => this._setSetting(t.id, { autonomy: ev.target.value as AutonomyId }),
          onOpen: () => this._go(screenOf[t.id]),
        };
      }),
      ruleLog: st.ruleLog
        .slice()
        .reverse()
        .slice(0, 6)
        .map((l) => ({
          label: l.label,
          meta: l.by + ' · ' + S.fmtDateTime(new Date(l.at)),
          rule: l.ruleId.indexOf('setting:') === 0 ? (A.types.filter((t) => 'setting:' + t.id === l.ruleId)[0] || {}).label : '#' + ((rules.filter((r) => r.id === l.ruleId)[0] || {}).no || ''),
        })),
      hasRuleLog: st.ruleLog.length > 0,
    };

    // ======================================================================
    // 15. Sub-navigation
    // ======================================================================
    const navItem = (key: string, label: string, count: number, alert?: boolean, dot?: string) => ({
      key: key,
      label: label,
      count: count,
      hasCount: count > 0,
      countClass: alert ? 'is-alert' : '',
      dot: dot || '',
      hasDot: !!dot,
      onClass: st.screen === key ? 'is-on' : '',
      onClick: () => this.setState({ screen: key }),
    });
    const typeDot = (t: Rec) => (setting(t).active ? '#2E7D4F' : '#B8B2A9');
    const nav = [
      { title: '', hasTitle: false, items: [navItem('overview', 'Përmbledhje', 0), navItem('activity', 'Aktiviteti', 0), navItem('attention', 'Kërkojnë vëmendje', attentionAll.length, true)] },
      {
        title: 'Automatizimet',
        hasTitle: true,
        items: [
          navItem('routing', 'Routing', pendRouting.length + pendIntake.length, pendIntake.length > 0, typeDot('routing')),
          navItem('priority', 'Prioriteti', 0, false, typeDot('priority')),
          navItem('duplicates', 'Dublikatat', pendDup.length, false, typeDot('duplicates')),
          navItem(
            'moderation',
            'Moderimi',
            pendMod.length,
            pendMod.some((m) => m.held),
            typeDot('moderation'),
          ),
          navItem('missing', 'Informacioni i munguar', blockedMiss.length, blockedMiss.length > 0, typeDot('missing')),
          navItem('sla', 'SLA & Eskalimet', slaBreachOpen.length, slaBreachOpen.length > 0, typeDot('sla')),
          navItem('verification', 'Verifikimi i zgjidhjeve', pendVer.length, false, typeDot('verification')),
          navItem('publications', 'Publikimet', 0, false, typeDot('publications')),
        ],
      },
      {
        title: 'Kontrolli',
        hasTitle: true,
        items: [navItem('overrides', 'Ndërhyrjet njerëzore', overrideScreen.weekCount, false), navItem('audit', 'Audit Log', 0), navItem('config', 'Rregullat & Konfigurimi', 0)],
      },
    ];
    const SCREEN_TITLE: Record<string, string[]> = {
      overview: ['Automatizimet', 'Monitoroni veprimet automatike të SINJAL dhe ndërhyni kur kërkohet.'],
      activity: ['Aktiviteti', 'Çdo veprim automatik dhe njerëzor, sipas kohës.'],
      attention: ['Kërkojnë vëmendjen tuaj', "Vetëm ato që automatizimi nuk mund t'i vendosë vetë — dhe modelet që tregojnë se një rregull duhet rishikuar."],
      routing: ['Routing automatik', 'SINJAL cakton automatikisht raportet te departamenti / ekipi përgjegjës.'],
      priority: ['Prioriteti automatik', 'SINJAL vendos prioritetin sipas rregullave të konfiguruara; stafi e ruan kontrollin.'],
      duplicates: ['Dublikatat', 'Dublikatë e mundshme ≠ dublikatë e konfirmuar. Lidhja automatike ndodh vetëm mbi pragun.'],
      moderation: ['Moderimi i përmbajtjes', 'Zbulimi ≠ fshirje. Për vendime me pasoja SINJAL vetëm sinjalizon dhe pezullon; vendos nëpunësi.'],
      missing: ['Informacioni i munguar', 'SINJAL identifikon raportet e paplota dhe i kërkon qytetarit informacionin që mungon.'],
      sla: ['SLA & Eskalimet', 'Eskalimi i bazuar në kohë: kush njoftohet dhe kur.'],
      verification: ['Verifikimi i zgjidhjeve', 'Kontrolli automatik i cilësisë kur një departament e shënon raportin të zgjidhur.'],
      publications: ['Publikimet', 'Njoftime për qytetarët nga rastet e zgjidhura. AI përgatit draftin — nëpunësi publikon.'],
      overrides: ['Ndërhyrjet njerëzore', 'Çdo herë që stafi ndryshoi një veprim automatik, dhe pse.'],
      audit: ['Audit Log', 'Regjistri i plotë i çdo veprimi me pasoja — automatik apo njerëzor.'],
      config: ['Rregullat & Konfigurimi', 'Si sillet automatizimi: rregullat, pragjet dhe niveli i autonomisë.'],
    };
    const is = (k: Rec) => st.screen === k;

    // pages a list field in place, adding `<field>All` and `<field>Pg` beside it
    const pg = (obj: Rec, field: string, key: string, size: number) => {
      const P = pager(key, obj[field], size);
      obj[field + 'All'] = obj[field];
      obj[field] = P.items;
      obj[field + 'Pg'] = P.pg;
    };
    const feedP = pager('feed', recentFeed, 5);
    pg(activity, 'rows', 'act:' + st.actType, 10);
    pg(routingScreen, 'rows', 'routing:' + st.routingFilter, 10);
    pg(priorityScreen, 'rows', 'priority:' + st.priorityFilter, 10);
    pg(dupScreen, 'pending', 'dupPending', 2);
    pg(dupScreen, 'decided', 'dupDecided', 4);
    pg(modScreen, 'rows', 'mod', 8);
    pg(missScreen, 'rows', 'miss', 8);
    pg(slaScreen, 'feed', 'slaFeed', 6);
    pg(verScreen, 'rows', 'ver', 7);
    pg(pubScreen, 'candidates', 'pubCand', 6);
    pg(pubScreen, 'history', 'pubHist', 3);
    pg(overrideScreen, 'rows', 'ov:' + [st.ovType, st.ovClerk, st.ovDept, st.ovSearch].join('|'), 8);
    pg(auditScreen, 'rows', 'au:' + [st.auActor, st.auType, st.auClerk, st.auSearch].join('|'), 12);
    pg(configScreen, 'routingRules', 'cfgRules', 8);
    const attnRedP = pager(
      'attnRed',
      attentionAll.filter((a) => a.sev === 'red'),
      5,
    );
    const attnAmberP = pager(
      'attnAmber',
      attentionAll.filter((a) => a.sev === 'amber' && !a.isPattern),
      5,
    );

    return {
      nav: nav,
      title: SCREEN_TITLE[st.screen][0],
      lede: SCREEN_TITLE[st.screen][1],
      notOverview: st.screen !== 'overview',
      onOverview: () => this._go('overview'),
      onConfigure: () => this._go('config', { configTab: 'settings', selRule: null }),
      onAudit: () => this._go('audit'),
      isOverview: is('overview'),
      isActivity: is('activity'),
      isAttention: is('attention'),
      isRouting: is('routing'),
      isPriority: is('priority'),
      isDuplicates: is('duplicates'),
      isModeration: is('moderation'),
      isMissing: is('missing'),
      isSla: is('sla'),
      isVerification: is('verification'),
      isPublications: is('publications'),
      isOverrides: is('overrides'),
      isAudit: is('audit'),
      isConfig: is('config'),
      periods: periods,
      health: health,
      loop: loop,
      statusRows: statusRows,
      recentFeed: feedP.items,
      recentFeedPg: feedP.pg,
      attention: attentionAll.slice(0, 5),
      attentionAll: attentionAll,
      attentionNone: attentionAll.length === 0,
      attentionCount: attentionAll.length,
      attentionRed: attnRedP.items,
      attentionRedPg: attnRedP.pg,
      attentionAmber: attnAmberP.items,
      attentionAmberPg: attnAmberP.pg,
      attentionPatterns: patternAttn,
      hasRed: attentionAll.some((a) => a.sev === 'red'),
      hasAmber: attentionAll.some((a) => a.sev === 'amber' && !a.isPattern),
      hasPatterns: patternAttn.length > 0,
      normalLine: pUnchanged.length + ' veprime automatike ' + periodLabel + ' u kryen pa ndërhyrje.',
      trend: trend,
      trendTotals: trendTotals,
      trendNote: trendNote,
      activity: activity,
      routing: routingScreen,
      priority: priorityScreen,
      dup: dupScreen,
      mod: modScreen,
      miss: missScreen,
      sla: slaScreen,
      ver: verScreen,
      pub: pubScreen,
      ov: overrideScreen,
      au: auditScreen,
      cfg: configScreen,
      goRouting: () => this._go('routing'),
      goAttention: () => this._go('attention'),
      goActivity: () => this._go('activity'),
      goOverrides: () => this._go('overrides'),
      goConfigRouting: () => this._go('config', { configTab: 'rules', ruleGroup: 'routing', selRule: null }),
      confLegend: (['high', 'medium', 'low'] as ConfTier[]).map((k) => ({
        label: A.tierMeta[k].label,
        color: A.tierMeta[k].color,
        range: k === 'high' ? '≥ 80%' : k === 'medium' ? '55–79%' : '< 55%',
        note: k === 'high' ? 'Veprim automatik' : k === 'medium' ? 'Automatik + shqyrtim i theksuar' : 'Asnjë vendim automatik me pasoja',
      })),
    };
  }
}
