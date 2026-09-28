#!/usr/bin/env node
/*
 * Opts a .dc.html app's pages into the shared layout. Idempotent — safe to run again.
 *
 *   node shared/layout/optin-pages.mjs <app dir> <data script> [--dry]
 *   node shared/layout/optin-pages.mjs sinjal-admin admin-data.js
 *   node shared/layout/optin-pages.mjs sinjal-managerial/public city-data.js
 *   node shared/layout/optin-pages.mjs sinjal-Departamenti dept-data.js
 *
 * For every *.dc.html page in <app dir> that imports the Sidebar (Sidebar.dc.html and
 * NotificationBell.dc.html themselves are skipped):
 *   1. <head>: adds <link rel="stylesheet" href="sinjal-layout.css"> after the page's last
 *      stylesheet link, and <script src="sinjal-layout.js"></script> right after the data script.
 *   2. Sets the Sidebar import's hint-size to "232px,900px".
 *   3. Adds <dc-import name="NotificationBell" hint-size="40px,40px"></dc-import> as the last child
 *      of the header's .page-actions (creating <div class="page-actions"> before </header> when the
 *      page has none). Pages with no <header class="page-header"> are reported, not changed.
 * Prints what it did per file. Files are re-read after writing and checked for NUL bytes.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [dirArg, dataScript, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry');
if (!dirArg || !dataScript) {
  console.error('usage: node shared/layout/optin-pages.mjs <app dir> <data script> [--dry]');
  process.exit(2);
}
const dir = resolve(dirArg);
const BELL = '<dc-import name="NotificationBell" hint-size="40px,40px"></dc-import>';
const SKIP = new Set(['Sidebar.dc.html', 'NotificationBell.dc.html']);

// index of the </div> closing the <div …> that starts at `open`
function matchDiv(src, open) {
  const re = /<div\b|<\/div\s*>/gi;
  re.lastIndex = open;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    if (m[0][1] === '/') { depth--; if (depth === 0) return m.index; }
    else depth++;
  }
  return -1;
}

let problems = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.dc.html') && !SKIP.has(x)).sort()) {
  const p = join(dir, f);
  const buf = readFileSync(p);
  if (buf.includes(0)) { console.error(`${f}: contains NUL bytes — skipped`); problems++; continue; }
  let s = buf.toString('utf8');
  const orig = s;
  const NL = /\r\n/.test(s) ? '\r\n' : '\n'; // keep the file's own line endings (the repo mixes both)
  const did = [];
  if (!/<dc-import\s+name="Sidebar"/.test(s)) { console.log(`${f}: no Sidebar import — skipped`); continue; }

  // 1. head tags
  const headEnd = s.indexOf('</head>');
  if (!s.slice(0, headEnd).includes('sinjal-layout.css')) {
    const head = s.slice(0, headEnd);
    const links = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)];
    if (!links.length) { console.error(`${f}: no stylesheet link in <head>`); problems++; continue; }
    const last = links[links.length - 1];
    const at = last.index + last[0].length;
    s = s.slice(0, at) + NL + '<link rel="stylesheet" href="sinjal-layout.css">' + s.slice(at);
    did.push('css');
  }
  if (!s.slice(0, s.indexOf('</head>')).includes('sinjal-layout.js')) {
    const tag = `<script src="${dataScript}"></script>`;
    const i = s.indexOf(tag);
    if (i === -1 || i > s.indexOf('</head>')) { console.error(`${f}: data script ${tag} not in <head>`); problems++; continue; }
    s = s.slice(0, i + tag.length) + NL + '<script src="sinjal-layout.js"></script>' + s.slice(i + tag.length);
    did.push('js');
  }

  // 2. sidebar hint-size
  s = s.replace(/(<dc-import\s+name="Sidebar"[^>]*?)hint-size="[^"]*"/, (m0, a) => {
    if (m0.includes('hint-size="232px,900px"')) return m0;
    did.push('hint-size');
    return a + 'hint-size="232px,900px"';
  });

  // 3. bell
  if (!s.includes('name="NotificationBell"')) {
    const h = s.search(/<header\b[^>]*class="[^"]*\bpage-header\b/);
    if (h === -1) { console.log(`${f}: no <header class="page-header"> — bell NOT added`); problems++; }
    else {
      const hClose = s.indexOf('</header>', h);
      const pa = s.slice(h, hClose).search(/<div\b[^>]*class="[^"]*\bpage-actions\b/);
      if (pa !== -1) {
        const close = matchDiv(s, h + pa);
        if (close === -1 || close > hClose) { console.error(`${f}: could not match .page-actions </div>`); problems++; }
        else {
          // keep the closing tag's indentation when .page-actions spans several lines
          const lineStart = s.lastIndexOf('\n', close) + 1;
          const onOwnLine = /^\s*$/.test(s.slice(lineStart, close));
          const indent = s.slice(lineStart, close);
          s = onOwnLine
            ? s.slice(0, lineStart) + indent + '  ' + BELL + NL + s.slice(lineStart)
            : s.slice(0, close) + BELL + s.slice(close);
          did.push('bell');
        }
      } else {
        // insert on its own line before </header>, indented one level deeper than the closing tag
        const lineStart = s.lastIndexOf('\n', hClose) + 1;
        const indent = /^\s*$/.test(s.slice(lineStart, hClose)) ? s.slice(lineStart, hClose) : '';
        const at = indent || lineStart === hClose ? lineStart : hClose;
        s = s.slice(0, at) + indent + '  <div class="page-actions">' + BELL + '</div>' + NL + s.slice(at);
        did.push('bell+page-actions');
      }
    }
  }

  if (s === orig) { console.log(`${f}: already opted in`); continue; }
  if (!dry) {
    writeFileSync(p, s, 'utf8');
    const back = readFileSync(p);
    if (back.includes(0) || back.toString('utf8') !== s) { console.error(`${f}: write verification FAILED`); problems++; continue; }
  }
  console.log(`${f}: ${did.join(', ')}${dry ? ' (dry run)' : ''}`);
}
if (problems) { console.error(`${problems} problem(s) — see above`); process.exit(1); }
