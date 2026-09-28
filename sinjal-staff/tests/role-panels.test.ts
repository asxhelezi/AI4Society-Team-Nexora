import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { panelBody } from '../role-panels.mjs';

test('field assets stay on the field panel path, and the original source stays intact', () => {
  const original = readFileSync(resolve('../sinjal-terren/public/index.html'));
  const served = panelBody('field', '.html', original).toString();
  expect(served).toContain('data-role="operative_staff"');
  expect(served).toContain('src="/field/i18n-dict.js"');
  expect(served).toContain("from '/field/src/dc-runtime.js'");
  expect(original.toString()).toContain("from '/src/dc-runtime.js'");
});

test('a department screen checks its role without changing its design content', () => {
  const original = readFileSync(resolve('../sinjal-Departamenti/Main.dc.html'));
  const served = panelBody('department', '.html', original).toString();
  expect(served).toContain('data-role="department_authority"');
  expect(served.replace('<script src="/role-guard.js" data-role="department_authority"></script>', ''))
    .toBe(original.toString());
});
