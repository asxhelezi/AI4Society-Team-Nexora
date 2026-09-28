// Runs the acceptance spec (spec/qa.js) against the app's logic classes.
//
// spec/qa.js loads each design file's logic in a sandbox. Here every
// `run(label, fn)` block from that file is executed unchanged, but with
// `loadComponent` returning the ported TypeScript class and `freshWindow`
// returning the app's data module with a cleared localStorage. A suite runs
// once every design file it loads has been ported; until then it is listed
// as a todo.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { NotificationBellLogic } from '../src/components/notifications/NotificationBellLogic';
import { SidebarLogic } from '../src/components/sidebar/SidebarLogic';
import { SINJAL } from '../src/data/sinjal';
import { AutomatizimetLogic } from '../src/screens/automatizimet/AutomatizimetLogic';
import { DepartamentetLogic } from '../src/screens/departamentet/DepartamentetLogic';
import { HartaLogic } from '../src/screens/harta/HartaLogic';
import { KreuLogic } from '../src/screens/kreu/KreuLogic';
import { PerformancaLogic } from '../src/screens/performanca/PerformancaLogic';
import { RaportiLogic } from '../src/screens/raporti/RaportiLogic';
import { RaportetLogic } from '../src/screens/raportet/RaportetLogic';

const PORTED: Record<string, unknown> = {
  'Sidebar.dc.html': SidebarLogic,
  'NotificationBell.dc.html': NotificationBellLogic,
  'Main.dc.html': KreuLogic,
  'Raportet.dc.html': RaportetLogic,
  'Raporti.dc.html': RaportiLogic,
  'Harta.dc.html': HartaLogic,
  'Departamentet.dc.html': DepartamentetLogic,
  'Automatizimet.dc.html': AutomatizimetLogic,
  'Performanca.dc.html': PerformancaLogic,
};

// Default props, as declared in each design file's data-props.
const DEFAULT_PROPS: Record<string, object> = {
  'Sidebar.dc.html': { active: 'kreu' },
};

function freshWindow() {
  window.localStorage.clear();
  return { SINJAL, localStorage: window.localStorage };
}

function loadComponent(file: string) {
  const Component = PORTED[file];
  if (!Component) throw new Error(file + ' is not ported yet');
  return { Component, props: { ...(DEFAULT_PROPS[file] || {}) } };
}

interface Suite {
  label: string;
  body: string;
  files: string[];
}

// spec/qa.js's own harness, replaced above by the app-facing versions
const HARNESS = new Set(['makeLocalStorage', 'extractComponentScript', 'extractDataProps', 'loadComponent', 'run', 'freshWindow']);

/** Top-level helper functions spec/qa.js declares for its suites (e.g. A_hasCategoryAutomation). */
function readHelpers(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^function (\w+)\(/.exec(lines[i]);
    if (!m || HARNESS.has(m[1])) continue;
    let j = i;
    if (!/}\s*$/.test(lines[i])) while (j < lines.length && lines[j] !== '}') j++;
    out.push(lines.slice(i, j + 1).join('\n'));
  }
  return out.join('\n');
}

function readSuites(): Suite[] {
  const src = fs.readFileSync(path.join(__dirname, '..', 'spec', 'qa.js'), 'utf8');
  const helpers = readHelpers(src);
  const suites: Suite[] = [];
  const re = /^run\('((?:[^'\\]|\\.)*)', \(\) => \{\n([\s\S]*?)^\}\);$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const body = m[2];
    const files = [...new Set([...body.matchAll(/loadComponent\('([^']+)'/g)].map((x) => x[1]))];
    suites.push({ label: m[1].replace(/\\'/g, "'"), body: helpers + '\n' + body, files });
  }
  return suites;
}

describe('spec/qa.js against the ported app', () => {
  const suites = readSuites();

  it('finds every suite in spec/qa.js', () => {
    if (suites.length < 11) throw new Error('expected at least 11 suites, found ' + suites.length);
  });

  for (const suite of suites) {
    const missing = suite.files.filter((f) => !PORTED[f]);
    if (missing.length) {
      it.todo(`${suite.label} (waiting on ${missing.join(', ')})`);
      continue;
    }
    it(suite.label, () => {
      const fn = new Function('freshWindow', 'loadComponent', suite.body);
      fn(freshWindow, loadComponent);
    });
  }
});
