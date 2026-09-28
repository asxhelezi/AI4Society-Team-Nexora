import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

// Serve the existing panels on the login site's origin so their session is shared.
export const rolePanels = {
  admin: { source: '../sinjal-admin', role: 'admin' },
  department: { source: '../sinjal-Departamenti', role: 'department_authority' },
  managerial: { source: '../sinjal-managerial/public', role: 'municipal_authority' },
  field: { source: '../sinjal-terren/public', role: 'operative_staff' },
};

export function panelBody(panel, extension, body) {
  if (!['.html', '.js', '.css'].includes(extension)) return body;
  let value = body.toString('utf8');
  if (panel === 'field') {
    // The field prototype was authored for /. Scope its own asset URLs to /field/.
    value = value.replace(/(["'(])\/(assets|fonts|src|vendor|screens|i18n-dict\.js|sinjal-i18n\.js|kanavaca\.html|prototype\.html)(?=[/"'])/g, '$1/field/$2');
    value = value.replace(/(href=["'])\/(?=["'])/g, '$1/field/');
  }
  if (extension === '.html') {
    const guard = `<script src="/role-guard.js" data-role="${rolePanels[panel].role}"></script>`;
    value = /<head\b[^>]*>/i.test(value)
      ? value.replace(/<head\b[^>]*>/i, (match) => match + guard)
      : /<html\b[^>]*>/i.test(value)
        ? value.replace(/<html\b[^>]*>/i, (match) => match + '<head>' + guard + '</head>')
        : value.replace(/(?=<(?:meta|link|script)\b)/i, guard);
  }
  return Buffer.from(value);
}

export function copyRolePanels(root, target) {
  for (const [panel, config] of Object.entries(rolePanels)) {
    const source = resolve(root, config.source);
    const output = join(target, panel);
    cpSync(source, output, { recursive: true });
    function transform(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) transform(file);
        else if (entry.isFile() && ['.html', '.js', '.css'].includes(extname(file))) {
          writeFileSync(file, panelBody(panel, extname(file), readFileSync(file)));
        }
      }
    }
    transform(output);
  }
  mkdirSync(target, { recursive: true });
  cpSync(resolve(root, 'role-guard.js'), join(target, 'role-guard.js'));
}
