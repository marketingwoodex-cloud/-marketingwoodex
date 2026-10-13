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
for (const route of ['invoices', 'projects']) {
  await p.goto(`http://127.0.0.1:8080/admin/?theme=light&t=${Date.now()}#/${route}`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(r => setTimeout(r, 2600));
  console.log(route, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#view button.on, #view .on')].map(el => {
    const kids = [...el.querySelectorAll('small, span')].map(k => k.tagName + ':' + k.textContent.trim().slice(0, 12) + '=' + getComputedStyle(k).color);
    return { cls: el.className, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, kids, text: el.textContent.trim().slice(0, 26) };
  }).filter(x => x.kids.length))));
}
await b.close();
