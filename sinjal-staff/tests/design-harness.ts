// Loads the original design files (design/*.dc.html + mock-data.js) in a VM
// sandbox, the same way spec/qa.js does, so ported code can be compared with
// the source of truth.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const DIR = path.join(__dirname, '..', 'design');

export function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: unknown) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;

export function designWindow(): Loose {
  const w: Loose = { localStorage: makeLocalStorage() };
  const ctx = vm.createContext({ window: w });
  vm.runInContext(fs.readFileSync(path.join(DIR, 'mock-data.js'), 'utf8'), ctx);
  return w;
}

export function designComponent(file: string, w: Loose): Loose {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no component script in ' + file);
  const ctx = vm.createContext({ window: w });
  vm.runInContext(
    'class DCLogic { constructor(props){ this.props = props || {}; this.state = this.state || {}; } setState(p){ this.state = Object.assign({}, this.state, typeof p === "function" ? p(this.state) : p); } }\n' +
      m[1] +
      '\n this._Component = Component;',
    ctx,
  );
  return ctx._Component;
}

/** JSON view of a renderVals() result with functions dropped, for diffing. */
export function plain(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === 'function' ? undefined : val)));
}

// The logo differs by design: the design points at a hosted blob, the app at
// the bundled design/assets/logo.png.
const ASSET_KEYS = new Set(['logoUrl']);

/**
 * Asserts `ours` carries everything `theirs` has (functions and the logo URL
 * ignored). Ported logic may add fields (e.g. React keys) but must not
 * change or drop any.
 */
export function expectSuperset(ours: unknown, theirs: unknown, at = '$'): void {
  const a = plain(ours);
  const b = plain(theirs);
  const walk = (x: unknown, y: unknown, p: string) => {
    if (y === null || typeof y !== 'object') {
      if (x !== y) throw new Error(`${p}: expected ${JSON.stringify(y)}, got ${JSON.stringify(x)}`);
      return;
    }
    if (x === null || typeof x !== 'object') throw new Error(`${p}: expected object, got ${JSON.stringify(x)}`);
    if (Array.isArray(y)) {
      if (!Array.isArray(x) || x.length !== y.length) throw new Error(`${p}: array length ${Array.isArray(x) ? x.length : 'n/a'} != ${y.length}`);
      y.forEach((item, i) => walk(x[i], item, `${p}[${i}]`));
      return;
    }
    for (const k of Object.keys(y as object)) if (!ASSET_KEYS.has(k)) walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${p}.${k}`);
  };
  walk(a, b, at);
}
