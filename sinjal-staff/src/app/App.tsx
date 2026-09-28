import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { AUTH_REQUIRED, LOGIN_URL, REAL_STAFF, SUPABASE_STAFF, loadDemoStaff, loadStaff, logout, staffSessionReady } from '../api/staff';
import { SupabaseSignIn } from './SupabaseSignIn';

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
  const [signIn, setSignIn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    if (window.SinjalLayout) {
      window.SinjalLayout.auth.loginUrl = LOGIN_URL;
      window.SinjalLayout.auth.onLogout = () => logout();
    }
    // Supabase mode signs in here; the API mode uses the shared /login/ page.
    const signedOut = () => {
      logout();
      if (SUPABASE_STAFF) setSignIn(true);
      else window.location.replace(LOGIN_URL);
    };
    let active = true;
    staffSessionReady().then((session) => {
      if (!active) return;
      if (!session) { signedOut(); return; }
      return (REAL_STAFF ? loadStaff() : loadDemoStaff()).then((role) => {
        if (!active) return;
        if (role === 'clerk') setReady(true);
        // The other role panels still sign in through the API, so Supabase mode only admits clerks.
        else if (!SUPABASE_STAFF && ROLE_DESTINATIONS[role]) window.location.replace(ROLE_DESTINATIONS[role]);
        else signedOut();
      });
    }).catch(() => { if (active) signedOut(); });
    return () => { active = false; };
  }, [attempt]);
  if (signIn) return <SupabaseSignIn onSignedIn={() => { setSignIn(false); setAttempt((n) => n + 1); }} />;
  if (!ready) return <div className="app-frame" />;
  return <StaffRoutes />;
}
