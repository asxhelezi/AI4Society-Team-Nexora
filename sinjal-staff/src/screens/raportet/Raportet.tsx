import { Fragment } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Shell } from '../../components/Shell';
import { useLogic } from '../../lib/dc';
import { RaportetLogic } from './RaportetLogic';

const NO_PROPS = {};

/** Raportet: the paginated report list with search, filters, saved filters and bulk actions. */
export function Raportet() {
  const v = useLogic(RaportetLogic, NO_PROPS);

  return (
    <Shell active="raportet" scroll overlay={v.panelOpen ? <div onClick={v.onTogglePanel} style={{ position: 'absolute', inset: 0, zIndex: 55 }} /> : null}>
      <PageHeader title="Raportet" context={v.resultsLabel} />
      <div className="app-pad" style={{ padding: '20px 28px 0', flex: '0 0 auto' }}>
        <div className="r-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div className="r-search" style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px', maxWidth: '420px' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8A847C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '11px', top: '11px', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={v.search}
              onChange={v.onSearch}
              placeholder="Kërko sipas ID, titullit, përshkrimit ose adresës…"
              className="staff-input"
              style={{ width: '100%', padding: '9px 12px 9px 32px' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button
              type="button"
              onClick={v.onTogglePanel}
              className={`tap staff-btn-secondary ${v.panelBtnClass}`}
              style={{ padding: '9px 14px', display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>{' '}
              Filtra{' '}
              {v.activeFilterBadge.show ? (
                <span
                  className="tabular-nums"
                  style={{
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '999px',
                    background: '#C23B31',
                    color: '#F5F2ED',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {v.activeFilterBadge.n}
                </span>
              ) : null}
            </button>
            {v.panelOpen ? (
              <div className="panel r-filter-panel" style={{ top: '44px', left: 0, width: '700px', maxHeight: '600px', overflowY: 'auto', padding: '16px 18px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div className="filter-group-title" style={{ marginBottom: 0 }}>
                      Filtrat e ruajtur
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={v.onClearAll}
                        className="tap"
                        style={{ border: 0, background: 'transparent', padding: '2px 4px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#6B665F' }}
                      >
                        Pastro të gjitha filtrat
                      </button>
                      <button
                        type="button"
                        onClick={v.onOpenSaving}
                        className="tap"
                        style={{ border: 0, background: 'transparent', padding: '2px 4px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}
                      >
                        + Ruaj filtrin aktual
                      </button>
                    </div>
                  </div>
                  {v.savingOpen ? (
                    <div style={{ padding: '10px', background: '#F5F2ED', borderRadius: '10px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={v.savingName}
                        onChange={v.onSavingNameChange}
                        placeholder="Emri: p.sh. Infrastrukturë — SLA në rrezik"
                        className="staff-input"
                        style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
                      />
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <button type="button" onClick={v.onToggleSavingDefault} className="tap filter-check-row" style={{ width: 'auto', padding: '2px' }}>
                          <span className={`check-box ${v.savingDefaultClass}`}>
                            {v.savingDefault ? (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : null}
                          </span>{' '}
                          Përdore si filtër të paracaktuar
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={v.onCancelSaving}
                            className="tap"
                            style={{ border: 0, background: 'transparent', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}
                          >
                            Anulo
                          </button>
                          <button
                            type="button"
                            onClick={v.onSaveCurrent}
                            className="tap staff-btn-primary"
                            style={{ padding: '6px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                          >
                            Ruaj
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {v.savedFilterRows.map((sf, sfIdx) => (
                    <div key={sfIdx} className="saved-filter-row">
                      <button
                        type="button"
                        onClick={sf.onApply}
                        className="tap"
                        style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{ flex: '0 0 auto', display: 'flex' }} aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#C23B31" stroke="none">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: "'Barlow',sans-serif",
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#1B1917',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {sf.name}
                          </span>
                          <span style={{ display: 'block', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>{sf.resultLabel}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={sf.onDelete}
                        className="tap"
                        style={{ flex: '0 0 auto', border: 0, background: 'transparent', color: '#B0AAA0', padding: '4px', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {v.savedFiltersEmpty ? <div style={{ padding: '6px 8px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#8A847C' }}>Ende pa filtra të ruajtur.</div> : null}
                </div>
                <div style={{ paddingTop: '12px', borderTop: '1px solid #EFEAE2', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px 20px' }} className="r-filter-grid">
                  {v.filterGroups.map((grp, grpIdx) => (
                    <div key={grpIdx} style={{ marginBottom: '14px' }}>
                      <div className="filter-group-title">{grp.title}</div>
                      {grp.items.map((it, itIdx) => (
                        <button key={itIdx} type="button" onClick={it.onClick} className="tap filter-check-row">
                          <span className={`check-box ${it.onClass}`}>
                            {it.isOn ? (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : null}
                          </span>{' '}
                          {it.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: '8px', borderTop: '1px solid #EFEAE2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="r-filter-grid">
                  <div>
                    <div className="filter-group-title">Data e raportimit</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {v.reportedPresets.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={p.onClick}
                          className={`tap staff-chip ${p.onClass}`}
                          style={{ padding: '5px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {v.reportedCustomShow ? (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="date" value={v.reportedFrom} onChange={v.onReportedFrom} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                        <span style={{ color: '#8A847C', fontSize: '11px', flex: '0 0 auto' }}>deri</span>
                        <input type="date" value={v.reportedTo} onChange={v.onReportedTo} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className="filter-group-title">Përditësuar</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {v.updatedPresets.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={p.onClick}
                          className={`tap staff-chip ${p.onClass}`}
                          style={{ padding: '5px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {v.updatedCustomShow ? (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="date" value={v.updatedFrom} onChange={v.onUpdatedFrom} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                        <span style={{ color: '#8A847C', fontSize: '11px', flex: '0 0 auto' }}>deri</span>
                        <input type="date" value={v.updatedTo} onChange={v.onUpdatedTo} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ flex: 1 }} />
          <div className="r-sort" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto', position: 'relative' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F', whiteSpace: 'nowrap' }}>Rendit sipas:</span>
            <button
              type="button"
              onClick={v.onToggleSort}
              className="tap staff-select"
              style={{ padding: '8px 10px', display: 'inline-flex', alignItems: 'center', gap: '7px', border: '1px solid #D9D4CC' }}
            >
              {v.sortLabel}{' '}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {v.sortOpen ? (
              <div className="panel" style={{ top: '38px', right: 0, width: '230px', padding: '6px' }}>
                {v.sortOptions.map((o, oIdx) => (
                  <button key={oIdx} type="button" onClick={o.onClick} className={`tap sort-option-row ${o.onClass}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="r-chips" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {v.quickChips.map((c, cIdx) => (
            <button
              key={cIdx}
              type="button"
              onClick={c.onClick}
              className={`tap staff-chip ${c.onClass}`}
              style={{ padding: '6px 14px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {v.incomingChips.map((ic, icIdx) => (
          <div key={icIdx} style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={ic.onClear}
              className="tap staff-chip is-on"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 6px 6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
            >
              {ic.label}{' '}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <main className="app-pad" style={{ flex: 1, padding: '16px 28px 40px' }}>
        {v.exportNotice ? (
          <div style={{ marginBottom: '12px', padding: '9px 14px', borderRadius: '10px', background: '#E1EEE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1E5C3A' }}>{v.exportNoticeText}</span>
            <button type="button" onClick={v.onDismissExport} className="tap" style={{ border: 0, background: 'transparent', color: '#1E5C3A', padding: '2px' }}>
              ✕
            </button>
          </div>
        ) : null}
        {v.bulkBar.show ? (
          <div className="bulk-bar" style={{ marginBottom: '12px' }}>
            <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#F5F2ED' }}>
              {v.bulkBar.count} të zgjedhura
            </span>
            <span style={{ width: '1px', height: '18px', background: 'rgba(245,242,237,.2)', flex: '0 0 auto' }} />
            <select onChange={v.bulkBar.onDept} value={v.bulkBar.deptDraft} className="staff-select" style={{ padding: '6px 8px', fontSize: '12px' }}>
              <option value="">Cakto departamentin…</option>
              {v.bulkBar.deptOptions.map((o, oIdx) => (
                <option key={oIdx} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select onChange={v.bulkBar.onStatus} value={v.bulkBar.statusDraft} className="staff-select" style={{ padding: '6px 8px', fontSize: '12px' }}>
              <option value="">Ndrysho statusin…</option>
              {v.bulkBar.statusOptions.map((o, oIdx) => (
                <option key={oIdx} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select onChange={v.bulkBar.onPriority} value={v.bulkBar.priorityDraft} className="staff-select" style={{ padding: '6px 8px', fontSize: '12px' }}>
              <option value="">Ndrysho prioritetin…</option>
              {v.bulkBar.priorityOptions.map((o, oIdx) => (
                <option key={oIdx} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={v.bulkBar.onExport}
              className="tap"
              style={{
                border: '1px solid rgba(245,242,237,.3)',
                background: 'transparent',
                color: '#F5F2ED',
                borderRadius: '8px',
                padding: '6px 12px',
                fontFamily: "'Barlow',sans-serif",
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Eksporto
            </button>
            {v.bulkBar.confirmShow ? (
              <>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#F5F2ED' }}>{v.bulkBar.confirmLabel}</span>
                <button
                  type="button"
                  onClick={v.bulkBar.onConfirm}
                  className="tap"
                  style={{ background: '#C23B31', color: '#F5F2ED', border: 0, borderRadius: '8px', padding: '6px 12px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700 }}
                >
                  Konfirmo
                </button>
                <button
                  type="button"
                  onClick={v.bulkBar.onCancelConfirm}
                  className="tap"
                  style={{ border: 0, background: 'transparent', color: '#F5F2ED', padding: '6px 4px', fontFamily: "'Barlow',sans-serif", fontSize: '12px' }}
                >
                  Anulo
                </button>
              </>
            ) : null}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={v.bulkBar.onClearSelection} className="tap" style={{ border: 0, background: 'transparent', color: '#F5F2ED', opacity: 0.75, padding: '4px' }}>
              ✕
            </button>
          </div>
        ) : null}
        <div className="staff-card" style={{ overflow: 'hidden' }} role="table" aria-label="Lista e raporteve">
          <div className="r-thead" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E4DFD6' }} role="row">
            <span style={{ width: '34px', flex: '0 0 auto' }} />
            <span className="staff-th r-c-id" style={{ width: '74px', flex: '0 0 auto' }}>
              ID
            </span>
            <span className="staff-th r-c-title" style={{ flex: 1, minWidth: '200px' }}>
              Titulli
            </span>
            <span className="staff-th r-c-zone" style={{ width: '100px', flex: '0 0 auto' }}>
              Vendndodhja
            </span>
            <span className="staff-th r-c-cat" style={{ width: '136px', flex: '0 0 auto' }}>
              Kategoria
            </span>
            <span className="staff-th r-c-dept" style={{ width: '136px', flex: '0 0 auto' }}>
              Departamenti
            </span>
            <span className="staff-th r-c-status" style={{ width: '150px', flex: '0 0 auto' }}>
              Statusi
            </span>
            <span className="staff-th r-c-sla" style={{ width: '112px', flex: '0 0 auto' }}>
              SLA
            </span>
            <span className="staff-th r-c-upd" style={{ width: '104px', flex: '0 0 auto' }}>
              Përditësuar
            </span>
          </div>
          {v.rows.map((r, rIdx) => (
            <div key={rIdx} className="report-row-link tap" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E4DFD6' }}>
              <span style={{ width: '34px', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button type="button" onClick={r.onToggleSelect} className={`tap check-box ${r.checkClass}`} aria-label="Zgjidh raportin">
                  {r.isSelected ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>
              </span>
              <DcLink href="Raporti.dc.html" onClick={r.onClick} role="row" className="r-row" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <span className="staff-td tabular-nums r-c-id" style={{ width: '74px', flex: '0 0 auto', color: '#6B665F', fontWeight: 600 }}>
                  {r.id}
                </span>
                <span className="staff-td r-c-title" style={{ flex: 1, minWidth: '200px', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ minWidth: 0, fontWeight: 500, color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                  {r.reappeared ? (
                    <span
                      title="Rishfaqur"
                      style={{
                        flex: '0 0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(194,59,49,.13)',
                        color: '#C23B31',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      ↻
                    </span>
                  ) : null}
                </span>
                <span
                  className="staff-td r-c-zone"
                  style={{ width: '100px', flex: '0 0 auto', color: '#6B665F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={r.address}
                >
                  {r.zone}
                </span>
                <span
                  className="staff-td r-c-cat"
                  style={{ width: '136px', flex: '0 0 auto', color: '#6B665F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={r.category}
                >
                  {r.category}
                </span>
                <span
                  className="staff-td r-c-dept"
                  style={{ width: '136px', flex: '0 0 auto', color: '#6B665F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={r.department}
                >
                  {r.department}
                </span>
                <span className="staff-td r-c-status" style={{ width: '150px', flex: '0 0 auto', overflow: 'hidden' }}>
                  <span className="status-pill" style={{ background: r.statusBg, color: r.statusInk }}>
                    <span className="status-dot" style={{ background: r.statusDot }} />
                    {r.status}
                  </span>
                </span>
                <span className="staff-td r-c-sla" style={{ width: '112px', flex: '0 0 auto', paddingTop: '7px', paddingBottom: '7px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: r.priorityColor }}>
                    <span className="status-dot" style={{ background: r.priorityColor }} />
                    {r.priority}
                  </div>
                  <div className="tabular-nums" style={{ marginTop: '2px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: r.slaColor }}>
                    {r.sla}
                  </div>
                </span>
                <span className="staff-td r-c-upd" style={{ width: '104px', flex: '0 0 auto', color: '#8A847C', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {r.updatedLabel}
                </span>
              </DcLink>
            </div>
          ))}
          {v.emptyState ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '15px', color: '#1B1917', marginBottom: '4px' }}>Asnjë raport nuk përputhet</div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F', marginBottom: '14px' }}>Provoni të hiqni disa filtra ose ndryshoni kërkimin.</div>
              <button type="button" onClick={v.onClearAll} className="tap staff-btn-secondary" style={{ padding: '8px 16px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600 }}>
                Pastro filtrat
              </button>
            </div>
          ) : null}
          {v.pagination.show ? (
            <div className="pager" style={{ borderTop: 0 }}>
              <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                {v.pagination.label}
              </span>
              <div className="pager-btns">
                <button type="button" onClick={v.pagination.onPrev} className={`tap icon-btn ${v.pagination.prevClass}`} aria-label="Faqja e mëparshme">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                {v.pagination.nums.map((pn, pnIdx) => (
                  <Fragment key={pnIdx}>
                    {pn.isNum ? (
                      <button type="button" onClick={pn.onClick} className={`tap pager-num ${pn.onClass} tabular-nums`}>
                        {pn.n}
                      </button>
                    ) : null}
                    {pn.isGap ? <span className="pager-gap">…</span> : null}
                  </Fragment>
                ))}
                <button type="button" onClick={v.pagination.onNext} className={`tap icon-btn ${v.pagination.nextClass}`} aria-label="Faqja tjetër">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}
