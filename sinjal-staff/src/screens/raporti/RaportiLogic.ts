import type { ChangeEvent } from 'react';
import { SINJAL } from '../../data/sinjal';
import type { CaseOverride, CaseOverrides, DeptId, Priority, Report, Status, TimelineEvent } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, readString, writeJSON, writeString } from '../../lib/storage';
import { REAL_STAFF, isDatabaseCase, loadReportDetail, saveCase } from '../../api/staff';

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

interface AssignDraft {
  department: DeptId;
  responsible: string;
  priority: Priority;
}

interface State {
  currentId: string | null;
  overrides: CaseOverrides;
  moreOpen: boolean;
  exportNotice: boolean;
  assignOpen: boolean;
  assignDraft: AssignDraft | null;
  assignReason: string;
  statusDraft: string | null;
  reopenOpen: boolean;
  reopenReason: string;
  requestOpen: boolean;
  requestCustom: string;
  deptDraft: string;
}

/** Port of the Raporti.dc.html logic: one case, its actions and its audit trail. */
export class RaportiLogic extends DCLogic<Record<string, never>, State> {
  state: State = {
    currentId: null,
    overrides: {},
    moreOpen: false,
    exportNotice: false,
    assignOpen: false,
    assignDraft: null,
    assignReason: '',
    statusDraft: null,
    reopenOpen: false,
    reopenReason: '',
    requestOpen: false,
    requestCustom: '',
    deptDraft: '',
  };

  componentDidMount() {
    const S = SINJAL;
    let id = readString(STORAGE_KEYS.selectedReport);
    if (!id || !S.byId(id)) id = S.reports[0] ? S.reports[0].id : null;
    const overrides = readJSON<CaseOverrides>(STORAGE_KEYS.caseOverrides, {});
    this.setState({ currentId: id, overrides });
    if (id && (REAL_STAFF || isDatabaseCase(id))) void loadReportDetail(id).then(() => this.onChange?.()).catch((err: unknown) => window.alert(String(err)));
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
    this.setState({ overrides });
  }
  _goTo(id: string) {
    return () => {
      writeString(STORAGE_KEYS.selectedReport, id);
      if (REAL_STAFF || isDatabaseCase(id)) void loadReportDetail(id).then(() => this.onChange?.()).catch((err: unknown) => window.alert(String(err)));
      this.setState({
        currentId: id,
        assignOpen: false,
        assignDraft: null,
        assignReason: '',
        statusDraft: null,
        reopenOpen: false,
        reopenReason: '',
        requestOpen: false,
        requestCustom: '',
        deptDraft: '',
        moreOpen: false,
      });
    };
  }
  // "The report as the clerk currently sees it": seed data merged with the
  // sinjal_case_overrides layer, shared by renderVals and the action
  // handlers so the merge (including the recomputed department/employee
  // names overrides don't carry) lives in one place.
  _currentReport() {
    const S = SINJAL;
    const id = this.state.currentId || S.reports[0].id;
    const base = S.byId(id) || S.reports[0];
    const ov: CaseOverride = this.state.overrides[base.id] || {};
    const eff = Object.assign({}, base, ov) as Report;
    if (ov.status) eff.status = ov.status;
    eff.departmentName = S.deptName(eff.department);
    eff.responsibleName = eff.responsible ? S.empName(eff.responsible) : null;
    return { S, base, ov, eff };
  }

  _openAssign() {
    const { eff } = this._currentReport();
    this.setState({ assignOpen: true, assignDraft: { department: eff.department, responsible: eff.responsible || '', priority: eff.priority }, assignReason: '' });
  }
  _cancelAssign() {
    this.setState({ assignOpen: false, assignDraft: null, assignReason: '' });
  }
  _saveAssign() {
    const { base, eff, S } = this._currentReport();
    const d = this.state.assignDraft;
    if (!d) return;
    const deptOrRespChanged = d.department !== eff.department || (d.responsible || '') !== (eff.responsible || '');
    const isReassignment = !!eff.responsible && deptOrRespChanged;
    if (isReassignment && !(this.state.assignReason || '').trim()) return;
    const patch: CaseOverride = { department: d.department, responsible: d.responsible || null, priority: d.priority };
    if (isReassignment) {
      const reassignLog = (this.state.overrides[base.id] && this.state.overrides[base.id].reassignLog) || [];
      patch.reassignLog = reassignLog.concat([{ at: S.now.toISOString(), from: eff.departmentName, to: S.deptName(d.department), by: 'Drita K.', reason: this.state.assignReason.trim() }]);
    }
    this._patchOverride(base.id, patch);
    this.setState({ assignOpen: false, assignDraft: null, assignReason: '' });
  }

  _openReopen() {
    this.setState({ reopenOpen: true, reopenReason: '', requestOpen: false });
  }
  _cancelReopen() {
    this.setState({ reopenOpen: false, reopenReason: '' });
  }
  _confirmReopen() {
    const { base, eff, S } = this._currentReport();
    const reason = (this.state.reopenReason || '').trim();
    if (!reason) return;
    const reopenLog = (this.state.overrides[base.id] && this.state.overrides[base.id].reopenLog) || [];
    this._patchOverride(base.id, { status: 'Në punë', reopenLog: reopenLog.concat([{ at: S.now.toISOString(), from: eff.status, by: 'Drita K.', reason }]) });
    this.setState({ reopenOpen: false, reopenReason: '', statusDraft: null });
  }

  _toggleEscalate() {
    const { base, ov, S } = this._currentReport();
    if (ov.escalated) this._patchOverride(base.id, { escalated: false, escalatedAt: null });
    else this._patchOverride(base.id, { escalated: true, escalatedAt: S.now.toISOString() });
  }
  _acceptResolution() {
    const { base, S } = this._currentReport();
    this._patchOverride(base.id, { status: 'Mbyllur', acceptedAt: S.now.toISOString() });
  }

  _sendRequest(label: string) {
    const { base, S } = this._currentReport();
    const reqs = (this.state.overrides[base.id] && this.state.overrides[base.id].citizenRequests) || [];
    this._patchOverride(base.id, { citizenRequests: reqs.concat([{ at: S.now.toISOString(), label }]) });
    this.setState({ requestOpen: false, requestCustom: '' });
  }
  _sendCustomRequest() {
    const text = (this.state.requestCustom || '').trim();
    if (!text) return;
    this._sendRequest(text);
  }

  renderVals() {
    const { S, base, ov, eff } = this._currentReport();
    const NOW = S.now;
    const HOUR_MS = 3600000;

    const sm = S.statusMeta[eff.status] || S.statusMeta['I ri'];
    const pm = S.priorityMeta[eff.priority] || S.priorityMeta['E mesme'];
    const slaColor = base.slaBreached ? '#C23B31' : base.slaAtRisk ? '#B8860B' : '#6B665F';

    const dupDismissed = !!ov.dupDismissed;
    const dupShow = !!base.duplicateCandidateId && !dupDismissed && eff.status !== 'Dublikatë';

    // ---- merge the seed timeline with every audit event this session's
    // actions generated (reassignment, reopen, escalation, info request,
    // intervention note, accepted resolution) into one chronological
    // history, built only from the patches those actions wrote.
    const withDot = (s: string) => (/[.!?]$/.test(s) ? s : s + '.');
    const auditEvents: TimelineEvent[] = [];
    (ov.reassignLog || []).forEach((e) => auditEvents.push({ time: new Date(e.at), label: 'Caktimi u ndryshua nga ' + e.from + ' në ' + e.to + '. Arsye: ' + withDot(e.reason), kind: 'clerk' }));
    (ov.reopenLog || []).forEach((e) => auditEvents.push({ time: new Date(e.at), label: 'Raporti u rihap (ishte "' + e.from + '"). Arsye: ' + withDot(e.reason), kind: 'clerk' }));
    if (ov.escalatedAt) auditEvents.push({ time: new Date(ov.escalatedAt), label: 'U përshkallëzua te përgjegjësi i departamentit.', kind: 'clerk' });
    (ov.citizenRequests || []).forEach((e) => auditEvents.push({ time: new Date(e.at), label: 'Iu kërkua qytetarit: ' + e.label, kind: 'clerk' }));
    (ov.notes || []).forEach((n) => {
      if (n && typeof n !== 'string' && n.at) auditEvents.push({ time: new Date(n.at), label: 'Shënim ndërhyrjeje: ' + n.text, kind: 'clerk' });
    });
    if (ov.acceptedAt) auditEvents.push({ time: new Date(ov.acceptedAt), label: 'Zgjidhja u pranua; rasti u mbyll.', kind: 'clerk' });
    const mergedTimeline = (base.timeline || []).concat(auditEvents).sort((a, b) => a.time.getTime() - b.time.getTime());
    const lastActivityAt = mergedTimeline.length ? mergedTimeline[mergedTimeline.length - 1].time : base.submittedAt;

    const relTime = (d: Date) => {
      const mins = Math.max(0, Math.round((NOW.getTime() - d.getTime()) / 60000));
      if (mins < 1) return 'tani';
      if (mins < 60) return mins + ' min më parë';
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return hrs + ' orë më parë';
      return Math.round(hrs / 24) + ' ditë më parë';
    };
    const fmtDur = (hours: number) => S.fmtHours(Math.abs(hours)); // shared app-wide duration format

    // ---- exceptions: every signal is a computed condition, ranked so the
    // most urgent becomes the top banner and the rest appear in "Probleme".
    const terminal = ['Zgjidhur', 'Mbyllur', 'Refuzuar', 'Dublikatë'].indexOf(eff.status) !== -1;
    const noActivity48h = !terminal && (NOW.getTime() - lastActivityAt.getTime()) / HOUR_MS >= 48;
    const dupUndismissed = dupShow;
    const evidenceMissing = eff.status === 'Zgjidhur' && !(base.resolutionEvidence && base.resolutionEvidence.length > 0);
    const lowConfidence = base.ai.confidence < 60;
    type Sev = 1 | 2 | 3;
    const raw: { sev: Sev; isSla?: boolean; text: string; evidence: string; actionLabel: string; onAction: (() => void) | null }[] = [];
    if (base.slaBreached)
      raw.push({ sev: 3, isSla: true, text: 'SLA e shkelur', evidence: 'Afati u tejkalua (' + base.slaLabel + ').', actionLabel: 'Rishpërndaj', onAction: () => this._openAssign() });
    else if (base.slaAtRisk)
      raw.push({
        sev: 2,
        isSla: true,
        text: 'SLA në rrezik',
        evidence: 'Kanë mbetur ' + base.slaLabel + ' deri në afat.',
        actionLabel: ov.escalated ? 'Anulo përshkallëzimin' : 'Escalo',
        onAction: () => this._toggleEscalate(),
      });
    if (noActivity48h)
      raw.push({ sev: 2, text: 'Pa aktivitet për 48+ orë', evidence: 'Veprimi i fundit: ' + relTime(lastActivityAt) + '.', actionLabel: 'Rishpërndaj', onAction: () => this._openAssign() });
    if (dupUndismissed && base.duplicateCandidateId)
      raw.push({
        sev: 2,
        text: 'Dublikatë e mundshme e pashqyrtuar',
        evidence: base.duplicateSimilarity + '% ngjashmëri me ' + (S.byId(base.duplicateCandidateId) as Report).displayId + '.',
        actionLabel: '',
        onAction: null,
      });
    if (evidenceMissing) raw.push({ sev: 2, text: 'Mungon dëshmia e zgjidhjes', evidence: 'Statusi është "Zgjidhur" por nuk ka foto/dëshmi të ngarkuar.', actionLabel: '', onAction: null });
    if (base.reappeared && base.reappearedFromId) {
      const prev = S.byId(base.reappearedFromId) as Report;
      raw.push({ sev: 1, text: 'Raport i rishfaqur', evidence: 'I ngjashëm me ' + prev.displayId + ', tashmë ' + prev.status + '.', actionLabel: '', onAction: null });
    }
    if (lowConfidence)
      raw.push({
        sev: 1,
        text: 'Routing me besueshmëri të ulët',
        evidence: base.ai.confidence + '% besueshmëri e routing-ut — rekomandohet verifikim manual i departamentit.',
        actionLabel: 'Rishpërndaj',
        onAction: () => this._openAssign(),
      });
    raw.sort((a, b) => b.sev - a.sev);
    const SEVC: Record<Sev, string> = { 3: '#C23B31', 2: '#B8860B', 1: '#8A847C' };
    // SLA lives in the SLA card only: keep it out of the banner and list
    const nonSla = raw.filter((ex) => !ex.isSla);
    const exceptions = nonSla.map((ex) => ({
      color: SEVC[ex.sev],
      text: ex.text,
      evidence: ex.evidence,
      hasAction: !!ex.actionLabel,
      actionLabel: ex.actionLabel,
      onAction: ex.onAction || (() => {}),
    }));
    const TONE: Record<Sev, { bg: string; border: string; ink: string }> = {
      3: { bg: 'rgba(194,59,49,.07)', border: '#C23B31', ink: '#8C2A22' },
      2: { bg: '#F5EBD6', border: '#B8860B', ink: '#7A5A0B' },
      1: { bg: '#EDEAE3', border: '#8A847C', ink: '#4A4640' },
    };
    const top = nonSla[0];
    const topBanner = top
      ? { show: true, text: top.text, evidence: top.evidence, bg: TONE[top.sev].bg, border: TONE[top.sev].border, ink: TONE[top.sev].ink }
      : { show: false, text: '', evidence: '', bg: '', border: '', ink: '' };

    // ---- contextual primary actions (header + mirrored sticky bar) ----
    const actions: { label: string; btnClass: string; onClick: () => void }[] = [];
    if (['I ri', 'Në shqyrtim'].indexOf(eff.status) !== -1) {
      actions.push({ label: 'Cakto', btnClass: 'staff-btn-primary', onClick: () => this._openAssign() });
    } else if (['Caktuar', 'Në punë'].indexOf(eff.status) !== -1) {
      actions.push({ label: 'Rishpërndaj', btnClass: 'staff-btn-secondary', onClick: () => this._openAssign() });
      actions.push({ label: 'Kërko informacion', btnClass: 'staff-btn-secondary', onClick: () => this.setState({ requestOpen: true, reopenOpen: false }) });
      if (base.slaAtRisk || base.slaBreached) actions.push({ label: ov.escalated ? 'Anulo përshkallëzimin' : 'Escalo', btnClass: 'staff-btn-secondary', onClick: () => this._toggleEscalate() });
    } else if (eff.status === 'Zgjidhur') {
      actions.push({ label: 'Prano zgjidhjen', btnClass: 'staff-btn-primary', onClick: () => this._acceptResolution() });
      actions.push({ label: 'Rihap raportin', btnClass: 'staff-btn-secondary', onClick: () => this._openReopen() });
      actions.push({ label: 'Kërko informacion', btnClass: 'staff-btn-secondary', onClick: () => this.setState({ requestOpen: true, reopenOpen: false }) });
    } else {
      // Mbyllur and the branch statuses (Dublikatë, Refuzuar, Kërkon informacion)
      actions.push({ label: 'Rihap raportin', btnClass: 'staff-btn-secondary', onClick: () => this._openReopen() });
    }

    const requestTemplates = [
      { label: 'Kërko foto', onClick: () => this._sendRequest('Kërko foto shtesë') },
      { label: 'Kërko vendndodhje më të saktë', onClick: () => this._sendRequest('Kërko vendndodhje më të saktë') },
      { label: 'Kërko përshkrim shtesë', onClick: () => this._sendRequest('Kërko përshkrim shtesë') },
    ];

    // ---- assignment card: read-only summary, or the edit form when the
    // clerk opened it via "Cakto"/"Rishpërndaj" (header, sticky bar, or the
    // card's own "Ndrysho" link)
    const assignDraft: AssignDraft = this.state.assignDraft || { department: eff.department, responsible: eff.responsible || '', priority: eff.priority };
    const deptEmployees = S.employees.filter((e) => e.dept === assignDraft.department);
    const deptOrRespChanged = assignDraft.department !== eff.department || (assignDraft.responsible || '') !== (eff.responsible || '');
    const reasonRequired = !!eff.responsible && deptOrRespChanged;
    const assignedEvent = mergedTimeline.filter((ev) => ev.label.indexOf('u caktua te') !== -1)[0];

    // ---- SLA card: elapsed/remaining + the two named milestones from the
    // (deterministic) seed timeline.
    const allowedHours = (base.slaDeadline.getTime() - base.submittedAt.getTime()) / HOUR_MS;
    const elapsedHours = (NOW.getTime() - base.submittedAt.getTime()) / HOUR_MS;
    const pct = Math.max(0, Math.min(100, (elapsedHours / allowedHours) * 100));
    const assignedTl = mergedTimeline.filter((ev) => ev.label.indexOf('u caktua te') !== -1)[0];
    const startedTl = mergedTimeline.filter((ev) => ev.label === 'Statusi ndryshoi në Në punë.')[0];

    // ---- department-work / intervention card ---------------------------
    const deptNotes = (ov.notes || []).map((n) => ({ text: typeof n === 'string' ? n : n.text }));
    const deptPhotos = (base.resolutionEvidence || []).map((e) => ({ photo: e.photo }));

    // ---- resolution verification (once the department has marked the case
    // Zgjidhur, before the clerk closes it out)
    const locationOk = !!(base.address && base.zone);
    const descOk = (base.resolutionEvidence || []).some((e) => e.note) || deptNotes.length > 0;
    const photoOk = deptPhotos.length > 0;

    // ---- citizen-facing thread: the already-derived milestones
    // (submission, assignment, resolution) plus any info requests this
    // session sent. Never invented citizen replies.
    const thread: { from: 'system' | 'clerk'; at: Date; text: string }[] = [];
    thread.push({ from: 'system', at: base.submittedAt, text: 'Raporti juaj u regjistrua nga SINJAL.' });
    if (assignedTl) thread.push({ from: 'system', at: assignedTl.time, text: 'Raporti juaj u caktua te Departamenti i ' + eff.departmentName + '.' });
    if (['Zgjidhur', 'Mbyllur'].indexOf(eff.status) !== -1) {
      const resolvedTl = mergedTimeline.filter((ev) => ev.label === 'Statusi ndryshoi në Zgjidhur.')[0];
      thread.push({ from: 'system', at: resolvedTl ? resolvedTl.time : base.slaDeadline, text: 'Raporti është shënuar si i zgjidhur.' });
    }
    (ov.citizenRequests || []).forEach((r2) => thread.push({ from: 'clerk', at: new Date(r2.at), text: r2.label }));
    // Kept in insertion order, as the design renders it (its sort compared a
    // field the entries don't have, so it never reordered). Sorting by `at`
    // would move a fallback resolution time, which can lie in the future,
    // after the clerk's requests.

    // ---- status lifecycle stepper ---------------------------------------
    const CHAIN: Status[] = ['I ri', 'Në shqyrtim', 'Caktuar', 'Në punë', 'Zgjidhur', 'Mbyllur'];
    const chainIdx = CHAIN.indexOf(eff.status);
    const isBranch = chainIdx === -1;
    const steps = CHAIN.map((s, i) => {
      const state2 = isBranch ? 'pending' : i < chainIdx ? 'done' : i === chainIdx ? 'current' : 'pending';
      return {
        label: s,
        stepClass: state2 === 'done' ? 'is-done' : state2 === 'current' ? 'is-current' : '',
        showConnector: i < CHAIN.length - 1,
        connectorClass: state2 === 'done' && i < chainIdx ? 'is-done' : '',
      };
    });

    // ---- related / duplicate reports ------------------------------------
    const linkedIds = base.linkedIds || [];
    const linkedItems = linkedIds.flatMap((lid) => {
      const lr = S.byId(lid);
      if (!lr) return [];
      return [
        {
          key: lr.id,
          id: lr.displayId,
          title: lr.title,
          status: lr.status,
          statusBg: S.statusMeta[lr.status].bg,
          statusInk: S.statusMeta[lr.status].ink,
          statusDot: S.statusMeta[lr.status].dot,
          onClick: this._goTo(lr.id),
        },
      ];
    });

    const reappearFrom = base.reappearedFromId ? S.byId(base.reappearedFromId) : null;
    const zc = S.zoneCoords[base.zone] || { x: 50, y: 50 };
    const lastReassign = ov.reassignLog && ov.reassignLog.length ? ov.reassignLog[ov.reassignLog.length - 1] : null;

    return {
      r: {
        id: base.displayId,
        category: base.categoryLabel,
        title: base.title,
        zone: base.zone,
        address: base.address,
        status: eff.status,
        statusBg: sm.bg,
        statusInk: sm.ink,
        statusDot: sm.dot,
        priority: eff.priority,
        priorityColor: pm.color,
        slaLabel: base.slaLabel,
        slaColor,
        description: base.description,
        submittedLabel: base.submittedLabel,
        citizenInitials: base.citizenInitials,
        photo: base.photo,
        departmentName: eff.departmentName,
        responsibleLabel: eff.responsibleName || 'Pa caktuar',
      },
      actions,
      moreOpen: this.state.moreOpen,
      moreBtnClass: this.state.moreOpen ? 'is-on' : '',
      onToggleMore: () => this.setState({ moreOpen: !this.state.moreOpen }),
      onExport: () => this.setState({ exportNotice: true, moreOpen: false }),
      exportNotice: this.state.exportNotice,
      onDismissExport: () => this.setState({ exportNotice: false }),

      topBanner,
      exceptions,
      hasExceptions: exceptions.length > 0,

      reopenOpen: this.state.reopenOpen,
      reopenReason: this.state.reopenReason,
      onReopenReason: (e: InputEvent) => this.setState({ reopenReason: e.target.value }),
      onConfirmReopen: () => this._confirmReopen(),
      onCancelReopen: () => this._cancelReopen(),

      requestOpen: this.state.requestOpen,
      requestCustom: this.state.requestCustom,
      requestTemplates,
      onRequestCustom: (e: InputEvent) => this.setState({ requestCustom: e.target.value }),
      onSendCustomRequest: () => this._sendCustomRequest(),
      onCancelRequest: () => this.setState({ requestOpen: false, requestCustom: '' }),
      onOpenRequest: () => this.setState({ requestOpen: true, reopenOpen: false }),

      ai: {
        zone: base.zone,
        priority: base.ai.suggestedPriority,
        department: base.ai.confidence < 55 ? 'Pranimi i përgjithshëm' : base.ai.suggestedDepartment,
        summaryLead: base.ai.confidence < 55 ? 'Besueshmëri e pamjaftueshme — SINJAL e dërgoi te' : 'SINJAL e routoi automatikisht te',
        summaryTarget: base.ai.confidence < 55 ? 'Pranimi i përgjithshëm' : base.ai.suggestedDepartment,
        risk: base.ai.risk,
        confidence: base.ai.confidence,
        confColor: base.ai.confidence >= 80 ? '#2E7D4F' : base.ai.confidence >= 55 ? '#B8860B' : '#C23B31',
        rationale: base.ai.rationale,
        assignedTime: assignedEvent ? S.fmtTime(assignedEvent.time) : S.fmtTime(base.submittedAt),
        onUse: () => {
          const d = S.departments.filter((x) => x.name === base.ai.suggestedDepartment)[0];
          this.setState({ assignOpen: true, assignDraft: { department: (d && d.id) || eff.department, responsible: '', priority: base.ai.suggestedPriority }, assignReason: '' });
        },
        onAutomation: () => writeJSON(STORAGE_KEYS.autoFocus, { screen: 'routing', caseId: base.id }),
        reassignNote: lastReassign
          ? { show: true, from: lastReassign.from, to: lastReassign.to, by: lastReassign.by, reason: lastReassign.reason }
          : { show: false, from: '', to: '', by: '', reason: '' },
      },

      dept: {
        doneBy: eff.responsibleName || '—',
        startedLabel: startedTl ? S.fmtDateTime(startedTl.time) : '—',
        evidenceMissing: eff.status === 'Zgjidhur' && !photoOk,
        hasPhotos: deptPhotos.length > 0,
        photos: deptPhotos,
        notes: deptNotes,
        draft: this.state.deptDraft,
        onDraft: (e: InputEvent) => this.setState({ deptDraft: e.target.value }),
        onAdd: () => {
          const text = (this.state.deptDraft || '').trim();
          if (!text) return;
          const notes = (ov.notes || []).concat([{ text, at: S.now.toISOString() }]);
          this._patchOverride(base.id, { notes });
          this.setState({ deptDraft: '' });
        },
      },

      verify: {
        show: eff.status === 'Zgjidhur',
        locationMark: locationOk ? '✓' : '!',
        locationColor: locationOk ? '#2E7D4F' : '#B8860B',
        locationBg: locationOk ? '#E1EEE5' : '#F5EBD6',
        descMark: descOk ? '✓' : '!',
        descColor: descOk ? '#2E7D4F' : '#B8860B',
        descBg: descOk ? '#E1EEE5' : '#F5EBD6',
        photoMark: photoOk ? '✓' : '!',
        photoColor: photoOk ? '#2E7D4F' : '#B8860B',
        photoBg: photoOk ? '#E1EEE5' : '#F5EBD6',
        onAccept: () => this._acceptResolution(),
        onReopen: () => this._openReopen(),
      },

      thread: thread.map((m) => ({ rowClass: m.from === 'clerk' ? 'from-clerk' : '', bubbleClass: m.from === 'clerk' ? 'from-clerk' : 'from-system', text: m.text, timeLabel: S.fmtDateTime(m.at) })),

      timeline: mergedTimeline.map((ev) => ({ time: S.fmtTime(ev.time), label: ev.label, color: ev.kind === 'ai' ? '#B8860B' : ev.kind === 'clerk' ? '#C23B31' : '#6B665F' })),

      deptOptions: S.departments.map((d) => ({ value: d.id, label: d.name })),
      priorityOptions: S.priorityOrder.map((p) => ({ value: p, label: p })),
      statusOptions: S.statusOrder.map((s) => ({ value: s, label: s })),

      assign: {
        open: this.state.assignOpen,
        showOpenBtn: !this.state.assignOpen,
        showSummary: !this.state.assignOpen,
        openLabel: eff.responsible ? 'Rishpërndaj' : 'Cakto',
        onOpen: () => this._openAssign(),
        onCancel: () => this._cancelAssign(),
        department: assignDraft.department,
        responsible: assignDraft.responsible || '',
        priority: assignDraft.priority,
        respOptions: deptEmployees.map((e) => ({ value: e.id, label: e.name })),
        reasonRequired,
        reason: this.state.assignReason,
        onDept: (e: InputEvent) => this.setState({ assignDraft: { department: e.target.value as DeptId, responsible: '', priority: assignDraft.priority } }),
        onResp: (e: InputEvent) => this.setState({ assignDraft: Object.assign({}, assignDraft, { responsible: e.target.value }) }),
        onPriority: (e: InputEvent) => this.setState({ assignDraft: Object.assign({}, assignDraft, { priority: e.target.value as Priority }) }),
        onReason: (e: InputEvent) => this.setState({ assignReason: e.target.value }),
        onSave: () => this._saveAssign(),
        saveLabel: reasonRequired ? 'Ruaj rishpërndarjen' : 'Ruaj caktimin',
        assignedAtLabel: assignedEvent ? S.fmtDateTime(assignedEvent.time) : '—',
      },

      sla: {
        allowedLabel: fmtDur(allowedHours),
        elapsedLabel: fmtDur(elapsedHours),
        remainingLabel: base.slaRemainingHours === null ? '—' : base.slaLabel,
        color: slaColor,
        pct,
        statusLabel: base.slaBreached ? 'E shkelur — afati ka kaluar' : base.slaAtRisk ? 'Në rrezik — afati po afrohet' : 'Brenda afatit',
        headline: base.slaRemainingHours === null ? '—' : base.slaBreached ? S.fmtHours(base.slaRemainingHours) : S.fmtHours(base.slaRemainingHours) + ' mbeten',
        historyAssigned: assignedTl ? S.fmtTime(assignedTl.time) : '—',
        historyStarted: startedTl ? S.fmtTime(startedTl.time) : '—',
        historyLastUpdate: S.fmtTime(lastActivityAt),
        showEscalate: base.slaAtRisk || base.slaBreached,
        escalateLabel: ov.escalated ? 'U përshkallëzua' : 'Escalo te përgjegjësi i departamentit',
        escalateClass: ov.escalated ? 'is-on' : '',
        onEscalate: () => this._toggleEscalate(),
      },

      lifecycle: { steps, isBranch, branchNote: isBranch ? eff.status : '' },
      statusCtl: {
        value: this.state.statusDraft !== null ? this.state.statusDraft : eff.status,
        onChange: (e: InputEvent) => this.setState({ statusDraft: e.target.value }),
        onSave: () => {
          const v = this.state.statusDraft !== null ? this.state.statusDraft : eff.status;
          this._patchOverride(base.id, { status: v as Status });
          this.setState({ statusDraft: null });
        },
        saveLabel: this.state.statusDraft !== null && this.state.statusDraft !== eff.status ? 'Përditëso statusin' : 'Statusi u përditësua',
      },

      dup: {
        show: dupShow,
        candidateId: base.duplicateCandidateId ? (S.byId(base.duplicateCandidateId) as Report).displayId : '',
        similarity: base.duplicateSimilarity,
        onConfirm: () => this._patchOverride(base.id, { status: 'Dublikatë' }),
        onDismiss: () => this._patchOverride(base.id, { dupDismissed: true }),
      },
      linked: { show: linkedItems.length > 0, items: linkedItems },
      reappear: reappearFrom
        ? { show: true, prevId: reappearFrom.displayId, prevStatus: reappearFrom.status, onOpen: this._goTo(reappearFrom.id) }
        : { show: false, prevId: '', prevStatus: '', onOpen: () => {} },
      mapPin: { left: zc.x + '%', top: zc.y + '%', color: pm.color },
    };
  }
}
