import { useState } from 'react';

function query(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Whether the user asked for reduced motion. Read once when the page mounts, like the
 * static pages did in componentDidMount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(query);
  return reduced;
}
