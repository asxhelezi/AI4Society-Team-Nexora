import { describe, expect, it } from 'vitest';
import { computeScale, FLUID_BELOW, layoutScale } from '../src/lib/viewportScale';

describe('viewport scale', () => {
  it('lays out at exactly design size on a 1440×900 window', () => {
    expect(computeScale(1440, 900)).toBe(1);
  });
  it('scales up on large displays, keeping the layout ~1440 wide', () => {
    expect(1920 / computeScale(1920, 1080)).toBeCloseTo(1440, 5);
    expect(2560 / computeScale(2560, 1440)).toBeCloseTo(1440, 5);
    // a 1080p screen minus browser chrome: height limits the scale a little
    expect(1920 / computeScale(1920, 950)).toBeCloseTo(1616.8, 1);
  });
  it('lets height win on ultrawide screens, and never shrinks below 0.8', () => {
    expect(computeScale(3440, 1440)).toBe(1.8);
    expect(computeScale(800, 500)).toBe(0.8);
  });
  it('switches to the fluid layout (scale 1) below the desktop breakpoint', () => {
    expect(layoutScale(390, 844)).toBe(1);
    expect(layoutScale(820, 1180)).toBe(1);
    expect(layoutScale(FLUID_BELOW - 1, 800)).toBe(1);
    expect(layoutScale(FLUID_BELOW, 900)).toBe(computeScale(FLUID_BELOW, 900));
    expect(layoutScale(1440, 900)).toBe(1);
  });
});
