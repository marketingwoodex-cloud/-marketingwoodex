/* shot-screen.mjs <route> <name> [--full] [--click=selector] — screenshot a screen in both themes.
   One page, one sign-in (sessionStorage persists across same-tab navigation), so a QA run
   never trips the API's per-IP login throttle. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const route = process.argv[2] || 'leads', name = process.argv[3] || route.replace(/\W/g, '-');
const clickArg = (process.argv.find(a => a.startsWith('--click=')) || '').slice(8) || null;
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const OUT = '/tmp/shots'; fs.mkdirSync(OUT, { recursive: true });
const b = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e.message).slice(0, 90)));
await signIn(p);
for (const mode of ['light', 'dark']) {
  await p.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  await p.goto('http://127.0.0.1:8080/admin/?theme=' + mode + '&t=' + Date.now() + '#/' + route, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(r => setTimeout(r, 2800));
  if (clickArg) { await p.click(clickArg).catch(e => console.log('  click failed:', e.message.slice(0, 60))); await new Promise(r => setTimeout(r, 1500)); }
  const probe = await p.evaluate(() => {
    const v = document.querySelector('#view'), cs = getComputedStyle(v);
    const t = v.querySelector('table'); const rowsEl = v.querySelectorAll('.wx-t-row, tbody tr');
    const head = v.querySelector('thead') || v.querySelector('.wx-t-head');
    const firstRow = v.querySelector('.wx-t-row') || v.querySelector('tbody tr');
    const btn = v.querySelector('.wx-btn, button.btn, .btn');
    return {
      dark: document.documentElement.classList.contains('dark'), viewBg: cs.backgroundColor,
      rows: t ? t.querySelectorAll('tbody tr').length : v.querySelectorAll('.wx-t-row').length,
      hasTable: !!t, title: (v.querySelector('h1') || {}).textContent || null,
      head: head ? { bg: getComputedStyle(head).backgroundColor, color: getComputedStyle(head).color, font: getComputedStyle(head).fontSize, pad: getComputedStyle(head.firstElementChild || head).padding } : null,
      row: firstRow ? { font: getComputedStyle(firstRow).fontSize, pad: getComputedStyle(firstRow.firstElementChild || firstRow).padding, color: getComputedStyle(firstRow).color, border: getComputedStyle(firstRow).borderBottomColor } : null,
      btn: btn ? { t: btn.textContent.trim().slice(0, 16), bg: getComputedStyle(btn).backgroundColor, color: getComputedStyle(btn).color, radius: getComputedStyle(btn).borderRadius, h: Math.round(btn.getBoundingClientRect().height) } : null,
      legacyInline: [...v.querySelectorAll('[style]')].filter(e => (e.getAttribute('style') || '').trim()).length,
      cardRadius: (document.querySelector('.content .card, .content .wx-card') || {}) ? getComputedStyle(document.querySelector('.content .card, .content .wx-card') || document.body).borderRadius : null,
    };
  });
  console.log(mode, JSON.stringify(probe));
  await p.screenshot({ path: path.join(OUT, name + '-' + mode + '.png'), fullPage: process.argv.includes('--full') });
}
console.log('pageErrors', errs.length, errs.slice(0, 3));
await b.close();
