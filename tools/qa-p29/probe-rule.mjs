/* Which CSS rule wins for a selector? Uses CDP matched styles.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node probe-rule.mjs [route] [css-selector] [dark] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'http://127.0.0.1:8080';
const route = process.argv[2] || 'clients';
const selector = process.argv[3] || '#view .crumb a';
const mode = process.argv[4] || 'dark';

const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const page = await browser.newPage();
const client = await page.createCDPSession();
await client.send('DOM.enable');
await client.send('CSS.enable');

await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) {
  await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn');
}
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.evaluate(m => { localStorage.setItem('hs_theme', m); localStorage.setItem('wxaTheme', m); }, mode);
await page.goto(`${BASE}/admin/?t=${Date.now()}#/${route}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#view', { timeout: 25000 });
await new Promise(r => setTimeout(r, 2500));

const { root } = await client.send('DOM.getDocument', { depth: -1 });
const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
if (!nodeId) { console.log('not found:', selector); await browser.close(); process.exit(0); }
const ms = await client.send('CSS.getMatchedStylesForNode', { nodeId });
console.log('computed:', await page.evaluate(s => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : null; }, selector));
for (const r of ms.matchedCSSRules || []) {
  const decls = (r.rule.style.cssText || '').split(';').map(d => d.trim()).filter(d => /(^|[^-])color\s*:/.test(d));
  if (!decls.length) continue;
  const m = r.rule.media && r.rule.media.length ? ' @media ' + r.rule.media.map(x => x.text).join(' / ') : '';
  console.log(`  ${r.rule.origin}${m}  [${r.rule.selectorList.text.slice(0, 96)}]  =>  ${decls.join(' ')}`);
}
await browser.close();
