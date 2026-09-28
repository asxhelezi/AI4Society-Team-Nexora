import { useEffect, useRef } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { Photo } from '../../components/Photo';
import { SatelliteCameraView } from '../../components/SatelliteCameraView';
import { Shell } from '../../components/Shell';
import { useSatelliteCamera } from '../../hooks/useSatelliteCamera';
import { useLogic } from '../../lib/dc';
import { HartaLogic } from './HartaLogic';

const NO_PROPS = {};
/** Must match the `initialZoom` below, and must be a whole number: a
 * fractional resting zoom would leave the next-level tile layer permanently
 * part-visible (the cross-fade meant only for mid-zoom transitions), which
 * reads as a soft ghost/shadow doubling the imagery even at rest. */
const INITIAL_ZOOM = 16;

/** Harta: the city map with clustered pins, layers, filters, a draw-a-zone filter and a side panel. */
export function Harta() {
  const v = useLogic(HartaLogic, NO_PROPS);

  // The real Esri satellite camera (same tile source, continuous fractional
  // zoom and cross-fade as sinjal-citizen's Harta, so deep zoom never shows a
  // blank/black tile). Panning is disabled while drawing a custom zone so a
  // drag doesn't get mistaken for placing a vertex.
  const camera = useSatelliteCamera({ initialZoom: INITIAL_ZOOM, panEnabled: !v.drawMode });
  const mapRef = useRef<HTMLDivElement>(null);

  // Projects a point that used to be plain "left: x%, top: y%" of the frame
  // onto the same ground the camera's tiles are showing (same scale-about-
  // center + pixel pan). Markers keep a fixed on-screen size and are placed
  // by pixel left/top — never inside a scaled container — because scaling a
  // container also blows up any CSS filter (the pins' drop-shadow) on its
  // contents into a big soft smear at higher zoom, exactly like sinjal-
  // citizen's pins, which are also placed by computed pixel position.
  const size = camera.size;
  const scaleTotal = Math.pow(2, camera.zoomLevel - INITIAL_ZOOM);
  const toScreen = (pctX: number, pctY: number) => {
    if (!size) return { x: 0, y: 0 };
    const localX = (pctX / 100) * size.w;
    const localY = (pctY / 100) * size.h;
    return { x: size.w / 2 + (localX - size.w / 2) * scaleTotal + camera.pan.x, y: size.h / 2 + (localY - size.h / 2) * scaleTotal + camera.pan.y };
  };
  const pctPoint = (leftPct: string, topPct: string) => toScreen(parseFloat(leftPct), parseFloat(topPct));

  // In the fluid layout (tablet/phone) the filters open as a panel over the map
  // (styles/responsive.css), so start with them closed there and give the map
  // the whole width; the "Filtra" button above the map opens them.
  const initialFilters = useRef({ open: v.filtersOpen, toggle: v.onToggleFilters });
  useEffect(() => {
    const narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1099px)').matches;
    if (narrow && initialFilters.current.open) initialFilters.current.toggle();
  }, []);

  return (
    <Shell active="harta">
      <PageHeader
        title="Harta"
        context={
          <>
            <span>Elbasan, tani</span>
            <span className="harta-stat-chip">
              <b className="tabular-nums">{v.summary.total}</b> raporte
            </span>
            <span className="harta-stat-chip">
              <b className="tabular-nums">{v.summary.progress}</b> në punë
            </span>
            <span className="harta-stat-chip">
              <b className="tabular-nums">{v.summary.urgent}</b> urgjente
            </span>
            <span className="harta-stat-chip">
              <b className="tabular-nums">{v.summary.slaRisk}</b> SLA në rrezik
            </span>
            <span className="harta-stat-chip">
              <b className="tabular-nums">{v.summary.resolved}</b> zgjidhur
            </span>
            {v.compare.show ? <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: v.compare.color }}>{v.compare.text}</span> : null}
          </>
        }
      />
      <div className="app-pad r-harta" style={{ flex: 1, minHeight: 0, display: 'flex', padding: '16px 28px 18px', gap: '14px' }}>
        {v.filtersOpen ? (
          <div className="staff-card harta-filters-col" style={{ width: '238px', flex: '0 0 238px', padding: '14px 14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flex: '0 0 auto' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#8A847C' }}>Filtrat</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={v.onClearAllFilters}
                  className="tap"
                  style={{ border: 0, background: 'transparent', padding: '2px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#6B665F' }}
                >
                  Pastro
                </button>
                <button
                  type="button"
                  onClick={v.onToggleFilters}
                  className="tap"
                  style={{ border: 0, background: 'transparent', padding: '2px', color: '#6B665F', display: 'flex' }}
                  aria-label="Mbyll filtrat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Statusi</div>
              {v.statusItems.map((it, itIdx) => (
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
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Prioriteti</div>
              {v.priorityItems.map((it, itIdx) => (
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
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Departamenti</div>
              {v.departmentItems.map((it, itIdx) => (
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
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Kategoria</div>
              {v.categoryItems.map((it, itIdx) => (
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
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Koha (raportuar)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {v.periodPresets.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={p.onClick}
                    className={`tap staff-chip ${p.onClass}`}
                    style={{ padding: '5px 9px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {v.periodCustomShow ? (
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="date" value={v.periodFrom} onChange={v.onPeriodFrom} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                  <span style={{ color: '#8A847C', fontSize: '11px', flex: '0 0 auto' }}>deri</span>
                  <input type="date" value={v.periodTo} onChange={v.onPeriodTo} className="staff-input" style={{ padding: '6px 7px', fontSize: '11px', flex: 1, minWidth: 0 }} />
                </div>
              ) : null}
              <div style={{ marginTop: '8px' }}>
                <button type="button" onClick={v.onToggleCompare} className="tap filter-check-row" style={{ width: 'auto', padding: '2px' }}>
                  <span className={`check-box ${v.compareClass}`}>
                    {v.comparePeriod ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F5F2ED" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </span>{' '}
                  Krahaso me periudhën e mëparshme
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">SLA</div>
              {v.slaItems.map((it, itIdx) => (
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
            <div style={{ marginBottom: '13px' }}>
              <div className="filter-group-title">Automatizimi</div>
              {v.automationItems.map((it, itIdx) => (
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
            <div>
              <div className="filter-group-title">Zona</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {v.zonaModes.map((z, zIdx) => (
                  <button
                    key={zIdx}
                    type="button"
                    onClick={z.onClick}
                    className={`tap staff-chip ${z.onClass}`}
                    style={{ padding: '5px 9px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600 }}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
              {v.zonaListShow ? (
                <div style={{ marginTop: '8px' }}>
                  {v.zoneItems.map((it, itIdx) => (
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
              ) : null}
              {v.zonaDrawShow ? (
                <div style={{ marginTop: '8px', padding: '9px 10px', background: '#F5F2ED', borderRadius: '10px' }}>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640', lineHeight: 1.4 }}>{v.drawHint}</div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                    {v.drawMode ? (
                      <>
                        <button
                          type="button"
                          onClick={v.onFinishDraw}
                          className={`tap staff-btn-primary ${v.finishDisabledClass}`}
                          style={{ flex: 1, padding: '6px 8px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Përfundo zonën
                        </button>
                        <button
                          type="button"
                          onClick={v.onCancelDraw}
                          className="tap staff-btn-secondary"
                          style={{ flex: '0 0 auto', padding: '6px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                        >
                          Anulo
                        </button>
                      </>
                    ) : null}
                    {v.drawModeOff ? (
                      <button
                        type="button"
                        onClick={v.onStartDraw}
                        className="tap staff-btn-secondary"
                        style={{ flex: 1, padding: '6px 8px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                      >
                        Vizato zonën në hartë
                      </button>
                    ) : null}
                  </div>
                  {v.customZoneActiveShow ? (
                    <button
                      type="button"
                      onClick={v.onClearCustomZone}
                      className="tap"
                      style={{ marginTop: '6px', border: 0, background: 'transparent', padding: '2px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#C23B31' }}
                    >
                      Hiq zonën e vizatuar ×
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="r-harta-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flex: '0 0 auto', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {v.filtersClosed ? (
                <button
                  type="button"
                  onClick={v.onToggleFilters}
                  className="tap staff-btn-secondary"
                  style={{ padding: '7px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>{' '}
                  Filtra{' '}
                  {v.activeFilterBadge.show ? (
                    <span
                      className="tabular-nums"
                      style={{
                        minWidth: '15px',
                        height: '15px',
                        padding: '0 3px',
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
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {v.legendItems.map((l, lIdx) => (
                  <span key={lIdx} className="harta-legend-chip">
                    <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', background: l.color }} />
                    {l.label} <span className="tabular-nums">({l.count})</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="harta-layers-wrap">
              <button type="button" onClick={v.onToggleLayersMenu} className={`tap harta-layers-btn ${v.layersMenuBtnClass}`} aria-label="Shtresat e hartës">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </button>
              {v.layersMenuShow ? (
                <div className="harta-layers-menu">
                  {v.layers.map((ly, lyIdx) => (
                    <button key={lyIdx} type="button" onClick={ly.onClick} className={`tap harta-layers-menu-item ${ly.onClass}`}>
                      <span className="harta-layers-menu-icon">
                        {ly.isRaporte ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        ) : null}
                        {ly.isIntensiteti ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 1 1-15 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2 1z" />
                          </svg>
                        ) : null}
                        {ly.isDepartamentet ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="21" x2="21" y2="21" />
                            <path d="M5 21V9l7-5 7 5v12" />
                            <line x1="9" y1="21" x2="9" y2="13" />
                            <line x1="15" y1="21" x2="15" y2="13" />
                          </svg>
                        ) : null}
                        {ly.isSla ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : null}
                      </span>{' '}
                      {ly.label}{' '}
                      {ly.isActive ? (
                        <span className="harta-layers-menu-check">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div
            ref={mapRef}
            className="harta-map-frame"
            onClick={v.onMapClick}
            onDoubleClick={() => {
              if (!v.drawMode) camera.zoomIn();
            }}
          >
            <div ref={camera.cameraRef} className={`sat-camera${v.drawMode ? '' : ' sat-camera--interactive'}`}>
              {camera.scene ? <SatelliteCameraView camera={camera} /> : null}
            </div>
            {/* Fixed to the frame, not the camera's pan/zoom — a corner label, not a
                ground feature (matches sinjal-citizen's fixed "Imagery © Esri" credit). */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '12px',
                top: '10px',
                pointerEvents: 'none',
                fontFamily: "'Barlow',sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#8A847C',
              }}
            >
              Elbasan
            </span>
            <div className="harta-map-inner">
              {v.heatLayerShow ? (
                <>
                  {v.heatBlobs.map((b, bIdx) => {
                    const pt = pctPoint(b.left, b.top);
                    const sizePx = (parseFloat(b.size) / 100) * (size ? size.w : 0) * scaleTotal;
                    return <div key={bIdx} className="harta-heat-blob" style={{ left: pt.x, top: pt.y, width: sizePx, height: sizePx, background: b.bg }} />;
                  })}
                </>
              ) : null}
              {v.pinsLayerShow ? (
                <>
                  {v.pins.map((p, pIdx) => {
                    const pt = pctPoint(p.left, p.top);
                    return (
                      <button key={pIdx} type="button" onClick={p.onClick} className="tap harta-pin" style={{ left: pt.x, top: pt.y }} title={p.title} aria-label={p.title}>
                        <svg width="22" height="28" viewBox="0 0 30 38" fill="none">
                          <path d="M15 1c7.7 0 14 6.2 14 14 0 10-14 22-14 22S1 25 1 15C1 7.2 7.3 1 15 1z" fill={p.color} stroke="#1B1917" strokeWidth="1" />
                          <circle cx="15" cy="15" r="5" fill="#FBFAF8" />
                        </svg>
                      </button>
                    );
                  })}
                  {v.clusters.map((c, cIdx) => {
                    const pt = pctPoint(c.left, c.top);
                    return (
                      <button key={cIdx} type="button" onClick={c.onClick} className="tap harta-cluster" style={{ left: pt.x, top: pt.y }} title={c.title}>
                        <span className="harta-cluster-badge" style={{ width: c.size, height: c.size }}>
                          <svg className="harta-cluster-ring" viewBox="0 0 40 40">
                            <circle cx="20" cy="20" r="17" fill="#FBFAF8" stroke="#E4DFD6" strokeWidth="2" />
                            {c.ring.map((seg, segIdx) => (
                              <circle
                                key={segIdx}
                                cx="20"
                                cy="20"
                                r="17"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="4.5"
                                pathLength="100"
                                strokeDasharray={seg.dasharray}
                                strokeDashoffset={seg.dashoffset}
                                transform="rotate(-90 20 20)"
                              />
                            ))}
                          </svg>
                          <span className="harta-cluster-count" style={{ fontSize: c.fontSize }}>
                            {c.count}
                          </span>
                        </span>
                        <span className="harta-cluster-label">{c.zoneLabel}</span>
                      </button>
                    );
                  })}
                </>
              ) : null}
              {v.drawOverlayShow ? (
                <svg width={size ? size.w : 0} height={size ? size.h : 0} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {v.drawPolylineShow ? (
                    <polyline points={v.drawDots.map((d) => { const pt = pctPoint(d.cx, d.cy); return `${pt.x},${pt.y}`; }).join(' ')} fill="none" stroke="#C23B31" strokeWidth="2" />
                  ) : null}
                  {v.drawDots.map((d, dIdx) => {
                    const pt = pctPoint(d.cx, d.cy);
                    return <circle key={dIdx} cx={pt.x} cy={pt.y} r="3" fill="#C23B31" />;
                  })}
                </svg>
              ) : null}
              {v.customPolygonShow ? (
                <svg width={size ? size.w : 0} height={size ? size.h : 0} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <polygon
                    points={v.customPolygonPoints.map((p) => { const pt = toScreen(p.x, p.y); return `${pt.x},${pt.y}`; }).join(' ')}
                    fill="rgba(194,59,49,.12)"
                    stroke="#C23B31"
                    strokeWidth="2"
                  />
                </svg>
              ) : null}
            </div>
            <div className="harta-zoom-float" onClick={v.onZoomWrapClick}>
              <span className="harta-zoom-float-label">{v.zoomLabel}</span>
              <div className="harta-zoom-float-pill">
                <button type="button" onClick={camera.zoomIn} className="tap harta-zoom-float-btn" aria-label="Zmadho">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <div className="harta-zoom-float-divider" />
                <button type="button" onClick={camera.zoomOut} className="tap harta-zoom-float-btn" aria-label="Largohu">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
            {v.drawBannerShow ? (
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  padding: '7px 12px',
                  background: '#1B1917',
                  color: '#F5F2ED',
                  borderRadius: '999px',
                  fontFamily: "'Barlow',sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Kliko në hartë për të shtuar pika ({v.drawPointCount})
              </div>
            ) : null}
            {v.sidePanelShow ? (
              <div className="harta-side-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 10px 0' }}>
                  <button type="button" onClick={v.onCloseSidePanel} className="tap" style={{ border: 0, background: 'transparent', color: '#8A847C', padding: '4px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </svg>
                  </button>
                </div>
                {v.sidePanelIsReport ? (
                  <div style={{ padding: '0 18px 18px' }}>
                    <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: '#6B665F' }}>
                      {v.sidePanelReport.id}
                    </span>
                    <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', color: '#1B1917', lineHeight: 1.3 }}>{v.sidePanelReport.title}</div>
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {v.sidePanelReport.zone} · {v.sidePanelReport.address}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span className="status-pill" style={{ background: v.sidePanelReport.statusBg, color: v.sidePanelReport.statusInk }}>
                        <span className="status-dot" style={{ background: v.sidePanelReport.statusDot }} />
                        {v.sidePanelReport.status}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: "'Barlow',sans-serif",
                          fontSize: '12px',
                          fontWeight: 700,
                          color: v.sidePanelReport.priorityColor,
                        }}
                      >
                        <span className="status-dot" style={{ background: v.sidePanelReport.priorityColor }} />
                        {v.sidePanelReport.priority}
                      </span>
                    </div>
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #EFEAE2', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                      <div style={{ color: '#8A847C', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Departamenti</div> {v.sidePanelReport.department} · {v.sidePanelReport.responsible}
                    </div>
                    <div style={{ marginTop: '10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px' }}>
                      <div style={{ color: '#8A847C', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>SLA</div>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: v.sidePanelReport.slaColor }}>
                        {v.sidePanelReport.sla}
                      </span>
                    </div>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #EFEAE2', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640', lineHeight: 1.5 }}>
                      "{v.sidePanelReport.description}"
                    </div>
                    <Photo src={v.sidePanelReport.photo} alt="" style={{ marginTop: '10px', width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    <div style={{ marginTop: '8px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>Raportuar: {v.sidePanelReport.submittedLabel}</div>
                    <DcLink
                      href="Raporti.dc.html"
                      onClick={v.sidePanelReport.onOpen}
                      className="tap staff-btn-primary"
                      style={{ marginTop: '12px', display: 'block', textAlign: 'center', padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                    >
                      Shiko raportin →
                    </DcLink>
                    {v.nearbyShow ? (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                        <div className="filter-group-title">Raporte pranë këtij problemi ({v.nearby.length})</div>
                        {v.nearby.map((n, nIdx) => (
                          <DcLink key={nIdx} href="Raporti.dc.html" onClick={n.onClick} className="tap harta-nearby-row">
                            <span className="tabular-nums" style={{ flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 700, color: '#6B665F' }}>
                              {n.id}
                            </span>
                            <span style={{ minWidth: 0, fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.title}
                            </span>
                          </DcLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {v.sidePanelIsCluster ? (
                  <div style={{ padding: '0 18px 18px' }}>
                    <div className="tabular-nums" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '24px', color: '#1B1917', lineHeight: 1 }}>
                      {v.sidePanelCluster.count} raporte
                    </div>
                    <div style={{ marginTop: '4px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F' }}>{v.sidePanelCluster.label}</div>
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                      {v.sidePanelCluster.breakdown.map((b, bIdx) => (
                        <div key={bIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                            <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', background: b.color }} />
                            {b.label}
                          </span>
                          <span className="tabular-nums" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <DcLink
                      href="Raportet.dc.html"
                      onClick={v.sidePanelCluster.onViewList}
                      className="tap staff-btn-primary"
                      style={{ marginTop: '14px', display: 'block', textAlign: 'center', padding: '9px 10px', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700 }}
                    >
                      Shiko listën →
                    </DcLink>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
