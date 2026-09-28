import { Fragment } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Shell } from '../../components/Shell';
import { useLogic } from '../../lib/dc';
import { PerformancaLogic, type Rec } from './PerformancaLogic';

const NO_PROPS = {};

/** Performanca: service performance at municipal and department scope, with the indicator builder, drill-down to cases, trends, insights and scheduled reports. */
export function Performanca() {
  const v = useLogic(PerformancaLogic, NO_PROPS);

  return (
    <Shell active="performanca">
      <PageHeader
        title={v.title}
        context={v.lede}
        actions={
          <>
            <div style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '999px', background: '#EDEAE3' }}>
              {v.periods.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={p.onClick}
                  className={`tap staff-chip ${p.onClass}`}
                  style={{ borderColor: 'transparent', padding: '5px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700 }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        }
      />
      <div className="app-pane r-subnav-split" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <nav className="auto-subnav" aria-label="Performanca">
          <div className="auto-subnav-title">Shtrirja</div>
          <div style={{ padding: '4px 2px 2px' }}>
            {v.roleChips.map((r, rIdx) => (
              <button key={rIdx} type="button" onClick={r.onClick} className={`tap perf-role ${r.onClass}`}>
                {r.label}
              </button>
            ))}
            {v.isDept ? (
              <select value={v.roleDept} onChange={v.onRoleDept} className="staff-select" style={{ width: '100%', padding: '6px 8px', marginTop: '2px' }}>
                {v.deptOptions.map((o, oIdx) => (
                  <option key={oIdx} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="auto-subnav-title" style={{ paddingTop: '16px' }}>
            {v.navTitle}
          </div>
          {v.nav.map((it, itIdx) => (
            <button key={itIdx} type="button" onClick={it.onClick} className={`tap auto-nav-item ${it.onClass}`}>
              <span className="auto-nav-label">{it.label}</span>
            </button>
          ))}
          <div style={{ margin: '18px 8px 0', paddingTop: '12px', borderTop: '1px solid #E4DFD6', fontFamily: "'Barlow',sans-serif", fontSize: '11px', lineHeight: 1.5, color: '#8A847C' }}>
            {v.histNote}
          </div>
        </nav>
        <main className="app-pane app-pad" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '20px 28px 32px' }}>
          {v.isSummary ? (
            <>
              <section>
                <div className="auto-section-head">
                  <div>
                    <h2 className="auto-h2">Gjendja e performancës</h2>
                    <div className="auto-muted tabular-nums" style={{ marginTop: '2px' }}>
                      {v.periodText} · krahasuar me {v.prevText} · kliko çdo numër për ta eksploruar
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={v.onEditKpis}
                      className="tap staff-btn-secondary"
                      style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                    >
                      Ndrysho indikatorët
                    </button>
                    <button
                      type="button"
                      onClick={v.builder.onOpen}
                      className="tap staff-btn-primary"
                      style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700 }}
                    >
                      + Krijo indikator
                    </button>
                  </div>
                </div>
                {v.editKpisOpen ? (
                  <div className="staff-card" style={{ padding: '6px 16px', marginBottom: '12px' }}>
                    {v.pinnedRows.map((p: Rec, pIdx: number) => (
                      <div
                        key={pIdx}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderTop: '1px solid #EFEAE2', fontFamily: "'Barlow',sans-serif", fontSize: '13px' }}
                      >
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: '#1B1917' }}>{p.name}</span>
                        {p.canTarget ? (
                          <>
                            <span className="auto-muted">Objektivi {p.dirLabel}</span>
                            <input type="text" value={p.target} onChange={p.onTarget} placeholder="—" className="staff-input" style={{ width: '58px', padding: '5px 7px', textAlign: 'right' }} />
                            <span className="auto-muted" style={{ width: '28px' }}>
                              {p.unitNote}
                            </span>
                          </>
                        ) : null}
                        {p.noTarget ? (
                          <span className="auto-muted" style={{ width: '150px', textAlign: 'right' }}>
                            pa objektiv (tregues konteksti)
                          </span>
                        ) : null}
                        <button type="button" onClick={p.onUp} className={`tap icon-btn ${p.upClass}`} aria-label="Lart">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 15l6-6 6 6" />
                          </svg>
                        </button>
                        <button type="button" onClick={p.onDown} className={`tap icon-btn ${p.downClass}`} aria-label="Poshtë">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        <button type="button" onClick={p.onRemove} className="tap icon-btn" aria-label="Hiq">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {v.pinnedPg.show ? (
                      <div className="pager pager-bare">
                        <span className="auto-muted tabular-nums">{v.pinnedPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.pinnedPg.onPrev} className={`tap icon-btn ${v.pinnedPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.pinnedPg.nums.map((pn, pnIdx) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.pinnedPg.onNext} className={`tap icon-btn ${v.pinnedPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div style={{ padding: '8px 0 6px', borderTop: '1px solid #EFEAE2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="auto-muted">Shtoni tregues nga biblioteka ose krijoni një të ri.</span>
                      <button type="button" onClick={v.goIndicators} className="tap auto-link">
                        Biblioteka e indikatorëve
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="perf-kpi-grid">
                  {v.kpis.map((k: Rec, kIdx: number) => (
                    <button key={kIdx} type="button" onClick={k.onClick} className="tap perf-kpi">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span className="perf-kpi-name">{k.name}</span>
                        <span className="auto-muted" style={{ whiteSpace: 'nowrap' }}>
                          {k.sub}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' }}>
                        <div className="perf-kpi-val tabular-nums" style={{ flex: '0 0 auto' }}>
                          {k.value}
                        </div>
                        {k.hasSpark ? (
                          <svg width="120" height="30" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true" style={{ flex: '0 1 120px', minWidth: '64px' }}>
                            <line x1="0" x2="120" y1={k.tgtY} y2={k.tgtY} stroke="#B8B2A9" strokeWidth="1" strokeDasharray="3 3" />
                            <polyline points={k.spark} fill="none" stroke="#1B1917" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                        ) : null}
                      </div>
                      <div style={{ marginTop: '6px', minHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {k.hasDelta ? (
                          <>
                            <span className="perf-kpi-delta tabular-nums" style={{ color: k.dColor }}>
                              {k.delta}
                            </span>{' '}
                            <span className="auto-muted tabular-nums">nga {k.prevValue}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="perf-kpi-foot">
                        {k.hasTarget ? (
                          <>
                            <span className="status-pill" style={{ padding: '2px 8px 2px 6px', fontSize: '11px', background: '#F5F2ED', color: k.tColor }}>
                              <span className="status-dot" style={{ background: k.tColor }} />
                              {k.tLabel}
                            </span>
                            <span className="tabular-nums">
                              Objektivi {k.tTarget} · {k.tGap}
                            </span>
                          </>
                        ) : null}
                        {k.noTarget ? <span>Pa objektiv</span> : null}
                        {k.scope ? <span style={{ marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.scope}</span> : null}
                      </div>
                    </button>
                  ))}
                </div>
                {v.kpisPg.show ? (
                  <div className="pager pager-bare">
                    <span className="auto-muted tabular-nums">{v.kpisPg.label}</span>
                    <div className="pager-btns">
                      <button type="button" onClick={v.kpisPg.onPrev} className={`tap icon-btn ${v.kpisPg.prevClass}`} aria-label="Faqja e mëparshme">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      {v.kpisPg.nums.map((pn, pnIdx) => (
                        <Fragment key={pnIdx}>
                          {pn.isNum ? (
                            <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                              {pn.n}
                            </button>
                          ) : null}
                          {pn.isGap ? <span className="pager-gap">…</span> : null}
                        </Fragment>
                      ))}
                      <button type="button" onClick={v.kpisPg.onNext} className={`tap icon-btn ${v.kpisPg.nextClass}`} aria-label="Faqja tjetër">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">SINJAL ka identifikuar</h2>
                  <span className="auto-muted">Çdo vëzhgim lidhet me rastet që e prodhojnë.</span>
                </div>
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.insights.map((x: Rec, xIdx: number) => (
                    <div key={xIdx} className="perf-insight">
                      <span className="attn-sev" style={{ background: x.color }} />
                      <div style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif" }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B1917', lineHeight: 1.4 }}>{x.title}</div>
                        {x.hasCauses ? (
                          <>
                            <div className="auto-form-label" style={{ margin: '8px 0 3px' }}>
                              Shkaqet kryesore të lidhura me të dhënat
                            </div>
                            {x.causes.map((c: Rec, cIdx: number) => (
                              <div key={cIdx} style={{ fontSize: '13px', color: '#4A4640', padding: '1px 0' }} className="tabular-nums">
                                • {c.t}
                              </div>
                            ))}
                          </>
                        ) : null}
                        <div className="auto-muted tabular-nums" style={{ marginTop: '6px' }}>
                          {x.source} · {x.period}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                          {x.actions.map((a: Rec, aIdx: number) => (
                            <Fragment key={aIdx}>
                              {a.isLink ? (
                                <DcLink href={a.href} onClick={a.onClick} className="tap auto-link">
                                  {a.label}
                                </DcLink>
                              ) : null}
                              {a.isBtn ? (
                                <button type="button" onClick={a.onClick} className="tap auto-link">
                                  {a.label}
                                </button>
                              ) : null}
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {v.insightsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.insightsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.insightsPg.onPrev} className={`tap icon-btn ${v.insightsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.insightsPg.nums.map((pn, pnIdx) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.insightsPg.onNext} className={`tap icon-btn ${v.insightsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {v.insightsNone ? <div className="perf-insight auto-muted">Asnjë ndryshim i rëndësishëm në këtë periudhë.</div> : null}
                </div>
              </section>
              {v.isMuni ? (
                <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                  <button type="button" onClick={v.goDepartments} className="tap perf-kpi">
                    <div className="perf-kpi-name">Performanca sipas departamentit</div>
                    <div className="auto-muted" style={{ marginTop: '4px' }}>
                      Treguesit krah për krah, pa renditje.
                    </div>
                  </button>
                  <button type="button" onClick={v.goZones} className="tap perf-kpi">
                    <div className="perf-kpi-name">Ku janë të përqendruara problemet</div>
                    <div className="auto-muted" style={{ marginTop: '4px' }}>
                      Departament, zonë apo kategori?
                    </div>
                  </button>
                  <button type="button" onClick={v.goTrends} className="tap perf-kpi">
                    <div className="perf-kpi-name">Trendet dhe shkaqet</div>
                    <div className="auto-muted" style={{ marginTop: '4px' }}>
                      Pse ndryshoi një tregues.
                    </div>
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {v.isDepartments ? (
            <>
              <div className="auto-callout" style={{ margin: '0 0 14px', background: '#EDEAE3' }}>
                Departamentet nuk renditen dhe nuk marrin një pikë të vetme: një departament me më shumë raste urgjente ose më pak staf nuk duhet të reduktohet në një numër. Krahasoni treguesit dhe
                kontekstin. Kliko çdo vlerë për ta eksploruar.
              </div>
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Departamenti</th>
                      <th>Raporte</th>
                      <th>Aktive</th>
                      <th>SLA</th>
                      <th>SLA · 12 javë</th>
                      <th>Reagim</th>
                      <th>Zgjidhje</th>
                      <th>Rishfaqje</th>
                      <th>Urgjente</th>
                      <th>Ngarkesë/staf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.deptRows.map((d, dIdx) => (
                      <tr key={dIdx}>
                        <td>
                          <button type="button" onClick={d.onOpen} className="tap perf-cell" style={{ fontWeight: 700 }}>
                            {d.name}
                            <small style={{ color: '#8A847C', fontWeight: 500 }}>{d.smallNote}</small>
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.newC.onClick} className="tap perf-cell tabular-nums">
                            {d.newC.v}
                            <small style={{ color: d.newC.dColor }}>{d.newC.d}</small>
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.active.onClick} className="tap perf-cell tabular-nums">
                            {d.active.v}
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.sla.onClick} className="tap perf-cell tabular-nums" style={{ fontWeight: 700 }}>
                            {d.sla.v}
                            <small style={{ color: d.sla.dColor }}>{d.sla.d}</small>
                          </button>
                        </td>
                        <td>
                          <svg width="96" height="26" viewBox="0 0 96 26" aria-hidden="true">
                            <line x1="0" x2="96" y1={d.tgtY} y2={d.tgtY} stroke="#B8B2A9" strokeWidth="1" strokeDasharray="3 3" />
                            <polyline points={d.spark} fill="none" stroke="#1B1917" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                          </svg>
                        </td>
                        <td>
                          <button type="button" onClick={d.resp.onClick} className="tap perf-cell tabular-nums">
                            {d.resp.v}
                            <small style={{ color: d.resp.dColor }}>{d.resp.d}</small>
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.res.onClick} className="tap perf-cell tabular-nums">
                            {d.res.v}
                            <small style={{ color: d.res.dColor }}>{d.res.d}</small>
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.reap.onClick} className="tap perf-cell tabular-nums">
                            {d.reap.v}
                            <small style={{ color: d.reap.dColor }}>{d.reap.d}</small>
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.urgent.onClick} className="tap perf-cell tabular-nums" style={{ color: '#6B665F' }}>
                            {d.urgent.v}
                          </button>
                        </td>
                        <td>
                          <button type="button" onClick={d.load.onClick} className="tap perf-cell tabular-nums">
                            {d.load.v}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="auto-muted" style={{ margin: '10px 2px 0', lineHeight: 1.5 }}>
                Raporte = të dërguara në {v.periodText}. SLA, reagimi, zgjidhja dhe rishfaqja llogariten mbi të njëjtat raste. Vija me pika = objektivi i SLA. Urgjente dhe ngarkesa janë kontekst, jo
                cilësi.
              </p>
            </>
          ) : null}
          {v.isServices ? (
            <div className="staff-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Shërbimi</th>
                    <th>Departamenti</th>
                    <th>Raporte</th>
                    <th>Aktive</th>
                    <th>SLA</th>
                    <th>Reagim</th>
                    <th>Zgjidhje</th>
                    <th>Rishfaqje</th>
                    <th>Urgjente</th>
                  </tr>
                </thead>
                <tbody>
                  {v.catRows.map((d, dIdx) => (
                    <tr key={dIdx}>
                      <td>
                        <button type="button" onClick={d.onOpen} className="tap perf-cell" style={{ fontWeight: 700 }}>
                          {d.name}
                        </button>
                      </td>
                      <td style={{ color: '#6B665F' }}>{d.dept}</td>
                      <td>
                        <button type="button" onClick={d.newC.onClick} className="tap perf-cell tabular-nums">
                          {d.newC.v}
                          <small style={{ color: d.newC.dColor }}>{d.newC.d}</small>
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.active.onClick} className="tap perf-cell tabular-nums">
                          {d.active.v}
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.sla.onClick} className="tap perf-cell tabular-nums" style={{ fontWeight: 700 }}>
                          {d.sla.v}
                          <small style={{ color: d.sla.dColor }}>{d.sla.d}</small>
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.resp.onClick} className="tap perf-cell tabular-nums">
                          {d.resp.v}
                          <small style={{ color: d.resp.dColor }}>{d.resp.d}</small>
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.res.onClick} className="tap perf-cell tabular-nums">
                          {d.res.v}
                          <small style={{ color: d.res.dColor }}>{d.res.d}</small>
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.reap.onClick} className="tap perf-cell tabular-nums">
                          {d.reap.v}
                          <small style={{ color: d.reap.dColor }}>{d.reap.d}</small>
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={d.urgent.onClick} className="tap perf-cell tabular-nums" style={{ color: '#6B665F' }}>
                          {d.urgent.v}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {v.isZones ? (
            <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div className="staff-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderBottom: '1px solid #E4DFD6' }}>
                  <span className="staff-th" style={{ padding: 0, flex: 1 }}>
                    Zona · raporte
                  </span>
                  <span className="staff-th" style={{ padding: 0, width: '52px', textAlign: 'right' }}>
                    Aktive
                  </span>
                  <span className="staff-th" style={{ padding: 0, width: '70px', textAlign: 'right' }}>
                    SLA rrezik
                  </span>
                  <span className="staff-th" style={{ padding: 0, width: '70px', textAlign: 'right' }}>
                    Rishfaqje
                  </span>
                  <span className="staff-th" style={{ padding: 0, width: '120px' }}>
                    Më i shpeshti
                  </span>
                </div>
                {v.zoneRows.map((z: Rec, zIdx: number) => (
                  <button key={zIdx} type="button" onClick={z.onClick} className={`tap auto-row ${z.onClass}`}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                        <span>{z.zone}</span>
                        <span className="tabular-nums">{z.n}</span>
                      </span>
                      <span className="perf-bar-track" style={{ display: 'block', marginTop: '5px' }}>
                        <span className="perf-bar-fill" style={{ display: 'block', width: z.barW }} />
                      </span>
                    </span>
                    <span className="tabular-nums" style={{ width: '52px', textAlign: 'right', fontSize: '13px' }}>
                      {z.active}
                    </span>
                    <span className="tabular-nums" style={{ width: '70px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: z.atRiskColor }}>
                      {z.atRisk}
                    </span>
                    <span className="tabular-nums" style={{ width: '70px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: z.reapColor }}>
                      {z.reap}
                    </span>
                    <span style={{ width: '120px', fontSize: '12px', color: '#6B665F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.topCat}</span>
                  </button>
                ))}
                {v.zonePg.show ? (
                  <div className="pager">
                    <span className="auto-muted tabular-nums">{v.zonePg.label}</span>
                    <div className="pager-btns">
                      <button type="button" onClick={v.zonePg.onPrev} className={`tap icon-btn ${v.zonePg.prevClass}`} aria-label="Faqja e mëparshme">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      {v.zonePg.nums.map((pn, pnIdx) => (
                        <Fragment key={pnIdx}>
                          {pn.isNum ? (
                            <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                              {pn.n}
                            </button>
                          ) : null}
                          {pn.isGap ? <span className="pager-gap">…</span> : null}
                        </Fragment>
                      ))}
                      <button type="button" onClick={v.zonePg.onNext} className={`tap icon-btn ${v.zonePg.nextClass}`} aria-label="Faqja tjetër">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <aside className="staff-card auto-panel" style={{ width: '360px', flex: '0 0 auto', position: 'sticky', top: 0 }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '18px', fontWeight: 700, color: '#1B1917' }}>{v.zone.zone}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '10px' }}>
                  <div>
                    <div className="loop-step-n tabular-nums" style={{ fontSize: '24px', margin: 0 }}>
                      {v.zone.n}
                    </div>
                    <div className="auto-muted">raporte</div>
                  </div>
                  <div>
                    <div className="loop-step-n tabular-nums" style={{ fontSize: '24px', margin: 0 }}>
                      {v.zone.active}
                    </div>
                    <div className="auto-muted">aktive</div>
                  </div>
                  <div>
                    <div className="loop-step-n tabular-nums" style={{ fontSize: '24px', margin: 0, color: '#C23B31' }}>
                      {v.zone.atRisk}
                    </div>
                    <div className="auto-muted">SLA në rrezik</div>
                  </div>
                  <div>
                    <div className="loop-step-n tabular-nums" style={{ fontSize: '24px', margin: 0 }}>
                      {v.zone.reap}
                    </div>
                    <div className="auto-muted">rishfaqur</div>
                  </div>
                </div>
                <div className="auto-form-label" style={{ marginTop: '14px' }}>
                  Diagnoza
                </div>
                {v.zone.diag.map((g, gIdx) => (
                  <div key={gIdx} className="auto-callout" style={{ marginTop: '6px', background: '#F5F2ED' }}>
                    <div className="auto-callout-title">{g.kind}</div>
                    {g.text}
                  </div>
                ))}
                <div className="auto-form-label" style={{ marginTop: '14px' }}>
                  Sipas departamentit
                </div>
                {v.zone.depts.map((b, bIdx) => (
                  <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontFamily: "'Barlow',sans-serif", fontSize: '12px' }}>
                    <span style={{ width: '118px', color: '#4A4640' }}>{b.label}</span>
                    <span className="perf-bar-track" style={{ flex: 1 }}>
                      <span className="perf-bar-fill" style={{ display: 'block', width: b.w }} />
                    </span>
                    <span className="tabular-nums" style={{ width: '28px', textAlign: 'right', fontWeight: 700 }}>
                      {b.n}
                    </span>
                  </div>
                ))}
                <div className="auto-form-label" style={{ marginTop: '12px' }}>
                  Sipas kategorisë
                </div>
                {v.zone.cats.map((b, bIdx) => (
                  <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontFamily: "'Barlow',sans-serif", fontSize: '12px' }}>
                    <span style={{ width: '118px', color: '#4A4640' }}>{b.label}</span>
                    <span className="perf-bar-track" style={{ flex: 1 }}>
                      <span className="perf-bar-fill" style={{ display: 'block', width: b.w, background: '#6B665F' }} />
                    </span>
                    <span className="tabular-nums" style={{ width: '28px', textAlign: 'right', fontWeight: 700 }}>
                      {b.n}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <DcLink
                    href="Harta.dc.html"
                    onClick={v.zone.onHarta}
                    className="tap staff-btn-primary"
                    style={{ flex: 1, textAlign: 'center', padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                  >
                    Hap në Harta
                  </DcLink>
                  <button
                    type="button"
                    onClick={v.zone.onCases}
                    className="tap staff-btn-secondary"
                    style={{ flex: 1, padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                  >
                    Shiko rastet
                  </button>
                </div>
              </aside>
            </div>
          ) : null}
          {v.isTrends ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {v.trend.chips.map((c: Rec, cIdx: number) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={c.onClick}
                    className={`tap staff-chip ${c.onClass}`}
                    style={{ padding: '5px 11px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="staff-card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div className="perf-kpi-name" style={{ fontSize: '13px' }}>
                      {v.trend.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                      <span className="perf-kpi-val tabular-nums" style={{ fontSize: '32px' }}>
                        {v.trend.value}
                      </span>
                      {v.trend.hasDelta ? (
                        <>
                          <span className="perf-kpi-delta tabular-nums" style={{ fontSize: '15px', color: v.trend.dColor }}>
                            {v.trend.delta}
                          </span>
                          <span className="auto-muted tabular-nums">nga {v.trend.prevValue}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="auto-muted" style={{ marginTop: '4px' }}>
                      {v.trend.formula}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={v.trend.onExplore}
                    className="tap staff-btn-secondary"
                    style={{ flex: '0 0 auto', padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Eksploro
                  </button>
                </div>
                {v.trend.hasSeries ? (
                  <>
                    <svg
                      width="100%"
                      height="190"
                      viewBox="0 0 640 180"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${v.trend.name} sipas javës, 12 javët e fundit`}
                      style={{ display: 'block', marginTop: '12px' }}
                    >
                      <line x1="18" x2="622" y1="162" y2="162" stroke="#E4DFD6" strokeWidth="1" />
                      {v.trend.hasTarget ? <line x1="18" x2="622" y1={v.trend.tgtY} y2={v.trend.tgtY} stroke="#2E7D4F" strokeWidth="1.2" strokeDasharray="4 4" /> : null}
                      <polyline points={v.trend.line} fill="none" stroke="#1B1917" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      {v.trend.dots.map((p: Rec, pIdx: number) => (
                        <g key={pIdx}>
                          <circle cx={p.cx} cy={p.cy} r="12" fill="transparent">
                            <title>{p.tip}</title>
                          </circle>
                          <circle cx={p.cx} cy={p.cy} r="3.5" fill="#1B1917" stroke="#FBFAF8" strokeWidth="2" pointerEvents="none" />
                        </g>
                      ))}
                    </svg>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: '2px', marginTop: '4px' }}>
                      {v.trend.weekVals.map((w: Rec, wIdx: number) => (
                        <div key={wIdx} style={{ textAlign: 'center', fontFamily: "'Barlow',sans-serif" }}>
                          <div className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700, color: '#1B1917' }}>
                            {w.v}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: '11px', color: '#8A847C' }}>
                            {w.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {v.trend.hasTarget ? (
                      <div className="auto-muted" style={{ marginTop: '6px' }}>
                        <span style={{ color: '#2E7D4F', fontWeight: 700 }}>- - -</span> {v.trend.targetLabel}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {v.trend.isSnapshot ? (
                  <div className="auto-muted" style={{ marginTop: '12px' }}>
                    Tregues i çastit — nuk ka seri historike.
                  </div>
                ) : null}
                <div className="auto-callout" style={{ background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{v.trend.insight}</div>
                  <button
                    type="button"
                    onClick={v.trend.onCauses}
                    className="tap staff-btn-primary"
                    style={{ flex: '0 0 auto', padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                  >
                    Shiko çfarë e shkaktoi
                  </button>
                </div>
              </div>
              {v.trend.causesOpen ? (
                <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
                  <section>
                    <div className="auto-section-head">
                      <h2 className="auto-h2">Ku ndodhi ndryshimi</h2>
                      <span className="auto-muted">renditur sipas ndikimit</span>
                    </div>
                    <div className="staff-card" style={{ overflow: 'hidden' }}>
                      {v.trend.causes.map((c: Rec, cIdx: number) => (
                        <button key={cIdx} type="button" onClick={c.onClick} className="tap auto-row">
                          <span style={{ width: '92px', fontSize: '12px', fontWeight: 600, color: '#8A847C' }}>{c.dim}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 700 }}>{c.label}</span>
                          <span className="tabular-nums" style={{ width: '110px', textAlign: 'right', fontSize: '13px', color: '#4A4640' }}>
                            {c.prev} → {c.cur}
                          </span>
                          <span className="tabular-nums" style={{ width: '74px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: c.dColor }}>
                            {c.delta}
                          </span>
                          <span className="tabular-nums auto-muted" style={{ width: '44px', textAlign: 'right' }}>
                            n={c.n}
                          </span>
                        </button>
                      ))}
                      {v.trend.causesPg.show ? (
                        <div className="pager">
                          <span className="auto-muted tabular-nums">{v.trend.causesPg.label}</span>
                          <div className="pager-btns">
                            <button type="button" onClick={v.trend.causesPg.onPrev} className={`tap icon-btn ${v.trend.causesPg.prevClass}`} aria-label="Faqja e mëparshme">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 6l-6 6 6 6" />
                              </svg>
                            </button>
                            {v.trend.causesPg.nums.map((pn: Rec, pnIdx: number) => (
                              <Fragment key={pnIdx}>
                                {pn.isNum ? (
                                  <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                    {pn.n}
                                  </button>
                                ) : null}
                                {pn.isGap ? <span className="pager-gap">…</span> : null}
                              </Fragment>
                            ))}
                            <button type="button" onClick={v.trend.causesPg.onNext} className={`tap icon-btn ${v.trend.causesPg.nextClass}`} aria-label="Faqja tjetër">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {v.trend.causesNone ? <div className="attn-row auto-muted">Asnjë segment nuk e përkeqësoi treguesin.</div> : null}
                    </div>
                  </section>
                  <section>
                    <div className="auto-section-head">
                      <h2 className="auto-h2">Ngarkesa dhe caktimi</h2>
                    </div>
                    <div className="staff-card" style={{ overflow: 'hidden' }}>
                      {v.trend.context.map((c: Rec, cIdx: number) => (
                        <button key={cIdx} type="button" onClick={c.onClick} className="tap auto-row" style={{ alignItems: 'flex-start' }}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>{c.label}</span>
                            <span className="auto-muted tabular-nums" style={{ display: 'block' }}>
                              {c.value}
                            </span>
                          </span>
                          <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: c.dColor }}>
                            {c.delta}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </>
          ) : null}
          {v.isIndicators ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="auto-muted">Bashkia nuk është e kufizuar te treguesit e zgjedhur nga dizajni i produktit.</span>
                <button
                  type="button"
                  onClick={v.builder.onOpen}
                  className="tap staff-btn-primary"
                  style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                >
                  + Krijo indikator
                </button>
              </div>
              <section>
                <div className="auto-section-head">
                  <h2 className="auto-h2">Në panel · objektivat</h2>
                  <span className="auto-muted">Objektivi → Aktuali → Diferenca → Trendi</span>
                </div>
                <div className="staff-card" style={{ padding: '4px 16px' }}>
                  {v.pinnedRows.map((p: Rec, pIdx: number) => (
                    <div
                      key={pIdx}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid #EFEAE2', fontFamily: "'Barlow',sans-serif", fontSize: '13px' }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: '#1B1917' }}>{p.name}</span>
                      {p.canTarget ? (
                        <>
                          <span className="auto-muted">Objektivi {p.dirLabel}</span>
                          <input type="text" value={p.target} onChange={p.onTarget} placeholder="—" className="staff-input" style={{ width: '58px', padding: '5px 7px', textAlign: 'right' }} />
                          <span className="auto-muted" style={{ width: '28px' }}>
                            {p.unitNote}
                          </span>
                        </>
                      ) : null}
                      {p.noTarget ? <span className="auto-muted">pa objektiv</span> : null}
                      <button type="button" onClick={p.onUp} className={`tap icon-btn ${p.upClass}`} aria-label="Lart">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 15l6-6 6 6" />
                        </svg>
                      </button>
                      <button type="button" onClick={p.onDown} className={`tap icon-btn ${p.downClass}`} aria-label="Poshtë">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      <button type="button" onClick={p.onRemove} className="tap icon-btn" aria-label="Hiq nga paneli">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {v.pinnedPg.show ? (
                    <div className="pager pager-bare">
                      <span className="auto-muted tabular-nums">{v.pinnedPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.pinnedPg.onPrev} className={`tap icon-btn ${v.pinnedPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.pinnedPg.nums.map((pn, pnIdx) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.pinnedPg.onNext} className={`tap icon-btn ${v.pinnedPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
              {v.hasCustom ? (
                <section className="auto-section">
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Indikatorët e personalizuar</h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.customList.map((c: Rec, cIdx: number) => (
                      <div key={cIdx} className="attn-row">
                        <div className="attn-text">
                          <b>{c.name}</b>
                          <span className="attn-evidence">
                            {c.formula} · {c.scope}
                          </span>
                        </div>
                        <span className="tabular-nums" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800 }}>
                          {c.value}
                        </span>
                        <span className="tabular-nums" style={{ width: '64px', fontSize: '12px', fontWeight: 700, color: c.dColor }}>
                          {c.delta}
                        </span>
                        <button type="button" onClick={c.onView} className="tap auto-link">
                          Eksploro
                        </button>
                        <button type="button" onClick={c.onDelete} className="tap auto-link" style={{ color: '#6B665F' }}>
                          Fshi
                        </button>
                      </div>
                    ))}
                    {v.customPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.customPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.customPg.onPrev} className={`tap icon-btn ${v.customPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.customPg.nums.map((pn, pnIdx) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.customPg.onNext} className={`tap icon-btn ${v.customPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
              {v.library.map((g, gIdx) => (
                <section key={gIdx} className="auto-section">
                  <div className="auto-section-head">
                    <h2 className="auto-h2">{g.label}</h2>
                    <span className="auto-muted">{g.byLabel}</span>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {g.items.map((i, iIdx) => (
                      <div key={iIdx} className="attn-row">
                        <div className="attn-text">
                          <b>{i.name}</b>
                          <span className="attn-evidence">{i.formula}</span>
                        </div>
                        <span className="tabular-nums" style={{ width: '84px', textAlign: 'right', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800 }}>
                          {i.value}
                        </span>
                        <span className="tabular-nums" style={{ width: '70px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: i.dColor }}>
                          {i.delta}
                        </span>
                        <button type="button" onClick={i.onView} className="tap auto-link" style={{ width: '62px' }}>
                          Eksploro
                        </button>
                        <button
                          type="button"
                          onClick={i.onPin}
                          className={`tap staff-btn-secondary ${i.pinClass}`}
                          style={{ width: '118px', padding: '6px 8px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700 }}
                        >
                          {i.pinLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : null}
          {v.isReports ? (
            <>
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <section style={{ width: '330px', flex: '0 0 auto' }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Krijo raport</h2>
                  </div>
                  <div className="staff-card" style={{ padding: '14px 16px' }}>
                    <div className="auto-form-label">Titulli</div>
                    <input type="text" value={v.reportForm.title} onChange={v.reportForm.onTitle} className="staff-input" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }} />
                    <div className="auto-form-label" style={{ marginTop: '12px' }}>
                      Periudha
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="date" value={v.reportForm.from} onChange={v.reportForm.onFrom} className="staff-input" style={{ flex: 1, minWidth: 0, padding: '7px 8px' }} />
                      <span className="auto-muted">→</span>
                      <input type="date" value={v.reportForm.to} onChange={v.reportForm.onTo} className="staff-input" style={{ flex: 1, minWidth: 0, padding: '7px 8px' }} />
                    </div>
                    <div className="auto-form-label" style={{ marginTop: '12px' }}>
                      Departamentet
                    </div>
                    {v.reportForm.depts.map((d, dIdx) => (
                      <button key={dIdx} type="button" onClick={d.onClick} className="tap pub-case" style={{ padding: '6px 2px', borderTop: 0 }}>
                        <span className={`check-box ${d.checkClass}`}>
                          {d.checked ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12l5 5 9-10" />
                            </svg>
                          ) : null}
                        </span>
                        <span style={{ fontSize: '13px', color: '#1B1917' }}>{d.label}</span>
                      </button>
                    ))}
                    <div className="auto-form-label" style={{ marginTop: '12px' }}>
                      Indikatorët
                    </div>
                    {v.reportForm.inds.map((d, dIdx) => (
                      <button key={dIdx} type="button" onClick={d.onClick} className="tap pub-case" style={{ padding: '6px 2px', borderTop: 0 }}>
                        <span className={`check-box ${d.checkClass}`}>
                          {d.checked ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12l5 5 9-10" />
                            </svg>
                          ) : null}
                        </span>
                        <span style={{ fontSize: '13px', color: '#1B1917' }}>{d.label}</span>
                      </button>
                    ))}
                    <div className="auto-form-label" style={{ marginTop: '12px' }}>
                      Krahasim
                    </div>
                    <button type="button" onClick={v.reportForm.onCompare} className="tap pub-case" style={{ padding: '6px 2px', borderTop: 0 }}>
                      <span className={`check-box ${v.reportForm.compareClass}`}>
                        {v.reportForm.compare ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5 9-10" />
                          </svg>
                        ) : null}
                      </span>
                      <span style={{ fontSize: '13px', color: '#1B1917' }}>Me periudhën paraardhëse me të njëjtën gjatësi</span>
                    </button>
                    <button
                      type="button"
                      onClick={v.reportForm.onGenerate}
                      className={`tap staff-btn-primary ${v.reportForm.genDisabledClass}`}
                      style={{ width: '100%', marginTop: '14px', padding: '10px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                    >
                      Gjenero raportin
                    </button>
                  </div>
                </section>
                <section style={{ flex: 1, minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Parapamja</h2>
                  </div>
                  {v.generated.show ? (
                    <div className="staff-card" style={{ padding: '16px 18px' }}>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '18px', fontWeight: 700, color: '#1B1917' }}>{v.generated.title}</div>
                      <div className="auto-muted tabular-nums" style={{ marginTop: '3px' }}>
                        {v.generated.period} · {v.generated.compareText} · Bashkia Elbasan · SINJAL
                      </div>
                      <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Indikatori</th>
                              {v.generated.tCols.map((c: Rec, cIdx: number) => (
                                <th key={cIdx}>{c.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {v.generated.tRows.map((r: Rec, rIdx: number) => (
                              <tr key={rIdx}>
                                <td style={{ fontWeight: 700 }}>{r.label}</td>
                                {r.cells.map((c: Rec, cIdx: number) => (
                                  <td key={cIdx} className="tabular-nums">
                                    <b>{c.v}</b>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: c.dColor }}>{c.d}</span>
                                    <span style={{ display: 'block', fontSize: '11px', color: '#8A847C' }}>{c.prev}</span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                        <DcLink
                          href={v.generated.csvHref}
                          download={v.generated.csvName}
                          className="tap staff-btn-primary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Shkarko Excel / CSV
                        </DcLink>
                        <button
                          type="button"
                          onClick={v.generated.onPrint}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Printo / ruaj si PDF
                        </button>
                        <button
                          type="button"
                          onClick={v.generated.onSave}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Ruaj për përdoruesit e autorizuar
                        </button>
                        {v.generated.saved ? (
                          <span className="auto-muted" style={{ alignSelf: 'center', color: '#2E7D4F', fontWeight: 700 }}>
                            Ruajtur
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {v.generated.notShown ? (
                    <div className="staff-card auto-muted" style={{ padding: '22px', textAlign: 'center' }}>
                      Zgjidhni periudhën, departamentet dhe indikatorët, pastaj gjeneroni raportin.
                    </div>
                  ) : null}
                  {v.hasSaved ? (
                    <>
                      <div className="auto-form-label" style={{ margin: '14px 0 6px' }}>
                        Raporte të ruajtura
                      </div>
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.savedReports.map((s: Rec, sIdx: number) => (
                          <button key={sIdx} type="button" onClick={s.onOpen} className="tap auto-row">
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>{s.title}</span>
                              <span className="auto-muted tabular-nums" style={{ display: 'block' }}>
                                {s.meta}
                              </span>
                            </span>
                            <span className="auto-link">Hap</span>
                          </button>
                        ))}
                        {v.savedPg.show ? (
                          <div className="pager">
                            <span className="auto-muted tabular-nums">{v.savedPg.label}</span>
                            <div className="pager-btns">
                              <button type="button" onClick={v.savedPg.onPrev} className={`tap icon-btn ${v.savedPg.prevClass}`} aria-label="Faqja e mëparshme">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M15 6l-6 6 6 6" />
                                </svg>
                              </button>
                              {v.savedPg.nums.map((pn, pnIdx) => (
                                <Fragment key={pnIdx}>
                                  {pn.isNum ? (
                                    <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                      {pn.n}
                                    </button>
                                  ) : null}
                                  {pn.isGap ? <span className="pager-gap">…</span> : null}
                                </Fragment>
                              ))}
                              <button type="button" onClick={v.savedPg.onNext} className={`tap icon-btn ${v.savedPg.nextClass}`} aria-label="Faqja tjetër">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 6l6 6-6 6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Raporte të planifikuara</h2>
                  <button
                    type="button"
                    onClick={v.onOpenSchedule}
                    className="tap staff-btn-secondary"
                    style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    + Planifiko raport
                  </button>
                </div>
                {v.scheduleOpen ? (
                  <div className="staff-card" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                    <div className="perf-field">
                      <span className="perf-field-k">Emri</span>
                      <input type="text" value={v.scheduleForm.name} onChange={v.scheduleForm.onName} className="staff-input" style={{ padding: '7px 10px' }} />
                    </div>
                    <div className="perf-field">
                      <span className="perf-field-k">Dërgohet</span>
                      <select value={v.scheduleForm.freq} onChange={v.scheduleForm.onFreq} className="staff-select" style={{ padding: '6px 8px', justifySelf: 'start' }}>
                        {v.scheduleForm.freqOptions.map((o, oIdx) => (
                          <option key={oIdx} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="perf-field">
                      <span className="perf-field-k">Për</span>
                      <select value={v.scheduleForm.scope} onChange={v.scheduleForm.onScope} className="staff-select" style={{ padding: '6px 8px', justifySelf: 'start' }}>
                        {v.scheduleForm.scopeOptions.map((o, oIdx) => (
                          <option key={oIdx} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="perf-field" style={{ alignItems: 'start' }}>
                      <span className="perf-field-k">Përmban</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {v.scheduleForm.contents.map((c, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={c.onClick}
                            className={`tap staff-chip ${c.checkClass}`}
                            style={{ padding: '4px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={v.onSaveSchedule}
                        className={`tap staff-btn-primary ${v.scheduleForm.saveDisabledClass}`}
                        style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                      >
                        Ruaj planifikimin
                      </button>
                      <button
                        type="button"
                        onClick={v.onCancelSchedule}
                        className="tap staff-btn-secondary"
                        style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                      >
                        Anulo
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.schedules.map((s: Rec, sIdx: number) => (
                    <div key={sIdx} className="attn-row" style={{ alignItems: 'flex-start', gap: '14px' }}>
                      <div className="attn-text">
                        <b>{s.name}</b>
                        <span className="attn-evidence">
                          {s.freq} · {s.scope} · për: {s.recipients} · {s.next}
                        </span>
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                          {s.contents.map((c: Rec, cIdx: number) => (
                            <span key={cIdx} className="zone-chip">
                              {c.label}
                            </span>
                          ))}
                        </span>
                      </div>
                      <button type="button" onClick={s.onToggle} className={`tap switch ${s.switchClass}`} aria-label="Aktiv" />
                    </div>
                  ))}
                  {v.schedulesPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.schedulesPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.schedulesPg.onPrev} className={`tap icon-btn ${v.schedulesPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.schedulesPg.nums.map((pn, pnIdx) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.schedulesPg.onNext} className={`tap icon-btn ${v.schedulesPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
          {v.isTeam ? (
            <>
              <div className="auto-callout" style={{ margin: '0 0 14px', background: '#EDEAE3' }}>
                Ekipi paraqitet si kontekst për shpërndarjen e punës — jo si renditje. Zonat e mbulimit dhe llojet e rasteve ndikojnë drejtpërdrejt në kohët e zgjidhjes.
              </div>
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Punonjësi</th>
                      <th>Zonat e mbulimit</th>
                      <th>Aktive tani</th>
                      <th>Zgjidhur</th>
                      <th>Koha mesatare e zgjidhjes</th>
                      <th>SLA</th>
                      <th>Rishfaqje</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {v.team.map((t, tIdx) => (
                      <tr key={tIdx}>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span
                            className="mini-avatar"
                            style={{
                              display: 'inline-flex',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#EDEAE3',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              marginRight: '8px',
                            }}
                          >
                            {t.initials}
                          </span>
                          {t.name}
                        </td>
                        <td style={{ color: '#6B665F' }}>{t.zones}</td>
                        <td className="tabular-nums">{t.active}</td>
                        <td className="tabular-nums">{t.resolved}</td>
                        <td className="tabular-nums">{t.avgRes}</td>
                        <td className="tabular-nums" style={{ fontWeight: 700 }}>
                          {t.sla}
                        </td>
                        <td className="tabular-nums">{t.reap}</td>
                        <td>
                          <button type="button" onClick={t.onOpen} className="tap auto-link">
                            Rastet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {v.isSla ? (
            <>
              <div className="staff-card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                  <div>
                    <div className="perf-kpi-name">Përmbushja e SLA · {v.periodText}</div>
                    <div className="perf-kpi-val tabular-nums" style={{ fontSize: '32px' }}>
                      {v.sla.value}
                    </div>
                    <div className="perf-kpi-delta tabular-nums" style={{ color: v.sla.dColor, marginTop: '4px' }}>
                      {v.sla.delta}{' '}
                      <span className="auto-muted" style={{ fontWeight: 500 }}>
                        nga periudha paraardhëse
                      </span>
                    </div>
                  </div>
                  {v.sla.hasTarget ? (
                    <div style={{ display: 'flex', gap: '18px', paddingBottom: '4px', fontFamily: "'Barlow',sans-serif" }}>
                      <div>
                        <div className="auto-form-label">Objektivi</div>
                        <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700 }}>
                          {v.sla.tTarget}
                        </div>
                      </div>
                      <div>
                        <div className="auto-form-label">Diferenca</div>
                        <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: v.sla.tColor }}>
                          {v.sla.tGap}
                        </div>
                      </div>
                      <div>
                        <div className="auto-form-label">Statusi</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: v.sla.tColor }}>{v.sla.tLabel}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <svg width="100%" height="160" viewBox="0 0 640 150" preserveAspectRatio="none" role="img" aria-label="Përmbushja e SLA sipas javës" style={{ display: 'block', marginTop: '10px' }}>
                  <line x1="16" x2="624" y1="134" y2="134" stroke="#E4DFD6" strokeWidth="1" />
                  <line x1="16" x2="624" y1={v.sla.tgtY} y2={v.sla.tgtY} stroke="#2E7D4F" strokeWidth="1.2" strokeDasharray="4 4" />
                  <polyline points={v.sla.line} fill="none" stroke="#1B1917" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {v.sla.dots.map((p: Rec, pIdx: number) => (
                    <g key={pIdx}>
                      <circle cx={p.cx} cy={p.cy} r="12" fill="transparent">
                        <title>{p.tip}</title>
                      </circle>
                      <circle cx={p.cx} cy={p.cy} r="3.5" fill="#1B1917" stroke="#FBFAF8" strokeWidth="2" pointerEvents="none" />
                    </g>
                  ))}
                </svg>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: '2px', marginTop: '4px' }}>
                  {v.sla.weekVals.map((w: Rec, wIdx: number) => (
                    <div key={wIdx} style={{ textAlign: 'center', fontFamily: "'Barlow',sans-serif" }}>
                      <div className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {w.v}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '11px', color: '#8A847C' }}>
                        {w.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                <section>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Sipas prioritetit</h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Prioriteti</th>
                          <th>Afati</th>
                          <th>Zgjidhur</th>
                          <th>SLA</th>
                          <th>Pas afatit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.sla.byPrio.map((p: Rec, pIdx: number) => (
                          <tr key={pIdx}>
                            <td style={{ fontWeight: 700, color: p.color }}>{p.priority}</td>
                            <td className="tabular-nums">{p.target}</td>
                            <td className="tabular-nums">{p.n}</td>
                            <td className="tabular-nums" style={{ fontWeight: 700 }}>
                              {p.sla}
                            </td>
                            <td className="tabular-nums">{p.late}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Sipas shërbimit</h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Shërbimi</th>
                          <th>Raporte</th>
                          <th>SLA</th>
                          <th>Zgjidhje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.sla.byCat.map((d: Rec, dIdx: number) => (
                          <tr key={dIdx}>
                            <td style={{ fontWeight: 700 }}>{d.name}</td>
                            <td className="tabular-nums">{d.newC.v}</td>
                            <td>
                              <button type="button" onClick={d.sla.onClick} className="tap perf-cell tabular-nums" style={{ fontWeight: 700 }}>
                                {d.sla.v}
                                <small style={{ color: d.sla.dColor }}>{d.sla.d}</small>
                              </button>
                            </td>
                            <td className="tabular-nums">{d.res.v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">
                    {v.sla.breachCount} raste jashtë SLA · {v.sla.openBreaches} ende aktive
                  </h2>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <DcLink href="Raportet.dc.html" onClick={v.sla.onRaportet} className="tap auto-link">
                      Hap aktivet në Raportet →
                    </DcLink>
                    <button type="button" onClick={v.sla.onAll} className="tap auto-link">
                      Të gjitha rastet
                    </button>
                  </div>
                </div>
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.sla.breaches.map((b: Rec, bIdx: number) => (
                    <div key={bIdx} className="attn-row">
                      <span className="tabular-nums" style={{ width: '58px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                        {b.id}
                      </span>
                      <div className="attn-text">
                        <b>{b.title}</b>
                        <span className="attn-evidence">
                          {b.zone} · <span style={{ color: b.prioColor, fontWeight: 700 }}>{b.priority}</span> · {b.when}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: b.stateColor }}>{b.state}</span>
                      {b.live ? (
                        <DcLink
                          href="Raporti.dc.html"
                          onClick={b.onOpen}
                          className="tap staff-btn-secondary"
                          style={{ padding: '5px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Hap
                        </DcLink>
                      ) : null}
                      {b.archived ? (
                        <span className="auto-muted" style={{ width: '52px', textAlign: 'center' }}>
                          arkiv
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {v.sla.breachesPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.sla.breachesPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.sla.breachesPg.onPrev} className={`tap icon-btn ${v.sla.breachesPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.sla.breachesPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.sla.breachesPg.onNext} className={`tap icon-btn ${v.sla.breachesPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
          {v.isExplore ? (
            <>
              <button type="button" onClick={v.explore.onBack} className="tap auto-link" style={{ color: '#6B665F' }}>
                ← Kthehu
              </button>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', margin: '10px 0 12px' }}>
                {v.explore.crumbs.map((c: Rec, cIdx: number) => (
                  <Fragment key={cIdx}>
                    <button type="button" onClick={c.onClick} className="tap perf-crumb" style={{ color: c.color }}>
                      {c.label}
                    </button>
                    {c.notLast ? <span style={{ color: '#B8B2A9' }}>→</span> : null}
                  </Fragment>
                ))}
              </div>
              <div className="staff-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div className="perf-kpi-name" style={{ fontSize: '13px' }}>
                    {v.explore.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                    <span className="perf-kpi-val tabular-nums">{v.explore.value}</span>
                    {v.explore.hasDelta ? (
                      <span className="perf-kpi-delta tabular-nums" style={{ color: v.explore.dColor }}>
                        {v.explore.delta}
                      </span>
                    ) : null}
                    <span className="auto-muted tabular-nums">
                      n = {v.explore.n} · {v.explore.period}
                    </span>
                  </div>
                  <div className="auto-muted" style={{ marginTop: '4px' }}>
                    {v.explore.formula}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                  <DcLink
                    href="Harta.dc.html"
                    onClick={v.explore.onHarta}
                    className="tap staff-btn-secondary"
                    style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Hap në Harta
                  </DcLink>
                  <DcLink
                    href="Raportet.dc.html"
                    onClick={v.explore.onRaportet}
                    className="tap staff-btn-secondary"
                    style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Hap në Raportet
                  </DcLink>
                </div>
              </div>
              <div className="auto-section-head" style={{ marginTop: '16px' }}>
                <h2 className="auto-h2">{v.explore.levelLabel}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={v.explore.onToggleBad}
                    className={`tap staff-chip ${v.explore.onlyBadClass}`}
                    style={{ padding: '5px 11px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Vetëm rastet problematike ({v.explore.badCount})
                  </button>
                  {v.explore.showCasesBtn ? (
                    <button
                      type="button"
                      onClick={v.explore.onCasesNow}
                      className="tap staff-btn-secondary"
                      style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                    >
                      Shiko të {v.explore.n} rastet
                    </button>
                  ) : null}
                </div>
              </div>
              {v.explore.isGroups ? (
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.explore.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className="tap auto-row">
                      <span style={{ width: '150px', fontSize: '13px', fontWeight: 700 }}>{r.label}</span>
                      <span className="perf-bar-track" style={{ flex: 1 }}>
                        <span className="perf-bar-fill" style={{ display: 'block', width: r.w }} />
                      </span>
                      <span className="tabular-nums" style={{ width: '84px', textAlign: 'right', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800 }}>
                        {r.value}
                      </span>
                      <span className="tabular-nums" style={{ width: '70px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: r.dColor }}>
                        {r.delta}
                      </span>
                      <span className="tabular-nums auto-muted" style={{ width: '120px', textAlign: 'right' }}>
                        {r.n} raste · {r.bad} problematike
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A847C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  ))}
                  {v.explore.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.explore.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.explore.rowsPg.onPrev} className={`tap icon-btn ${v.explore.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.explore.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.explore.rowsPg.onNext} className={`tap icon-btn ${v.explore.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {v.explore.rowsNone ? <div className="attn-row auto-muted">Nuk ka raste në këtë nivel.</div> : null}
                </div>
              ) : null}
              {v.explore.isCases ? (
                <>
                  {v.explore.hasLive ? (
                    <div className="auto-muted" style={{ marginBottom: '8px' }}>
                      {v.explore.liveCount} nga këto raste janë aktualisht në SINJAL dhe hapen me një klik; të tjerat janë në arkivin historik.
                    </div>
                  ) : null}
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rasti</th>
                          <th>Titulli</th>
                          <th>Departamenti</th>
                          <th>Zona</th>
                          <th>Prioriteti</th>
                          <th>Dërguar</th>
                          <th>Zgjidhja</th>
                          <th>SLA</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {v.explore.cases.map((c: Rec, cIdx: number) => (
                          <tr key={cIdx} style={{ background: c.rowBg }}>
                            <td className="tabular-nums" style={{ fontWeight: 700 }}>
                              {c.id}
                            </td>
                            <td>
                              {c.title}
                              <span style={{ display: 'block', fontSize: '11px', color: '#8A847C' }}>{c.category}</span>
                            </td>
                            <td style={{ color: '#4A4640' }}>{c.dept}</td>
                            <td style={{ color: '#4A4640' }}>{c.zone}</td>
                            <td>{c.priority}</td>
                            <td className="tabular-nums" style={{ whiteSpace: 'nowrap', color: '#6B665F' }}>
                              {c.submitted}
                            </td>
                            <td className="tabular-nums">{c.resolution}</td>
                            <td style={{ fontWeight: 700, color: c.slaColor }}>{c.sla}</td>
                            <td>
                              {c.live ? (
                                <DcLink href="Raporti.dc.html" onClick={c.onOpen} className="tap auto-link">
                                  Hap
                                </DcLink>
                              ) : null}
                              {c.archived ? <span className="auto-muted">arkiv</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {v.explore.casesPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.explore.casesPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.explore.casesPg.onPrev} className={`tap icon-btn ${v.explore.casesPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.explore.casesPg.nums.map((pn: Rec, pnIdx: number) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.explore.casesPg.onNext} className={`tap icon-btn ${v.explore.casesPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {v.explore.casesNone ? <div className="attn-row auto-muted">Asnjë rast.</div> : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span className="auto-muted tabular-nums">{v.explore.caseTotal} raste</span>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </main>
      </div>
    </Shell>
  );
}
