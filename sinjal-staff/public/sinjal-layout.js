/*
 * Sinjal — shared staff-side layout: navigation config + identity hooks.
 *
 * SOURCE COPY. Edit it here (shared/layout/) and run `node shared/layout/sync.mjs`; the copies in
 * sinjal-admin/, sinjal-managerial/public/, sinjal-Departamenti/ and sinjal-staff/public/ are
 * overwritten. See shared/layout/README.md.
 *
 * Classic script (no modules). Load it in every page <head>, AFTER the app's data script:
 *
 *   <script src="admin-data.js"></script>      <- sets window.SINJAL_APP, SINJAL_BADGES, SINJAL_NOTIFICATIONS
 *   <script src="sinjal-layout.js"></script>   <- defines window.SinjalLayout
 *
 * Nothing here reads the globals at load time (only when a function is called), so the order is
 * a convention, not a hard requirement — but keep it, it documents the dependency.
 *
 * window.SinjalLayout
 *   .apps.<appKey>         nav / org / profile-menu config for 'admin' | 'managerial' | 'department' | 'staff'
 *   .demoUsers.<appKey>    the person each app shows until real login exists
 *   .icons                 named SVG inner markup (24×24, stroke = currentColor)
 *   .app()                 the current app key (window.SINJAL_APP)
 *   .config(appKey?)       apps[appKey]
 *   .currentUser(appKey?)  session user if one exists, else the app's demo user      [AUTH HOOK]
 *   .logout()              ends the session and leaves the app                       [AUTH HOOK]
 *   .canSee(item, user?)   role check for nav items / menu items                     [AUTH HOOK]
 *   .badges(appKey?)       window.SINJAL_BADGES (object or function) as {key:{count,tone,label}}
 *   .nav(appKey?, active?) sections with items resolved: role-filtered, active flag, badge
 *   .profileMenu(appKey?)  profile-menu items, role-filtered
 *   .notifications()       window.SINJAL_NOTIFICATIONS normalised (see README "Notifications")
 *   .openNotification(n)   marks one read (or calls the app's onOpen hook)
 *   .markAllRead()
 *   .relTime(at, now?)     Albanian relative time ("12 min më parë")
 */
(function () {
  'use strict';

  if (window.SinjalLayout) return;

  // ------------------------------------------------------------------------------ icons
  // Inner markup of a 24×24 SVG drawn with stroke="currentColor". Ported 1:1 from the four
  // apps' former sidebars. Several apps used different drawings for the same idea (e.g. the
  // "Njoftimet" bell); each keeps its own so nothing changes visually.
  var I = {
    grid: '<rect x="3" y="3" width="7" height="8"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="15" width="7" height="6"/>',
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>',
    shieldCheck: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    orgChart: '<rect x="9" y="3" width="6" height="5"/><rect x="3" y="16" width="6" height="5"/><rect x="15" y="16" width="6" height="5"/><path d="M12 8v4M6 16v-4h12v4"/>',
    teams: '<circle cx="12" cy="7" r="3"/><circle cx="5" cy="13" r="2.3"/><circle cx="19" cy="13" r="2.3"/><path d="M7.5 21c.4-3 2.2-4.5 4.5-4.5s4.1 1.5 4.5 4.5"/><path d="M1.8 20c.3-2 1.4-3 3.2-3M22.2 20c-.3-2-1.4-3-3.2-3"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.8.2 5 2.2 5 5.4"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/>',
    zones: '<path d="M4 5h7v6H4zM13 5h7v9h-7zM4 13h7v6H4zM13 16h7v3h-7z"/>',
    workflow: '<rect x="3" y="4" width="6" height="5"/><rect x="15" y="4" width="6" height="5"/><rect x="9" y="15" width="6" height="5"/><path d="M9 6.5h6M18 9v3H12v3M6 9v3h6"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    boltAlt: '<path d="M13 3 4 14h6l-1 7 9-11h-6l1-7z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    bellAlt: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0"/>',
    doc: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
    docAlt: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
    lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>',
    plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.4 7.4 0 0 0 0-2l2-1.5-2-3.5-2.3.9a7.6 7.6 0 0 0-1.8-1l-.3-2.4h-4l-.3 2.4a7.6 7.6 0 0 0-1.8 1l-2.3-.9-2 3.5L6.6 11a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9a7.6 7.6 0 0 0 1.8 1l.3 2.4h4l.3-2.4a7.6 7.6 0 0 0 1.8-1l2.3.9 2-3.5-2-1.5z"/>',
    table: '<rect x="3" y="4" width="18" height="16"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/>',
    swap: '<path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    bars: '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="8"/><rect x="10.5" y="7" width="3" height="13"/><rect x="15" y="15" width="3" height="5"/>',
    trend: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8"/>',
    assistant: '<path d="M4 5h16v11H9l-5 4z"/><path d="M12 8.2l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z"/>',
    townHall: '<path d="M3 21h18"/><path d="M4 21V10h16v11"/><path d="M2 10 12 3l10 7"/><path d="M8 21v-7M12 21v-7M16 21v-7"/>',
    building: '<rect x="5" y="3" width="14" height="18"/><line x1="9" y1="8" x2="9" y2="8.01"/><line x1="15" y1="8" x2="15" y2="8.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="15" y1="13" x2="15" y2="13.01"/>',
    deptHouse: '<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-6h6v6"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  };

  // Every profile menu ends with this item. `action: 'logout'` → SinjalLayout.logout().
  var LOGOUT = { label: 'Dil', icon: I.logout, action: 'logout', tone: 'danger' };
  var DIVIDER = { divider: true };

  // ------------------------------------------------------------------------------ apps
  /*
   * App config schema (README "Config schema"):
   *   subtitle      string            line under the SINJAL wordmark
   *   home          string            href of the app's first page (brand link, logout fallback)
   *   logo          string|null       logo image URL relative to the app root (null: the app supplies it)
   *   org           {name, sub, icon, dot?}|null   the chip under the logo (dot = status colour)
   *   navLabel      string            aria-label of the <nav>
   *   sections      [{label?, items:[{key, label, href, icon, badgeKey?, roles?}]}]
   *   profileMenu   [{label, href?, icon?, action?:'logout', tone?:'danger', roles?} | {divider:true}]
   * `key` must match the page's <dc-import name="Sidebar" active="<key>"> (or the React NavKey).
   */
  var APPS = {
    // sinjal-admin — ported from its former Sidebar.dc.html (keys, labels, hrefs, icons, sections unchanged)
    admin: {
      subtitle: 'Admin / IT · Administrimi i sistemit',
      home: 'Main.dc.html',
      logo: 'logo.png',
      org: { name: 'Bashkia Elbasan', sub: 'Mjedisi: Prodhim', icon: I.townHall, dot: '#2E7D4F' },
      navLabel: 'Navigimi i administrimit',
      sections: [
        { label: 'Sistemi', items: [
          { key: 'permbledhje', label: 'Përmbledhje', href: 'Main.dc.html', icon: I.grid },
        ] },
        { label: 'Aksesi', items: [
          { key: 'perdoruesit', label: 'Përdoruesit', href: 'Perdoruesit.dc.html', icon: I.users, badgeKey: 'perdoruesit' },
          { key: 'rolet', label: 'Rolet & Lejet', href: 'Rolet.dc.html', icon: I.shieldCheck },
        ] },
        { label: 'Organizata', items: [
          { key: 'departamentet', label: 'Departamentet', href: 'Departamentet.dc.html', icon: I.orgChart },
          { key: 'ekipet', label: 'Ekipet & Pozicionet', href: 'Ekipet.dc.html', icon: I.teams },
          { key: 'zonat', label: 'Zonat & Mbulesa', href: 'Zonat.dc.html', icon: I.map, badgeKey: 'zonat' },
        ] },
        { label: 'Konfigurimi', items: [
          { key: 'workflow', label: 'Workflow & Rregullat', href: 'Workflow.dc.html', icon: I.workflow },
          { key: 'automatizimet', label: 'Automatizimet', href: 'Automatizimet.dc.html', icon: I.bolt },
          { key: 'njoftimet', label: 'Njoftimet', href: 'Njoftimet.dc.html', icon: I.bell },
        ] },
        { label: 'Siguria & Teknika', items: [
          { key: 'audit', label: 'Audit Log', href: 'Audit.dc.html', icon: I.doc },
          { key: 'siguria', label: 'Siguria', href: 'Siguria.dc.html', icon: I.lock, badgeKey: 'siguria' },
          { key: 'integrimet', label: 'Integrimet', href: 'Integrimet.dc.html', icon: I.plug, badgeKey: 'integrimet' },
          { key: 'cilesimet', label: 'Cilësimet e Sistemit', href: 'Cilesimet.dc.html', icon: I.sliders },
        ] },
      ],
      // admin had no profile menu before; the settings shortcut mirrors Departamenti's.
      profileMenu: [
        { label: 'Cilësimet e sistemit', href: 'Cilesimet.dc.html', icon: I.gear },
        DIVIDER, LOGOUT,
      ],
    },

    // sinjal-managerial/public — ported from its former Sidebar.dc.html
    managerial: {
      subtitle: 'Paneli i Menaxhimit',
      home: 'Main.dc.html',
      logo: 'assets/logo.png',
      org: { name: 'Bashkia Elbasan', sub: 'Pamje për të gjithë zyrtarët', icon: I.townHall },
      navLabel: 'Navigimi kryesor',
      sections: [
        { label: 'Menaxhimi', items: [
          { key: 'permbledhje', label: 'Përmbledhje', href: 'Main.dc.html', icon: I.grid },
          { key: 'performanca', label: 'Performanca', href: 'Performanca.dc.html', icon: I.trend },
          { key: 'harta', label: 'Harta', href: 'Harta.dc.html', icon: I.map },
          { key: 'departamentet', label: 'Shërbimet & Departamentet', href: 'Departamentet.dc.html', icon: I.orgChart },
          { key: 'zonat', label: 'Zonat', href: 'Zonat.dc.html', icon: I.zones },
          { key: 'indikatoret', label: 'Indikatorët', href: 'Indikatoret.dc.html', icon: I.target },
          { key: 'raportet', label: 'Raportet', href: 'Raportet.dc.html', icon: I.docAlt },
          // badge was: S.insights().filter(i => i.bad).length (red)
          { key: 'asistenti', label: 'Asistenti SINJAL', href: 'Asistenti.dc.html', icon: I.assistant, badgeKey: 'asistenti' },
        ] },
        { label: 'Pamje për seancat', items: [
          { key: 'keshilli', label: 'Pamja e Këshillit', href: 'Keshilli.dc.html', icon: I.townHall },
        ] },
      ],
      // managerial had no profile menu before.
      profileMenu: [LOGOUT],
    },

    // sinjal-Departamenti — ported from its former Sidebar.dc.html. The old unlabeled dividers
    // (before Ekipi, Performanca, Njoftimet) became labelled sections; the four section labels
    // below are NEW copy — review them.
    department: {
      subtitle: 'Paneli i Departamentit',
      home: 'Main.dc.html',
      logo: 'images/3c2ecd94d2306b31874a5b15023b932d.png',
      org: { name: 'Infrastrukturë', sub: 'Bashkia Elbasan', icon: I.deptHouse },
      navLabel: 'Navigimi kryesor',
      sections: [
        { label: 'Rastet', items: [
          { key: 'permbledhje', label: 'Kreu', href: 'Main.dc.html', icon: I.home },
          { key: 'raportet', label: 'Raportet', href: 'Raportet.dc.html', icon: I.table, badgeKey: 'raportet' },
          { key: 'harta', label: 'Harta', href: 'Harta.dc.html', icon: I.pin },
        ] },
        { label: 'Ekipi & puna', items: [
          { key: 'ekipi', label: 'Ekipi', href: 'Ekipi.dc.html', icon: I.team },
          { key: 'caktimet', label: 'Caktimet', href: 'Caktimet.dc.html', icon: I.swap, badgeKey: 'caktimet' },
          { key: 'sla', label: 'SLA & Prioritetet', href: 'SLA.dc.html', icon: I.timer, badgeKey: 'sla' },
          { key: 'nderhyrjet', label: 'Ndërhyrjet / Zgjidhjet', href: 'Nderhyrjet.dc.html', icon: I.wrench, badgeKey: 'nderhyrjet' },
        ] },
        { label: 'Analiza', items: [
          { key: 'performanca', label: 'Performanca', href: 'Performanca.dc.html', icon: I.bars },
          { key: 'automatizimet', label: 'Automatizimet', href: 'Automatizimet.dc.html', icon: I.boltAlt },
        ] },
        { label: 'Departamenti', items: [
          { key: 'njoftimet', label: 'Njoftimet', href: 'Njoftimet.dc.html', icon: I.bellAlt, badgeKey: 'njoftimet' },
          { key: 'raportetdep', label: 'Raportet e Departamentit', href: 'RaportetDep.dc.html', icon: I.docAlt },
          { key: 'cilesimet', label: 'Cilësimet', href: 'Cilesimet.dc.html', icon: I.gear },
        ] },
      ],
      profileMenu: [
        { label: 'Cilësimet e departamentit', href: 'Cilesimet.dc.html', icon: I.gear },
        DIVIDER, LOGOUT,
      ],
    },

    // sinjal-staff (React) — ported from src/components/sidebar/Sidebar.tsx; hrefs are the
    // router paths from src/lib/routes.ts. No sections (one unlabeled group, as before).
    staff: {
      subtitle: 'Paneli i Nëpunësit',
      home: '/',
      logo: null, // the React app imports its logo through Vite (SINJAL.assets.logo)
      org: null,
      navLabel: 'Navigimi kryesor',
      sections: [
        { items: [
          { key: 'kreu', label: 'Kreu', href: '/', icon: I.home },
          { key: 'raportet', label: 'Raportet', href: '/raportet', icon: I.table },
          { key: 'harta', label: 'Harta', href: '/harta', icon: I.pin },
          { key: 'departamentet', label: 'Departamentet', href: '/departamentet', icon: I.building },
          { key: 'automatizimet', label: 'Automatizimet', href: '/automatizimet', icon: I.boltAlt },
          { key: 'performanca', label: 'Performanca', href: '/performanca', icon: I.bars },
        ] },
      ],
      // "Profili" and "Cilësimet" have no screen yet: items without href just close the menu.
      profileMenu: [
        { label: 'Profili', icon: I.person },
        { label: 'Cilësimet', icon: I.gear },
        DIVIDER, LOGOUT,
      ],
    },
  };

  // ------------------------------------------------------------------------------ people
  /*
   * User shape: { id, name, short, initials, title, menuTitle, roles: [roleId] }
   *   short      name shown in the sidebar profile block (falls back to name)
   *   title      second line in the profile block
   *   menuTitle  second line in the profile-menu header (falls back to title)
   *   roles      role ids from sinjal-admin/admin-data.js ROLES: clerk, manager, operative,
   *              management, admin, auditor, superadmin, supervisor
   */
  var DEMO_USERS = {
    admin: { id: 'u4', name: 'Klevis Duka', short: 'Klevis Duka', initials: 'KD', title: 'Super Admin · IT & Sisteme', menuTitle: 'Super Admin · IT & Sisteme', roles: ['superadmin'] },
    managerial: { id: 'official', name: 'Zyrtar i Bashkisë', short: 'Zyrtar i Bashkisë', initials: 'ZB', title: 'Bashkia Elbasan', menuTitle: 'Bashkia Elbasan', roles: ['management'] },
    department: { id: 'dept-infra-manager', name: 'Besnik Leka', short: 'Besnik L.', initials: 'BL', title: 'Përgjegjës departamenti', menuTitle: 'Infrastrukturë · Përgjegjës departamenti', roles: ['manager'] },
    staff: { id: 'u2', name: 'Drita Kastrati', short: 'Drita K.', initials: 'DK', title: 'Nëpunëse', menuTitle: 'Shërbime Publike · Nëpunëse', roles: ['clerk'] },
  };

  // ------------------------------------------------------------------------------ auth hooks
  /*
   * AUTH HOOKS — the only places the layout reads or ends identity. Nothing checks a password yet.
   *
   * When login exists it should store { app, user } (user shape above) under AUTH.sessionKey in
   * localStorage and set AUTH.loginUrl. NOTE: the four apps run on different ports = different
   * origins, so they cannot share that localStorage entry; a shared login needs one origin
   * (single static server / reverse proxy: /admin, /managerial, /department, /staff) or a token
   * passed in the URL. See README "Auth hooks".
   */
  var AUTH = {
    sessionKey: 'sinjal_session',
    loginUrl: null, // e.g. '/login.html' once it exists; null → logout returns to the app's home
    onLogout: null, // optional function (appKey) called before navigating away
  };

  function readSession() {
    try {
      var raw = window.localStorage.getItem(AUTH.sessionKey) || window.sessionStorage.getItem(AUTH.sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function app() {
    return window.SINJAL_APP || null;
  }
  function key(appKey) { return appKey || app() || 'admin'; }
  function config(appKey) { return APPS[key(appKey)] || null; }

  function initialsOf(name) {
    var p = String(name || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '').concat((p[1] || '')[0] || '').toUpperCase();
  }

  function currentUser(appKey) {
    var k = key(appKey);
    var s = readSession();
    if (s && s.user && s.user.name && (!s.app || s.app === k)) {
      var u = s.user;
      return {
        id: u.id || null, name: u.name, short: u.short || u.name, initials: u.initials || initialsOf(u.name),
        title: u.title || '', menuTitle: u.menuTitle || u.title || '', roles: u.roles || [],
      };
    }
    return DEMO_USERS[k] || { id: null, name: '', short: '', initials: '', title: '', menuTitle: '', roles: [] };
  }

  function logout() {
    var k = key();
    try { window.localStorage.removeItem(AUTH.sessionKey); } catch (e) { /* storage blocked */ }
    try { window.sessionStorage.removeItem(AUTH.sessionKey); } catch (e) { /* storage blocked */ }
    if (typeof AUTH.onLogout === 'function') {
      try { AUTH.onLogout(k); } catch (e) { /* never block logout */ }
    }
    var target = AUTH.loginUrl || (APPS[k] && APPS[k].home) || './';
    if (window.console) {
      console.info('[SinjalLayout] logout(): no login exists yet — session key "' + AUTH.sessionKey + '" cleared, going to ' + target + '. Set SinjalLayout.auth.loginUrl when login.html exists.');
    }
    window.location.assign(target);
  }

  function canSee(item, user) {
    if (!item || !item.roles || !item.roles.length) return true;
    var roles = (user || currentUser()).roles || [];
    for (var i = 0; i < item.roles.length; i++) if (roles.indexOf(item.roles[i]) !== -1) return true;
    return false;
  }

  // ------------------------------------------------------------------------------ badges
  /*
   * window.SINJAL_BADGES = { <badgeKey>: { count: number, tone: 'alert'|'neutral', label?: string } }
   * or a function returning that object (use a function when counts change while the page is open).
   * `label` completes the screen-reader text: "<count> <label>". count 0 / missing → no badge.
   */
  function badges() {
    var b = window.SINJAL_BADGES;
    try { if (typeof b === 'function') b = b(); } catch (e) { b = null; }
    return b && typeof b === 'object' ? b : {};
  }

  function nav(appKey, active) {
    var cfg = config(appKey);
    if (!cfg) return [];
    var user = currentUser(appKey);
    var B = badges(appKey);
    var out = [];
    cfg.sections.forEach(function (sec) {
      var items = [];
      sec.items.forEach(function (it) {
        if (!canSee(it, user)) return;
        var b = it.badgeKey ? B[it.badgeKey] : null;
        var count = b && typeof b.count === 'number' ? b.count : 0;
        items.push({
          key: it.key, label: it.label, href: it.href, icon: it.icon || '',
          active: it.key === active,
          badge: count > 0 ? { count: count, text: count > 99 ? '99+' : String(count), tone: b.tone === 'neutral' ? 'neutral' : 'alert', label: b.label || '' } : null,
        });
      });
      if (items.length) out.push({ label: sec.label || '', items: items });
    });
    return out;
  }

  function profileMenu(appKey) {
    var cfg = config(appKey);
    if (!cfg) return [];
    var user = currentUser(appKey);
    return cfg.profileMenu.filter(function (m) { return m.divider || canSee(m, user); });
  }

  // ------------------------------------------------------------------------------ notifications
  /*
   * window.SINJAL_NOTIFICATIONS — see README "Notifications". Either
   *   an array of items, a function returning one, or
   *   { items: array | () => array, inboxHref?, now?, href?(n), onOpen?(n), relTime?(at), onMarkAll?() }
   * Item: { id, title, body?, at? (Date|ms|ISO), time? (preformatted), label?, color?, read?, done?, href?,
   *         meta?: {label, color} }  — meta.* is Departamenti's shape and is read as a fallback.
   */
  var READ_PREFIX = 'sinjal_notif_read_';

  function notifConfig() {
    var c = window.SINJAL_NOTIFICATIONS;
    if (!c) return { items: [] };
    if (Array.isArray(c) || typeof c === 'function') return { items: c };
    return c;
  }

  function readIds() {
    try { return JSON.parse(window.localStorage.getItem(READ_PREFIX + key()) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeIds(o) {
    try { window.localStorage.setItem(READ_PREFIX + key(), JSON.stringify(o)); } catch (e) { /* storage blocked */ }
  }

  var MIN = 60000;
  function relTime(at, now) {
    var t = at instanceof Date ? at.getTime() : typeof at === 'string' ? Date.parse(at) : at;
    if (typeof t !== 'number' || isNaN(t)) return '';
    var n = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.now();
    var mins = Math.max(0, Math.round((n - t) / MIN));
    if (mins < 1) return 'tani';
    if (mins < 60) return mins + ' min më parë';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' orë më parë';
    return Math.round(hrs / 24) + ' ditë më parë';
  }

  function notifications() {
    var c = notifConfig();
    var list = c.items;
    try { if (typeof list === 'function') list = list(); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    var local = c.onOpen ? null : readIds();
    var items = [];
    list.forEach(function (n, i) {
      if (!n || n.done) return;
      var id = n.id != null ? String(n.id) : 'n' + i;
      var meta = n.meta || {};
      var href = n.href || (typeof c.href === 'function' ? c.href(n) : null) || c.inboxHref || null;
      var time = n.time || (n.at != null ? (typeof c.relTime === 'function' ? c.relTime(n.at) : relTime(n.at, c.now)) : '');
      items.push({
        id: id, title: n.title || '', body: n.body || '', time: time,
        label: n.label || meta.label || '', color: n.color || meta.color || '#8A847C',
        unread: !(n.read || (local && local[id])), href: href, raw: n,
      });
    });
    var unread = items.filter(function (x) { return x.unread; }).length;
    return { items: items, unread: unread, inboxHref: c.inboxHref || null };
  }

  function openNotification(n) {
    var c = notifConfig();
    if (typeof c.onOpen === 'function') { c.onOpen(n.raw || n); return; }
    var o = readIds(); o[n.id] = 1; writeIds(o);
  }

  function markAllRead() {
    var c = notifConfig();
    if (typeof c.onMarkAll === 'function') { c.onMarkAll(); return; }
    var o = readIds();
    notifications().items.forEach(function (n) { o[n.id] = 1; });
    writeIds(o);
  }

  window.SinjalLayout = {
    version: 1,
    icons: I,
    apps: APPS,
    demoUsers: DEMO_USERS,
    auth: AUTH,
    app: app,
    config: config,
    currentUser: currentUser,
    logout: logout,
    canSee: canSee,
    badges: badges,
    nav: nav,
    profileMenu: profileMenu,
    notifications: notifications,
    openNotification: openNotification,
    markAllRead: markAllRead,
    relTime: relTime,
  };
})();
