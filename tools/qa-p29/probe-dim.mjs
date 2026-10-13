import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const b = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const p = await b.newPage();
await signIn(p, 'http://127.0.0.1:8080');
await p.evaluate(() => { localStorage.setItem('hs_theme', 'light'); localStorage.setItem('wxaTheme', 'light'); });
await p.goto('http://127.0.0.1:8080/admin/?theme=light&t=' + Date.now() + '#/invoices', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(r => setTimeout(r, 3000));
console.log(JSON.stringify(await p.evaluate(() => {
  const parse = c => { const m = String(c).match(/[\d.]+/g); if (!m) return null; const [r, g, bl] = m.map(Number); const a = m.length > 3 ? +m[3] : 1; return { r, g, b: bl, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const out = [];
  for (const el of document.querySelectorAll('#view *')) {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!txt || el.offsetParent === null) continue;
    const fg = parse(getComputedStyle(el).color); if (!fg || fg.a < .95) continue;
    let n = el, bg = null, chain = [];
    while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { chain.push(n.tagName + '.' + (n.className || '') + ' ' + getComputedStyle(n).backgroundColor); if (c.a === 1) { bg = c; break; } } n = n.parentElement; }
    if (!bg) continue;
    const L = [lum(fg), lum(bg)].sort((a, c) => c - a); const cr = (L[0] + .05) / (L[1] + .05);
    if (cr < 2.2) { const r = el.getBoundingClientRect(); out.push({ txt: txt.slice(0, 24), cr: +cr.toFixed(2), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], chain: chain.slice(0, 6), html: el.outerHTML.slice(0, 150) }); }
    if (out.length > 2) break;
  }
  return out;
}), null, 1));
await b.close();
