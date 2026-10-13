/* Leads screen + sidebar: real KPI cards, no invented figures, no stray badge
   dots on the nav, token-only pills. Runs light and dark.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node leadslook.mjs [base] [outdir] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/leadslook'; fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 1000 } });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

const out = {};
for (const mode of ['light', 'dark']) {
  await page.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
  await page.goto(`${BASE}/admin/?theme=${mode}&t=${Date.now()}#/enquiries`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  await page.waitForFunction(() => document.querySelectorAll('#s17-rows tr').length > 1, { timeout: 25000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  out[mode] = await page.evaluate(() => {
    const v = document.querySelector('#view');
    const kpis = [...v.querySelectorAll('#s17-kpi .kpi')];
    const nav = [...document.querySelectorAll('#nav .nav-a')];
    // a badge is a stray dot when it is visible but carries no text
    const emptyBadges = nav.map(a => a.querySelector('.nav-bdg')).filter(b => b && !b.hidden && !b.textContent.trim()).length;
    return {
      dark: document.documentElement.classList.contains('dark'),
      kpis: kpis.map(k => ({ label: k.querySelector('small').textContent, value: k.querySelector('.kpi-row b').textContent, note: (k.querySelectorAll('small')[1] || {}).textContent })),
      legacyDemoBlocks: v.querySelectorAll('.crm-kpi-card, .crm-trio-grid, .crm-funnel-row').length,
      hardcodedInDemo: (v.innerHTML.match(/#1e293b|#dcfae6|#38bdf8|#6366f1|#818cf8/g) || []).length,
      tableRows: v.querySelectorAll('#s17-rows tr').length,
      thBg: (() => { const th = v.querySelector('table.tbl thead th'); return th ? getComputedStyle(th).backgroundColor : null; })(),
      tags: v.querySelectorAll('.wx-tag').length,
      ck: v.querySelectorAll('.wx-ck').length,
      waBtn: (() => { const w = v.querySelector('.s17-wa'); if (!w) return null; const c = getComputedStyle(w); return { bg: c.backgroundColor, color: c.color, radius: c.borderRadius }; })(),
      emptyBadges,
      navActive: (() => { const a = document.querySelector('#nav .nav-a.on'); return a ? getComputedStyle(a).backgroundColor : null; })(),
    };
  });
  await page.screenshot({ path: path.join(OUT, `${mode}-leads.png`) });
  // collapsed sidebar: badges must not reappear as dots on hover
  await page.evaluate(() => { const t = document.querySelector('#nav-tog, .nav-tog, #collapse, [data-toggle="mini"]'); if (t) t.click(); });
  await new Promise(r => setTimeout(r, 900));
  await page.hover('#nav').catch(() => {});
  await new Promise(r => setTimeout(r, 600));
  out[mode].miniEmptyBadges = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('#nav .nav-a')];
    return nav.map(a => a.querySelector('.nav-bdg')).filter(b => b && getComputedStyle(b).display !== 'none' && !b.textContent.trim()).length;
  });
  await page.screenshot({ path: path.join(OUT, `${mode}-sidebar-mini.png`) });
}
out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'leadslook.json'), JSON.stringify(out, null, 1));
for (const m of ['light', 'dark']) { console.log('\n== ' + m.toUpperCase(), JSON.stringify(out[m], null, 1)); }
console.log('\npageErrors:', errs.length, errs.slice(0, 3));
await browser.close();
