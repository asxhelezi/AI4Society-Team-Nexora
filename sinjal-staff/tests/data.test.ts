import { describe, expect, it } from 'vitest';
import { SINJAL } from '../src/data/sinjal';
import { designWindow, plain } from './design-harness';

// The typed data module must produce exactly what design/mock-data.js does.
describe('data module parity with design/mock-data.js', () => {
  const D = designWindow().SINJAL;
  const strip = (v: unknown) => JSON.parse(JSON.stringify(v, (k, val) => (k === 'logo' ? undefined : val)));

  it('reports, notifications, activity and automation config match', () => {
    expect(strip(SINJAL.reports)).toEqual(strip(D.reports));
    expect(plain(SINJAL.notifications)).toEqual(plain(D.notifications));
    expect(plain(SINJAL.activity)).toEqual(plain(D.activity));
    expect(plain(SINJAL.automations)).toEqual(plain(D.automations));
    expect(plain(SINJAL.automation)).toEqual(plain(D.automation));
  });

  it('90-day history is identical (843 closed cases)', () => {
    expect(SINJAL.history.length).toBe(D.history.length);
    expect(plain(SINJAL.history)).toEqual(plain(D.history));
  });

  it('performance engine gives the same figures', () => {
    const a = SINJAL.perf.records({});
    const b = D.perf.records({});
    expect(plain(a)).toEqual(plain(b));
    for (const days of [7, 30, 90]) {
      expect(SINJAL.perf.slaRate(a, {}, days)).toBe(D.perf.slaRate(b, {}, days));
      expect(SINJAL.perf.avgResponse(a, {}, days)).toBe(D.perf.avgResponse(b, {}, days));
      expect(SINJAL.perf.avgResolution(a, {}, days)).toBe(D.perf.avgResolution(b, {}, days));
      expect(SINJAL.perf.newCount(a, { dept: 'infra' }, days, 1)).toBe(D.perf.newCount(b, { dept: 'infra' }, days, 1));
    }
    expect(Math.round(SINJAL.perf.slaRate(a, {}, 30) as number)).toBe(86);
  });

  it('formats durations the one shared way', () => {
    for (const h of [0.4, 1, 3.9, 23.99, 24, 41, -2.5, null]) {
      expect(SINJAL.fmtHours(h)).toBe(D.fmtHours(h));
    }
    expect(SINJAL.fmtHours(3.9)).toBe('3 orë 54 min');
    expect(SINJAL.fmtHours(41)).toBe('1,7 ditë');
  });
});
