/* chip-check.mjs — text must be readable against the surface it is painted on.
   Composites translucent backgrounds up the ancestor chain, so inherited and
   semi-transparent chips are measured correctly (a raw colour-vs-colour compare
   reports false positives on both). Flags anything under 2.2:1, which is where
   text disappears rather than just looking weak. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const ROUTES = (process.env.ROUTES || 'dashboard,pipeline,enquiries,clients,quotes,invoices,projects,settings').split(',');
const b = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e.message).slice(0, 90)));
await signIn(p, 'http://127.0.0.1:8080');

const measure = () => {
  const parse = c => { const m = String(c).match(/[\d.]+/g); if (!m) return null; const [r, g, bl] = m.map(Number); const a = m.length > 3 ? +m[3] : 1; return { r, g, b: bl, a }; };
  const over = (f, bk) => ({ r: f.a * f.r + (1 - f.a) * bk.r, g: f.a * f.g + (1 - f.a) * bk.g, b: f.a * f.b + (1 - f.a) * bk.b, a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (x, y) => { const [a, bk] = [lum(x), lum(y)].sort((m, n) => n - m); return (a + .05) / (bk + .05); };
  const painted = el => {
    let bg = { r: 255, g: 255, b: 255, a: 1 }, n = el; const chain = [];
    while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a === 1) break; } n = n.parentElement; }
    for (let i = chain.length - 1; i >= 0; i--) bg = chain[i].a === 1 ? chain[i] : over(chain[i], bg);
    return bg;
  };
  const out = [];
  for (const el of document.querySelectorAll('#view *')) {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!txt || el.offsetParent === null) continue;
    const fg = parse(getComputedStyle(el).color);
    if (!fg || fg.a < .95) continue;
    const cr = ratio(fg, painted(el));
    if (cr < 2.2) out.push({ cls: (el.className || '').toString().slice(0, 30), text: txt.slice(0, 20), color: getComputedStyle(el).color, cr: +cr.toFixed(2) });
    if (out.length > 6) break;
  }
  return out;
};

const res = {};
for (const mode of ['light', 'dark']) {
  await p.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  for (const r of ROUTES) {
    await p.goto(`http://127.0.0.1:8080/admin/?theme=${mode}&t=${Date.now()}#/${r}`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(x => setTimeout(x, 2500));
    res[mode + '/' + r] = await p.evaluate(measure);
  }
}
for (const k of Object.keys(res)) console.log(k.padEnd(20), 'unreadable:', String(res[k].length).padStart(2), res[k].slice(0, 2).map(x => JSON.stringify(x)).join(' | '));
console.log('pageErrors', errs.length);
await b.close();
