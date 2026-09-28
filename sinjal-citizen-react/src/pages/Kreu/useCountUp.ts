import { useEffect, useState, type RefObject } from 'react';

const DURATION_MS = 1700;

/** easeOutExpo, as in index.html `_setupCounter`. */
const ease = (p: number) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));

/**
 * Counts from 0 up to `target` the first time `ref` is 40% visible. With `disabled`
 * (reduced motion) it shows `target` straight away.
 */
export function useCountUp(ref: RefObject<HTMLElement | null>, target: number, disabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (disabled) {
      setCount(target);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / DURATION_MS);
          setCount(Math.round(ease(p) * target));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, target, disabled]);

  return count;
}
