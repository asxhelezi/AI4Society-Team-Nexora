import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top whenever the path changes, like a full page load did in the static site. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
