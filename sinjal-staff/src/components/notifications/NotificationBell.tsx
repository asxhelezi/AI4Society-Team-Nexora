import { useLogic } from '../../lib/dc';
import { DcLink } from '../DcLink';
import { NotificationBellLogic } from './NotificationBellLogic';

const ROW_STYLE = { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '11px 16px', borderBottom: '1px solid #E4DFD6' } as const;
const NO_PROPS = {};

type Row = ReturnType<NotificationBellLogic['renderVals']>['rows'][number];

function RowBody({ n }: { n: Row }) {
  return (
    <>
      {n.unread ? <span className="notif-unread-dot" style={{ marginTop: '5px' }} /> : <span style={{ width: '7px', flex: '0 0 auto' }} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', fontWeight: 600, color: '#1B1917', lineHeight: 1.35 }}>{n.title}</div>
        <div style={{ marginTop: '2px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', color: '#6B665F', lineHeight: 1.4 }}>{n.body}</div>
        <div style={{ marginTop: '4px', fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: '#8A847C' }}>
          {n.timeLabel} · {n.group}
        </div>
      </div>
    </>
  );
}

/** The only global control in the page header. */
export function NotificationBell() {
  const v = useLogic(NotificationBellLogic, NO_PROPS);

  return (
    <div className="bell-wrap" style={{ width: '40px', height: '40px', position: 'relative' }}>
      <button type="button" onClick={v.onToggle} aria-label="Njoftimet" aria-expanded={v.isOpenAttr} className="tap bell-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B1917" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
          <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
        {v.hasUnread ? <span className="bell-badge">{v.unreadCount}</span> : null}
      </button>

      {v.open ? (
        <div className="panel bell-panel" style={{ top: '46px', right: 0, width: '380px', maxHeight: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E4DFD6' }}>
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: 0, color: '#1B1917' }}>Njoftimet</span>
            <button
              type="button"
              onClick={v.onMarkAll}
              className="tap"
              style={{ border: 0, background: 'transparent', padding: '4px 2px', fontFamily: "'Barlow',sans-serif", fontSize: '12px', fontWeight: 600, color: '#C23B31' }}
            >
              Shëno të gjitha si lexuar
            </button>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #E4DFD6', padding: '0 8px' }}>
            <button type="button" onClick={v.onTabAll} className={`panel-tab ${v.tabAllClass}`} style={{ border: 0, background: 'transparent' }}>
              Të gjitha
            </button>
            <button type="button" onClick={v.onTabAction} className={`panel-tab ${v.tabActionClass}`} style={{ border: 0, background: 'transparent' }}>
              Kërkojnë veprim
            </button>
            <button type="button" onClick={v.onTabUnread} className={`panel-tab ${v.tabUnreadClass}`} style={{ border: 0, background: 'transparent' }}>
              Të palexuara
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {v.rows.map((n) =>
              n.linkable ? (
                <DcLink key={n.id} href={n.href} onClick={n.onClick} className="tap notif-row" style={ROW_STYLE}>
                  <RowBody n={n} />
                </DcLink>
              ) : (
                <div key={n.id} className="notif-row" style={ROW_STYLE}>
                  <RowBody n={n} />
                </div>
              ),
            )}
            {v.emptyState ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: '#8A847C' }}>Asnjë njoftim në këtë kategori.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
