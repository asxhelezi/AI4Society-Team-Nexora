import type { ReactNode } from 'react';
import { DcLink } from '../../components/DcLink';
import { PageHeader } from '../../components/PageHeader';
import { SatelliteCameraView } from '../../components/SatelliteCameraView';
import { Shell } from '../../components/Shell';
import { useSatelliteCamera } from '../../hooks/useSatelliteCamera';
import { useLogic } from '../../lib/dc';
import { KreuLogic } from './KreuLogic';

const NO_PROPS = {};
/** Whole number on purpose: a fractional resting zoom would leave the next
 * tile level permanently part-visible, reading as a faint ghost even at rest. */
const INITIAL_ZOOM = 15;

const SECTION_TITLE = { margin: 0, fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' } as const;

const PRIORITY_LEGEND = [
  { key: 'urgjente', label: 'Urgjente', color: '#C23B31' },
  { key: 'elarte', label: 'E lartë', color: '#B8860B' },
  { key: 'emesme', label: 'E mesme', color: '#4A4640' },
  { key: 'eulet', label: 'E ulët', color: '#8A847C' },
] as const;

const ICON = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS = {
  newReport: (
    <svg {...ICON} stroke="#1B1917">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <line x1="12" y1="13" x2="12" y2="18" />
      <line x1="9.5" y1="15.5" x2="14.5" y2="15.5" />
    </svg>
  ),
  inProgress: (
    <svg {...ICON} stroke="#4A4640">
      <polyline points="3 12 8 12 10 7 14 17 16 12 21 12" />
    </svg>
  ),
  unassigned: (
    <svg {...ICON} stroke="#B8860B">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="18" y1="8" x2="23" y2="13" />
      <line x1="23" y1="8" x2="18" y2="13" />
    </svg>
  ),
  slaRisk: (
    <svg {...ICON} stroke="#C23B31" strokeWidth={1.9}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  done: (
    <svg {...ICON} stroke="#2E7D4F">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

interface KpiCardProps {
  kpi: { count: number; sub: string; onClick: () => void };
  label: string;
  chipBg: string;
  icon: ReactNode;
  /** The SLA card reads in the critical tone. */
  critical?: boolean;
}

/** One of the five headline tiles; each opens Raportet pre-filtered. */
function KpiCard({ kpi, label, chipBg, icon, critical }: KpiCardProps) {
  return (
    <DcLink href="Raportet.dc.html" onClick={kpi.onClick} className="tap kpi-card" style={{ flex: 1, minWidth: 0, padding: '14px 16px', display: 'block' }}>
      <div className="icon-chip" style={{ background: chipBg }}>
        {icon}
      </div>
      <div
        style={{ marginTop: '10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '24px', lineHeight: 1, color: critical ? '#C23B31' : '#1B1917' }}
        className="tabular-nums"
      >
        {kpi.count}
      </div>
      {critical ? (
        <>
          <div style={{ marginTop: '5px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#A8302A' }}>{label}</div>
          <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#A8302A', opacity: 0.85 }} className="tabular-nums">
            {kpi.sub}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: '5px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#6B665F', ...ELLIPSIS }}>{label}</div>
          <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C', ...ELLIPSIS }} className="tabular-nums">
            {kpi.sub}
          </div>
        </>
      )}
    </DcLink>
  );
}

/** Kreu, the home page: today's workload, exceptions, the city map, trends and department load. */
export function Kreu() {
  const v = useLogic(KreuLogic, NO_PROPS);

  // A little real interaction on the dashboard preview too — drag/wheel/pinch
  // pan and zoom the real imagery (same camera as Harta). Pins are placed by
  // computed pixel position (never by scaling a container) so their fixed
  // size and drop-shadow never balloon into a smear at higher zoom.
  const camera = useSatelliteCamera({ initialZoom: INITIAL_ZOOM });
  const size = camera.size;
  const scaleTotal = Math.pow(2, camera.zoomLevel - INITIAL_ZOOM);
  const toScreen = (pctX: number, pctY: number) => {
    if (!size) return { x: 0, y: 0 };
    const localX = (pctX / 100) * size.w;
    const localY = (pctY / 100) * size.h;
    return { x: size.w / 2 + (localX - size.w / 2) * scaleTotal + camera.pan.x, y: size.h / 2 + (localY - size.h / 2) * scaleTotal + camera.pan.y };
  };
  const pctPoint = (leftPct: string, topPct: string) => toScreen(parseFloat(leftPct), parseFloat(topPct));

  return (
    <Shell active="kreu" scroll>
      <PageHeader title="Kreu" context={v.greeting} />
      <main className="app-pad" style={{ flex: 1, padding: '20px 28px 32px' }}>
        <div className="r-kpis" style={{ display: 'flex', gap: '12px' }}>
          <KpiCard kpi={v.kpiNew} label="Raporte të reja" chipBg="rgba(27,25,23,.06)" icon={ICONS.newReport} />
          <KpiCard kpi={v.kpiInProgress} label="Në punë" chipBg="rgba(107,102,95,.11)" icon={ICONS.inProgress} />
          <KpiCard kpi={v.kpiUnassigned} label="Pa caktuar" chipBg="rgba(184,134,11,.13)" icon={ICONS.unassigned} />
          <KpiCard kpi={v.kpiSla} label="SLA në rrezik" chipBg="rgba(194,59,49,.16)" icon={ICONS.slaRisk} critical />
          <KpiCard kpi={v.kpiDone} label="Përfunduar" chipBg="rgba(46,125,79,.13)" icon={ICONS.done} />
        </div>
        <div className="r-split" style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px', alignItems: 'stretch' }}>
          <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={SECTION_TITLE}>Kërkojnë vëmendjen tuaj</h2>
            </div>
            <div className="staff-card" style={{ padding: '2px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {v.exceptionGroups.map((g) => (
                <div key={g.label} className="exception-group" style={{ padding: '9px 0' }}>
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
              {v.exceptionsNone ? (
                <div style={{ padding: '22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#6B665F' }}>Asgjë nuk kërkon vëmendje të menjëhershme.</div>
                </div>
              ) : null}
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={SECTION_TITLE}>Problemet në qytet</h2>
              <DcLink href="Harta.dc.html" className="tap" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}>
                Hap hartën →
              </DcLink>
            </div>
            <div className="staff-card" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="map-frame">
                <div ref={camera.cameraRef} className="sat-camera sat-camera--interactive">
                  {camera.scene ? <SatelliteCameraView camera={camera} /> : null}
                </div>
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '8px',
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
                {v.mapPins.map((p) => {
                  const pt = pctPoint(p.left, p.top);
                  return (
                    <DcLink key={p.id} href="Raporti.dc.html" onClick={p.onClick} className="tap map-pin" style={{ left: pt.x, top: pt.y }} title={p.title}>
                      <svg width="20" height="25" viewBox="0 0 30 38" fill="none">
                        <path d="M15 1c7.7 0 14 6.2 14 14 0 10-14 22-14 22S1 25 1 15C1 7.2 7.3 1 15 1z" fill={p.color} stroke="#1B1917" strokeWidth="1" />
                        <circle cx="15" cy="15" r="5" fill="#FBFAF8" />
                      </svg>
                    </DcLink>
                  );
                })}
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #EFEAE2' }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', lineHeight: 1.2, letterSpacing: 0, color: '#1B1917' }} className="tabular-nums">
                  {v.mapActiveCount} raporte aktive
                </div>
                <div style={{ marginTop: '9px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {PRIORITY_LEGEND.map((p) => (
                    <span key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#4A4640' }} className="tabular-nums">
                      <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', background: p.color }} />
                      {p.label} {v.priorityCounts[p.key]}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: '10px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#6B665F' }}>
                  Zona me më shumë raportime: <span style={{ color: '#1B1917', fontWeight: 600 }}>{v.topZone.name}</span> · {v.topZone.count} raportime
                </div>
                <div style={{ marginTop: '3px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#6B665F' }}>
                  Kategoria dominante: <span style={{ color: '#1B1917', fontWeight: 600 }}>{v.topCategory.label}</span> · {v.topCategory.pct}%
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="r-split" style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px', alignItems: 'stretch' }}>
          <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={SECTION_TITLE}>Çfarë po ndryshon?</h2>
            </div>
            <div className="staff-card" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#8A847C' }}>Raporte të reja · 7 ditët e fundit</div>
              <div className="trend-chart" style={{ marginTop: '10px' }}>
                {v.trendDays.map((t, tIdx) => (
                  <div key={tIdx} className="trend-bar-col" title={`${t.label}: ${t.count}`}>
                    <div className="trend-bar-track">
                      <div className="trend-bar" style={{ height: `${t.pct}%` }} />
                    </div>
                    <span className="trend-bar-label">{t.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EFEAE2' }}>
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#8A847C', marginBottom: '4px' }}>Kategoritë në lëvizje · 30 ditë</div>
                {v.categoryTrends.map((c) => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#1B1917' }}>{c.label}</span>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 700, color: c.color }} className="tabular-nums">
                      {c.arrow}
                      {c.pct}%
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <div style={{ padding: '9px 10px', background: '#F5F2ED', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B665F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: '0 0 auto', marginTop: '2px' }}
                  >
                    <path d="M9 18h6M10 21h4" />
                    <path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
                  </svg>
                  <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#4A4640', lineHeight: 1.4 }}>{v.insightText}</span>
                </div>
              </div>
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={SECTION_TITLE}>Ngarkesa sipas departamentit</h2>
              <DcLink href="Departamentet.dc.html" className="tap" style={{ fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}>
                Detaje →
              </DcLink>
            </div>
            <div className="staff-card" style={{ padding: '8px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 6px 4px' }}>
                <span className="staff-th" style={{ padding: 0, flex: 1, minWidth: 0 }}>
                  Departamenti
                </span>
                <span className="staff-th" style={{ padding: 0, width: '44px', textAlign: 'right' }}>
                  Aktive
                </span>
                <span className="staff-th" style={{ padding: 0, width: '52px', textAlign: 'right' }}>
                  Në SLA
                </span>
                <span className="staff-th" style={{ padding: 0, width: '60px', textAlign: 'right' }}>
                  Në rrezik
                </span>
              </div>
              {v.deptTable.map((d) => (
                <DcLink key={d.id} href="Departamentet.dc.html" onClick={d.onClick} className="tap dept-table-row">
                  <span style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.name}
                  </span>
                  <span style={{ width: '44px', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }} className="tabular-nums">
                    {d.active}
                  </span>
                  <span style={{ width: '52px', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#2E7D4F' }} className="tabular-nums">
                    {d.onSla}
                  </span>
                  <span style={{ width: '60px', textAlign: 'right', fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: d.atRiskColor }} className="tabular-nums">
                    {d.atRisk}
                  </span>
                </DcLink>
              ))}
              {v.focusDept ? (
                <DcLink href="Departamentet.dc.html" onClick={v.focusDept.onClick} className="tap focus-dept-card" style={{ marginTop: 'auto', display: 'block' }}>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 700, color: '#1B1917' }}>{v.focusDept.name}</div>
                  <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#6B665F' }} className="tabular-nums">
                      {v.focusDept.active} aktive · {v.focusDept.atRisk} në rrezik
                    </span>
                    <span style={{ flex: '0 0 auto', fontFamily: "'Barlow',sans-serif", fontSize: '11px', fontWeight: 600, color: '#C23B31' }}>Shiko departamentin →</span>
                  </div>
                </DcLink>
              ) : null}
            </div>
          </section>
        </div>
        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 style={SECTION_TITLE}>Aktiviteti i fundit</h2>
          </div>
          <div className="staff-card" style={{ padding: '4px 10px' }}>
            {v.activityFeed.map((a) => (
              <DcLink key={a.key} href="Raporti.dc.html" onClick={a.onClick} className="tap activity-row">
                <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', marginTop: '5px', background: a.color }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#1B1917' }}>
                    <span style={{ fontWeight: 700 }} className="tabular-nums">
                      {a.id}
                    </span>{' '}
                    {a.text}
                  </div>
                  <div style={{ marginTop: '2px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }} className="tabular-nums">
                    {a.minutesAgo} min më parë · {a.meta}
                  </div>
                </div>
              </DcLink>
            ))}
          </div>
        </div>
      </main>
    </Shell>
  );
}
