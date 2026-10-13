/* r8-verify.mjs — request-8 acceptance, from the browser's perspective.
   Sidebar (expanded + collapsed hover), Leads (real numbers, no demo mock), Pipeline.
   Writes /tmp/r8/ + r8.json. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const BASE = process.env.PREVIEW_BASE || 'http://127.0.0.1:8080';
const OUT = '/tmp/r8'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const b = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e.message).slice(0, 110)));
await signIn(p, BASE);

const badge = () => ({
  visible: [...document.querySelectorAll('#nav .nav-bdg')].filter(x => x.offsetParent !== null).length,
  emptyVisible: [...document.querySelectorAll('#nav .nav-bdg')].filter(x => x.offsetParent !== null && !x.textContent.trim()).length,
  texts: [...document.querySelectorAll('#nav .nav-bdg')].filter(x => x.offsetParent !== null).map(x => x.dataset.bdg + '=' + x.textContent.trim()),
});
const out = {};

for (const mode of ['light', 'dark']) {
  await p.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  const nav = async (hash) => { await p.goto(`${BASE}/admin/?theme=${mode}&t=${Date.now()}#/${hash}`, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(r => setTimeout(r, 3000)); };
  const r = {};

  /* ---------- sidebar, expanded ---------- */
  await nav('enquiries');
  r.sidebar = await p.evaluate(badge);
  r.navStyle = await p.evaluate(() => {
    const a = document.querySelector('#nav .nav-a'), on = document.querySelector('#nav .nav-a.on'), f = document.querySelector('#nav .nav-gb > span') || document.querySelector('#nav .nav-a .nav-t');
    const g = e => e ? { bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color, font: getComputedStyle(e).fontSize, weight: getComputedStyle(e).fontWeight, h: Math.round(e.getBoundingClientRect().height), radius: getComputedStyle(e).borderRadius, pad: getComputedStyle(e).padding } : null;
    return { item: g(a), active: g(on), label: g(f), font: getComputedStyle(document.body).fontFamily.split(',')[0], sidebarBg: getComputedStyle(document.querySelector('#side')).backgroundColor };
  });
  await p.screenshot({ path: path.join(OUT, mode + '-sidebar.png') });

  /* ---------- sidebar, collapsed + hover ---------- */
  await p.click('#rail').catch(() => {});
  await new Promise(r2 => setTimeout(r2, 800));
  await p.hover('#side').catch(() => {});
  await new Promise(r2 => setTimeout(r2, 700));
  r.sidebarMini = await p.evaluate(badge);
  r.miniWidth = await p.evaluate(() => Math.round(document.querySelector('#side').getBoundingClientRect().width));
  await p.screenshot({ path: path.join(OUT, mode + '-sidebar-hover.png') });
  await p.click('#rail').catch(() => {}); await new Promise(r2 => setTimeout(r2, 600));

  /* ---------- leads ---------- */
  await nav('enquiries');
  await p.waitForFunction(() => document.querySelectorAll('#s17-rows tr').length > 1, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  r.leads = await p.evaluate(() => {
    const v = document.querySelector('#view');
    const kp = [...v.querySelectorAll('#s17-kpi .crm-kpi-card')].map(k => ({ label: (k.querySelector('.crm-kpi-lbl') || {}).textContent, value: (k.querySelector('.crm-kpi-val') || {}).textContent, sub: (k.querySelector('.wx-kpi-sub') || {}).textContent }));
    return {
      kpis: kp, kpiCount: kp.length,
      demoMock: v.querySelectorAll('.crm-trio-grid, .crm-imp-item, .crm-gauge-wrap').length,
      prelineApiMentions: (v.textContent.match(/Preline/gi) || []).length,
      rows: v.querySelectorAll('#s17-rows tr').length,
      counters: [...v.querySelectorAll('#s17-c .s17-k')].map(x => x.textContent.trim()).slice(0, 4),
      tableBg: (() => { const t = v.querySelector('table.tbl'); return t ? { headBg: getComputedStyle(t.querySelector('thead th')).backgroundColor, rowColor: getComputedStyle(t.querySelector('tbody tr') || t).color, radius: getComputedStyle(v.querySelector('.preline-tbl-card') || t).borderRadius } : null; })(),
      inlineStyles: [...v.querySelectorAll('[style]')].length,
    };
  });
  await p.screenshot({ path: path.join(OUT, mode + '-leads.png'), fullPage: false });

  /* ---------- pipeline ---------- */
  await nav('pipeline');
  await new Promise(r2 => setTimeout(r2, 2500));
  r.pipeline = await p.evaluate(() => {
    const v = document.querySelector('#view');
    const cols = [...v.querySelectorAll('.p19-col')];
    const cards = [...v.querySelectorAll('.p19-card')];
    const ct = v.querySelector('.p19-ct'), cd = cards[0];
    return { boards: v.querySelectorAll('.p19-kb').length, cols: cols.length, cards: cards.length,
      colBg: cols[0] ? getComputedStyle(cols[0]).backgroundColor : null,
      colCount: ct ? getComputedStyle(ct).color : null,
      cardBg: cd ? getComputedStyle(cd).backgroundColor : null,
      cardColor: cd ? getComputedStyle(cd).color : null,
      cardRadius: cd ? getComputedStyle(cd).borderRadius : null,
      colHeads: cols.map(c => (c.querySelector('.p19-ct') || {}).textContent || '').slice(0, 6),
      brokenBoard: v.innerHTML.indexOf('undefined') >= 0,
      text: v.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) };
  });
  await p.screenshot({ path: path.join(OUT, mode + '-pipeline.png') });
  out[mode] = r;
}
out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'r8.json'), JSON.stringify(out, null, 1));
for (const m of ['light', 'dark']) { console.log('\n===== ' + m.toUpperCase()); console.log(JSON.stringify(out[m], null, 1)); }
console.log('\npageErrors:', errs.length, errs.slice(0, 4));
await b.close();
