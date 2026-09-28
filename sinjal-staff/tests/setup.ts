// Loads the shared staff-side layout into the jsdom window the way index.html
// does in the browser: window.SINJAL_APP = 'staff', then public/sinjal-layout.js
// (a classic script that defines window.SinjalLayout; see src/lib/layout.ts).
import fs from 'node:fs';
import path from 'node:path';

window.SINJAL_APP = 'staff';
if (!window.SinjalLayout) {
  // indirect eval: runs the classic script in the global (jsdom window) scope
  (0, eval)(fs.readFileSync(path.join(__dirname, '..', 'public', 'sinjal-layout.js'), 'utf8'));
}
