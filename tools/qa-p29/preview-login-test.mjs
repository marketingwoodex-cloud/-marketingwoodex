// Headless-browser test of the static preview (tools/qa-p29 preview stub). QA only.
// Usage: PREVIEW_PASS=<preview password> node preview-login-test.mjs [baseUrl]
// Prints booleans and status codes only. Never prints the password or the pre-filled value.
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';

const ROOT = '/home/user/-marketingwoodex/tools/qa-p29/node_modules';
const cm = (await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/index.js')).href)).default;
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const pp = await import(pathToFileURL(path.join(ROOT, 'puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
const pptr = pp.default || pp;

const base = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const PREVIEW_EMAIL = process.env.PREVIEW_EMAIL || 'preview@woodex.test';
const PREVIEW_PASS = process.env.PREVIEW_PASS || '';
if (!PREVIEW_PASS) { console.log('FAIL: set PREVIEW_PASS'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1280, height: 900 } });
const page = await browser.newPage();
const pageErrors = [];
const statuses = {};
const external = new Set();
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 120)));
page.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) statuses[r.status()] = (statuses[r.status()] || 0) + 1; });
await page.setRequestInterception(true);
page.on('request', req => { const u = new URL(req.url()); if (u.hostname === '127.0.0.1') return req.continue(); external.add(u.hostname); return req.abort(); });

const text = sel => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const visible = sel => page.$eval(sel, e => !e.hidden && e.offsetParent !== null).catch(() => false);

await page.goto(base + '/admin/', { waitUntil: 'load' });
await sleep(1500);
const result = {};
result.loginFormVisible = await visible('#login-form');
result.passwordPrefilled = await page.$eval('#l-pass', e => e.value.length > 0).catch(() => 'no field');
// 1. Submit the form exactly as pre-filled (negative case: the shared pre-fill must not sign in).
await page.click('#l-btn'); await sleep(1200);
result.prefilledSignIn = await visible('#app');
result.prefilledError = (await text('#l-err')).slice(0, 120);
// 2. Sign in with the preview test account.
await page.$eval('#l-email', e => { e.value = ''; });
await page.$eval('#l-pass', e => { e.value = ''; });
await page.type('#l-email', PREVIEW_EMAIL);
await page.type('#l-pass', PREVIEW_PASS);
await page.click('#l-btn'); await sleep(2000);
result.previewSignIn = await visible('#app');
result.userName = await text('#u-name');
result.userRole = await text('#u-role');
result.viewHeading = (await text('#view')).slice(0, 60);
result.serverErrorShown = /Server error|Admin API is not reachable|Network error/.test(await text('#view') + await text('#l-err'));
// 3. Reload: session token should restore the signed-in state through api('me').
await page.reload({ waitUntil: 'load' }); await sleep(2000);
result.signedInAfterReload = await visible('#app');
result.apiStatusCodes = statuses;
result.pageErrors = pageErrors.length;
result.pageErrorSample = pageErrors.slice(0, 3);
result.externalHostsBlocked = [...external];
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(0);
