import { SINJAL } from '../../data/sinjal';
import type { CaseOverrides, Report, ReportFilter } from '../../data/types';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, writeJSON, writeString } from '../../lib/storage';

type Handler = () => void;

interface Kpi {
  count: number;
  sub: string;
  onClick: Handler;
}

interface ExceptionGroup {
  color: string;
  label: string;
  count: number;
  onClick: Handler;
  actionLabel: string;
  example: { id: string; title: string; meta: string; onClick: Handler };
}

interface DeptRow {
  id: string;
  name: string;
  active: number;
  atRisk: number;
  onSla: number;
  atRiskColor: string;
  onClick: Handler;
}

/** Port of the Main.dc.html (Kreu) logic. */
export class KreuLogic extends DCLogic {
  _select(id: string): Handler {
    return () => writeString(STORAGE_KEYS.selectedReport, id);
  }
  _filter(f: ReportFilter): Handler {
    return () => writeJSON(STORAGE_KEYS.incomingFilter, f);
  }
  _deptFocus(id: string): Handler {
    return () => writeString(STORAGE_KEYS.deptFocus, id);
  }

  renderVals() {
    const S = SINJAL;
    const reports = S.reports || [];
    const NOW = S.now || new Date();
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Mirëmëngjes' : hour < 18 ? 'Mirëdita' : 'Mirëmbrëma';
    const DAY_ABBR = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
    const HOUR_MS = 3600000;

    const isNew = (r: Report) => r.status === 'I ri';
    const isUnassigned = (r: Report) => !r.responsible && r.status !== 'Dublikatë' && r.status !== 'Refuzuar';
    const isInProgress = (r: Report) => r.status === 'Në punë';
    const isDone = (r: Report) => r.status === 'Zgjidhur' || r.status === 'Mbyllur';
    const isPendingClosure = (r: Report) => r.status === 'Zgjidhur' && r.resolutionEvidence && r.resolutionEvidence.length > 0;
    const isOpenCase = (r: Report) => r.status !== 'Zgjidhur' && r.status !== 'Mbyllur' && r.status !== 'Refuzuar' && r.status !== 'Dublikatë';
    const isSlaFlagged = (r: Report) => r.slaAtRisk || r.slaBreached;
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const countBy = <T>(list: T[], key: (item: T) => string) => {
      const m: Record<string, number> = {};
      list.forEach((r) => {
        const k = key(r);
        m[k] = (m[k] || 0) + 1;
      });
      return m;
    };
    const topEntry = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0] || null;

    const newReports = reports.filter(isNew);
    const inProgress = reports.filter(isInProgress);
    const unassigned = reports.filter(isUnassigned);
    const done = reports.filter(isDone);
    const slaFlagged = reports.filter(isSlaFlagged);
    const pendingClosure = reports.filter(isPendingClosure);
    const cSlaBreached = reports.filter((r) => r.slaBreached).length;
    const cSlaAtRisk = reports.filter((r) => r.slaAtRisk).length;
    const dueToday = inProgress.filter((r) => sameDay(r.slaDeadline, NOW)).length;
    const overTwoHours = unassigned.filter((r) => (NOW.getTime() - r.submittedAt.getTime()) / HOUR_MS > 2).length;
    // Shared performance engine (same records + formulas as Performanca).
    const ovs = readJSON<CaseOverrides>(STORAGE_KEYS.caseOverrides, {});
    const recs = S.perf.records(ovs);
    const wkNow = S.perf.newCount(recs, {}, 7, 0);
    const wkPrev = S.perf.newCount(recs, {}, 7, 1);
    const wkDelta = wkPrev ? Math.round(((wkNow - wkPrev) / wkPrev) * 100) : 0;
    const sla30 = S.perf.slaRate(recs, {}, 30);

    // ---- KPI row: 5 equal cards, each a headline count with a real
    // operational sub-line. Weekly volume and the resolved-within-SLA rate
    // come from the shared S.perf engine, so they match Performanca exactly.
    const kpiNew: Kpi = { count: newReports.length, sub: wkNow + ' të dërguara këtë javë (' + (wkDelta >= 0 ? '+' : '−') + Math.abs(wkDelta) + '%)', onClick: this._filter({ status: 'I ri' }) };
    const kpiInProgress: Kpi = { count: inProgress.length, sub: dueToday > 0 ? dueToday + ' kanë afat sot' : 'Asnjë me afat sot', onClick: this._filter({ status: 'Në punë' }) };
    const kpiUnassigned: Kpi = { count: unassigned.length, sub: overTwoHours > 0 ? overTwoHours + ' prej tyre > 2 orë' : 'Të gjitha nën 2 orë', onClick: this._filter({ unassigned: true }) };
    const kpiSla: Kpi = { count: slaFlagged.length, sub: cSlaBreached + ' shkelur · ' + cSlaAtRisk + ' afrohen', onClick: this._filter({ slaFlag: true }) };
    const kpiDone: Kpi = { count: done.length, sub: (sla30 == null ? '—' : Math.round(sla30)) + '% brenda SLA · 30 ditë', onClick: this._filter({ done: true }) };

    // ---- Kërkojnë vëmendjen tuaj: exceptions, not a recent-activity list.
    // Each group shows its real count plus one representative case (the
    // worst SLA breach, the longest-unassigned report, the oldest pending
    // verification). Duplicate/low-confidence/repeat signals stay off Kreu:
    // Automatizimet and Raportet already surface those.
    const fmtWaitHours = (r: Report) => Math.max(1, Math.round((NOW.getTime() - r.submittedAt.getTime()) / HOUR_MS));
    const exceptionGroups: ExceptionGroup[] = [];
    if (slaFlagged.length > 0) {
      const worst = slaFlagged.slice().sort((a, b) => (a.slaRemainingHours as number) - (b.slaRemainingHours as number))[0];
      exceptionGroups.push({
        color: '#C23B31',
        label: 'SLA në rrezik',
        count: slaFlagged.length,
        onClick: this._filter({ slaFlag: true }),
        actionLabel: 'Shiko raportin',
        example: {
          id: worst.displayId,
          title: worst.title,
          meta: worst.departmentName + ' · ' + (worst.slaBreached ? 'SLA e shkelur (' + worst.slaLabel + ')' : worst.slaLabel + ' deri në SLA'),
          onClick: this._select(worst.id),
        },
      });
    }
    if (unassigned.length > 0) {
      const oldest = unassigned.slice().sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())[0];
      exceptionGroups.push({
        color: '#B8860B',
        label: 'raporte pa caktuar',
        count: unassigned.length,
        onClick: this._filter({ unassigned: true }),
        actionLabel: 'Cakto',
        example: {
          id: oldest.displayId,
          title: oldest.title,
          meta: fmtWaitHours(oldest) + ' orë pa përgjegjës · ' + oldest.departmentName,
          onClick: this._select(oldest.id),
        },
      });
    }
    if (pendingClosure.length > 0) {
      const rep = pendingClosure[0];
      exceptionGroups.push({
        color: '#2E7D4F',
        label: 'raporte kërkojnë verifikim',
        count: pendingClosure.length,
        onClick: this._filter({ pendingClosure: true }),
        actionLabel: 'Verifiko',
        example: {
          id: rep.displayId,
          title: rep.title,
          meta: 'Zgjidhja u raportua nga ' + rep.departmentName + ', pret verifikim përfundimtar.',
          onClick: this._select(rep.id),
        },
      });
    }
    const exceptionsNone = exceptionGroups.length === 0;

    // ---- Problemet në qytet: map widget (stable pin placement) plus a
    // legend with real per-tier counts and two "what's dominant" lines
    // computed from the full report set, not just the active pins.
    const zoneCoords = S.zoneCoords || {};
    const hashOf = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
      return hash;
    };
    const activeReports = reports.filter(isOpenCase);
    const mapPins = activeReports.map((r) => {
      const base = zoneCoords[r.zone] || { x: 50, y: 50 };
      const angle = (hashOf(r.id + 'a') % 360) * (Math.PI / 180);
      const radius = 4 + ((hashOf(r.id + 'r') % 100) / 100) * 6;
      const x = Math.min(95, Math.max(5, base.x + Math.cos(angle) * radius));
      const y = Math.min(93, Math.max(6, base.y + Math.sin(angle) * radius * 1.85));
      return { id: r.id, left: x.toFixed(1) + '%', top: y.toFixed(1) + '%', color: S.priorityMeta[r.priority].color, onClick: this._select(r.id), title: r.displayId + ' · ' + r.title };
    });
    const priorityCounts = { urgjente: 0, elarte: 0, emesme: 0, eulet: 0 };
    activeReports.forEach((r) => {
      if (r.priority === 'Urgjente') priorityCounts.urgjente++;
      else if (r.priority === 'E lartë') priorityCounts.elarte++;
      else if (r.priority === 'E mesme') priorityCounts.emesme++;
      else priorityCounts.eulet++;
    });
    const topZoneEntry = topEntry(countBy(reports, (r) => r.zone));
    const topZone = topZoneEntry ? { name: topZoneEntry[0], count: topZoneEntry[1] } : { name: '—', count: 0 };
    const topCatEntry = topEntry(countBy(reports, (r) => r.categoryLabel));
    const topCategory = topCatEntry ? { label: topCatEntry[0], pct: Math.round((topCatEntry[1] / reports.length) * 100) } : { label: '—', pct: 0 };

    // ---- Çfarë po ndryshon: 7-day buckets and the top-category → top-zone
    // insight, computed from submittedAt over the shared S.perf records; the
    // category deltas use the same 30-vs-30-day comparison as Performanca.
    const dayBuckets: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(NOW);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      dayBuckets.push({ label: DAY_ABBR[d.getDay()], count: recs.filter((r) => r.submittedAt >= d && r.submittedAt < next).length });
    }
    const maxDay = Math.max(1, Math.max(...dayBuckets.map((d) => d.count)));
    const trendDays = dayBuckets.map((d) => ({ label: d.label, count: d.count, pct: Math.round((d.count / maxDay) * 100) }));

    // 30 days vs the 30 before: the same comparison Performanca's insights use
    const categoryTrends = S.categories
      .map((c) => {
        const a = S.perf.newCount(recs, { category: c.id }, 30, 0);
        const b = S.perf.newCount(recs, { category: c.id }, 30, 1);
        return { c, d: b ? Math.round(((a - b) / b) * 100) : 0 };
      })
      .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
      .slice(0, 3)
      .map((x) => ({
        label: x.c.label,
        pct: Math.abs(x.d),
        arrow: x.d >= 0 ? '↑' : '↓',
        color: x.d >= 0 ? '#C23B31' : '#2E7D4F',
      }));

    const last7Start = new Date(NOW);
    last7Start.setDate(last7Start.getDate() - 7);
    last7Start.setHours(0, 0, 0, 0);
    const last7 = recs.filter((r) => r.submittedAt >= last7Start).map((r) => ({ categoryLabel: S.catLabel(r.category), ...r }));
    const last7TopCatEntry = topEntry(countBy(last7, (r) => r.categoryLabel));
    let insightText = 'Nuk ka ende mjaftueshëm të dhëna për një insight këtë javë.';
    if (last7TopCatEntry) {
      const catReports = last7.filter((r) => r.categoryLabel === last7TopCatEntry[0]);
      const catTopZoneEntry = topEntry(countBy(catReports, (r) => r.zone));
      insightText = catTopZoneEntry
        ? 'Raportimet për ' + last7TopCatEntry[0] + ' janë përqendruar kryesisht në zonën ' + catTopZoneEntry[0] + ' gjatë 7 ditëve të fundit.'
        : 'Raportimet për ' + last7TopCatEntry[0] + ' janë kategoria më e shpeshtë këtë javë.';
    }

    // ---- Ngarkesa sipas departamentit: a real Aktive / Në SLA / Në rrezik
    // split per department, sorted by load, with a callout for whichever
    // department is carrying the most right now.
    const deptRaw = S.departments.map((d) => {
      const deptReports = reports.filter((r) => r.department === d.id);
      const active = deptReports.filter(isOpenCase);
      const atRisk = active.filter(isSlaFlagged).length;
      return { id: d.id, name: d.name, active: active.length, atRisk, onSla: active.length - atRisk };
    });
    const deptTable: DeptRow[] = deptRaw
      .slice()
      .sort((a, b) => b.active - a.active)
      .map((d) => ({ ...d, atRiskColor: d.atRisk > 0 ? '#C23B31' : '#8A847C', onClick: this._deptFocus(d.id) }));
    const focusDept = deptTable.length && deptTable[0].active > 0 ? deptTable[0] : null;

    // ---- Aktiviteti i fundit: hand-authored feed, but every entry resolves
    // to a real report and its current department, so the copy can't drift
    // from that report's actual state.
    const ACTIVITY_COPY: Record<string, (r: Report, a: (typeof S.activity)[number]) => string> = {
      resolved: () => 'u shënua si Zgjidhur',
      auto_assigned: (r) => 'u caktua automatikisht te ' + r.departmentName,
      reviewed: (_r, a) => 'u rishikua nga ' + (a.actor || 'nëpunësi'),
      reappeared: (r) => 'u rikthye në ' + r.status + (r.reappearedFromId ? ' · përsëritje e #' + r.reappearedFromId : ''),
    };
    const ACTIVITY_COLOR: Record<string, string> = { resolved: '#2E7D4F', auto_assigned: '#4A6FA0', reviewed: '#B8860B', reappeared: '#C23B31' };
    const activityFeed = (S.activity || []).flatMap((a) => {
      const r = S.byId(a.reportId);
      if (!r) return [];
      const copyFn = ACTIVITY_COPY[a.kind];
      return [
        {
          key: a.id,
          id: r.displayId,
          text: copyFn ? copyFn(r, a) : '',
          minutesAgo: a.minutesAgo,
          meta: r.departmentName,
          color: ACTIVITY_COLOR[a.kind] || '#8A847C',
          onClick: this._select(r.id),
        },
      ];
    });

    return {
      greeting: greet + ', Drita. Ja çfarë po ndodh sot.',
      kpiNew,
      kpiInProgress,
      kpiUnassigned,
      kpiSla,
      kpiDone,
      exceptionGroups,
      exceptionsNone,
      mapPins,
      mapActiveCount: activeReports.length,
      priorityCounts,
      topZone,
      topCategory,
      trendDays,
      categoryTrends,
      insightText,
      deptTable,
      focusDept,
      activityFeed,
    };
  }
}
