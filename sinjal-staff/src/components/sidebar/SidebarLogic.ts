import { SINJAL } from '../../data/sinjal';
import { DCLogic } from '../../lib/dc';

export type NavKey = 'kreu' | 'raportet' | 'harta' | 'departamentet' | 'automatizimet' | 'performanca';

export interface NavState {
  bg: string;
  color: string;
  current: 'page' | 'false';
  shadow: string;
}

interface Props {
  active?: NavKey;
}

interface State {
  menuOpen: boolean;
}

/** Port of the Sidebar.dc.html logic: nav highlight + profile menu. */
export class SidebarLogic extends DCLogic<Props, State> {
  state: State = { menuOpen: false };

  _state(key: NavKey, active: NavKey): NavState {
    const isActive = key === active;
    return {
      bg: isActive ? '#C23B31' : 'transparent',
      color: isActive ? '#F5F2ED' : 'rgba(245,242,237,.65)',
      current: isActive ? 'page' : 'false',
      shadow: isActive ? '0 4px 12px rgba(194,59,49,.35)' : 'none',
    };
  }

  renderVals() {
    const active = this.props.active || 'kreu';
    const open = !!this.state.menuOpen;
    return {
      menuOpen: open,
      menuOpenAttr: (open ? 'true' : 'false') as 'true' | 'false',
      chevron: open ? 'rotate(180deg)' : 'rotate(0deg)',
      profileBg: open ? 'rgba(245,242,237,.06)' : 'transparent',
      onToggleMenu: () => this.setState({ menuOpen: !open }),
      onCloseMenu: () => this.setState({ menuOpen: false }),
      logoUrl: SINJAL.assets.logo || '',
      navKreu: this._state('kreu', active),
      navRaportet: this._state('raportet', active),
      navHarta: this._state('harta', active),
      navDepartamentet: this._state('departamentet', active),
      navAutomatizimet: this._state('automatizimet', active),
      navPerformanca: this._state('performanca', active),
    };
  }
}
