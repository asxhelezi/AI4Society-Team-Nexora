import { Fragment } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Photo } from '../../components/Photo';
import { Shell } from '../../components/Shell';
import { useLogic } from '../../lib/dc';
import { AutomatizimetLogic, type Rec } from './AutomatizimetLogic';

const NO_PROPS = {};

/** Automatizimet: the automation operations center (overview, activity, each automation's review queue, overrides, audit log, rules and configuration). */
export function Automatizimet() {
  const v = useLogic(AutomatizimetLogic, NO_PROPS);

  return (
    <Shell active="automatizimet">
      <PageHeader
        crumb={
          v.notOverview ? (
            <button type="button" onClick={v.onOverview} className="tap page-crumb">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              Automatizimet
            </button>
          ) : null
        }
        title={v.title}
        context={v.lede}
        actions={
          <>
            <button
              type="button"
              onClick={v.onConfigure}
              className="tap staff-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 13px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>{' '}
              Konfiguro
            </button>
            <button
              type="button"
              onClick={v.onAudit}
              className="tap staff-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 13px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6h11M9 12h11M9 18h11" />
                <path d="M4 6h.01M4 12h.01M4 18h.01" />
              </svg>{' '}
              Shiko auditimin
            </button>
          </>
        }
      />
      <div className="app-pane r-subnav-split" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <nav className="auto-subnav" aria-label="Automatizimet">
          {v.nav.map((g, gIdx) => (
            <Fragment key={gIdx}>
              {g.hasTitle ? <div className="auto-subnav-title">{g.title}</div> : null}
              {g.items.map((it, itIdx) => (
                <button key={itIdx} type="button" onClick={it.onClick} className={`tap auto-nav-item ${it.onClass}`}>
                  {it.hasDot ? <span className="auto-dot" style={{ background: it.dot }} /> : null}
                  <span className="auto-nav-label">{it.label}</span>
                  {it.hasCount ? <span className={`auto-nav-count ${it.countClass} tabular-nums`}>{it.count}</span> : null}
                </button>
              ))}
            </Fragment>
          ))}
        </nav>
        <main className="app-pane app-pad" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '20px 28px 32px' }}>
          {v.isOverview ? (
            <>
              <section>
                <div className="auto-section-head">
                  <h2 className="auto-h2">Shëndeti i automatizimit</h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {v.periods.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={p.onClick}
                        className={`tap staff-chip ${p.onClass}`}
                        style={{ padding: '5px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  <div className="health-strip">
                    <div className="health-cell">
                      <div className="health-num tabular-nums">{v.health.auto}</div>
                      <div className="health-label">Veprime automatike</div>
                      <div className="health-sub">{v.health.periodLabel}</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-num tabular-nums" style={{ color: '#2E7D4F' }}>
                        {v.health.unchanged}
                      </div>
                      <div className="health-label">Pa ndërhyrje</div>
                      <div className="health-sub">mbetën të pandryshuara</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-num tabular-nums" style={{ color: '#B8860B' }}>
                        {v.health.overrides}
                      </div>
                      <div className="health-label">Ndërhyrje njerëzore</div>
                      <div className="health-sub">ndryshuar nga stafi</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-num tabular-nums">{v.health.review}</div>
                      <div className="health-label">Për shqyrtim</div>
                      <div className="health-sub">mbajtur për vëmendje njerëzore</div>
                    </div>
                    <div className="health-cell">
                      <div className="health-num tabular-nums" style={{ color: '#C23B31' }}>
                        {v.health.blocked}
                      </div>
                      <div className="health-label">Të bllokuara</div>
                      <div className="health-sub">nuk mund të vazhdonin me siguri</div>
                    </div>
                  </div>
                  <div className="health-foot">
                    <span className="tabular-nums" style={{ fontWeight: 700, color: '#1B1917', whiteSpace: 'nowrap' }}>
                      {v.health.unchangedPct}% pa ndërhyrje
                    </span>
                    <div className="health-meter" aria-hidden="true">
                      <span style={{ width: v.health.autoPct, background: '#2E7D4F' }} />
                      <span style={{ width: v.health.ovPct, background: '#B8860B' }} />
                    </div>
                    <span className="tabular-nums" style={{ whiteSpace: 'nowrap' }}>
                      {v.health.review} në shqyrtim · {v.health.blocked} të bllokuara
                    </span>
                  </div>
                </div>
              </section>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Cikli njeri–automatizim</h2>
                  <span className="auto-muted">Çdo ndërhyrje me arsye bëhet reagim për rregullat.</span>
                </div>
                <div className="staff-card loop-band" style={{ padding: '6px' }}>
                  {v.loop.map((s, sIdx) => (
                    <Fragment key={sIdx}>
                      <button type="button" onClick={s.onClick} className="tap loop-step">
                        <div className="loop-step-k">{s.k}</div>
                        <div className="loop-step-n tabular-nums">{s.n}</div>
                        <div className="loop-step-d">{s.d}</div>
                      </button>
                      {s.hasArrow ? (
                        <div className="loop-arrow" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </div>
                      ) : null}
                    </Fragment>
                  ))}
                </div>
              </section>
              <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '18px', alignItems: 'start' }}>
                <section style={{ minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Kërkojnë vëmendjen tuaj</h2>
                    <button type="button" onClick={v.goAttention} className="tap auto-link">
                      Të gjitha ({v.attentionCount})
                    </button>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.attention.map((a, aIdx) => (
                      <div key={aIdx} className="attn-row">
                        <span className="attn-sev" style={{ background: a.color }} />
                        <div className="attn-text">
                          <b>{a.text}</b>
                          <span className="attn-evidence">{a.evidence}</span>
                        </div>
                        <button
                          type="button"
                          onClick={a.onAction}
                          className="tap staff-btn-secondary"
                          style={{ flex: '0 0 auto', padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          {a.actionLabel}
                        </button>
                      </div>
                    ))}
                    {v.attentionNone ? (
                      <div className="attn-row">
                        <span className="attn-sev" style={{ background: '#2E7D4F' }} />
                        <div className="attn-text">Asgjë nuk kërkon ndërhyrje tani.</div>
                      </div>
                    ) : null}
                    <div className="attn-row" style={{ background: '#F5F2ED' }}>
                      <span className="attn-sev" style={{ background: '#2E7D4F' }} />
                      <div className="attn-text" style={{ fontSize: '13px', color: '#4A4640' }}>
                        {v.normalLine}
                      </div>
                    </div>
                  </div>
                </section>
                <section style={{ minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Statusi i automatizimeve</h2>
                    <span className="auto-muted">{v.health.periodLabel}</span>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.statusRows.map((s, sIdx) => (
                      <button key={sIdx} type="button" onClick={s.onClick} className="tap auto-row" style={{ padding: '9px 14px' }}>
                        <span className="auto-dot" style={{ background: s.statusColor }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{s.label}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#8A847C' }}>{s.autonomy}</span>
                        </span>
                        <span className="tabular-nums" style={{ width: '34px', textAlign: 'right', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800, color: '#1B1917' }}>
                          {s.count}
                        </span>
                        <span className="tabular-nums" style={{ width: '84px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: s.pendingColor }}>
                          {s.pendingLabel}
                        </span>
                        <span style={{ width: '52px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: s.statusColor }}>{s.statusLabel}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '18px', alignItems: 'start' }}>
                <section style={{ minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Aktiviteti i fundit</h2>
                    <button type="button" onClick={v.goActivity} className="tap auto-link">
                      I gjithë aktiviteti
                    </button>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.recentFeed.map((f, fIdx) => (
                      <button key={fIdx} type="button" onClick={f.onClick} className="tap feed-row">
                        <span className="feed-rail">
                          <span className="auto-dot" style={{ width: '9px', height: '9px', background: f.color }} />
                        </span>
                        <span className="feed-main">
                          <span className="feed-kind" style={{ color: f.color }}>
                            {f.kind} · {f.typeLabel}
                          </span>
                          <span className="feed-title" style={{ display: 'block', marginTop: '2px' }}>
                            {f.caseLabel} · {f.title}
                          </span>
                          <span className="feed-body" style={{ display: 'block' }}>
                            {f.body}
                          </span>
                          {f.hasReason ? (
                            <span className="feed-body" style={{ display: 'block' }}>
                              <b>Arsye:</b> "{f.reason}"
                            </span>
                          ) : null}
                          <span className="feed-meta" style={{ display: 'block' }}>
                            {f.actor}
                            {f.hasConf ? <>· {f.confLabel} besueshmëri</> : null}
                          </span>
                        </span>
                        <span className="feed-time tabular-nums">{f.time}</span>
                      </button>
                    ))}
                    {v.recentFeedPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.recentFeedPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.recentFeedPg.onPrev} className={`tap icon-btn ${v.recentFeedPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.recentFeedPg.nums.map((pn, pnIdx) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.recentFeedPg.onNext} className={`tap icon-btn ${v.recentFeedPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
                <section style={{ minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Automatizimi gjatë 7 ditëve</h2>
                    <span className="auto-muted tabular-nums">{v.trendTotals.total} veprime</span>
                  </div>
                  <div className="staff-card" style={{ padding: '16px 18px' }}>
                    <div className="trend7" role="img" aria-label="Veprime automatike dhe ndërhyrje njerëzore në 7 ditët e fundit">
                      {v.trend.map((t, tIdx) => (
                        <div key={tIdx} className="trend7-col">
                          <div className="trend7-num tabular-nums">{t.total}</div>
                          <div className="trend7-track" style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: '3px' }}>
                            <div className="trend7-stack" style={{ width: '18px' }}>
                              <div className="trend7-seg" style={{ height: t.hUnchanged, background: '#1B1917' }} />
                              <div className="trend7-seg" style={{ height: t.hHeld, background: '#D4A63A' }} />
                              <div className="trend7-seg" style={{ height: t.hBlocked, background: '#C23B31' }} />
                            </div>
                            <div className="trend7-stack" style={{ width: '6px' }}>
                              <div className="trend7-seg" style={{ height: t.hOverride, background: '#7A5A0B' }} />
                            </div>
                          </div>
                          <div className="trend7-label">{t.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: '12px' }}>
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: '#1B1917' }} />
                        Automatik
                      </span>
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: '#D4A63A' }} />
                        Për shqyrtim{' '}
                        <span className="tabular-nums" style={{ color: '#8A847C' }}>
                          {v.trendTotals.held}
                        </span>
                      </span>
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: '#C23B31' }} />
                        Të bllokuara{' '}
                        <span className="tabular-nums" style={{ color: '#8A847C' }}>
                          {v.trendTotals.blocked}
                        </span>
                      </span>
                      <span className="legend-item">
                        <span className="legend-swatch" style={{ background: '#7A5A0B' }} />
                        Ndërhyrje{' '}
                        <span className="tabular-nums" style={{ color: '#8A847C' }}>
                          {v.trendTotals.overrides}
                        </span>
                      </span>
                    </div>
                    <p className="auto-muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                      {v.trendNote}
                    </p>
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                      <div className="filter-group-title">Modeli i besueshmërisë</div>
                      {v.confLegend.map((c, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 0', fontFamily: "'Barlow',sans-serif", fontSize: '12px' }}>
                          <span className="auto-dot" style={{ background: c.color }} />
                          <span style={{ width: '62px', fontWeight: 700, color: '#1B1917' }}>{c.label}</span>
                          <span className="tabular-nums" style={{ width: '58px', color: '#6B665F' }}>
                            {c.range}
                          </span>
                          <span style={{ color: '#4A4640' }}>{c.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : null}
          {v.isActivity ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {v.activity.chips.map((c: Rec, cIdx: number) => (
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
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                {v.activity.rows.map((f: Rec, fIdx: number) => (
                  <button key={fIdx} type="button" onClick={f.onClick} className="tap feed-row">
                    <span className="feed-rail">
                      <span className="auto-dot" style={{ width: '9px', height: '9px', background: f.color }} />
                    </span>
                    <span className="feed-main">
                      <span className="feed-kind" style={{ color: f.color }}>
                        {f.kind} · {f.typeLabel}
                      </span>
                      <span className="feed-title" style={{ display: 'block', marginTop: '2px' }}>
                        {f.caseLabel} · {f.title}
                      </span>
                      <span className="feed-body" style={{ display: 'block' }}>
                        {f.body}
                      </span>
                      {f.hasReason ? (
                        <span className="feed-body" style={{ display: 'block' }}>
                          <b>Arsye:</b> "{f.reason}"
                        </span>
                      ) : null}
                      <span className="feed-meta" style={{ display: 'block' }}>
                        {f.actor}
                        {f.hasConf ? <>· {f.confLabel} besueshmëri</> : null}
                      </span>
                    </span>
                    <span className="feed-time tabular-nums">{f.time}</span>
                  </button>
                ))}
                {v.activity.rowsPg.show ? (
                  <div className="pager">
                    <span className="auto-muted tabular-nums">{v.activity.rowsPg.label}</span>
                    <div className="pager-btns">
                      <button type="button" onClick={v.activity.rowsPg.onPrev} className={`tap icon-btn ${v.activity.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      {v.activity.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                        <Fragment key={pnIdx}>
                          {pn.isNum ? (
                            <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                              {pn.n}
                            </button>
                          ) : null}
                          {pn.isGap ? <span className="pager-gap">…</span> : null}
                        </Fragment>
                      ))}
                      <button type="button" onClick={v.activity.rowsPg.onNext} className={`tap icon-btn ${v.activity.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <span className="auto-muted tabular-nums">{v.activity.total} veprime gjithsej</span>
              </div>
            </>
          ) : null}
          {v.isAttention ? (
            <>
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                <div className="attn-row" style={{ background: '#E1EEE5' }}>
                  <span className="attn-sev" style={{ background: '#2E7D4F' }} />
                  <div className="attn-text">
                    <b>Normal</b>
                    <span className="attn-evidence" style={{ color: '#1E5C3A' }}>
                      {v.normalLine}
                    </span>
                  </div>
                </div>
              </div>
              {v.hasRed ? (
                <section className="auto-section">
                  <div className="auto-section-head">
                    <h2 className="auto-h2" style={{ color: '#8E2A22' }}>
                      Kërkon veprim
                    </h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.attentionRed.map((a, aIdx) => (
                      <div key={aIdx} className="attn-row">
                        <span className="attn-sev" style={{ background: a.color }} />
                        <div className="attn-text">
                          <b>{a.text}</b>
                          <span className="attn-evidence">{a.evidence}</span>
                        </div>
                        <button
                          type="button"
                          onClick={a.onAction}
                          className="tap staff-btn-primary"
                          style={{ flex: '0 0 auto', padding: '7px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700 }}
                        >
                          {a.actionLabel}
                        </button>
                      </div>
                    ))}
                    {v.attentionRedPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.attentionRedPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.attentionRedPg.onPrev} className={`tap icon-btn ${v.attentionRedPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.attentionRedPg.nums.map((pn, pnIdx) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.attentionRedPg.onNext} className={`tap icon-btn ${v.attentionRedPg.nextClass}`} aria-label="Faqja tjetër">
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
              {v.hasAmber ? (
                <section className="auto-section">
                  <div className="auto-section-head">
                    <h2 className="auto-h2" style={{ color: '#7A5A0B' }}>
                      Kërkon shqyrtim
                    </h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.attentionAmber.map((a, aIdx) => (
                      <div key={aIdx} className="attn-row">
                        <span className="attn-sev" style={{ background: a.color }} />
                        <div className="attn-text">
                          <b>{a.text}</b>
                          <span className="attn-evidence">{a.evidence}</span>
                        </div>
                        <button
                          type="button"
                          onClick={a.onAction}
                          className="tap staff-btn-secondary"
                          style={{ flex: '0 0 auto', padding: '7px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          {a.actionLabel}
                        </button>
                      </div>
                    ))}
                    {v.attentionAmberPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.attentionAmberPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.attentionAmberPg.onPrev} className={`tap icon-btn ${v.attentionAmberPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.attentionAmberPg.nums.map((pn, pnIdx) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.attentionAmberPg.onNext} className={`tap icon-btn ${v.attentionAmberPg.nextClass}`} aria-label="Faqja tjetër">
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
              {v.hasPatterns ? (
                <section className="auto-section">
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Modele të zbuluara</h2>
                    <span className="auto-muted">Ndërhyrjet e përsëritura si reagim për automatizimin.</span>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.attentionPatterns.map((a, aIdx) => (
                      <div key={aIdx} className="attn-row">
                        <span className="attn-sev" style={{ background: '#B8860B' }} />
                        <div className="attn-text">
                          <b>{a.text}</b>
                          <span className="attn-evidence">{a.evidence}</span>
                        </div>
                        <button
                          type="button"
                          onClick={a.onAction}
                          className="tap staff-btn-secondary"
                          style={{ flex: '0 0 auto', padding: '7px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          {a.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Si funksionon cikli</h2>
                </div>
                <div className="staff-card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#4A4640' }}>
                    <span className="rb-token">Raporti i qytetarit</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token">Automatizimi i SINJAL</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token">Nëpunësi monitoron</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token">Ndërhyrje kur duhet</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token">Arsyeja regjistrohet</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token">Modelet grumbullohen</span>
                    <span style={{ color: '#B8B2A9' }}>→</span>
                    <span className="rb-token" style={{ background: '#1B1917', color: '#F5F2ED' }}>
                      Rregulli përmirësohet
                    </span>
                  </div>
                </div>
              </section>
            </>
          ) : null}
          {v.isRouting ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="stat-chip">
                  <span className="auto-dot" style={{ background: '#2E7D4F' }} />
                  <b className="tabular-nums">{v.routing.stats.high}</b> besueshmëri e lartë
                </span>
                <span className="stat-chip">
                  <span className="auto-dot" style={{ background: '#B8860B' }} />
                  <b className="tabular-nums">{v.routing.stats.medium}</b> mesatare
                </span>
                <span className="stat-chip">
                  <span className="auto-dot" style={{ background: '#C23B31' }} />
                  <b className="tabular-nums">{v.routing.stats.low}</b> e ulët → pranim
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.routing.stats.overrides}</b> ndërhyrje njerëzore
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {v.routing.filters.map((c: Rec, cIdx: number) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={c.onClick}
                    className={`tap staff-chip ${c.onClass}`}
                    style={{ padding: '5px 11px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    {c.label}{' '}
                    <span className="tabular-nums" style={{ opacity: 0.7 }}>
                      {c.n}
                    </span>
                  </button>
                ))}
              </div>
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="staff-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderBottom: '1px solid #E4DFD6' }}>
                    <span className="staff-th" style={{ padding: 0, width: '118px' }}>
                      Raporti · kategoria
                    </span>
                    <span className="staff-th" style={{ padding: 0, flex: 1 }}>
                      Caktuar te
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '92px' }}>
                      Besueshmëria
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '150px' }}>
                      Statusi
                    </span>
                  </div>
                  {v.routing.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className={`tap auto-row ${r.onClass}`}>
                      <span style={{ width: '118px', flex: '0 0 auto', minWidth: 0 }}>
                        <span className="tabular-nums" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4A4640' }}>
                          {r.id}
                        </span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#8A847C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.category}</span>
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.target}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#8A847C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team}</span>
                      </span>
                      <span className="auto-conf" style={{ width: '92px', flex: '0 0 auto' }}>
                        <span className="auto-conf-track">
                          <span className="auto-conf-fill" style={{ display: 'block', width: r.confWidth, background: r.confColor }} />
                        </span>
                        <span className="auto-conf-num tabular-nums" style={{ color: r.confColor }}>
                          {r.conf}
                        </span>
                      </span>
                      <span style={{ width: '150px', flex: '0 0 auto' }}>
                        <span className="status-pill" style={{ background: r.stateBg, color: r.stateInk }}>
                          <span className="status-dot" style={{ background: r.stateDot }} />
                          {r.stateLabel}
                        </span>
                      </span>
                    </button>
                  ))}
                  {v.routing.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.routing.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.routing.rowsPg.onPrev} className={`tap icon-btn ${v.routing.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.routing.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.routing.rowsPg.onNext} className={`tap icon-btn ${v.routing.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {v.routing.empty ? (
                    <div style={{ padding: '22px', textAlign: 'center' }} className="auto-muted">
                      Asnjë raport në këtë filtër.
                    </div>
                  ) : null}
                </div>
                <aside className="staff-card auto-panel" style={{ width: '340px', flex: '0 0 auto', position: 'sticky', top: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.routing.detail.displayId}
                    </span>
                    <DcLink href="Raporti.dc.html" onClick={v.routing.detail.onOpenCase} className="tap auto-link">
                      Hap rastin →
                    </DcLink>
                  </div>
                  <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1B1917', lineHeight: 1.35 }}>{v.routing.detail.title}</div>
                  <div className="auto-h2" style={{ marginTop: '14px', fontSize: '13px' }}>
                    Pse u caktua këtu?
                  </div>
                  <div className="auto-callout" style={{ marginTop: '8px', background: '#F5F2ED' }}>
                    <div className="auto-form-label" style={{ marginBottom: '3px' }}>
                      Vendimi automatik
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{v.routing.detail.target}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <span className="auto-conf-track" style={{ width: '120px' }}>
                        <span className="auto-conf-fill" style={{ display: 'block', width: v.routing.detail.confWidth, background: v.routing.detail.confColor }} />
                      </span>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: v.routing.detail.confColor }}>
                        {v.routing.detail.conf}%
                      </span>
                      <span className="status-pill" style={{ background: v.routing.detail.tierBg, color: v.routing.detail.tierInk, padding: '2px 8px', fontSize: '11px' }}>
                        {v.routing.detail.tierLabel}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B665F' }}>
                      {v.routing.detail.tierNote} · {v.routing.detail.time}
                    </div>
                  </div>
                  <div className="auto-form-label" style={{ marginTop: '14px' }}>
                    Bazuar në
                  </div>
                  {v.routing.detail.factors.map((f: Rec, fIdx: number) => (
                    <div key={fIdx} className="auto-kv">
                      <span className="auto-kv-k">{f.k}</span>
                      <span className="auto-kv-v">{f.v}</span>
                    </div>
                  ))}
                  {v.routing.detail.hasOverride ? (
                    <div className="auto-callout is-human">
                      <div className="auto-callout-title">Ndërhyrje njerëzore</div> Nga: {v.routing.detail.override.from}
                      <br />
                      Në: {v.routing.detail.override.to}
                      <br />
                      Nga: {v.routing.detail.override.by} · {v.routing.detail.override.time}
                      <br />
                      Arsye: "{v.routing.detail.override.reason}"
                    </div>
                  ) : null}
                  {v.routing.detail.canAssignIntake ? (
                    <div className="auto-callout is-risk">
                      <div className="auto-callout-title">Pa vendim automatik</div>
                      Besueshmëria nuk mjafton — zgjidhni departamentin manualisht.
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    {v.routing.detail.canConfirm ? (
                      <button
                        type="button"
                        onClick={v.routing.detail.onConfirm}
                        className="tap staff-btn-primary"
                        style={{ flex: 1, padding: '9px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                      >
                        Konfirmo routing-un
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={v.routing.detail.onOpenReassign}
                      className="tap staff-btn-secondary"
                      style={{ flex: 1, padding: '9px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                    >
                      Rishpërndaj
                    </button>
                  </div>
                  {v.routing.detail.reassignOpen ? (
                    <div className="auto-form">
                      <div className="auto-form-label">Nga {v.routing.detail.currentDept} në</div>
                      <select value={v.routing.detail.reassignDept} onChange={v.routing.detail.onReassignDept} className="staff-select" style={{ width: '100%', padding: '7px 9px' }}>
                        {v.routing.detail.deptOptions.map((o: Rec, oIdx: number) => (
                          <option key={oIdx} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className="auto-form-label" style={{ marginTop: '10px' }}>
                        Arsye (e detyrueshme)
                      </div>
                      <input
                        type="text"
                        value={v.routing.detail.reassignReason}
                        onChange={v.routing.detail.onReassignReason}
                        placeholder="p.sh. Problemi lidhet me shtyllën fizike."
                        className="staff-input"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={v.routing.detail.onSaveReassign}
                          className={`tap staff-btn-primary ${v.routing.detail.saveDisabledClass}`}
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Ruaj ndërhyrjen
                        </button>
                        <button
                          type="button"
                          onClick={v.routing.detail.onCancelReassign}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Rregullat e routing-ut</h2>
                  <button type="button" onClick={v.routing.onManageRules} className="tap auto-link">
                    Menaxho rregullat
                  </button>
                </div>
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.routing.rulesPreview.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className="tap auto-row">
                      <span className="tabular-nums" style={{ width: '40px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '15px', fontWeight: 800, color: '#8A847C' }}>
                        #{r.no}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#4A4640' }}>
                        <b style={{ color: '#8A847C', fontSize: '11px', letterSpacing: '.05em' }}>NËSE</b> {r.when}
                      </span>
                      <span style={{ flex: 1.2, minWidth: 0, fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                        <b style={{ color: '#2E7D4F', fontSize: '11px', letterSpacing: '.05em' }}>ATËHERË</b> {r.then}
                      </span>
                      <span style={{ width: '64px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: r.activeColor }}>{r.activeLabel}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
          {v.isPriority ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.priority.stats.raised}</b> ngritur mbi bazën e kategorisë
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.priority.stats.lowered}</b> ulur nën bazën
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#C23B31' }}>
                    {v.priority.stats.urgent}
                  </b>{' '}
                  urgjente të hapura
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#B8860B' }}>
                    {v.priority.stats.changed}
                  </b>{' '}
                  ndryshuar nga stafi
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {v.priority.filters.map((c: Rec, cIdx: number) => (
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
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="staff-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderBottom: '1px solid #E4DFD6' }}>
                    <span className="staff-th" style={{ padding: 0, width: '64px' }}>
                      Raporti
                    </span>
                    <span className="staff-th" style={{ padding: 0, flex: 1 }}>
                      Titulli
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '74px' }}>
                      Automatik
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '74px' }}>
                      Aktual
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '128px' }}>
                      Burimi
                    </span>
                  </div>
                  {v.priority.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className={`tap auto-row ${r.onClass}`}>
                      <span className="auto-cell-id tabular-nums">{r.id}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                      <span style={{ width: '74px', flex: '0 0 auto', fontSize: '12px', fontWeight: 700, color: r.autoColor }}>{r.auto}</span>
                      <span style={{ width: '74px', flex: '0 0 auto', fontSize: '12px', fontWeight: 700, color: r.currentColor }}>{r.current}</span>
                      <span style={{ width: '128px', flex: '0 0 auto', fontSize: '12px', fontWeight: 600, color: r.changedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.changedLabel}
                      </span>
                    </button>
                  ))}
                  {v.priority.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.priority.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.priority.rowsPg.onPrev} className={`tap icon-btn ${v.priority.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.priority.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.priority.rowsPg.onNext} className={`tap icon-btn ${v.priority.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <aside className="staff-card auto-panel" style={{ width: '330px', flex: '0 0 auto', position: 'sticky', top: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.priority.detail.displayId}
                    </span>
                    <DcLink href="Raporti.dc.html" onClick={v.priority.detail.onOpenCase} className="tap auto-link">
                      Hap rastin →
                    </DcLink>
                  </div>
                  <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1B1917', lineHeight: 1.35 }}>{v.priority.detail.title}</div>
                  <div className="auto-callout" style={{ background: '#F5F2ED' }}>
                    <div className="auto-form-label" style={{ marginBottom: '3px' }}>
                      Prioritet automatik
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '24px', fontWeight: 800, letterSpacing: '.02em', color: v.priority.detail.autoColor }}>
                      {v.priority.detail.auto}
                    </div>
                    <div className="auto-form-label" style={{ margin: '10px 0 4px' }}>
                      Arsyet
                    </div>
                    {v.priority.detail.reasons.map((x: Rec, xIdx: number) => (
                      <div key={xIdx} style={{ display: 'flex', gap: '7px', padding: '2px 0', fontSize: '13px', color: '#1B1917' }}>
                        <span style={{ color: '#8A847C' }}>•</span>
                        {x.t}
                      </div>
                    ))}
                  </div>
                  <div className="auto-kv" style={{ marginTop: '10px', borderTop: 0 }}>
                    <span className="auto-kv-k">Prioriteti aktual</span>
                    <span className="auto-kv-v" style={{ color: v.priority.detail.currentColor }}>
                      {v.priority.detail.current}
                    </span>
                  </div>
                  <div className="auto-form-label" style={{ marginTop: '12px' }}>
                    Historiku
                  </div>
                  {v.priority.detail.history.map((h: Rec, hIdx: number) => (
                    <div key={hIdx} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderTop: '1px solid #EFEAE2', fontFamily: "'Barlow',sans-serif" }}>
                      <span className="auto-dot" style={{ marginTop: '5px', background: h.color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{h.label}</div>
                        <div style={{ fontSize: '12px', color: '#6B665F' }}>
                          {h.who} · {h.time}
                        </div>
                        {h.hasReason ? <div style={{ fontSize: '12px', color: '#4A4640', marginTop: '2px' }}>Arsye: "{h.reason}"</div> : null}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={v.priority.detail.onOpen}
                    className="tap staff-btn-secondary"
                    style={{ width: '100%', marginTop: '12px', padding: '9px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                  >
                    Ndrysho prioritetin
                  </button>
                  {v.priority.detail.open ? (
                    <div className="auto-form">
                      <div className="auto-form-label">Prioriteti i ri</div>
                      <select value={v.priority.detail.draft} onChange={v.priority.detail.onDraft} className="staff-select" style={{ width: '100%', padding: '7px 9px' }}>
                        {v.priority.detail.options.map((o: Rec, oIdx: number) => (
                          <option key={oIdx} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className="auto-form-label" style={{ marginTop: '10px' }}>
                        Arsye (e detyrueshme)
                      </div>
                      <input
                        type="text"
                        value={v.priority.detail.reason}
                        onChange={v.priority.detail.onReason}
                        placeholder="p.sh. Rreziku nuk konfirmohet."
                        className="staff-input"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={v.priority.detail.onSave}
                          className={`tap staff-btn-primary ${v.priority.detail.saveDisabledClass}`}
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Ruaj ndërhyrjen
                        </button>
                        <button
                          type="button"
                          onClick={v.priority.detail.onCancel}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
          {v.isDuplicates ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#B8860B' }}>
                    {v.dup.pendingCount}
                  </b>{' '}
                  dublikate të mundshme
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#2E7D4F' }}>
                    {v.dup.autoCount}
                  </b>{' '}
                  të lidhura automatikisht
                </span>
                <span className="stat-chip">
                  Pragu i lidhjes automatike <b className="tabular-nums">{v.dup.threshold}%</b> · sinjalizimi nga <b className="tabular-nums">{v.dup.flagThreshold}%</b>
                </span>
              </div>
              {v.dup.pending.map((d: Rec, dIdx: number) => (
                <div key={dIdx} className="staff-card" style={{ padding: '14px 16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="sim-ring">
                      <svg width="54" height="54" viewBox="0 0 54 54">
                        <circle cx="27" cy="27" r="22" fill="none" stroke="#E4DFD6" strokeWidth="5" />
                        <circle cx="27" cy="27" r="22" fill="none" stroke={d.ringColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={d.dash} transform="rotate(-90 27 27)" />
                      </svg>
                      <span className="tabular-nums">{d.similarity}</span>
                    </div>
                    <div className="dup-side">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <b className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                          {d.a.id}
                        </b>
                        <DcLink href="Raporti.dc.html" onClick={d.a.onOpen} className="tap auto-link">
                          Hap
                        </DcLink>
                      </div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917', marginTop: '2px' }}>{d.a.title}</div>
                      <div className="auto-muted" style={{ marginTop: '2px' }}>
                        {d.a.meta} · {d.a.status}
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A847C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                      <path d="M7 7h11l-3-3M17 17H6l3 3" />
                    </svg>
                    <div className="dup-side">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <b className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                          {d.b.id}
                        </b>
                        <DcLink href="Raporti.dc.html" onClick={d.b.onOpen} className="tap auto-link">
                          Hap
                        </DcLink>
                      </div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917', marginTop: '2px' }}>{d.b.title}</div>
                      <div className="auto-muted" style={{ marginTop: '2px' }}>
                        {d.b.meta} · {d.b.status}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {d.factors.map((f: Rec, fIdx: number) => (
                      <span key={fIdx} className="zone-chip" style={{ gap: '6px' }}>
                        <span className="auto-dot" style={{ width: '6px', height: '6px', background: f.color }} />
                        {f.k}: {f.v}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="button" onClick={d.onLink} className="tap staff-btn-primary" style={{ padding: '8px 16px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}>
                      Lidh
                    </button>
                    <button
                      type="button"
                      onClick={d.onSeparate}
                      className="tap staff-btn-secondary"
                      style={{ padding: '8px 16px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                    >
                      Mbaji të ndara
                    </button>
                  </div>
                  {d.formOpen ? (
                    <div className="auto-form">
                      <div className="auto-form-label">{d.formTitle} — arsye (e detyrueshme)</div>
                      <input
                        type="text"
                        value={d.reason}
                        onChange={d.onReason}
                        placeholder="p.sh. Dy probleme të ndryshme në të njëjtën zonë."
                        className="staff-input"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={d.onSubmit}
                          className={`tap staff-btn-primary ${d.saveDisabledClass}`}
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Ruaj vendimin
                        </button>
                        <button
                          type="button"
                          onClick={d.onCancel}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {v.dup.pendingPg.show ? (
                <div className="pager pager-bare">
                  <span className="auto-muted tabular-nums">{v.dup.pendingPg.label}</span>
                  <div className="pager-btns">
                    <button type="button" onClick={v.dup.pendingPg.onPrev} className={`tap icon-btn ${v.dup.pendingPg.prevClass}`} aria-label="Faqja e mëparshme">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </button>
                    {v.dup.pendingPg.nums.map((pn: Rec, pnIdx: number) => (
                      <Fragment key={pnIdx}>
                        {pn.isNum ? (
                          <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                            {pn.n}
                          </button>
                        ) : null}
                        {pn.isGap ? <span className="pager-gap">…</span> : null}
                      </Fragment>
                    ))}
                    <button type="button" onClick={v.dup.pendingPg.onNext} className={`tap icon-btn ${v.dup.pendingPg.nextClass}`} aria-label="Faqja tjetër">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : null}
              {v.dup.pendingNone ? (
                <div className="staff-card auto-muted" style={{ padding: '18px', textAlign: 'center' }}>
                  Asnjë dublikatë e mundshme në pritje.
                </div>
              ) : null}
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Të lidhura automatikisht</h2>
                  <span className="auto-muted">Mbi pragun e ngjashmërisë — me mundësi zhbërjeje.</span>
                </div>
                {v.dup.auto.map((d: Rec, dIdx: number) => (
                  <div key={dIdx} className="staff-card" style={{ padding: '12px 16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="auto-dot" style={{ background: '#2E7D4F', width: '9px', height: '9px' }} />
                      <div style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif" }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                          {d.a.id} u lidh me {d.b.id} · {d.similarity}
                        </div>
                        <div className="auto-muted" style={{ marginTop: '2px' }}>
                          {d.autoText}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={d.onUndo}
                        className="tap staff-btn-secondary"
                        style={{ padding: '7px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                      >
                        Zhbëj
                      </button>
                    </div>
                    {d.formOpen ? (
                      <div className="auto-form">
                        <div className="auto-form-label">{d.formTitle} — arsye (e detyrueshme)</div>
                        <input
                          type="text"
                          value={d.reason}
                          onChange={d.onReason}
                          placeholder="p.sh. Dy probleme të ndryshme në të njëjtën zonë."
                          className="staff-input"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={d.onSubmit}
                            className={`tap staff-btn-primary ${d.saveDisabledClass}`}
                            style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                          >
                            Zhbëj lidhjen
                          </button>
                          <button
                            type="button"
                            onClick={d.onCancel}
                            className="tap staff-btn-secondary"
                            style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                          >
                            Anulo
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>
              <section className="auto-section">
                <div className="auto-section-head">
                  <h2 className="auto-h2">Vendime të regjistruara</h2>
                </div>
                <div className="staff-card" style={{ overflow: 'hidden' }}>
                  {v.dup.decided.map((d: Rec, dIdx: number) => (
                    <div key={dIdx} className="attn-row">
                      <span className="attn-sev" style={{ background: '#B8860B' }} />
                      <div className="attn-text">
                        <b>
                          {d.a.id} ↔ {d.b.id} · {d.stateLabel}
                        </b>
                        <span className="attn-evidence">{d.decisionText}</span>
                      </div>
                      <span className="tabular-nums auto-muted">{d.similarity}</span>
                    </div>
                  ))}
                  {v.dup.decidedPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.dup.decidedPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.dup.decidedPg.onPrev} className={`tap icon-btn ${v.dup.decidedPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.dup.decidedPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.dup.decidedPg.onNext} className={`tap icon-btn ${v.dup.decidedPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {v.dup.decidedNone ? <div className="attn-row auto-muted">Asnjë vendim ende.</div> : null}
                </div>
              </section>
            </>
          ) : null}
          {v.isModeration ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', marginBottom: '14px' }}>
                {v.mod.types.map((t: Rec, tIdx: number) => (
                  <div key={tIdx} className="staff-card" style={{ padding: '10px 12px', borderRadius: '12px' }}>
                    <div className="tabular-nums" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800, color: t.nColor }}>
                      {t.n}
                    </div>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#4A4640', lineHeight: 1.3 }}>{t.label}</div>
                  </div>
                ))}
              </div>
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="staff-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderBottom: '1px solid #E4DFD6' }}>
                    <span className="staff-th" style={{ padding: 0, width: '64px' }}>
                      Raporti
                    </span>
                    <span className="staff-th" style={{ padding: 0, flex: 1 }}>
                      Sinjalizimi
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '72px' }}>
                      Besueshm.
                    </span>
                    <span className="staff-th" style={{ padding: 0, width: '150px' }}>
                      Statusi
                    </span>
                  </div>
                  {v.mod.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className={`tap auto-row ${r.onClass}`}>
                      <span className="auto-cell-id tabular-nums">{r.id}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{r.type}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#8A847C' }}>{r.time}</span>
                      </span>
                      <span className="tabular-nums" style={{ width: '72px', fontSize: '12px', fontWeight: 700, color: r.confColor }}>
                        {r.conf}
                      </span>
                      <span style={{ width: '150px', fontSize: '12px', fontWeight: 700, color: r.stateColor }}>{r.stateLabel}</span>
                    </button>
                  ))}
                  {v.mod.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.mod.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.mod.rowsPg.onPrev} className={`tap icon-btn ${v.mod.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.mod.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.mod.rowsPg.onNext} className={`tap icon-btn ${v.mod.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <aside className="staff-card auto-panel" style={{ width: '380px', flex: '0 0 auto', position: 'sticky', top: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.mod.detail.displayId}
                    </span>
                    <DcLink href="Raporti.dc.html" onClick={v.mod.detail.onOpenCase} className="tap auto-link">
                      Hap rastin →
                    </DcLink>
                  </div>
                  <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1B1917' }}>{v.mod.detail.title}</div>
                  <div className="auto-kv" style={{ marginTop: '10px', borderTop: 0 }}>
                    <span className="auto-kv-k">Sinjalizimi</span>
                    <span className="auto-kv-v">{v.mod.detail.flag}</span>
                  </div>
                  <div className="auto-kv">
                    <span className="auto-kv-k">Besueshmëria</span>
                    <span className="auto-kv-v tabular-nums" style={{ color: v.mod.detail.confColor }}>
                      {v.mod.detail.conf}
                    </span>
                  </div>
                  <div className="auto-kv">
                    <span className="auto-kv-k">Zbuluar</span>
                    <span className="auto-kv-v">{v.mod.detail.time}</span>
                  </div>
                  <div className="auto-form-label" style={{ marginTop: '12px' }}>
                    Përmbajtja e zbuluar
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#F5F2ED',
                      borderLeft: '3px solid #C23B31',
                      fontFamily: "'Barlow',sans-serif",
                      fontSize: '13px',
                      fontStyle: 'italic',
                      color: '#4A4640',
                      lineHeight: 1.5,
                    }}
                  >
                    {v.mod.detail.excerpt}
                  </div>
                  <div className="auto-callout is-risk">
                    <div className="auto-callout-title">Veprimi automatik</div>
                    {v.mod.detail.autoAction}
                  </div>
                  {v.mod.detail.decided ? (
                    <div className="auto-callout is-human">
                      <div className="auto-callout-title">{v.mod.detail.decisionLabel}</div> {v.mod.detail.decisionMeta}
                      <br />
                      Arsye: "{v.mod.detail.decisionReason}"{' '}
                      {v.mod.detail.hasEdited ? (
                        <>
                          <br />
                          Versioni i redaktuar: "{v.mod.detail.decisionEdited}"
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {v.mod.detail.undecided ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                      {v.mod.detail.actions.map((a: Rec, aIdx: number) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={a.onClick}
                          className={`tap staff-btn-secondary ${a.onClass}`}
                          style={{ flex: 1, padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {v.mod.detail.formOpen ? (
                    <div className="auto-form">
                      <div className="auto-muted" style={{ marginBottom: '8px', lineHeight: 1.45 }}>
                        {v.mod.detail.formHint}
                      </div>
                      {v.mod.detail.isEdit ? (
                        <>
                          <div className="auto-form-label">Përmbajtja e redaktuar</div>
                          <textarea value={v.mod.detail.edit} onChange={v.mod.detail.onEdit} className="auto-textarea" style={{ minHeight: '80px' }} />
                        </>
                      ) : null}
                      {v.mod.detail.needsReason ? (
                        <>
                          <div className="auto-form-label">Arsye (e detyrueshme)</div>
                          <input
                            type="text"
                            value={v.mod.detail.reason}
                            onChange={v.mod.detail.onReason}
                            placeholder="p.sh. Fals pozitiv."
                            className="staff-input"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                          />
                        </>
                      ) : null}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={v.mod.detail.onSubmit}
                          className={`tap staff-btn-primary ${v.mod.detail.saveDisabledClass}`}
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Ruaj vendimin
                        </button>
                        <button
                          type="button"
                          onClick={v.mod.detail.onCancel}
                          className="tap staff-btn-secondary"
                          style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
          {v.isMissing ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="auto-muted" style={{ marginRight: '4px' }}>
                  Informacion i detyrueshëm:
                </span>
                {v.miss.requiredOn.map((q: Rec, qIdx: number) => (
                  <span key={qIdx} className="zone-chip" style={{ gap: '6px' }}>
                    <span className="auto-dot" style={{ width: '6px', height: '6px', background: '#2E7D4F' }} />
                    {q.label}
                  </span>
                ))}
              </div>
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="staff-card" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  {v.miss.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className={`tap auto-row ${r.onClass}`} style={{ alignItems: 'flex-start' }}>
                      <span className="auto-cell-id tabular-nums" style={{ paddingTop: '1px' }}>
                        {r.id}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{r.title}</span>
                        <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: '#4A4640' }}>{r.problem}</span>
                      </span>
                      <span style={{ width: '170px', flex: '0 0 auto', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: r.stateColor }}>{r.stateLabel}</span>
                    </button>
                  ))}
                  {v.miss.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.miss.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.miss.rowsPg.onPrev} className={`tap icon-btn ${v.miss.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.miss.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.miss.rowsPg.onNext} className={`tap icon-btn ${v.miss.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <aside className="staff-card auto-panel" style={{ width: '380px', flex: '0 0 auto', position: 'sticky', top: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.miss.detail.displayId}
                    </span>
                    <DcLink href="Raporti.dc.html" onClick={v.miss.detail.onOpenCase} className="tap auto-link">
                      Hap rastin →
                    </DcLink>
                  </div>
                  <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1B1917' }}>{v.miss.detail.title}</div>
                  <div className="auto-callout is-human" style={{ display: 'flex', gap: '9px' }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B8860B"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flex: '0 0 auto', marginTop: '1px' }}
                    >
                      <path d="M12 3l9.5 17h-19z" />
                      <path d="M12 10v4M12 17.5h.01" />
                    </svg>
                    <div style={{ fontWeight: 700, color: '#1B1917' }}>{v.miss.detail.problem}</div>
                  </div>
                  <div className="auto-form-label" style={{ marginTop: '14px' }}>
                    Çfarë mungon
                  </div>
                  {v.miss.detail.fields.map((f: Rec, fIdx: number) => (
                    <div key={fIdx} className="check-line">
                      <span className="check-ico" style={{ background: f.bg, color: f.color, fontSize: '11px', fontWeight: 800 }}>
                        {f.mark}
                      </span>
                      <span>
                        {f.label} <span className="auto-muted">· {f.required}</span>
                      </span>
                      <span className="check-state" style={{ color: f.color }}>
                        {f.state}
                      </span>
                    </div>
                  ))}
                  <div className="auto-form-label" style={{ marginTop: '14px' }}>
                    Dërguar automatikisht · {v.miss.detail.sentAt}
                  </div>
                  {v.miss.detail.editOpen ? <textarea value={v.miss.detail.draft} onChange={v.miss.detail.onDraft} className="auto-textarea" style={{ minHeight: '74px' }} /> : null}
                  {v.miss.detail.notEditOpen ? (
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#F5F2ED', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', lineHeight: 1.5 }}>
                      "{v.miss.detail.message}"
                    </div>
                  ) : null}
                  <div className="auto-kv" style={{ marginTop: '8px', borderTop: 0 }}>
                    <span className="auto-kv-k">Statusi</span>
                    <span className="auto-kv-v" style={{ color: v.miss.detail.stateColor }}>
                      {v.miss.detail.stateLabel}
                    </span>
                  </div>
                  {v.miss.detail.answered ? (
                    <div className="auto-callout is-ok">
                      <div className="auto-callout-title">Përgjigjja e qytetarit · {v.miss.detail.answeredAt}</div>"{v.miss.detail.answer}"
                    </div>
                  ) : null}
                  {v.miss.detail.hasLastAction ? (
                    <div className="auto-muted" style={{ marginTop: '8px' }}>
                      {v.miss.detail.lastAction}
                    </div>
                  ) : null}
                  {v.miss.detail.actionable ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                      {v.miss.detail.notEditOpen ? (
                        <button
                          type="button"
                          onClick={v.miss.detail.onEdit}
                          className="tap staff-btn-secondary"
                          style={{ padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Ndrysho kërkesën
                        </button>
                      ) : null}
                      {v.miss.detail.editOpen ? (
                        <button
                          type="button"
                          onClick={v.miss.detail.onCancelEdit}
                          className="tap staff-btn-secondary"
                          style={{ padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Anulo ndryshimin
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={v.miss.detail.onSend}
                        className="tap staff-btn-primary"
                        style={{ padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                      >
                        Dërgo kërkesën
                      </button>
                      <button
                        type="button"
                        onClick={v.miss.detail.onProceed}
                        className="tap staff-btn-secondary"
                        style={{ padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                      >
                        Vazhdo pa informacion
                      </button>
                      <button
                        type="button"
                        onClick={v.miss.detail.onEscalate}
                        className="tap staff-btn-secondary"
                        style={{ padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                      >
                        Përshkallëzo te pranimi
                      </button>
                    </div>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
          {v.isSla ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#C23B31' }}>
                    {v.sla.breachOpen}
                  </b>{' '}
                  me SLA të shkelur, të përshkallëzuara
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#B8860B' }}>
                    {v.sla.warnOpen}
                  </b>{' '}
                  {'njoftime për < 25% kohë të mbetur'}
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.sla.unassignedOpen}</b> {'pa përgjegjës > 24 orë'}
                </span>
              </div>
              <div className="auto-section-head">
                <h2 className="auto-h2">Rregullat aktive</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                {v.sla.rules.map((r: Rec, rIdx: number) => (
                  <div key={rIdx} className="staff-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '15px', fontWeight: 800, letterSpacing: '.04em', color: '#8A847C' }}>RREGULLI {r.no}</span>
                      <button type="button" onClick={r.onToggle} className={`tap switch ${r.onClass}`} aria-label="Aktivizo / çaktivizo" />
                    </div>
                    <div className="rb-line" style={{ borderTop: 0, paddingBottom: '4px' }}>
                      <span className="rb-key" style={{ width: '48px' }}>
                        NËSE
                      </span>
                      <span className="rb-val">{r.condition}</span>
                    </div>
                    <div className="rb-line" style={{ paddingTop: '6px' }}>
                      <span className="rb-key is-then" style={{ width: '48px' }}>
                        →
                      </span>
                      <span className="rb-val" style={{ fontWeight: 700 }}>
                        {r.action}
                      </span>
                    </div>
                    <div className="auto-muted tabular-nums" style={{ marginTop: '6px' }}>
                      {r.label} · {r.count} ekzekutime
                    </div>
                  </div>
                ))}
              </div>
              <div className="auto-section" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}>
                <section style={{ minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Automatizimi SLA në kohë reale</h2>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.sla.feed.map((f: Rec, fIdx: number) => (
                      <div key={fIdx} className="attn-row" style={{ alignItems: 'flex-start' }}>
                        <span className="attn-sev" style={{ background: f.color }} />
                        <div className="attn-text">
                          <b className="tabular-nums">
                            {f.id} · {f.title}
                          </b>
                          <span className="attn-evidence" style={{ color: '#4A4640' }}>
                            {f.result}
                          </span>
                          <span className="attn-evidence">
                            {f.who} · {f.time} · tani: {f.status} · SLA {f.sla}
                          </span>
                        </div>
                        <DcLink
                          href="Raporti.dc.html"
                          onClick={f.onOpen}
                          className="tap staff-btn-secondary"
                          style={{ flex: '0 0 auto', padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Hap rastin
                        </DcLink>
                      </div>
                    ))}
                    {v.sla.feedPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.sla.feedPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.sla.feedPg.onPrev} className={`tap icon-btn ${v.sla.feedPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.sla.feedPg.nums.map((pn: Rec, pnIdx: number) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.sla.feedPg.onNext} className={`tap icon-btn ${v.sla.feedPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
                <section>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Objektivat standarde</h2>
                  </div>
                  <div className="staff-card" style={{ padding: '8px 16px' }}>
                    {v.sla.targets.map((t: Rec, tIdx: number) => (
                      <div key={tIdx} className="auto-kv">
                        <span className="auto-kv-k" style={{ fontWeight: 700, color: t.color }}>
                          {t.priority}
                        </span>
                        <span className="auto-kv-v tabular-nums">{t.hours}</span>
                      </div>
                    ))}
                  </div>
                  <p className="auto-muted" style={{ margin: '8px 2px 0', lineHeight: 1.45 }}>
                    Afati i secilit rast vendoset në momentin e caktimit dhe mund të ndryshojë sipas rregullit të kategorisë.
                  </p>
                </section>
              </div>
            </>
          ) : null}
          {v.isVerification ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#2E7D4F' }}>
                    {v.ver.counts.pass}
                  </b>{' '}
                  kaluan
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums" style={{ color: '#B8860B' }}>
                    {v.ver.counts.review}
                  </b>{' '}
                  kërkojnë shqyrtim
                </span>
                <span className="stat-chip">
                  <b className="tabular-nums">{v.ver.counts.waiting}</b> presin vendimin e nëpunësit
                </span>
              </div>
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="staff-card" style={{ width: '330px', flex: '0 0 auto', overflow: 'hidden' }}>
                  {v.ver.rows.map((r: Rec, rIdx: number) => (
                    <button key={rIdx} type="button" onClick={r.onClick} className={`tap auto-row ${r.onClass}`} style={{ alignItems: 'flex-start' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6B665F' }} className="tabular-nums">
                          {r.id} · {r.dept}
                        </span>
                        <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{r.title}</span>
                        <span style={{ display: 'block', marginTop: '2px', fontSize: '11px', fontWeight: 600, color: r.decisionColor }}>{r.decisionLabel}</span>
                      </span>
                      <span className="status-pill" style={{ background: r.resultBg, color: r.resultInk, padding: '2px 8px', fontSize: '11px' }}>
                        {r.resultLabel}
                      </span>
                    </button>
                  ))}
                  {v.ver.rowsPg.show ? (
                    <div className="pager">
                      <span className="auto-muted tabular-nums">{v.ver.rowsPg.label}</span>
                      <div className="pager-btns">
                        <button type="button" onClick={v.ver.rowsPg.onPrev} className={`tap icon-btn ${v.ver.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        {v.ver.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                          <Fragment key={pnIdx}>
                            {pn.isNum ? (
                              <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                {pn.n}
                              </button>
                            ) : null}
                            {pn.isGap ? <span className="pager-gap">…</span> : null}
                          </Fragment>
                        ))}
                        <button type="button" onClick={v.ver.rowsPg.onNext} className={`tap icon-btn ${v.ver.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="staff-card auto-panel" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.ver.detail.displayId} · {v.ver.detail.dept}
                    </span>
                    <DcLink href="Raporti.dc.html" onClick={v.ver.detail.onOpenCase} className="tap auto-link">
                      Hap rastin →
                    </DcLink>
                  </div>
                  <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '15px', fontWeight: 700, color: '#1B1917' }}>{v.ver.detail.title}</div>
                  {v.ver.detail.isPass ? (
                    <div className="auto-callout is-ok">
                      <div className="auto-callout-title">Kaloi</div>
                      Zgjidhja duket në përputhje me problemin e raportuar.
                    </div>
                  ) : null}
                  {v.ver.detail.isReview ? (
                    <div className="auto-callout is-human">
                      <div className="auto-callout-title">Kërkon shqyrtim</div>
                      Dëshmia e dërguar mund të mos e tregojë zgjidhjen.
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                    <div>
                      <div className="auto-form-label">Raporti origjinal · para</div>
                      <Photo src={v.ver.detail.before} alt="Foto e raportit origjinal" className="auto-photo" />
                    </div>
                    <div>
                      <div className="auto-form-label">Zgjidhja e departamentit · pas</div>
                      {v.ver.detail.hasAfter ? (
                        <>
                          <Photo src={v.ver.detail.after} alt="Foto pas ndërhyrjes" className="auto-photo" />
                          <div className="auto-muted" style={{ marginTop: '5px' }}>
                            {v.ver.detail.afterNote}
                          </div>
                        </>
                      ) : null}
                      {v.ver.detail.noAfter ? (
                        <div className="auto-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="auto-muted">Asnjë foto pas ndërhyrjes</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="auto-form-label" style={{ marginTop: '14px' }}>
                    Verifikimi i SINJAL
                  </div>
                  {v.ver.detail.checks.map((c: Rec, cIdx: number) => (
                    <div key={cIdx} className="check-line">
                      <span className="check-ico" style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 800 }}>
                        {c.mark}
                      </span>
                      <span>
                        {c.label}
                        <span className="auto-muted">{c.optional}</span>
                      </span>
                      <span className="check-state" style={{ color: c.color }}>
                        {c.stateLabel}
                      </span>
                    </div>
                  ))}
                  {v.ver.detail.decided ? (
                    <div className="auto-callout" style={{ marginTop: '14px' }}>
                      <div className="auto-callout-title">{v.ver.detail.decisionLabel}</div>
                      {v.ver.detail.decisionMeta}
                    </div>
                  ) : null}
                  {v.ver.detail.undecided ? (
                    <>
                      <div className="auto-muted" style={{ marginTop: '14px' }}>
                        {v.ver.detail.acceptNote}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={v.ver.detail.onAccept}
                          className="tap staff-btn-primary"
                          style={{ padding: '9px 18px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                        >
                          Prano zgjidhjen
                        </button>
                        <button
                          type="button"
                          onClick={v.ver.detail.onOpenReopen}
                          className="tap staff-btn-secondary"
                          style={{ padding: '9px 18px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                        >
                          Rihap raportin
                        </button>
                      </div>
                      {v.ver.detail.reopenOpen ? (
                        <div className="auto-form">
                          <div className="auto-form-label">Arsyeja e rihapjes (e detyrueshme)</div>
                          <input
                            type="text"
                            value={v.ver.detail.reason}
                            onChange={v.ver.detail.onReason}
                            placeholder="p.sh. Fotoja pas ndërhyrjes nuk tregon mbulesën e re."
                            className="staff-input"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                              type="button"
                              onClick={v.ver.detail.onReopen}
                              className={`tap staff-btn-primary ${v.ver.detail.reopenDisabledClass}`}
                              style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                            >
                              Rihap
                            </button>
                            <button
                              type="button"
                              onClick={v.ver.detail.onCancelReopen}
                              className="tap staff-btn-secondary"
                              style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                            >
                              Anulo
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
          {v.isPublications ? (
            <>
              {v.pub.hasNotice ? (
                <div className="auto-callout is-ok" style={{ margin: '0 0 14px' }}>
                  {v.pub.notice}
                </div>
              ) : null}
              <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <section style={{ width: '320px', flex: '0 0 auto' }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Zgjidh raportet</h2>
                    <span className="auto-muted tabular-nums">{v.pub.selectedCount} të zgjedhura</span>
                  </div>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.pub.candidates.map((c: Rec, cIdx: number) => (
                      <button key={cIdx} type="button" onClick={c.onClick} className="tap pub-case">
                        <span className={`check-box ${c.checkClass}`}>
                          {c.checked ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12l5 5 9-10" />
                            </svg>
                          ) : null}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#6B665F' }} className="tabular-nums">
                            {c.id} · {c.zone}
                          </span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{c.title}</span>
                        </span>
                        <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: c.statusColor }}>{c.status}</span>
                          {c.published ? <span style={{ display: 'block', fontSize: '11px', color: '#8A847C' }}>publikuar</span> : null}
                        </span>
                      </button>
                    ))}
                    {v.pub.candidatesPg.show ? (
                      <div className="pager">
                        <span className="auto-muted tabular-nums">{v.pub.candidatesPg.label}</span>
                        <div className="pager-btns">
                          <button type="button" onClick={v.pub.candidatesPg.onPrev} className={`tap icon-btn ${v.pub.candidatesPg.prevClass}`} aria-label="Faqja e mëparshme">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 6l-6 6 6 6" />
                            </svg>
                          </button>
                          {v.pub.candidatesPg.nums.map((pn: Rec, pnIdx: number) => (
                            <Fragment key={pnIdx}>
                              {pn.isNum ? (
                                <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                  {pn.n}
                                </button>
                              ) : null}
                              {pn.isGap ? <span className="pager-gap">…</span> : null}
                            </Fragment>
                          ))}
                          <button type="button" onClick={v.pub.candidatesPg.onNext} className={`tap icon-btn ${v.pub.candidatesPg.nextClass}`} aria-label="Faqja tjetër">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
                <section style={{ flex: 1, minWidth: 0 }}>
                  <div className="auto-section-head">
                    <h2 className="auto-h2">Njoftim për qytetarët · draft</h2>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {v.pub.notEditing ? (
                        <button
                          type="button"
                          onClick={v.pub.onEdit}
                          className="tap staff-btn-secondary"
                          style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Redakto
                        </button>
                      ) : null}
                      {v.pub.editing ? (
                        <button
                          type="button"
                          onClick={v.pub.onDoneEdit}
                          className="tap staff-btn-secondary"
                          style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Përfundo redaktimin
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={v.pub.onRegenerate}
                        className="tap staff-btn-secondary"
                        style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                      >
                        Rigjenero
                      </button>
                    </div>
                  </div>
                  <div className="staff-card" style={{ padding: '16px 18px' }}>
                    {v.pub.noSelection ? <div className="auto-muted">Zgjidhni rastet e zgjidhura për të gjeneruar draftin.</div> : null}
                    {v.pub.hasSelection ? (
                      <>
                        {v.pub.editing ? <textarea value={v.pub.draft} onChange={v.pub.onDraft} className="auto-textarea" style={{ minHeight: '140px' }} /> : null}
                        {v.pub.notEditing ? <p style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontSize: '15px', lineHeight: 1.65, color: '#1B1917' }}>{v.pub.draft}</p> : null}
                      </>
                    ) : null}
                    <div className="auto-form-label" style={{ marginTop: '16px' }}>
                      Kontrollet e AI para publikimit
                    </div>
                    {v.pub.checks.map((c: Rec, cIdx: number) => (
                      <div key={cIdx} className="check-line" style={{ alignItems: 'flex-start' }}>
                        <span className="check-ico" style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: 800 }}>
                          {c.mark}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block' }}>{c.label}</span>
                          <span className="auto-muted" style={{ display: 'block' }}>
                            {c.note}
                          </span>
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                      <button
                        type="button"
                        onClick={v.pub.onPublish}
                        className={`tap staff-btn-primary ${v.pub.publishDisabledClass}`}
                        style={{ padding: '9px 18px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                      >
                        Publiko
                      </button>
                      <button
                        type="button"
                        onClick={v.pub.onReturn}
                        className={`tap staff-btn-secondary ${v.pub.publishDisabledClass}`}
                        style={{ padding: '9px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                      >
                        Ktheje për shqyrtim
                      </button>
                      <span className="auto-muted" style={{ marginLeft: '6px' }}>
                        {v.pub.blockNote}
                      </span>
                    </div>
                  </div>
                  <section className="auto-section">
                    <div className="auto-section-head">
                      <h2 className="auto-h2">Publikimet e mëparshme</h2>
                    </div>
                    <div className="staff-card" style={{ overflow: 'hidden' }}>
                      {v.pub.history.map((h: Rec, hIdx: number) => (
                        <div key={hIdx} className="attn-row" style={{ alignItems: 'flex-start' }}>
                          <span className="attn-sev" style={{ background: h.statusColor }} />
                          <div className="attn-text">
                            <b>
                              {h.status} · {h.time} · {h.by}
                            </b>
                            <span className="attn-evidence tabular-nums">{h.cases}</span>
                            <span className="attn-evidence" style={{ color: '#4A4640' }}>
                              {h.text}
                            </span>
                          </div>
                        </div>
                      ))}
                      {v.pub.historyPg.show ? (
                        <div className="pager">
                          <span className="auto-muted tabular-nums">{v.pub.historyPg.label}</span>
                          <div className="pager-btns">
                            <button type="button" onClick={v.pub.historyPg.onPrev} className={`tap icon-btn ${v.pub.historyPg.prevClass}`} aria-label="Faqja e mëparshme">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 6l-6 6 6 6" />
                              </svg>
                            </button>
                            {v.pub.historyPg.nums.map((pn: Rec, pnIdx: number) => (
                              <Fragment key={pnIdx}>
                                {pn.isNum ? (
                                  <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                    {pn.n}
                                  </button>
                                ) : null}
                                {pn.isGap ? <span className="pager-gap">…</span> : null}
                              </Fragment>
                            ))}
                            <button type="button" onClick={v.pub.historyPg.onNext} className={`tap icon-btn ${v.pub.historyPg.nextClass}`} aria-label="Faqja tjetër">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </section>
              </div>
            </>
          ) : null}
          {v.isOverrides ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '22px', marginBottom: '14px' }}>
                <div>
                  <div className="health-num tabular-nums" style={{ fontSize: '32px', color: '#B8860B' }}>
                    {v.ov.weekCount}
                  </div>
                  <div className="health-label">këtë javë</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingBottom: '4px' }}>
                  {v.ov.byType.map((t: Rec, tIdx: number) => (
                    <span key={tIdx} className="zone-chip">
                      <b className="tabular-nums" style={{ marginRight: '4px' }}>
                        {t.n}
                      </b>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
              {v.ov.hasPatterns ? (
                <div className="staff-card" style={{ overflow: 'hidden', marginBottom: '14px' }}>
                  {v.ov.patterns.map((p: Rec, pIdx: number) => (
                    <div key={pIdx} className="attn-row" style={{ background: '#FBF5E8' }}>
                      <span className="attn-sev" style={{ background: '#B8860B' }} />
                      <div className="attn-text">
                        <b>Model i zbuluar: {p.text}</b>
                        <span className="attn-evidence">{p.evidence}</span>
                      </div>
                      <button
                        type="button"
                        onClick={p.onAction}
                        className="tap staff-btn-secondary"
                        style={{ flex: '0 0 auto', padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                      >
                        {p.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <select value={v.ov.type} onChange={v.ov.onType} className="staff-select" style={{ padding: '7px 9px' }}>
                  {v.ov.typeOptions.map((o: Rec, oIdx: number) => (
                    <option key={oIdx} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={v.ov.clerk} onChange={v.ov.onClerk} className="staff-select" style={{ padding: '7px 9px' }}>
                  {v.ov.clerkOptions.map((o: Rec, oIdx: number) => (
                    <option key={oIdx} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={v.ov.dept} onChange={v.ov.onDept} className="staff-select" style={{ padding: '7px 9px' }}>
                  {v.ov.deptOptions.map((o: Rec, oIdx: number) => (
                    <option key={oIdx} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input type="text" value={v.ov.search} onChange={v.ov.onSearch} placeholder="Rasti ose arsyeja…" className="staff-input" style={{ width: '190px', padding: '7px 10px' }} />
                <button type="button" onClick={v.ov.onClear} className="tap auto-link" style={{ marginLeft: '4px' }}>
                  Pastro filtrat
                </button>
                <span className="auto-muted tabular-nums" style={{ marginLeft: 'auto' }}>
                  {v.ov.shown} nga {v.ov.total}
                </span>
              </div>
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Koha</th>
                      <th>Rasti</th>
                      <th>Automatizimi</th>
                      <th>Veprimi automatik</th>
                      <th>Veprimi njerëzor</th>
                      <th>Nga</th>
                      <th>Arsye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.ov.rows.map((r: Rec, rIdx: number) => (
                      <tr key={rIdx}>
                        <td className="tabular-nums" style={{ whiteSpace: 'nowrap', color: '#6B665F' }}>
                          {r.time}
                        </td>
                        <td>
                          <DcLink href="Raporti.dc.html" onClick={r.onOpen} className="tap tabular-nums" style={{ fontWeight: 700, color: '#1B1917' }}>
                            {r.id}
                          </DcLink>
                        </td>
                        <td>{r.type}</td>
                        <td style={{ color: '#6B665F' }}>{r.auto}</td>
                        <td style={{ fontWeight: 700 }}>{r.human}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.by}</td>
                        <td style={{ color: '#4A4640', maxWidth: '260px' }}>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {v.ov.rowsPg.show ? (
                  <div className="pager">
                    <span className="auto-muted tabular-nums">{v.ov.rowsPg.label}</span>
                    <div className="pager-btns">
                      <button type="button" onClick={v.ov.rowsPg.onPrev} className={`tap icon-btn ${v.ov.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      {v.ov.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                        <Fragment key={pnIdx}>
                          {pn.isNum ? (
                            <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                              {pn.n}
                            </button>
                          ) : null}
                          {pn.isGap ? <span className="pager-gap">…</span> : null}
                        </Fragment>
                      ))}
                      <button type="button" onClick={v.ov.rowsPg.onNext} className={`tap icon-btn ${v.ov.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
                {v.ov.none ? (
                  <div className="auto-muted" style={{ padding: '18px', textAlign: 'center' }}>
                    Asnjë ndërhyrje për këto filtra.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {v.isAudit ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                {v.au.actorChips.map((c: Rec, cIdx: number) => (
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
                <select value={v.au.type} onChange={v.au.onType} className="staff-select" style={{ padding: '7px 9px', marginLeft: '6px' }}>
                  {v.au.typeOptions.map((o: Rec, oIdx: number) => (
                    <option key={oIdx} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={v.au.clerk} onChange={v.au.onClerk} className="staff-select" style={{ padding: '7px 9px' }}>
                  {v.au.clerkOptions.map((o: Rec, oIdx: number) => (
                    <option key={oIdx} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input type="text" value={v.au.search} onChange={v.au.onSearch} placeholder="Rasti ose veprimi…" className="staff-input" style={{ width: '190px', padding: '7px 10px' }} />
                <span className="auto-muted tabular-nums" style={{ marginLeft: 'auto' }}>
                  {v.au.autoCount} automatike · {v.au.humanCount} njerëzore
                </span>
              </div>
              <div className="staff-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Koha</th>
                      <th>Rasti</th>
                      <th>Aktori</th>
                      <th>Automatizimi</th>
                      <th>Veprimi</th>
                      <th>Rezultati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.au.rows.map((r: Rec, rIdx: number) => (
                      <tr key={rIdx}>
                        <td className="tabular-nums" style={{ whiteSpace: 'nowrap', color: '#6B665F' }}>
                          {r.time}
                        </td>
                        <td>
                          <DcLink href="Raporti.dc.html" onClick={r.onOpen} className="tap tabular-nums" style={{ fontWeight: 700, color: '#1B1917' }}>
                            {r.id}
                          </DcLink>
                        </td>
                        <td>
                          <span className="actor-chip" style={{ background: r.actorBg, color: r.actorInk }}>
                            {r.actor}
                          </span>
                        </td>
                        <td style={{ color: '#6B665F' }}>{r.type}</td>
                        <td style={{ fontWeight: 600 }}>
                          {r.action}
                          {r.hasReason ? <span style={{ display: 'block', fontWeight: 500, fontSize: '12px', color: '#6B665F' }}>Arsye: "{r.reason}"</span> : null}
                        </td>
                        <td style={{ color: '#4A4640', maxWidth: '280px' }}>{r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {v.au.rowsPg.show ? (
                  <div className="pager">
                    <span className="auto-muted tabular-nums">{v.au.rowsPg.label}</span>
                    <div className="pager-btns">
                      <button type="button" onClick={v.au.rowsPg.onPrev} className={`tap icon-btn ${v.au.rowsPg.prevClass}`} aria-label="Faqja e mëparshme">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>
                      {v.au.rowsPg.nums.map((pn: Rec, pnIdx: number) => (
                        <Fragment key={pnIdx}>
                          {pn.isNum ? (
                            <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                              {pn.n}
                            </button>
                          ) : null}
                          {pn.isGap ? <span className="pager-gap">…</span> : null}
                        </Fragment>
                      ))}
                      <button type="button" onClick={v.au.rowsPg.onNext} className={`tap icon-btn ${v.au.rowsPg.nextClass}`} aria-label="Faqja tjetër">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
                {v.au.none ? (
                  <div className="auto-muted" style={{ padding: '18px', textAlign: 'center' }}>
                    Asnjë veprim për këto filtra.
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <span className="auto-muted tabular-nums">
                  {v.au.total} veprime në këtë filtër · gjithsej {v.au.allTotal} të regjistruara
                </span>
              </div>
            </>
          ) : null}
          {v.isConfig ? (
            <>
              <div className="dept-tab-bar" style={{ marginBottom: '16px' }}>
                {v.cfg.tabs.map((t: Rec, tIdx: number) => (
                  <button key={tIdx} type="button" onClick={t.onClick} className={`tap dept-tab ${t.onClass}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {v.cfg.isRules ? (
                <div className="r-md" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '232px', flex: '0 0 auto' }}>
                    {v.cfg.groups.map((g: Rec, gIdx: number) => (
                      <button key={gIdx} type="button" onClick={g.onClick} className={`tap group-tab ${g.onClass}`}>
                        <span>{g.label}</span>
                        <span className="auto-muted tabular-nums">{g.n}</span>
                      </button>
                    ))}
                    {v.cfg.hasRuleLog ? (
                      <>
                        <div className="filter-group-title" style={{ margin: '16px 10px 6px' }}>
                          Ndryshimet e fundit
                        </div>
                        {v.cfg.ruleLog.map((l: Rec, lIdx: number) => (
                          <div key={lIdx} style={{ padding: '5px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640', lineHeight: 1.4 }}>
                            <b>{l.rule}</b> {l.label}
                            <span className="auto-muted" style={{ display: 'block' }}>
                              {l.meta}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: '10px' }}>
                      <h2 className="auto-h2">{v.cfg.group.label}</h2>
                      <p className="auto-lede">{v.cfg.group.q}</p>
                    </div>
                    {v.cfg.isRouting ? (
                      <>
                        <div className="auto-muted" style={{ marginBottom: '8px' }}>
                          Rregullat vlerësohen nga lart poshtë — i pari aktiv që përputhet fiton.
                        </div>
                        <div className="staff-card" style={{ overflow: 'hidden' }}>
                          {v.cfg.routingRules.map((r: Rec, rIdx: number) => (
                            <div key={rIdx} className="attn-row" style={{ gap: '10px', opacity: r.dim }}>
                              <span className="tabular-nums" style={{ width: '22px', flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#B8B2A9' }}>
                                {r.order}.
                              </span>
                              <button
                                type="button"
                                onClick={r.onOpen}
                                className="tap"
                                style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontFamily: "'Barlow',sans-serif", cursor: 'pointer' }}
                              >
                                <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                                  Rregulli #{r.no} · {r.category} · {r.zone}
                                </span>
                                <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: '#4A4640' }}>
                                  → {r.dept} · {r.team}
                                </span>
                                {r.hasException ? <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', color: '#7A5A0B' }}>Përjashtim: {r.exception}</span> : null}
                              </button>
                              <span className="auto-muted tabular-nums" style={{ width: '64px', textAlign: 'right' }}>
                                {r.matches} raste
                              </span>
                              <button type="button" onClick={r.onUp} className={`tap icon-btn ${r.upClass}`} aria-label="Lart">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 15l6-6 6 6" />
                                </svg>
                              </button>
                              <button type="button" onClick={r.onDown} className={`tap icon-btn ${r.downClass}`} aria-label="Poshtë">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </button>
                              <button type="button" onClick={r.onDuplicate} className="tap icon-btn" aria-label="Dubliko">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="8" y="8" width="12" height="12" rx="2" />
                                  <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
                                </svg>
                              </button>
                              <button type="button" onClick={r.onToggle} className={`tap switch ${r.switchClass}`} aria-label="Aktiv" />
                            </div>
                          ))}
                          {v.cfg.routingRulesPg.show ? (
                            <div className="pager">
                              <span className="auto-muted tabular-nums">{v.cfg.routingRulesPg.label}</span>
                              <div className="pager-btns">
                                <button type="button" onClick={v.cfg.routingRulesPg.onPrev} className={`tap icon-btn ${v.cfg.routingRulesPg.prevClass}`} aria-label="Faqja e mëparshme">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 6l-6 6 6 6" />
                                  </svg>
                                </button>
                                {v.cfg.routingRulesPg.nums.map((pn: Rec, pnIdx: number) => (
                                  <Fragment key={pnIdx}>
                                    {pn.isNum ? (
                                      <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                                        {pn.n}
                                      </button>
                                    ) : null}
                                    {pn.isGap ? <span className="pager-gap">…</span> : null}
                                  </Fragment>
                                ))}
                                <button type="button" onClick={v.cfg.routingRulesPg.onNext} className={`tap icon-btn ${v.cfg.routingRulesPg.nextClass}`} aria-label="Faqja tjetër">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 6l6 6-6 6" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {v.cfg.hasCustomRules ? (
                          <>
                            <div className="filter-group-title" style={{ margin: '16px 0 6px' }}>
                              Të shtuara te Departamentet
                            </div>
                            <div className="staff-card" style={{ overflow: 'hidden' }}>
                              {v.cfg.customRules.map((c: Rec, cIdx: number) => (
                                <div key={cIdx} className="attn-row">
                                  <div className="attn-text">
                                    <b>{c.category}</b> → {c.dept}
                                    <span className="attn-evidence">Prioriteti bazë: {c.priority}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {v.cfg.isBuilder ? (
                      <>
                        <button type="button" onClick={v.cfg.builder.onBack} className="tap auto-link" style={{ color: '#6B665F', marginBottom: '10px' }}>
                          ← Të gjitha rregullat e routing-ut
                        </button>
                        <div className="staff-card" style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '18px', fontWeight: 700, color: '#1B1917' }}>Rregulli i routing-ut #{v.cfg.builder.no}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#4A4640' }}>{v.cfg.builder.activeLabel}</span>
                              <button type="button" onClick={v.cfg.builder.onToggle} className={`tap switch ${v.cfg.builder.switchClass}`} aria-label="Aktiv / Joaktiv" />
                            </div>
                          </div>
                          {v.cfg.builder.viewing ? (
                            <>
                              <div className="rb-line">
                                <span className="rb-key">KUR</span>
                                <span className="rb-val">
                                  Kategoria = <span className="rb-token">{v.cfg.builder.category}</span>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key">DHE</span>
                                <span className="rb-val">
                                  Zona = <span className="rb-token">{v.cfg.builder.zone}</span>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key is-then">ATËHERË</span>
                                <span className="rb-val">
                                  Departamenti = <span className="rb-token">{v.cfg.builder.dept}</span> Ekipi = <span className="rb-token">{v.cfg.builder.team}</span>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key is-except">PËRVEÇ</span>
                                <span className="rb-val">{v.cfg.builder.exception}</span>
                              </div>
                            </>
                          ) : null}
                          {v.cfg.builder.editing ? (
                            <>
                              <div className="rb-line">
                                <span className="rb-key">KUR</span>
                                <span className="rb-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  Kategoria ={' '}
                                  <select value={v.cfg.builder.draftCategory} onChange={v.cfg.builder.onCategory} className="staff-select" style={{ padding: '6px 8px' }}>
                                    {v.cfg.builder.catOptions.map((o: Rec, oIdx: number) => (
                                      <option key={oIdx} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key">DHE</span>
                                <span className="rb-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  Zona ={' '}
                                  <select value={v.cfg.builder.draftZone} onChange={v.cfg.builder.onZone} className="staff-select" style={{ padding: '6px 8px' }}>
                                    {v.cfg.builder.zoneOptions.map((o: Rec, oIdx: number) => (
                                      <option key={oIdx} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key is-then">ATËHERË</span>
                                <span className="rb-val" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  Departamenti ={' '}
                                  <select value={v.cfg.builder.draftDept} onChange={v.cfg.builder.onDept} className="staff-select" style={{ padding: '6px 8px' }}>
                                    {v.cfg.builder.deptOptions.map((o: Rec, oIdx: number) => (
                                      <option key={oIdx} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>{' '}
                                  Ekipi ={' '}
                                  <select value={v.cfg.builder.draftTeam} onChange={v.cfg.builder.onTeam} className="staff-select" style={{ padding: '6px 8px' }}>
                                    {v.cfg.builder.teamOptions.map((o: Rec, oIdx: number) => (
                                      <option key={oIdx} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                </span>
                              </div>
                              <div className="rb-line">
                                <span className="rb-key is-except">PËRVEÇ</span>
                                <span className="rb-val">
                                  <input
                                    type="text"
                                    value={v.cfg.builder.draftException}
                                    onChange={v.cfg.builder.onException}
                                    placeholder="p.sh. Nëse prioriteti = Urgjente → Eskalimi #4"
                                    className="staff-input"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px' }}
                                  />
                                </span>
                              </div>
                            </>
                          ) : null}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                            <button
                              type="button"
                              onClick={v.cfg.builder.onTest}
                              className="tap staff-btn-primary"
                              style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                            >
                              Testo rregullin
                            </button>
                            {v.cfg.builder.viewing ? (
                              <button
                                type="button"
                                onClick={v.cfg.builder.onEdit}
                                className="tap staff-btn-secondary"
                                style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                              >
                                Ndrysho
                              </button>
                            ) : null}
                            {v.cfg.builder.editing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={v.cfg.builder.onSave}
                                  className="tap staff-btn-secondary"
                                  style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                                >
                                  Ruaj ndryshimet
                                </button>
                                <button
                                  type="button"
                                  onClick={v.cfg.builder.onCancelEdit}
                                  className="tap staff-btn-secondary"
                                  style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                                >
                                  Anulo
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={v.cfg.builder.onDuplicate}
                              className="tap staff-btn-secondary"
                              style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                            >
                              Dubliko
                            </button>
                            <button
                              type="button"
                              onClick={v.cfg.builder.onHistory}
                              className="tap staff-btn-secondary"
                              style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                            >
                              Shiko historikun
                            </button>
                          </div>
                          {v.cfg.builder.tested ? (
                            <div className="auto-callout" style={{ background: '#F5F2ED' }}>
                              <div className="auto-callout-title" style={{ fontSize: '13px' }}>
                                {v.cfg.builder.testSummary}
                              </div>{' '}
                              {v.cfg.builder.testDetail} {v.cfg.builder.hasShadow ? <div style={{ marginTop: '6px', color: '#7A5A0B', fontWeight: 600 }}>{v.cfg.builder.testShadow}</div> : null}
                              <div style={{ marginTop: '10px' }}>
                                {v.cfg.builder.testCases.map((t: Rec, tIdx: number) => (
                                  <div key={tIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', borderTop: '1px solid #E4DFD6' }}>
                                    <span className="tabular-nums" style={{ width: '54px', fontWeight: 700, color: '#6B665F' }}>
                                      {t.id}
                                    </span>
                                    <span style={{ flex: 1, minWidth: 0, color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                                    <span style={{ width: '110px', color: '#6B665F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.current}</span>
                                    <span style={{ width: '130px', textAlign: 'right', fontWeight: 700, color: t.changeColor }}>{t.changeLabel}</span>
                                  </div>
                                ))}
                                {v.cfg.builder.hasMore ? (
                                  <div className="auto-muted" style={{ paddingTop: '5px' }}>
                                    {v.cfg.builder.moreCases}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {v.cfg.builder.historyOpen ? (
                            <>
                              <div className="auto-form-label" style={{ marginTop: '14px' }}>
                                Historiku i rregullit
                              </div>
                              {v.cfg.builder.history.map((h: Rec, hIdx: number) => (
                                <div key={hIdx} className="check-line" style={{ alignItems: 'flex-start' }}>
                                  <span className="auto-dot" style={{ marginTop: '5px', background: '#B8860B' }} />
                                  <span style={{ flex: 1, minWidth: 0 }}>
                                    {h.label}
                                    <span className="auto-muted" style={{ display: 'block' }}>
                                      {h.meta}
                                    </span>
                                  </span>
                                </div>
                              ))}
                              {v.cfg.builder.historyNone ? <div className="auto-muted">Asnjë ndryshim ose ndërhyrje për këtë rregull.</div> : null}
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                    {v.cfg.isPriority ? (
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.cfg.priorityRules.map((r: Rec, rIdx: number) => (
                          <div key={rIdx} className="attn-row">
                            <div className="attn-text">
                              <b>{r.category}</b> → bazë <b style={{ color: r.baseColor }}>{r.base}</b>
                              <span className="attn-evidence">
                                Përjashtim: {r.exception} · {r.count} raste të ngritura
                              </span>
                            </div>
                            <button type="button" onClick={r.onToggle} className={`tap switch ${r.switchClass}`} aria-label="Aktiv" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {v.cfg.isSla ? (
                      <div className="staff-card" style={{ padding: '6px 16px' }}>
                        {v.cfg.slaTargets.map((t: Rec, tIdx: number) => (
                          <div key={tIdx} className="auto-kv">
                            <span className="auto-kv-k" style={{ fontWeight: 700, color: t.color }}>
                              {t.priority}
                            </span>
                            <span className="auto-kv-v tabular-nums">
                              {t.hours}{' '}
                              <span className="auto-muted" style={{ fontWeight: 500 }}>
                                · {t.cases} raste të hapura
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {v.cfg.isEscalation ? (
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.cfg.escalation.map((r: Rec, rIdx: number) => (
                          <div key={rIdx} className="attn-row">
                            <div className="attn-text">
                              <b>
                                Rregulli {r.no}: {r.condition}
                              </b>
                              <span className="attn-evidence">
                                → {r.action} · {r.count} ekzekutime
                              </span>
                            </div>
                            <button type="button" onClick={r.onToggle} className={`tap switch ${r.onClass}`} aria-label="Aktiv" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {v.cfg.isDuplicates ? (
                      <div className="staff-card" style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                          <div>
                            <div className="auto-form-label">Lidh automatikisht nga</div>
                            <select value={v.cfg.dupLinkValue} onChange={v.cfg.onDupLink} className="staff-select" style={{ padding: '7px 9px' }}>
                              {v.cfg.dupLinkOptions.map((o: Rec, oIdx: number) => (
                                <option key={oIdx} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="auto-form-label">Sinjalizo për shqyrtim nga</div>
                            <select value={v.cfg.dupFlagValue} onChange={v.cfg.onDupFlag} className="staff-select" style={{ padding: '7px 9px' }}>
                              {v.cfg.dupFlagOptions.map((o: Rec, oIdx: number) => (
                                <option key={oIdx} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="auto-callout" style={{ background: '#F5F2ED' }}>
                          {v.cfg.dupEffect}
                        </div>
                      </div>
                    ) : null}
                    {v.cfg.isMissing ? (
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.cfg.missingRules.map((r: Rec, rIdx: number) => (
                          <div key={rIdx} className="attn-row">
                            <div className="attn-text">
                              <b>{r.label}</b>
                              <span className="attn-evidence">{r.state}</span>
                            </div>
                            <button type="button" onClick={r.onToggle} className={`tap switch ${r.switchClass}`} aria-label="I detyrueshëm" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {v.cfg.isResolution ? (
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.cfg.resolutionRules.map((r: Rec, rIdx: number) => (
                          <div key={rIdx} className="attn-row">
                            <div className="attn-text">
                              <b>{r.label}</b>
                              <span className="attn-evidence">{r.state}</span>
                            </div>
                            <button type="button" onClick={r.onToggle} className={`tap switch ${r.switchClass}`} aria-label="E detyrueshme" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {v.cfg.isPublication ? (
                      <div className="staff-card" style={{ overflow: 'hidden' }}>
                        {v.cfg.publicationRules.map((r: Rec, rIdx: number) => (
                          <div key={rIdx} className="attn-row">
                            <div className="attn-text">
                              <b>{r.label}</b>
                              <span className="attn-evidence">{r.note}</span>
                            </div>
                            <button type="button" onClick={r.onToggle} className={`tap switch ${r.switchClass}`} aria-label="Aktiv" />
                          </div>
                        ))}
                        <div className="attn-row" style={{ background: '#F5F2ED' }}>
                          <div className="attn-text">
                            <b>Publikim automatik pa miratim</b>
                            <span className="attn-evidence">I çaktivizuar me politikë: nëpunësi mbetet përgjegjës për çdo publikim.</span>
                          </div>
                          <span className="auto-muted" style={{ fontWeight: 700 }}>
                            Kurrë
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {v.cfg.isSettings ? (
                <>
                  <p className="auto-lede" style={{ margin: '0 0 12px' }}>
                    Jo çdo automatizim ka të njëjtat pasoja — secili ka nivelin e vet të autonomisë.
                  </p>
                  <div className="staff-card" style={{ overflow: 'hidden' }}>
                    {v.cfg.settings.map((s: Rec, sIdx: number) => (
                      <div key={sIdx} className="attn-row" style={{ gap: '14px' }}>
                        <span className="auto-dot" style={{ background: s.activeColor, width: '9px', height: '9px' }} />
                        <div style={{ width: '190px', flex: '0 0 auto' }}>
                          <button type="button" onClick={s.onOpen} className="tap auto-link" style={{ color: '#1B1917', fontSize: '13px' }}>
                            {s.label}
                          </button>
                          <div className="auto-muted" style={{ color: s.activeColor, fontWeight: 700 }}>
                            {s.activeLabel}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {s.unlocked ? (
                            <select value={s.autonomy} onChange={s.onAutonomy} className="staff-select" style={{ padding: '6px 8px' }}>
                              {s.options.map((o: Rec, oIdx: number) => (
                                <option key={oIdx} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {s.locked ? <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: s.autonomyColor }}>{s.autonomyLabel}</span> : null}
                          <div className="auto-muted" style={{ marginTop: '3px' }}>
                            {s.note}
                          </div>
                        </div>
                        <button type="button" onClick={s.onToggle} className={`tap switch ${s.switchClass}`} aria-label="Aktiv / Paaktiv" />
                      </div>
                    ))}
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
