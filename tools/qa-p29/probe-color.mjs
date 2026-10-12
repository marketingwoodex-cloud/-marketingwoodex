/* One-off: find where a given text element gets its colour from.
   Usage: PREVIEW_EMAIL=… PREVIEW_PASS=… node probe-color.mjs [route] [text] */
import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'http://127.0.0.1:8080';
const route = process.argv[2] || 'invoices';
const needle = process.argv[3] || 'WI-10101';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');

const browser = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const page = await browser.newPage();
await page.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form, #nav', { timeout: 25000 });
if (await page.$('#l-email')) { await page.type('#l-email', process.env.PREVIEW_EMAIL); await page.type('#l-pass', process.env.PREVIEW_PASS); await page.click('#l-btn'); }
await page.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
await page.waitForSelector('#nav', { timeout: 25000 });
await page.evaluate(() => { localStorage.setItem('hs_theme', 'dark'); localStorage.setItem('wxaTheme', 'dark'); });
await page.goto(`${BASE}/admin/?t=${Date.now()}#/${route}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#view', { timeout: 25000 });
await new Promise(r => setTimeout(r, 2500));

const info = await page.evaluate((needle) => {
  const client = document.createElement('div');
  const el = [...document.querySelectorAll('#view *')].find(e =>
    [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.includes(needle)));
  if (!el) return { found: false };
  const chain = [];
  let n = el;
  while (n && n !== document.documentElement) {
    const s = getComputedStyle(n);
    chain.push({
      node: n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
      color: s.color,
      bg: s.backgroundColor,
      inline: n.getAttribute('style') || null,
    });
    n = n.parentElement;
  }
  const s = getComputedStyle(el);
  const varsAtEl = {};
  for (const v of ['--pri', '--pri-ink', '--primary', '--primary-text', '--gold', '--gold-d', '--primary-hover']) {
    varsAtEl[v] = s.getPropertyValue(v).trim() || getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  return { found: true, text: el.textContent.trim().slice(0, 40), cls: String(el.className), inline: el.getAttribute('style'), color: s.color, bg: s.backgroundColor, chain, varsAtEl, dark: document.documentElement.classList.contains('dark') };
}, needle);

console.log(JSON.stringify(info, null, 1));


/* CDP: report the winning `color` rule for the same element */
{
  const page2 = await browser.newPage();
  const client = await page2.createCDPSession();
  await client.send('DOM.enable'); await client.send('CSS.enable');
  await page2.goto(BASE + '/admin/', { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('#login-form, #nav', { timeout: 25000 });
  if (await page2.$('#l-email')) { await page2.type('#l-email', process.env.PREVIEW_EMAIL); await page2.type('#l-pass', process.env.PREVIEW_PASS); await page2.click('#l-btn'); }
  await page2.waitForFunction(() => !!sessionStorage.getItem('wxaTok'), { timeout: 30000 });
  await page2.evaluate(() => { localStorage.setItem('hs_theme', 'dark'); localStorage.setItem('wxaTheme', 'dark'); });
  await page2.goto(`${BASE}/admin/?t=${Date.now()}#/${route}`, { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('#view', { timeout: 25000 });
  await new Promise(r => setTimeout(r, 2500));
  const { root } = await client.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#view .crumb a' });
  if (nodeId) {
    const ms = await client.send('CSS.getMatchedStylesForNode', { nodeId });
    for (const r of ms.matchedCSSRules || []) {
      const txt = (r.rule.style.cssText || '').match(/color\s*:[^;]*/g);
      if (txt) console.log('RULE', JSON.stringify(r.rule.selectorList.text.slice(0, 70)), txt.join('|'), '->', (r.rule.styleSheetId !== undefined ? 'sheet ') + (r.rule.origin || ''), 'media:', (r.rule.media || []).map(m=>m.text).join(','));
    }
  } else console.log('no #view .crumb a found');
  await page2.close();
}
