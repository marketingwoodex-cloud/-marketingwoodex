/* Quick browser check of the live preview: load /admin/, sign in, open a few screens, screenshot. */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const OUT = process.argv[3] || '/tmp/preview-check';
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
const shots = [];
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
const needLogin = !!(await page.$('#l-email'));
if (needLogin) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL || 'master@woodex.pk');
  await page.type('#l-pass', process.env.PREVIEW_PASS || 'Woodex@2026');
  await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });
await new Promise((r) => setTimeout(r, 2500));
let f = path.join(OUT, '01-dashboard.png'); await page.screenshot({ path: f }); shots.push(f);

for (const [route, name] of [['invoices', '02-invoices'], ['users', '03-users'], ['media', '04-media'], ['settings', '05-settings']]) {
  await page.evaluate((r) => { location.hash = '#/' + r; }, route);
  await new Promise((r) => setTimeout(r, 2200));
  f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); shots.push(f);
}
const state = await page.evaluate(() => ({
  route: location.hash,
  navItems: document.querySelectorAll('#nav a').length,
  signInLabel: (document.querySelector('#u-name, .wxa-user, #nav') || {}).innerText?.split('\n')[0] || '',
  loading: /Loading/i.test(document.querySelector('#view')?.innerText || ''),
}));
console.log(JSON.stringify({ needLogin, state, pageErrors: errs, shots }, null, 1));
await browser.close();
