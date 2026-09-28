import { SINJAL } from '../../data/sinjal';
import { DCLogic } from '../../lib/dc';
import { STORAGE_KEYS, readJSON, writeJSON, writeString } from '../../lib/storage';

type Tab = 'all' | 'action' | 'unread';

interface State {
  open: boolean;
  tab: Tab;
  readIds: Record<string, boolean>;
}

/** Port of NotificationBell.dc.html: tabs, read state, deep links. */
export class NotificationBellLogic extends DCLogic<Record<string, never>, State> {
  state: State = { open: false, tab: 'all', readIds: {} };

  componentDidMount() {
    this.setState({ readIds: readJSON<Record<string, boolean>>(STORAGE_KEYS.notifRead, {}) });
  }

  _persist(readIds: Record<string, boolean>) {
    writeJSON(STORAGE_KEYS.notifRead, readIds);
  }

  _markRead(id: string) {
    const readIds = Object.assign({}, this.state.readIds);
    readIds[id] = true;
    this._persist(readIds);
    this.setState({ readIds });
  }

  renderVals() {
    const data = SINJAL;
    const all = data.notifications || [];
    const readIds = this.state.readIds || {};
    const withRead = all.map((n) => Object.assign({}, n, { effectiveRead: n.read || !!readIds[n.id] }));
    const unreadCount = withRead.filter((n) => !n.effectiveRead).length;

    const filtered = withRead.filter((n) => {
      if (this.state.tab === 'action') return n.type === 'action';
      if (this.state.tab === 'unread') return !n.effectiveRead;
      return true;
    });

    const rows = filtered.map((n) => {
      const hasTarget = !!(n.reportId || n.filter);
      const onClickFn = () => {
        this._markRead(n.id);
        if (n.reportId) writeString(STORAGE_KEYS.selectedReport, n.reportId);
        if (n.filter) writeJSON(STORAGE_KEYS.reportFilter, n.filter);
        this.setState({ open: false });
      };
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        group: n.group,
        timeLabel: data.fmtTime(n.time),
        unread: !n.effectiveRead,
        readAlready: n.effectiveRead,
        linkable: hasTarget,
        notLinkable: !hasTarget,
        href: n.reportId ? 'Raporti.dc.html' : n.filter ? 'Raportet.dc.html' : '',
        onClick: onClickFn,
      };
    });

    return {
      open: this.state.open,
      isOpenAttr: (this.state.open ? 'true' : 'false') as 'true' | 'false',
      onToggle: () => this.setState({ open: !this.state.open }),
      hasUnread: unreadCount > 0,
      unreadCount: unreadCount > 9 ? '9+' : unreadCount,
      onMarkAll: () => {
        const ids: Record<string, boolean> = {};
        all.forEach((n) => {
          ids[n.id] = true;
        });
        this._persist(ids);
        this.setState({ readIds: ids });
      },
      onTabAll: () => this.setState({ tab: 'all' }),
      onTabAction: () => this.setState({ tab: 'action' }),
      onTabUnread: () => this.setState({ tab: 'unread' }),
      tabAllClass: this.state.tab === 'all' ? 'is-on' : '',
      tabActionClass: this.state.tab === 'action' ? 'is-on' : '',
      tabUnreadClass: this.state.tab === 'unread' ? 'is-on' : '',
      rows,
      emptyState: rows.length === 0,
    };
  }
}
