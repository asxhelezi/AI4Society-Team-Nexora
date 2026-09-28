import { useEffect, useState } from 'react';

/**
 * Hero headline sequence. Soft hyphens (­) mark where the long words may break on
 * narrow screens; i18n.js ignores them when matching translations.
 */
export const HEADLINE_PHRASES = ['Sheh diçka që nuk shkon?', 'Vetëm 40 sekonda', 'Krejt­ësisht anonim'] as const;
export const FINAL_HEADLINE = 'Bëhu pjesë e zgjidh­jes';

export interface HeroIntroState {
  /** Eyebrow + headline block has faded in. */
  introShown: boolean;
  /** Current headline is visible (false while it blurs out between phrases). */
  headlineIn: boolean;
  /** "Raporto tani" button has popped in. */
  ctaVisible: boolean;
  /** Photo switched from grayscale to colour and the red glow is on. */
  colorful: boolean;
  headline: string;
}

const SETTLED: HeroIntroState = { introShown: true, headlineIn: true, ctaVisible: true, colorful: true, headline: FINAL_HEADLINE };

/** Delay between blurring a phrase out and bringing the next one in. */
const SWAP_MS = 380;

/**
 * The Kreu hero intro (index.html `_runIntro`): fade in at 150 ms, then cycle the
 * headline at 1.95 s, 3.48 s and 5.01 s, ending on FINAL_HEADLINE. The first swap also
 * "blooms" the photo into colour and reveals the CTA. With `disabled` (reduced motion) the
 * final state is shown straight away.
 */
export function useHeroIntro(disabled: boolean): HeroIntroState {
  const [state, setState] = useState<HeroIntroState>({
    introShown: false,
    headlineIn: false,
    ctaVisible: false,
    colorful: false,
    headline: HEADLINE_PHRASES[0],
  });

  useEffect(() => {
    if (disabled) {
      setState(SETTLED);
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const update = (patch: Partial<HeroIntroState>) => setState((s) => ({ ...s, ...patch }));

    const swapTo = (headline: string, bloom: boolean) => {
      update(bloom ? { headlineIn: false, colorful: true, ctaVisible: true } : { headlineIn: false });
      at(SWAP_MS, () => update({ headline, headlineIn: true }));
    };

    at(150, () => update({ introShown: true, headlineIn: true }));
    at(1950, () => swapTo(HEADLINE_PHRASES[1], true));
    at(3480, () => swapTo(HEADLINE_PHRASES[2], false));
    at(5010, () => swapTo(FINAL_HEADLINE, false));

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [disabled]);

  return state;
}
