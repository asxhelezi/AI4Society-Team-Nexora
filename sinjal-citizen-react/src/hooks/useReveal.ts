import { useLayoutEffect, type RefObject } from 'react';

export interface RevealOptions {
  /** Stagger per data-reveal index, in ms (Kreu/Harta 80, Bulletini 90, Raportet e mia 100, Raporto/Gjurmo 110). */
  stepMs: number;
  /** Cap for the stagger index (Kreu/Harta/Bulletini use 6; omit for no cap). */
  maxIndex?: number;
  threshold?: number;
  rootMargin?: string;
  /** Reveal everything at once, without animation (reduced motion). */
  disabled?: boolean;
  /**
   * Change this value when new [data-reveal] elements appear after the first render
   * (e.g. a result card shown after a search). Already-revealed elements are untouched.
   */
  rescanKey?: unknown;
}

const selector = '[data-reveal]:not([data-revealed])';

function markRevealed(el: HTMLElement, delayMs: number) {
  el.style.transitionDelay = `${delayMs}ms`;
  el.setAttribute('data-revealed', '');
}

/**
 * Fades [data-reveal] elements inside `rootRef` up as they scroll into view — the
 * IntersectionObserver the static pages set up in `_setupReveal()`.
 *
 * The hidden/shown styles live in base.css; this hook only sets `data-revealed` and the
 * stagger delay, so React never has to re-render and never fights the attribute. It runs as a
 * layout effect so elements revealed at once (reduced motion) are marked before the first paint.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>, options: RevealOptions): void {
  const { stepMs, maxIndex = Infinity, threshold = 0.1, rootMargin, disabled = false, rescanKey } = options;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pending = Array.from(root.querySelectorAll<HTMLElement>(selector));

    if (disabled) {
      pending.forEach((el) => markRevealed(el, 0));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const index = parseInt(el.getAttribute('data-reveal') ?? '', 10) || 0;
          markRevealed(el, Math.min(index, maxIndex) * stepMs);
          io.unobserve(el);
        });
      },
      { threshold, rootMargin },
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, stepMs, maxIndex, threshold, rootMargin, disabled, rescanKey]);
}

/** Show every [data-reveal] element under `root` immediately (Raporto's `_revealNow`). */
export function revealAll(root: ParentNode | null | undefined): void {
  root?.querySelectorAll<HTMLElement>(selector).forEach((el) => markRevealed(el, 0));
}
