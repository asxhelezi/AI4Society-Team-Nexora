/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyRolePanels, panelBody, rolePanels } from './role-panels.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const loginRoot = resolve(root, '../sinjal-login');

function serveExistingLogin(): Plugin {
  return {
    name: 'serve-existing-login',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?', 1)[0];
        if (pathname === '/login') {
          res.statusCode = 302; res.setHeader('Location', '/login/'); res.end(); return;
        }
        const panel = Object.keys(rolePanels).find((name) => pathname === `/${name}` || pathname.startsWith(`/${name}/`));
        if (panel && pathname === `/${panel}`) {
          res.statusCode = 302; res.setHeader('Location', `/${panel}/`); res.end(); return;
        }
        if (!pathname.startsWith('/login/') && !panel && pathname !== '/role-guard.js') { next(); return; }
        const base = pathname === '/role-guard.js' ? root : panel
          ? resolve(root, rolePanels[panel as keyof typeof rolePanels].source) : loginRoot;
        let relative: string;
        try {
          relative = decodeURIComponent(pathname === '/role-guard.js' ? 'role-guard.js' :
            pathname.slice((panel ? `/${panel}/` : '/login/').length)) || 'index.html';
        } catch { res.statusCode = 404; res.end(); return; }
        const file = resolve(base, relative);
        if (!file.startsWith(base + sep)) { res.statusCode = 404; res.end(); return; }
        try {
          if (!statSync(file).isFile()) throw new Error('Not a file');
          const mime: Record<string, string> = {
            '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
            '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
            '.webp': 'image/webp', '.mp4': 'video/mp4',
          };
          res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'no-store');
          const body = readFileSync(file);
          res.end(panel ? panelBody(panel, extname(file), body) : body);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
    closeBundle() {
      const output = resolve(root, 'dist');
      cpSync(loginRoot, resolve(output, 'login'), { recursive: true });
      copyRolePanels(root, output);
    },
  };
}

export default defineConfig({
  plugins: [react(), serveExistingLogin()],
  server: { proxy: { '/v1': 'http://127.0.0.1:8080' } },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
