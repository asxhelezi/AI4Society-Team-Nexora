/**
 * Typed access to the shared staff-side layout (window.SinjalLayout).
 *
 * public/sinjal-layout.js is a verbatim copy of shared/layout/sinjal-layout.js
 * (run `node shared/layout/sync.mjs staff` after editing the source). index.html
 * loads it as a classic script and sets window.SINJAL_APP = 'staff'; the sidebar,
 * profile menu and identity all come from it so the four staff-side apps show
 * the same chrome. See shared/layout/README.md for the config schema.
 */

export type AppKey = 'admin' | 'managerial' | 'department' | 'staff';

/** The app this bundle is. */
export const APP: AppKey = 'staff';

export type BadgeTone = 'alert' | 'neutral';

export interface LayoutOrg {
  name: string;
  sub: string;
  icon: string;
  dot?: string;
}

export interface LayoutNavItemConfig {
  key: string;
  label: string;
  href: string;
  /** Inner markup of a 24×24 SVG drawn with stroke="currentColor". */
  icon: string;
  badgeKey?: string;
  roles?: string[];
}

export interface LayoutSectionConfig {
  label?: string;
  items: LayoutNavItemConfig[];
}

export type LayoutMenuItem =
  | { divider: true }
  | {
      divider?: false;
      label: string;
      href?: string;
      icon?: string;
      action?: 'logout';
      tone?: 'danger';
      roles?: string[];
    };

export interface LayoutAppConfig {
  subtitle: string;
  home: string;
  logo: string | null;
  org: LayoutOrg | null;
  navLabel: string;
  sections: LayoutSectionConfig[];
  profileMenu: LayoutMenuItem[];
}

export interface LayoutBadge {
  count: number;
  text: string;
  tone: BadgeTone;
  label: string;
}

/** A nav item as SinjalLayout.nav() resolves it: role-filtered, with active flag and badge. */
export interface LayoutNavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  active: boolean;
  badge: LayoutBadge | null;
}

export interface LayoutSection {
  /** '' when the section has no label. */
  label: string;
  items: LayoutNavItem[];
}

export interface LayoutUser {
  id: string | null;
  name: string;
  short: string;
  initials: string;
  title: string;
  menuTitle: string;
  roles: string[];
}

export interface SinjalLayoutApi {
  version: number;
  icons: Record<string, string>;
  apps: Record<AppKey, LayoutAppConfig>;
  demoUsers: Record<AppKey, LayoutUser>;
  auth: { sessionKey: string; loginUrl: string | null; onLogout: ((appKey: AppKey) => void) | null };
  app(): AppKey | null;
  config(appKey?: AppKey): LayoutAppConfig | null;
  currentUser(appKey?: AppKey): LayoutUser;
  logout(): void;
  canSee(item: { roles?: string[] }, user?: LayoutUser): boolean;
  nav(appKey?: AppKey, active?: string): LayoutSection[];
  profileMenu(appKey?: AppKey): LayoutMenuItem[];
}

declare global {
  interface Window {
    SINJAL_APP?: AppKey;
    SINJAL_LOGO?: string;
    SinjalLayout?: SinjalLayoutApi;
  }
}

function api(): SinjalLayoutApi | null {
  if (typeof window === 'undefined') return null;
  if (!window.SinjalLayout) {
    console.error('[layout] window.SinjalLayout missing: index.html must load /sinjal-layout.js (run `node shared/layout/sync.mjs staff`).');
    return null;
  }
  return window.SinjalLayout;
}

const NO_USER: LayoutUser = { id: null, name: '', short: '', initials: '', title: '', menuTitle: '', roles: [] };

/** The staff app's layout config (subtitle, home, nav label, …). */
export function config(): LayoutAppConfig | null {
  return api()?.config(APP) ?? null;
}

/** Nav sections for the staff app, with `active` marked. */
export function nav(active: string): LayoutSection[] {
  return api()?.nav(APP, active) ?? [];
}

/** Profile-menu entries (role-filtered). */
export function profileMenu(): LayoutMenuItem[] {
  return api()?.profileMenu(APP) ?? [];
}

/** The signed-in user, or the staff demo user (Drita Kastrati) until login exists. */
export function currentUser(): LayoutUser {
  return api()?.currentUser(APP) ?? NO_USER;
}

/** Ends the session and leaves the app (SinjalLayout.logout). */
export function logout(): void {
  api()?.logout();
}
