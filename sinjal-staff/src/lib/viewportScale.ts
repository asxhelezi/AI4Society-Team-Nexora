/**
 * The design is a 1440×900 artboard built in fixed pixel sizes (type limited
 * to 11–32px, fixed card and map dimensions). Stretching that layout across a
 * large display leaves small text in oversized, half-empty cards, so instead
 * the whole desktop is laid out close to design size and scaled as one piece,
 * like zooming the artboard.
 *
 * The scale is picked so the layout stays near 1440 CSS px wide and at least
 * DESIGN_HEIGHT tall; on very wide screens the height wins and the layout gets
 * wider than 1440 rather than too short. It never drops below MIN_SCALE, so
 * text stays readable on small laptop windows.
 */
const DESIGN_WIDTH = 1440;
// the artboard is 900px tall; ~800px is what a 900px-tall screen leaves after browser chrome
const DESIGN_HEIGHT = 800;
const MIN_SCALE = 0.8;
/**
 * Below this width the artboard can't be scaled down legibly (MIN_SCALE would
 * leave a 1440-wide layout hanging off a tablet or phone), so the app switches
 * to its fluid layout instead: scale 1 at real device size, with the tablet and
 * phone rules in styles/responsive.css taking over. Keep in sync with the
 * max-width: 1099px queries there.
 */
export const FLUID_BELOW = 1100;

export function computeScale(width: number, height: number): number {
  return Math.max(MIN_SCALE, Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
}

/** Scale for the current window: the artboard scale on desktop, 1 in the fluid layout. */
export function layoutScale(width: number, height: number): number {
  return width < FLUID_BELOW ? 1 : computeScale(width, height);
}

function apply() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = layoutScale(w, h);
  const root = document.documentElement.style;
  root.setProperty('--app-scale', String(scale));
  root.setProperty('--app-w', w / scale + 'px');
  root.setProperty('--app-h', h / scale + 'px');
}

/** Sets --app-scale / --app-w / --app-h on <html> and keeps them current. */
export function installViewportScale(): void {
  apply();
  window.addEventListener('resize', apply);
}
