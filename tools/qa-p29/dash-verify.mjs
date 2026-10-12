/* Dashboard migration check: skeleton appears during load, then the §8.2 stat
   card and §10 layout land. Captures both states plus dark mode.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node dash-verify.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/dash-verify';
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));

const out = { base: BASE };

/* Interception is enabled once and gated by a flag, so the dashboard API can be
   held open long enough to observe the skeleton deterministically. */
let delayDash = 0;
let dashDelayed = 0;
await page.setRequestInterception(true);
page.on('request', req => {
  const isDash = req.url().includes('admin.php') && (req.postData() || '').includes('dash_data');
  if (isDash && delayDash) { dashDelayed++; setTimeout(() => req.continue(), delayDash); }
  else req.continue();
});
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

/* --- catch the loading state: poll fast for the skeleton, no throttling --- */
out.skeleton = await (async () => {
  delayDash = 10000;
  await page.goto(BASE + '/admin/#/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nav', { timeout: 25000 });
  let seen = null;
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => ({
      skeletonNodes: document.querySelectorAll('.wx-skel').length,
      shimmerAnim: (() => { const n = document.querySelector('.wx-skel'); return n ? getComputedStyle(n).animationName : null; })(),
      kpiCards: document.querySelectorAll('.dx-kpi').length,
    }));
    if (s.skeletonNodes) {
      await page.screenshot({ path: path.join(OUT, '01-loading-skeleton.png') });
      seen = s; break;
    }
    if (s.kpiCards) { seen = s; break; }
    await new Promise(r => setTimeout(r, 40));
  }
  seen = seen || { note: 'skeleton not observed' };
  seen.requestsDelayed = dashDelayed;
  delayDash = 0;
  return seen;
})();

/* --- let it settle into the real dashboard --- */
await new Promise(r => setTimeout(r, 3000));
await page.waitForSelector('.dx-kpi', { timeout: 15000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1200));

out.loaded = await page.evaluate(() => {
  const kpis = [...document.querySelectorAll('.dx-kpi')];
  const one = kpis[0];
  const cs = one ? getComputedStyle(one) : null;
  const num = one ? one.querySelector('b') : null;
  const eyebrow = one ? one.querySelector('small') : null;
  const card = document.querySelector('.card');
  const cardCs = card ? getComputedStyle(card) : null;
  const head = document.querySelector('.card-h');
  const headCs = head ? getComputedStyle(head) : null;
  const h1 = document.querySelector('#view h1');
  return {
    kpiCount: kpis.length,
    kpi: one ? {
      radius: cs.borderRadius,
      shadow: cs.boxShadow.slice(0, 40),
      padding: cs.padding,
      eyebrowText: eyebrow ? eyebrow.textContent.trim() : null,
      eyebrowTransform: eyebrow ? getComputedStyle(eyebrow).textTransform : null,
      eyebrowSize: eyebrow ? getComputedStyle(eyebrow).fontSize : null,
      eyebrowWeight: eyebrow ? getComputedStyle(eyebrow).fontWeight : null,
      numberSize: num ? getComputedStyle(num).fontSize : null,
      numberWeight: num ? getComputedStyle(num).fontWeight : null,
      numberTabular: num ? getComputedStyle(num).fontVariantNumeric : null,
      iconTile: (() => {
        const ic = one.querySelector('.kpi-ic');
        if (!ic) return 'absent';
        const s = getComputedStyle(ic);
        return { w: s.width, h: s.height, bg: s.backgroundColor };
      })(),
    } : null,
    card: cardCs ? { radius: cardCs.borderRadius, shadow: cardCs.boxShadow.slice(0, 30) } : null,
    cardHeader: headCs ? { padding: headCs.padding, borderBottom: headCs.borderBottomWidth } : null,
    h1: h1 ? { size: getComputedStyle(h1).fontSize, weight: getComputedStyle(h1).fontWeight } : null,
    hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 2,
  };
});
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: path.join(OUT, '02-dashboard-light.png'), fullPage: false });

/* --- dark mode --- */
await page.evaluate(() => localStorage.setItem('hs_theme', 'dark'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await page.waitForSelector('.dx-kpi', { timeout: 20000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));
out.dark = await page.evaluate(() => {
  const one = document.querySelector('.dx-kpi');
  const card = document.querySelector('.card');
  return {
    isDark: document.documentElement.classList.contains('dark'),
    cardBg: card ? getComputedStyle(card).backgroundColor : null,
    kpiColor: one ? getComputedStyle(one.querySelector('b')).color : null,
    eyebrowColor: one ? getComputedStyle(one.querySelector('small')).color : null,
  };
});
await page.screenshot({ path: path.join(OUT, '03-dashboard-dark.png') });

/* --- mobile: DESIGN.md §5 sidebar collapse, §12 no h-scroll --- */
await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => localStorage.setItem('hs_theme', 'light'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 1800));
out.mobile = await page.evaluate(() => {
  const nav = document.querySelector('#nav, .side, aside');
  const r = nav ? nav.getBoundingClientRect() : null;
  return {
    viewport: window.innerWidth,
    navOffscreen: r ? r.right <= 1 : null,
    navWidth: r ? Math.round(r.width) : null,
    hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 2,
    kpis: document.querySelectorAll('.dx-kpi').length,
  };
});
await page.screenshot({ path: path.join(OUT, '04-dashboard-mobile.png') });

out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'dash-verify.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
