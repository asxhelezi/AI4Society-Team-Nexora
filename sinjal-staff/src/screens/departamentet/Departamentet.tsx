import { Fragment } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Shell } from '../../components/Shell';
import { useLogic } from '../../lib/dc';
import { DepartamentetLogic } from './DepartamentetLogic';

const NO_PROPS = {};

/** Departamentet: the department overview, and the workspace for one department (summary, cases, team, rules). */
export function Departamentet() {
  const v = useLogic(DepartamentetLogic, NO_PROPS);

  return (
    <Shell active="departamentet">
      {v.isOverview ? (
        <>
          <PageHeader
            title="Departamentet"
            context={
              <>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.orgSummary.deptCount}</b> departamente
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.orgSummary.activeTotal}</b> raste aktive
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.orgSummary.slaRiskTotal}</b> në rrezik SLA
                </span>
              </>
            }
          />
          <div className="app-pane app-pad" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px 28px' }}>
            <section>
              <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Departamentet</h2>
              <div className="r-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
                {v.deptCards.map((d, dIdx) => (
                  <button key={dIdx} type="button" onClick={d.onClick} className="tap staff-card dept-card">
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', color: '#1B1917' }}>{d.name}</div>
                    <div style={{ marginTop: '8px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: '#1B1917' }}>
                        {d.active}
                      </span>{' '}
                      aktive
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: d.atRiskColor }}>
                        <span className="status-dot" style={{ background: d.atRiskColor }} />
                        <span className="tabular-nums" style={{ fontWeight: 700 }}>
                          {d.atRisk}
                        </span>{' '}
                        në rrezik SLA
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#2E7D4F' }}>
                        <span className="status-dot" style={{ background: '#2E7D4F' }} />
                        <span className="tabular-nums" style={{ fontWeight: 700 }}>
                          {d.onSla}
                        </span>{' '}
                        brenda SLA
                      </span>
                    </div>
                    <div className="dept-card-sla-row">
                      <b className="tabular-nums">{d.slaRate}%</b>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>SLA · 30 ditë</span>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}>Shiko departamentin →</div>
                  </button>
                ))}
              </div>
            </section>
            <section style={{ marginTop: '22px' }}>
              <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Shpërndarja e ngarkesës</h2>
              <div className="staff-card" style={{ padding: '10px 16px 14px' }}>
                {v.workloadRows.map((w, wIdx) => (
                  <Fragment key={wIdx}>
                    <div className="workload-row">
                      <span className="workload-row-label">{w.name}</span>
                      <div className="workload-track">
                        <div className="workload-fill" style={{ width: w.widthPct }} />
                      </div>
                      <span className="workload-row-count tabular-nums">{w.active}</span>
                    </div>
                    <div style={{ marginLeft: '144px', marginTop: '-4px', marginBottom: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }} className="tabular-nums">
                      {w.active} aktive · {w.urgent} urgjente · {w.atRisk} SLA në rrezik
                    </div>
                  </Fragment>
                ))}
              </div>
            </section>
            <section style={{ marginTop: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Rregullat e caktimit</h2>
                <button
                  type="button"
                  onClick={v.onOpenAddRule}
                  className="tap staff-btn-secondary"
                  style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                >
                  + Shto rregull
                </button>
              </div>
              <div className="staff-card" style={{ padding: '4px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px' }}>
                  <span className="staff-th" style={{ flex: 1, padding: 0 }}>
                    Kategoria
                  </span>
                  <span className="staff-th" style={{ width: '160px', padding: 0 }}>
                    Departamenti
                  </span>
                  <span className="staff-th" style={{ width: '90px', padding: 0 }}>
                    Prioritet
                  </span>
                  <span className="staff-th" style={{ flex: 1.5, padding: 0 }}>
                    Përjashtim
                  </span>
                  <span style={{ width: '22px', flex: '0 0 auto' }} />
                </div>
                {v.rules.map((r, rIdx) => (
                  <div key={rIdx} className="rule-row">
                    <span style={{ flex: 1, fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{r.category}</span>
                    <span style={{ width: '160px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#4A4640' }}>{r.department}</span>
                    <span style={{ width: '90px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: r.priorityColor }}>{r.priority}</span>
                    <span style={{ flex: 1.5, fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>{r.exception}</span>
                    {r.removable ? (
                      <button
                        type="button"
                        onClick={r.onRemove}
                        className="tap"
                        style={{ width: '22px', flex: '0 0 auto', border: 0, background: 'transparent', color: '#8A847C', fontSize: '15px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    ) : null}
                    {r.removableOff ? <span style={{ width: '22px', flex: '0 0 auto' }} /> : null}
                  </div>
                ))}
                {v.addRuleOpen ? (
                  <div className="add-rule-panel">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <div className="filter-group-title" style={{ marginBottom: '4px' }}>
                          Kategoria
                        </div>
                        <select value={v.addRuleDraft.category} onChange={v.onRuleCategory} className="staff-select" style={{ width: '100%', padding: '7px 9px' }}>
                          <option value="">Zgjidh...</option>
                          {v.categoryOptions.map((o, oIdx) => (
                            <option key={oIdx} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <div className="filter-group-title" style={{ marginBottom: '4px' }}>
                          Departamenti
                        </div>
                        <select value={v.addRuleDraft.department} onChange={v.onRuleDept} className="staff-select" style={{ width: '100%', padding: '7px 9px' }}>
                          <option value="">Zgjidh...</option>
                          {v.deptOptions.map((o, oIdx) => (
                            <option key={oIdx} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '0 0 130px' }}>
                        <div className="filter-group-title" style={{ marginBottom: '4px' }}>
                          Prioritet
                        </div>
                        <select value={v.addRuleDraft.priority} onChange={v.onRulePriority} className="staff-select" style={{ width: '100%', padding: '7px 9px' }}>
                          {v.priorityOptions.map((o, oIdx) => (
                            <option key={oIdx} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '0 0 auto', display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={v.onSaveRule}
                          className={`tap staff-btn-primary ${v.saveRuleDisabledClass}`}
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Ruaj
                        </button>
                        <button
                          type="button"
                          onClick={v.onCancelAddRule}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      {v.isDetail ? (
        <>
          <PageHeader
            crumb={
              <button type="button" onClick={v.onBack} className="tap page-crumb">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Departamentet
              </button>
            }
            title={v.detail.name}
            context={
              <>
                {v.detail.active} aktive · {v.detail.urgent} urgjente · {v.detail.atRisk} SLA në rrezik
              </>
            }
            contextClassName="tabular-nums"
          />
          <div className="dept-tab-bar" style={{ padding: '0 28px', flex: '0 0 auto' }}>
            {v.tabs.map((t, tIdx) => (
              <button key={tIdx} type="button" onClick={t.onClick} className={`tap dept-tab ${t.onClass}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="app-pane app-pad" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 28px 28px' }}>
            {v.isTabPermbledhje ? (
              <>
                <div className="r-grid3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="staff-card" style={{ padding: '16px' }}>
                    <h2 style={{ margin: '0 0 2px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '13px', color: '#8A847C' }}>Ngarkesa aktuale</h2>
                    <div className="tabular-nums" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '32px', color: '#1B1917', lineHeight: 1.2 }}>
                      {v.detail.active}
                    </div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C', marginBottom: '10px' }}>aktive</div>
                    {v.detail.priorityBreakdown.map((p, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                          <span className="status-dot" style={{ background: p.color }} />
                          {p.label}
                        </span>
                        <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                          {p.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="staff-card" style={{ padding: '16px' }}>
                    <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '13px', color: '#8A847C' }}>Statusi</h2>
                    {v.detail.statusBreakdown.map((s, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                          <span className="status-dot" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="staff-card" style={{ padding: '16px' }}>
                    <h2 style={{ margin: '0 0 2px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '13px', color: '#8A847C' }}>Performanca</h2>
                    <div className="tabular-nums" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '32px', color: '#1B1917', lineHeight: 1.2 }}>
                      {v.detail.slaRate}%
                    </div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C', marginBottom: '10px' }}>zgjidhur brenda SLA · 30 ditë</div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                      Koha mesatare e reagimit:{' '}
                      <span style={{ fontWeight: 700, color: '#1B1917' }} className="tabular-nums">
                        {v.detail.avgResponse}
                      </span>
                    </div>
                    <div style={{ marginTop: '5px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                      Koha mesatare e zgjidhjes:{' '}
                      <span style={{ fontWeight: 700, color: '#1B1917' }} className="tabular-nums">
                        {v.detail.avgResolution}
                      </span>
                    </div>
                  </div>
                </div>
                <section style={{ marginTop: '18px' }}>
                  <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Kërkojnë ndërhyrje</h2>
                  <div className="staff-card" style={{ padding: '2px 10px' }}>
                    {v.detail.exceptionGroups.map((g, gIdx) => (
                      <div key={gIdx} className="exception-group" style={{ padding: '9px 0' }}>
                        <DcLink href="Raportet.dc.html" onClick={g.onClick} className="tap exception-group-head">
                          <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', background: g.color }} />
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }} className="tabular-nums">
                            {g.count}
                          </span>
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{g.label}</span>
                        </DcLink>
                        <DcLink href="Raporti.dc.html" onClick={g.example.onClick} className="tap exception-card" style={{ borderLeftColor: g.color }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#6B665F' }} className="tabular-nums">
                              {g.example.id}
                            </span>
                            <span style={{ flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: g.color }}>{g.actionLabel} →</span>
                          </div>
                          <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {g.example.title}
                          </div>
                          <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>{g.example.meta}</div>
                        </DcLink>
                      </div>
                    ))}
                    {v.detail.exceptionsNone ? (
                      <div style={{ padding: '22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F' }}>Asgjë nuk kërkon ndërhyrje të menjëhershme.</div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            ) : null}
            {v.isTabRaportet ? (
              <div className="staff-card" style={{ padding: '4px 14px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px' }}>
                  <span className="staff-th" style={{ width: '60px', flex: '0 0 auto', padding: 0 }}>
                    ID
                  </span>
                  <span className="staff-th" style={{ flex: 1, padding: 0 }}>
                    Titulli
                  </span>
                  <span className="staff-th" style={{ width: '140px', flex: '0 0 auto', padding: 0 }}>
                    Statusi
                  </span>
                  <span className="staff-th" style={{ width: '90px', flex: '0 0 auto', padding: 0 }}>
                    Prioriteti
                  </span>
                  <span className="staff-th" style={{ width: '110px', flex: '0 0 auto', padding: 0 }}>
                    Përgjegjësi
                  </span>
                  <span className="staff-th" style={{ width: '80px', flex: '0 0 auto', padding: 0, textAlign: 'right' }}>
                    SLA
                  </span>
                </div>
                {v.detail.caseRows.map((r, rIdx) => (
                  <DcLink key={rIdx} href="Raporti.dc.html" onClick={r.onClick} className="tap hl-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 6px' }}>
                    <span className="tabular-nums" style={{ width: '60px', flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {r.id}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title}
                    </span>
                    <span style={{ width: '140px', flex: '0 0 auto' }}>
                      <span className="status-pill" style={{ background: r.statusBg, color: r.statusInk, fontSize: '11px' }}>
                        <span className="status-dot" style={{ background: r.statusDot }} />
                        {r.status}
                      </span>
                    </span>
                    <span style={{ width: '90px', flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: r.priorityColor }}>{r.priority}</span>
                    <span
                      style={{
                        width: '110px',
                        flex: '0 0 auto',
                        fontFamily: "'Barlow',sans-serif",
                        fontSize: '12px',
                        color: '#4A4640',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.responsibleLabel}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ width: '80px', flex: '0 0 auto', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: r.slaColor }}
                    >
                      {r.slaLabel}
                    </span>
                  </DcLink>
                ))}
              </div>
            ) : null}
            {v.isTabEkipi ? (
              <>
                <section>
                  <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Ekipi</h2>
                  <div className="staff-card" style={{ padding: '4px 14px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 6px' }}>
                      <span style={{ width: '24px', flex: '0 0 auto' }} />
                      <span className="staff-th" style={{ flex: 1, padding: 0 }}>
                        Punonjësi
                      </span>
                      <span className="staff-th" style={{ width: '60px', flex: '0 0 auto', padding: 0, textAlign: 'right' }}>
                        Aktive
                      </span>
                      <span className="staff-th" style={{ width: '70px', flex: '0 0 auto', padding: 0, textAlign: 'right' }}>
                        Urgjente
                      </span>
                      <span className="staff-th" style={{ width: '90px', flex: '0 0 auto', padding: 0, textAlign: 'right' }}>
                        SLA rrezik
                      </span>
                      <span className="staff-th" style={{ width: '40px', flex: '0 0 auto', padding: 0, textAlign: 'right' }}>
                        Status
                      </span>
                    </div>
                    {v.detail.team.map((e, eIdx) => (
                      <Fragment key={eIdx}>
                        <button type="button" onClick={e.onClick} className={`tap team-row ${e.onClass}`}>
                          <span className="mini-avatar" style={{ background: '#EDEAE3', color: '#4A4640' }}>
                            {e.initials}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily: "'Barlow',sans-serif",
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#1B1917',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {e.name}
                          </span>
                          <span
                            className="tabular-nums"
                            style={{ width: '60px', flex: '0 0 auto', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}
                          >
                            {e.active}
                          </span>
                          <span className="tabular-nums" style={{ width: '70px', flex: '0 0 auto', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#C23B31' }}>
                            {e.urgent}
                          </span>
                          <span className="tabular-nums" style={{ width: '90px', flex: '0 0 auto', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#B8860B' }}>
                            {e.slaRisk}
                          </span>
                          <span style={{ width: '40px', flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
                            <span className="status-dot" style={{ background: e.statusColor }} />
                          </span>
                        </button>
                        {e.isSelected ? (
                          <div style={{ margin: '2px 0 8px', padding: '12px 14px', background: '#F5F2ED', borderRadius: '12px' }}>
                            <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '13px', color: '#1B1917' }} className="tabular-nums">
                              {e.detail.active} raste aktive
                            </div>
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {e.detail.categoryBreakdown.map((cb, cbIdx) => (
                                <span key={cbIdx} className="zone-chip">
                                  <span className="tabular-nums" style={{ fontWeight: 700, marginRight: '3px' }}>
                                    {cb.count}
                                  </span>
                                  {cb.label}
                                </span>
                              ))}
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <div className="filter-group-title" style={{ marginBottom: '5px' }}>
                                Zonat e mbulimit
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {e.detail.zones.map((z, zIdx) => (
                                  <span key={zIdx} className="zone-chip">
                                    {z}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {e.detail.hasCases ? (
                              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E4DFD6' }}>
                                {e.detail.cases.map((cs, csIdx) => (
                                  <DcLink
                                    key={csIdx}
                                    href="Raporti.dc.html"
                                    onClick={cs.onClick}
                                    className="tap hl-row"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 6px' }}
                                  >
                                    <span className="tabular-nums" style={{ width: '54px', flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#6B665F' }}>
                                      {cs.id}
                                    </span>
                                    <span
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontFamily: "'Barlow',sans-serif",
                                        fontSize: '12px',
                                        color: '#1B1917',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {cs.title}
                                    </span>
                                    <span className="status-pill" style={{ flex: '0 0 auto', background: cs.statusBg, color: cs.statusInk, fontSize: '11px' }}>
                                      <span className="status-dot" style={{ background: cs.statusDot }} />
                                      {cs.status}
                                    </span>
                                  </DcLink>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </Fragment>
                    ))}
                  </div>
                </section>
                {v.detail.hasUnassigned ? (
                  <section style={{ marginTop: '18px' }}>
                    <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Caktimi i rasteve pa përgjegjës</h2>
                    {v.detail.unassignedCases.map((u, uIdx) => (
                      <div key={uIdx} className="balance-card">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                            {u.id}
                          </span>
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{u.title}</span>
                        </div>
                        <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>
                          {u.category} · {u.priority}
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {u.candidates.map((c, cIdx) => (
                            <div key={cIdx} className={`candidate-row ${c.onClass}`}>
                              <span className="mini-avatar" style={{ background: '#EDEAE3', color: '#4A4640' }}>
                                {c.initials}
                              </span>
                              <span style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                                {c.name}{' '}
                                <span className="tabular-nums" style={{ color: '#8A847C' }}>
                                  — {c.active} aktive
                                </span>
                              </span>
                              {c.isTop ? <span style={{ flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#2E7D4F' }}>Rekomanduar</span> : null}
                              <button
                                type="button"
                                onClick={c.onAssign}
                                className="tap staff-btn-secondary"
                                style={{ flex: '0 0 auto', padding: '5px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                              >
                                Cakto
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '8px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>Arsye: {u.reasonText}</div>
                      </div>
                    ))}
                  </section>
                ) : null}
                <section style={{ marginTop: '18px' }}>
                  <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Historiku i caktimeve</h2>
                  <div className="staff-card" style={{ padding: '2px 16px' }}>
                    {v.detail.history.map((h, hIdx) => (
                      <div key={hIdx} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderTop: '1px solid #EFEAE2' }}>
                        <span style={{ flex: '0 0 auto', width: '54px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }} className="tabular-nums">
                          {h.time}
                        </span>
                        <span className="status-dot" style={{ marginTop: '5px', flex: '0 0 auto', background: h.color }} />
                        <span style={{ flex: 1, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>{h.label}</span>
                      </div>
                    ))}
                    {v.detail.historyNone ? (
                      <div style={{ padding: '16px 4px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#8A847C' }}>Ende pa aktivitet caktimi për këtë departament.</div>
                    ) : null}
                  </div>
                </section>
              </>
            ) : null}
            {v.isTabRregullat ? (
              <div className="staff-card" style={{ padding: '4px 14px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px' }}>
                  <span className="staff-th" style={{ flex: 1, padding: 0 }}>
                    Kategoria
                  </span>
                  <span className="staff-th" style={{ width: '90px', flex: '0 0 auto', padding: 0 }}>
                    Prioritet
                  </span>
                  <span className="staff-th" style={{ flex: 1.5, padding: 0 }}>
                    Përjashtim
                  </span>
                </div>
                {v.detail.rules.map((r, rIdx) => (
                  <div key={rIdx} className="rule-row">
                    <span style={{ flex: 1, fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{r.category}</span>
                    <span style={{ width: '90px', flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: r.priorityColor }}>{r.priority}</span>
                    <span style={{ flex: 1.5, fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>{r.exception}</span>
                  </div>
                ))}
                {v.detail.rulesNone ? (
                  <div style={{ padding: '16px 4px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#8A847C' }}>Asnjë rregull i përcaktuar për këtë departament ende.</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </Shell>
  );
}
