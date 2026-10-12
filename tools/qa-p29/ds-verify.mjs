/* Verifies the DESIGN.md token layer as the browser actually computes it.
   Checks: tokens resolve, the legacy bridge resolves to DESIGN.md values,
   light/dark both switch, and no page errors.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node ds-verify.mjs [base] [outdir]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/ds-verify';
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || '');
  await page.type('#l-pass', process.env.PREVIEW_PASS || '');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });

/* Read the tokens from getComputedStyle — this is the layer the browser really uses,
   not what the source file claims. */
const probe = () => page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const t = n => cs.getPropertyValue(n).trim();
  const body = getComputedStyle(document.body);
  const card = document.querySelector('.card');
  const h1 = document.querySelector('main h1, #view h1');
  return {
    dark: document.documentElement.classList.contains('dark'),
    tokens: {
      page: t('--color-page'), surface: t('--color-surface'), line: t('--color-line'),
      ink: t('--color-ink'), primary: t('--color-primary'),
      ok: t('--color-ok'), warn: t('--color-warn'), bad: t('--color-bad'), info: t('--color-info'),
    },
    bridge: { bg: t('--bg'), txt: t('--txt'), ok: t('--ok'), pri: t('--pri'), line: t('--line') },
    computed: {
      bodyBg: body.backgroundColor,
      cardBg: card ? getComputedStyle(card).backgroundColor : null,
      cardRadius: card ? getComputedStyle(card).borderRadius : null,
      h1Size: h1 ? getComputedStyle(h1).fontSize : null,
      h1Color: h1 ? getComputedStyle(h1).color : null,
    },
    hsTheme: localStorage.getItem('hs_theme'),
    navItems: document.querySelectorAll('#nav a').length,
  };
});

const out = { base: BASE };
await page.evaluate(() => localStorage.removeItem('hs_theme'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 800));
out.light = await probe();
await page.screenshot({ path: path.join(OUT, '01-light.png') });

await page.evaluate(() => localStorage.setItem('hs_theme', 'dark'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 1200));
out.dark = await probe();
await page.screenshot({ path: path.join(OUT, '02-dark.png') });

/* Mobile: DESIGN.md §5 requires the sidebar to collapse below lg. */
await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => localStorage.setItem('hs_theme', 'light'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 1200));
out.mobile = await page.evaluate(() => {
  const nav = document.querySelector('#nav, .side, aside');
  const r = nav ? nav.getBoundingClientRect() : null;
  return {
    viewport: window.innerWidth,
    navOffsetLeft: r ? Math.round(r.left) : null,
    navWidth: r ? Math.round(r.width) : null,
    navVisibleOffscreen: r ? r.right <= 0 : null,
    bodyScrollsHorizontally: document.documentElement.scrollWidth > window.innerWidth + 2,
  };
});
await page.screenshot({ path: path.join(OUT, '03-mobile.png') });

out.pageErrors = errs;
fs.writeFileSync(path.join(OUT, 'ds-verify.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
