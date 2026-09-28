#!/usr/bin/env node
/*
 * Copies the shared layout into each staff-side app.  Plain Node (≥ 16), no dependencies.
 *
 *   node shared/layout/sync.mjs                  # all apps
 *   node shared/layout/sync.mjs admin department # only these apps
 *   node shared/layout/sync.mjs --check          # exit 1 if any copy is out of date (writes nothing)
 *
 * The .dc.html components are copied verbatim except for one line: the placeholder
 * `<!-- sinjal:app-data -->` in their <head> becomes the app's data script, so each app's
 * copy also renders on its own as a canvas artboard. The head is ignored when a page imports the
 * component, so pages are unaffected by it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const TARGETS = {
  admin: { dir: 'sinjal-admin', data: 'admin-data.js', dc: true },
  managerial: { dir: 'sinjal-managerial/public', data: 'city-data.js', dc: true },
  department: { dir: 'sinjal-Departamenti', data: 'dept-data.js', dc: true },
  staff: { dir: 'sinjal-staff/public', data: null, dc: false }, // React app: css + js only
};

const PLAIN = ['sinjal-layout.css', 'sinjal-layout.js'];
const COMPONENTS = ['Sidebar.dc.html', 'NotificationBell.dc.html'];
const PLACEHOLDER = '<!-- sinjal:app-data -->';

const args = process.argv.slice(2);
const check = args.includes('--check');
const names = args.filter((a) => !a.startsWith('--'));
for (const n of names) {
  if (!TARGETS[n]) {
    console.error(`unknown app "${n}" — use one of: ${Object.keys(TARGETS).join(', ')}`);
    process.exit(2);
  }
}
const apps = names.length ? names : Object.keys(TARGETS);

function read(p) {
  const buf = readFileSync(p);
  if (buf.includes(0)) throw new Error(`${relative(ROOT, p)} contains NUL bytes — refusing to copy a corrupted file`);
  return buf.toString('utf8');
}

let stale = 0;
let written = 0;
for (const app of apps) {
  const t = TARGETS[app];
  const dir = join(ROOT, t.dir);
  if (!existsSync(dir)) {
    console.error(`${app}: ${t.dir} not found`);
    process.exit(2);
  }
  const files = [...PLAIN, ...(t.dc ? COMPONENTS : [])];
  for (const f of files) {
    let src = read(join(HERE, f));
    if (f.endsWith('.dc.html')) {
      if (!src.includes(PLACEHOLDER)) throw new Error(`${f}: placeholder ${PLACEHOLDER} missing`);
      src = src.replace(PLACEHOLDER, `<script src="${t.data}"></script>`);
    }
    const dest = join(dir, f);
    const cur = existsSync(dest) ? readFileSync(dest).toString('utf8') : null;
    if (cur === src) continue;
    if (check) {
      console.log(`stale: ${relative(ROOT, dest)}`);
      stale++;
      continue;
    }
    writeFileSync(dest, src, 'utf8');
    const back = readFileSync(dest);
    if (back.includes(0) || back.toString('utf8') !== src) throw new Error(`${relative(ROOT, dest)}: write verification failed`);
    console.log(`wrote ${relative(ROOT, dest)}`);
    written++;
  }
}

if (check) {
  console.log(stale ? `${stale} file(s) out of date — run: node shared/layout/sync.mjs` : 'all copies up to date');
  process.exit(stale ? 1 : 0);
}
console.log(written ? `${written} file(s) updated` : 'nothing to do — all copies up to date');
