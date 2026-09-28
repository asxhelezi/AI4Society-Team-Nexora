import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Photo } from '../../components/Photo';
import { Shell } from '../../components/Shell';
import { useLogic } from '../../lib/dc';
import { RaportiLogic } from './RaportiLogic';
import './raporti.css';

const NO_PROPS = {};

/** Raporti: one case in full, with its contextual actions, SLA, assignment, lifecycle and audit trail. */
export function Raporti() {
  const v = useLogic(RaportiLogic, NO_PROPS);

  return (
    <Shell active="raportet" scroll>
      <PageHeader
        crumb={
          <DcLink href="Raportet.dc.html" className="tap page-crumb">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Raportet
          </DcLink>
        }
        title={v.r.title}
        context={
          <>
            <span className="tabular-nums" style={{ fontWeight: 600, color: '#4A4640' }}>
              {v.r.id}
            </span>
            <span className="status-pill" style={{ background: v.r.statusBg, color: v.r.statusInk, padding: '2px 9px 2px 7px' }}>
              <span className="status-dot" style={{ background: v.r.statusDot }} />
              {v.r.status}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: v.r.priorityColor }}>
              <span className="status-dot" style={{ background: v.r.priorityColor }} />
              {v.r.priority}
            </span>
            <span>{v.r.category}</span>
            <span>{v.r.zone}</span>
          </>
        }
        actions={
          <>
            {v.actions.map((a, aIdx) => (
              <button
                key={aIdx}
                type="button"
                onClick={a.onClick}
                className={`tap ${a.btnClass}`}
                style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
              >
                {a.label}
              </button>
            ))}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={v.onToggleMore}
                className={`tap staff-btn-secondary ${v.moreBtnClass}`}
                style={{ padding: '8px 10px', display: 'inline-flex', alignItems: 'center' }}
                aria-label="Më shumë veprime"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1B1917">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
              {v.moreOpen ? (
                <div className="panel" style={{ top: '40px', right: 0, width: '200px', padding: '6px' }}>
                  <button
                    type="button"
                    onClick={v.onExport}
                    className="tap menu-row"
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      background: 'transparent',
                      borderRadius: '7px',
                      padding: '8px 10px',
                      fontFamily: "'Barlow',sans-serif",
                      fontSize: '13px',
                      color: '#1B1917',
                    }}
                  >
                    Eksporto rastin
                  </button>
                </div>
              ) : null}
            </div>
            <span style={{ width: '1px', height: '28px', background: '#E4DFD6', margin: '0 4px' }} />
          </>
        }
      />
      <main className="app-pad" style={{ flex: 1, padding: '20px 28px 32px' }}>
        {v.exportNotice ? (
          <div style={{ marginBottom: '14px', padding: '8px 14px', borderRadius: '10px', background: '#E1EEE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#1E5C3A' }}>U përgatit eksporti i rastit {v.r.id}.</span>
            <button
              type="button"
              onClick={v.onDismissExport}
              className="tap"
              style={{ border: 0, background: 'transparent', color: '#1E5C3A', padding: '2px', display: 'inline-flex' }}
              aria-label="Mbyll"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : null}
        {v.topBanner.show ? (
          <div className="exception-banner" style={{ marginBottom: '14px', background: v.topBanner.bg, borderLeftColor: v.topBanner.border }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={v.topBanner.border}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: '0 0 auto', marginTop: '1px' }}
            >
              <path d="M12 3l9.5 17h-19z" />
              <path d="M12 10v4M12 17.5h.01" />
            </svg>
            <span style={{ flex: 1, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: v.topBanner.ink }}>
              <strong>{v.topBanner.text}</strong> — {v.topBanner.evidence}
            </span>
          </div>
        ) : null}
        {v.reopenOpen ? (
          <div className="quick-panel" style={{ marginBottom: '14px' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#7A5A0B', marginBottom: '8px' }}>Rihap raportin</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={v.reopenReason}
                onChange={v.onReopenReason}
                placeholder="Arsyeja e rihapjes (p.sh. problemi është rishfaqur)…"
                className="staff-input"
                style={{ flex: 1, padding: '8px 10px' }}
              />
              <button type="button" onClick={v.onConfirmReopen} className="tap staff-btn-primary" style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}>
                Konfirmo
              </button>
              <button
                type="button"
                onClick={v.onCancelReopen}
                className="tap staff-btn-secondary"
                style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
              >
                Anulo
              </button>
            </div>
          </div>
        ) : null}
        {v.requestOpen ? (
          <div className="quick-panel" style={{ marginBottom: '14px', background: '#EDEAE3', borderColor: '#D9D4CC' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917', marginBottom: '8px' }}>Kërko informacion nga qytetari</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {v.requestTemplates.map((t, tIdx) => (
                <button key={tIdx} type="button" onClick={t.onClick} className="tap request-chip">
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={v.requestCustom} onChange={v.onRequestCustom} placeholder="Mesazh i personalizuar…" className="staff-input" style={{ flex: 1, padding: '8px 10px' }} />
              <button
                type="button"
                onClick={v.onSendCustomRequest}
                className="tap staff-btn-primary"
                style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
              >
                Dërgo
              </button>
              <button
                type="button"
                onClick={v.onCancelRequest}
                className="tap staff-btn-secondary"
                style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
              >
                Anulo
              </button>
            </div>
          </div>
        ) : null}
        <div className="r-detail" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Raporti i qytetarit</h2>
              <div className="r-citizen" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '14px' }}>
                <Photo src={v.r.photo} alt="Foto e ngarkuar nga qytetari" style={{ width: '150px', height: '112px', objectFit: 'cover', borderRadius: '8px', flex: '0 0 auto' }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', lineHeight: 1.55, color: '#1B1917' }}>{v.r.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                    <span>Dërguar: {v.r.submittedLabel}</span>
                    <span>Qytetari: {v.r.citizenInitials}</span>
                    <span>
                      {v.r.zone} · {v.r.address}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="staff-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Përpunimi automatik i SINJAL</h2>
                <button type="button" onClick={v.ai.onUse} className="tap staff-btn-secondary" style={{ padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}>
                  Përdor sugjerimin
                </button>
              </div>
              <p style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F' }}>
                {v.ai.summaryLead} <strong style={{ color: '#1B1917' }}>{v.ai.summaryTarget}</strong> në {v.ai.assignedTime}.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px 20px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '3px' }}>Zona e mbulimit</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{v.ai.zone}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '3px' }}>Prioriteti automatik</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{v.ai.priority}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '3px' }}>Routing automatik</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{v.ai.department}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '3px' }}>Risku</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{v.ai.risk}</div>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C' }}>Besueshmëria e routing-ut</span>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: v.ai.confColor }} className="tabular-nums">
                    {v.ai.confidence}%
                  </span>
                </div>
                <div className="conf-track">
                  <div className="conf-fill" style={{ width: `${v.ai.confidence}%`, background: v.ai.confColor }} />
                </div>
              </div>
              <div style={{ paddingTop: '12px', borderTop: '1px solid #E4DFD6' }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '4px' }}>Pse?</div>
                <p style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontSize: '13px', lineHeight: 1.55, color: '#4A4640' }}>{v.ai.rationale}</p>
                <DcLink
                  href="Automatizimet.dc.html"
                  onClick={v.ai.onAutomation}
                  className="tap"
                  style={{ display: 'inline-block', marginTop: '10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#C23B31' }}
                >
                  Shiko vendimin në Automatizimet →
                </DcLink>
              </div>
              {v.ai.reassignNote.show ? (
                <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '8px', background: '#EDEAE3' }}>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#1B1917', marginBottom: '4px' }}>Ndërhyrje njerëzore: caktimi u ndryshua</div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640', lineHeight: 1.6 }}>
                    Nga: {v.ai.reassignNote.from}
                    <br />
                    Në: {v.ai.reassignNote.to}
                    <br />
                    Nga: {v.ai.reassignNote.by}
                    <br />
                    Arsye: {v.ai.reassignNote.reason}
                  </div>
                </div>
              ) : null}
            </section>
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 4px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Ndërhyrja e departamentit</h2>
              <p style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>
                Kryer nga {v.dept.doneBy} · filloi {v.dept.startedLabel}
              </p>
              {v.dept.evidenceMissing ? (
                <div style={{ marginBottom: '12px', padding: '9px 12px', borderRadius: '8px', background: '#F5EBD6', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#7A5A0B' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <svg
                      width="15"
                      height="15"
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
                    Mungon foto pas ndërhyrjes
                  </span>
                </div>
              ) : null}
              {v.dept.hasPhotos ? (
                <>
                  <div style={{ marginBottom: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#8A847C' }}>Foto pas ndërhyrjes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    {v.dept.photos.map((p, pIdx) => (
                      <Photo key={pIdx} src={p.photo} alt="Foto pas ndërhyrjes" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
                    ))}
                  </div>
                </>
              ) : null}
              {v.dept.notes.map((n, nIdx) => (
                <div key={nIdx} style={{ padding: '8px 0', borderTop: '1px solid #E4DFD6', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                  {n.text}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input type="text" value={v.dept.draft} onChange={v.dept.onDraft} placeholder="Shto shënim ndërhyrjeje…" className="staff-input" style={{ flex: 1, padding: '8px 10px' }} />
                <button type="button" onClick={v.dept.onAdd} className="tap staff-btn-secondary" style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}>
                  Shto
                </button>
              </div>
            </section>
            {v.verify.show ? (
              <section className="staff-card" style={{ padding: '18px' }}>
                <h2 style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Verifikimi i zgjidhjes</h2>
                <div style={{ marginBottom: '12px' }}>
                  <div className="verify-row">
                    <span className="check-ico" style={{ width: '16px', height: '16px', background: v.verify.locationBg, color: v.verify.locationColor, fontSize: '11px', fontWeight: 800 }}>
                      {v.verify.locationMark}
                    </span>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>Vendndodhja përputhet</span>
                  </div>
                  <div className="verify-row">
                    <span className="check-ico" style={{ width: '16px', height: '16px', background: v.verify.descBg, color: v.verify.descColor, fontSize: '11px', fontWeight: 800 }}>
                      {v.verify.descMark}
                    </span>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>Përshkrimi i zgjidhjes u dha</span>
                  </div>
                  <div className="verify-row">
                    <span className="check-ico" style={{ width: '16px', height: '16px', background: v.verify.photoBg, color: v.verify.photoColor, fontSize: '11px', fontWeight: 800 }}>
                      {v.verify.photoMark}
                    </span>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>Foto pas ndërhyrjes u ngarkua</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={v.verify.onAccept}
                    className="tap staff-btn-primary"
                    style={{ padding: '9px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                  >
                    Prano zgjidhjen
                  </button>
                  <button
                    type="button"
                    onClick={v.verify.onReopen}
                    className="tap staff-btn-secondary"
                    style={{ padding: '9px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                  >
                    Rihap raportin
                  </button>
                </div>
              </section>
            ) : null}
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Komunikimi me qytetarin</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {v.thread.map((m, mIdx) => (
                  <div key={mIdx} className={`thread-row ${m.rowClass}`}>
                    <div className={`thread-msg ${m.bubbleClass}`}>
                      <div>{m.text}</div>
                      <div style={{ marginTop: '3px', fontSize: '11px', opacity: 0.7 }}>{m.timeLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={v.onOpenRequest} className="tap staff-btn-secondary" style={{ padding: '8px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}>
                Kërko informacion
              </button>
            </section>
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Historiku i plotë i raportit</h2>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {v.timeline.map((ev, evIdx) => (
                  <div key={evIdx} style={{ display: 'flex', gap: '12px', padding: '8px 0' }}>
                    <span style={{ flex: '0 0 auto', width: '44px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }} className="tabular-nums">
                      {ev.time}
                    </span>
                    <span className="status-dot" style={{ marginTop: '5px', background: ev.color }} />
                    <span style={{ flex: 1, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <section className="staff-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Përgjegjësia</h2>
                {v.assign.showOpenBtn ? <></> : null}
              </div>
              {v.assign.open ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '4px' }}>
                      Departamenti
                    </span>
                    <select value={v.assign.department} onChange={v.assign.onDept} className="staff-select" style={{ width: '100%', padding: '8px 10px' }}>
                      {v.deptOptions.map((o, oIdx) => (
                        <option key={oIdx} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '4px' }}>Punonjësi</span>
                    <select value={v.assign.responsible} onChange={v.assign.onResp} className="staff-select" style={{ width: '100%', padding: '8px 10px' }}>
                      <option value="">— Pa caktuar —</option>
                      {v.assign.respOptions.map((o, oIdx) => (
                        <option key={oIdx} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '4px' }}>Prioriteti</span>
                    <select value={v.assign.priority} onChange={v.assign.onPriority} className="staff-select" style={{ width: '100%', padding: '8px 10px' }}>
                      {v.priorityOptions.map((o, oIdx) => (
                        <option key={oIdx} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {v.assign.reasonRequired ? (
                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: 0, color: '#8A847C', marginBottom: '4px' }}>
                        Arsyeja e rishpërndarjes
                      </span>
                      <input
                        type="text"
                        value={v.assign.reason}
                        onChange={v.assign.onReason}
                        placeholder="P.sh. kategoria fillestare ishte e pasaktë…"
                        className="staff-input"
                        style={{ width: '100%', padding: '8px 10px' }}
                      />
                    </label>
                  ) : null}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={v.assign.onSave}
                      className="tap staff-btn-primary"
                      style={{ flex: 1, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                    >
                      {v.assign.saveLabel}
                    </button>
                    <button
                      type="button"
                      onClick={v.assign.onCancel}
                      className="tap staff-btn-secondary"
                      style={{ padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
                    >
                      Anulo
                    </button>
                  </div>
                </div>
              ) : null}
              {v.assign.showSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B665F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                      <rect x="5" y="3" width="14" height="18" rx="1.5" />
                      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
                    </svg>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>{v.r.departmentName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B665F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                    </svg>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>{v.r.responsibleLabel}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B665F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                      <path d="M12 21s-7-6.3-7-12a7 7 0 0114 0c0 5.7-7 12-7 12z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>{v.r.zone}</span>
                  </div>
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #E4DFD6', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>Caktuar: {v.assign.assignedAtLabel}</div>
                </div>
              ) : null}
            </section>
            <section className="staff-card" style={{ padding: '18px', boxShadow: `inset 3px 0 0 ${v.sla.color}, 0 2px 5px rgba(27,25,23,.03), 0 18px 34px rgba(27,25,23,.055)` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>SLA</h2>
                <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '18px', fontWeight: 700, color: v.sla.color }}>
                  {v.sla.headline}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C', marginBottom: '2px' }}>Lejuar</div>
                  <div className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>
                    {v.sla.allowedLabel}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C', marginBottom: '2px' }}>Ka kaluar</div>
                  <div className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>
                    {v.sla.elapsedLabel}
                  </div>
                </div>
              </div>
              <div className="conf-track" style={{ marginBottom: '10px' }}>
                <div className="conf-fill" style={{ width: `${v.sla.pct}%`, background: v.sla.color }} />
              </div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: v.sla.color, marginBottom: '10px' }}>{v.sla.statusLabel}</div>
              <div style={{ paddingTop: '10px', borderTop: '1px solid #E4DFD6', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                  <span>Caktuar</span>
                  <span className="tabular-nums">{v.sla.historyAssigned}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                  <span>Filloi puna</span>
                  <span className="tabular-nums">{v.sla.historyStarted}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                  <span>Përditësimi i fundit</span>
                  <span className="tabular-nums">{v.sla.historyLastUpdate}</span>
                </div>
              </div>
            </section>
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Statusi</h2>
              <div style={{ marginBottom: '12px' }}>
                {v.lifecycle.steps.map((s, sIdx) => (
                  <div key={sIdx}>
                    <div className={`lifecycle-step ${s.stepClass}`}>
                      <span className="lifecycle-dot" />
                      <span className="lifecycle-label" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#4A4640' }}>
                        {s.label}
                      </span>
                    </div>
                    {s.showConnector ? <div className={`lifecycle-connector ${s.connectorClass}`} /> : null}
                  </div>
                ))}
              </div>
              {v.lifecycle.isBranch ? (
                <div style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', background: '#EDEAE3', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640' }}>
                  Ky rast doli nga rrjedha kryesore: <strong style={{ color: '#1B1917' }}>{v.lifecycle.branchNote}</strong>
                </div>
              ) : null}
              <select value={v.statusCtl.value} onChange={v.statusCtl.onChange} className="staff-select" style={{ width: '100%', padding: '8px 10px', marginBottom: '10px' }}>
                {v.statusOptions.map((o, oIdx) => (
                  <option key={oIdx} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={v.statusCtl.onSave}
                className="tap staff-btn-primary"
                style={{ width: '100%', padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
              >
                {v.statusCtl.saveLabel}
              </button>
            </section>
            {v.hasExceptions ? (
              <section className="staff-card" style={{ padding: '18px' }}>
                <h2 style={{ margin: '0 0 4px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Probleme me këtë raport</h2>
                <div>
                  {v.exceptions.map((ex, exIdx) => (
                    <div key={exIdx} className="exception-list-row">
                      <span className="auto-dot" style={{ marginTop: '6px', background: ex.color }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917' }}>{ex.text}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F', marginTop: '1px' }}>{ex.evidence}</div>
                        {ex.hasAction ? (
                          <button
                            type="button"
                            onClick={ex.onAction}
                            className="tap"
                            style={{ marginTop: '4px', border: 0, background: 'transparent', padding: 0, fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}
                          >
                            {ex.actionLabel}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {v.dup.show ? (
              <section className="staff-card" style={{ padding: '18px' }}>
                <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Dublikatë e mundshme</h2>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', marginBottom: '10px' }}>
                  {v.dup.candidateId} · {v.dup.similarity}% ngjashmëri
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={v.dup.onConfirm}
                    className="tap staff-btn-primary"
                    style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Lidh
                  </button>
                  <button
                    type="button"
                    onClick={v.dup.onDismiss}
                    className="tap staff-btn-secondary"
                    style={{ padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                  >
                    Mbaji të ndara
                  </button>
                </div>
              </section>
            ) : null}
            {v.linked.show ? (
              <section className="staff-card" style={{ padding: '18px' }}>
                <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Raporte të lidhura</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {v.linked.items.map((l, lIdx) => (
                    <DcLink
                      key={lIdx}
                      href="Raporti.dc.html"
                      onClick={l.onClick}
                      className="tap staff-row"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px' }}
                    >
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#6B665F' }} className="tabular-nums">
                        {l.id}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.title}
                      </span>
                      <span className="status-pill" style={{ background: l.statusBg, color: l.statusInk, fontSize: '11px' }}>
                        <span className="status-dot" style={{ background: l.statusDot }} />
                        {l.status}
                      </span>
                    </DcLink>
                  ))}
                </div>
              </section>
            ) : null}
            {v.reappear.show ? (
              <section className="staff-card" style={{ padding: '18px', background: '#F5EBD6', borderColor: '#E3D3A6' }}>
                <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#7A5A0B' }}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7A5A0B"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: '0 0 auto', marginRight: '6px', verticalAlign: '-2px' }}
                  >
                    <path d="M20 11a8 8 0 10-2.3 5.7" />
                    <path d="M20 4v7h-7" />
                  </svg>
                  Rishfaqje
                </h2>
                <p style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#7A5A0B' }}>Ky problem është raportuar më parë.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#7A5A0B' }}>
                  <div>
                    Raporti i mëparshëm: <strong>{v.reappear.prevId}</strong>
                  </div>
                  <div>Statusi i tij: {v.reappear.prevStatus}</div>
                </div>
                <DcLink
                  href="Raporti.dc.html"
                  onClick={v.reappear.onOpen}
                  className="tap staff-btn-secondary"
                  style={{ display: 'inline-block', padding: '7px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                >
                  Shiko raportin e mëparshëm
                </DcLink>
              </section>
            ) : null}
            <section className="staff-card" style={{ padding: '18px' }}>
              <h2 style={{ margin: '0 0 10px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Konteksti i hartës</h2>
              <div className="map-frame">
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(#E4DFD6 1px,transparent 1px),linear-gradient(90deg,#E4DFD6 1px,transparent 1px)',
                    backgroundSize: '22px 22px',
                  }}
                />
                <div className="map-pin" style={{ left: v.mapPin.left, top: v.mapPin.top }}>
                  <svg width="20" height="25" viewBox="0 0 30 38" fill="none">
                    <path d="M15 1c7.7 0 14 6.2 14 14 0 10-14 22-14 22S1 25 1 15C1 7.2 7.3 1 15 1z" fill={v.mapPin.color} stroke="#1B1917" strokeWidth="1" />
                    <circle cx="15" cy="15" r="5" fill="#FBFAF8" />
                  </svg>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>
                {v.r.zone} · {v.r.address}
              </p>
            </section>
          </div>
        </div>
      </main>
    </Shell>
  );
}
