/* Copies the Preline runtime into the shipped admin (no node_modules on the host). */
import fs from 'node:fs';
import path from 'node:path';
const src = 'node_modules/preline/dist/preline.js';
const dst = '../../woodex-live-p29-v2.1-pro/admin/vendor/preline.js';
if (!fs.existsSync(src)) { console.error('preline not installed — run npm install'); process.exit(1); }
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log(`preline.js -> ${dst} (${(fs.statSync(dst).size / 1024).toFixed(0)} KB)`);
