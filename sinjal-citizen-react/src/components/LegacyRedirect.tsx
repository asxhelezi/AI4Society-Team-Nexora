import { Navigate, useLocation } from 'react-router-dom';

/** Redirects an old static-site URL (e.g. /gjurmo.html?id=X) to its route, keeping query and hash. */
export function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
