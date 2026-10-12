/* Diagnoses theme switching: does the header toggle apply, does it survive a
   reload, and do light/dark actually produce different computed values?
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node theme-toggle-test.mjs [base]
*/
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({
  executablePath: await cm.executablePath(), args: cm.args, headless: true,
  defaultViewport: { width: 1440, height: 950 },
});
const page = await browser.newPage();
const probe = () => page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const t = n => cs.getPropertyValue(n).trim();
  const bodyCs = getComputedStyle(document.body);
  const side = document.querySelector('#nav, .side, aside');
  const sideCs = side ? getComputedStyle(side) : null;
  const view = document.querySelector('#view');
  const viewCs = view ? getComputedStyle(view) : null;
  const hdr = document.querySelector('header, .top, #top');
  const hdrCs = hdr ? getComputedStyle(hdr) : null;
  return {
    htmlClass: document.documentElement.className,
    ls: { hs_theme: localStorage.getItem('hs_theme'), wxaTheme: localStorage.getItem('wxaTheme') },
    tokens: { page: t('--color-page'), surface: t('--color-surface'), line: t('--color-line'), ink: t('--color-ink'), bg: t('--bg'), card: t('--card'), txt: t('--txt'), sideBg: t('--side-bg') },
    painted: {
      body: bodyCs.backgroundColor,
      sidebar: sideCs ? sideCs.backgroundColor : 'n/a',
      header: hdrCs ? hdrCs.backgroundColor : 'n/a',
      view: viewCs ? viewCs.backgroundColor : 'n/a',
    },
  };
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
await page.evaluate(() => { localStorage.removeItem('hs_theme'); localStorage.removeItem('wxaTheme'); });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 800));

const out = {};
out.initial = await probe();

/* find the header theme control and click it */
out.control = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('button,a,[role=button]')].filter(b => {
    const t = (b.textContent || '').trim();
    const a = (b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.id || '') + ' ' + (b.className || '');
    return /theme|dark|light|moon|sun/i.test(a + ' ' + t) && b.offsetParent !== null;
  }).map(b => ({ tag: b.tagName, id: b.id, cls: String(b.className).slice(0, 40), label: (b.getAttribute('aria-label') || '') , text: (b.textContent || '').trim().slice(0, 20) }));
  return cands;
});
out.afterClick = await (async () => {
  const clicked = await page.evaluate(() => {
    const b = document.querySelector('#dark-btn');
    if (!b) return 'no #dark-btn';
    if (b.offsetParent === null) return '#dark-btn not visible';
    b.click(); return true;
  });
  if (!clicked) return { clicked: false };
  await new Promise(r => setTimeout(r, 700));
  return { clicked: true, state: await probe() };
})();

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise(r => setTimeout(r, 800));
out.afterReload = await probe();

console.log(JSON.stringify(out, null, 1));
await browser.close();
