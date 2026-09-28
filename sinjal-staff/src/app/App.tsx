import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { AUTH_REQUIRED, DESKTOP_ROLES, REAL_STAFF, hasStaffSession, loadDemoStaff, loadStaff, logout, restoreSession, subscribeToReports } from '../api/staff';

const ROLE_DESTINATIONS: Record<string, string> = {
  admin: '/admin/', department_authority: '/department/',
  municipal_authority: '/managerial/', operative_staff: '/field/',
};

// One chunk per screen; Automatizimet and Performanca are large.
const Kreu = lazy(() => import('../screens/kreu/Kreu').then((m) => ({ default: m.Kreu })));
const Raportet = lazy(() => import('../screens/raportet/Raportet').then((m) => ({ default: m.Raportet })));
const Raporti = lazy(() => import('../screens/raporti/Raporti').then((m) => ({ default: m.Raporti })));
const Harta = lazy(() => import('../screens/harta/Harta').then((m) => ({ default: m.Harta })));
const Departamentet = lazy(() => import('../screens/departamentet/Departamentet').then((m) => ({ default: m.Departamentet })));
const Automatizimet = lazy(() => import('../screens/automatizimet/Automatizimet').then((m) => ({ default: m.Automatizimet })));
const Performanca = lazy(() => import('../screens/performanca/Performanca').then((m) => ({ default: m.Performanca })));

function BackendPending() {
  return <main role="status" style={{ padding: 40, fontFamily: 'Barlow, sans-serif' }}>Kjo faqe kërkon API shtesë për të ruajtur veprimet e stafit.</main>;
}

function StaffRoutes() {
  // Each navigation remounts the screen (keyed by location), like a page load
  // in the design: screens read their hand-off state from storage on mount.
  const location = useLocation();
  return (
    <Suspense fallback={<div className="app-frame" />}>
      <Routes location={location} key={location.key}>
        <Route path={ROUTES.kreu} element={<Kreu />} />
        <Route path={ROUTES.raportet} element={<Raportet />} />
        <Route path={ROUTES.raporti} element={<Raporti />} />
        <Route path={ROUTES.harta} element={<Harta />} />
        <Route path={ROUTES.departamentet} element={<Departamentet />} />
        <Route path={ROUTES.automatizimet} element={REAL_STAFF ? <BackendPending /> : <Automatizimet />} />
        <Route path={ROUTES.performanca} element={REAL_STAFF ? <BackendPending /> : <Performanca />} />
        <Route path="*" element={<Navigate to={ROUTES.kreu} replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  const [ready, setReady] = useState(!AUTH_REQUIRED);
  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    if (window.SinjalLayout) {
      window.SinjalLayout.auth.loginUrl = '/login/';
      window.SinjalLayout.auth.onLogout = () => logout();
    }
    if (!hasStaffSession()) {
      window.location.replace('/login/');
      return;
    }
    let active = true;
    let unsubscribe = () => {};
    restoreSession().then((ok) => {
      if (!ok) throw new Error('No session');
      return REAL_STAFF ? loadStaff() : loadDemoStaff();
    }).then((role) => {
      if (!active) return;
      if (DESKTOP_ROLES.includes(role)) {
        unsubscribe = subscribeToReports();
        setReady(true);
      } else if (ROLE_DESTINATIONS[role]) window.location.replace(ROLE_DESTINATIONS[role]);
      else { logout(); window.location.replace('/login/'); }
    }).catch(() => {
      logout();
      window.location.replace('/login/');
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  if (!ready) return <div className="app-frame" />;
  return <StaffRoutes />;
}
