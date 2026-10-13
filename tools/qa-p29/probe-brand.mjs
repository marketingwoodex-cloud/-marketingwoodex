import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT = path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT, '@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT, '@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH = [path.join(libDir, 'lib'), process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':');
const b = await pptr.launch({ executablePath: await cm.executablePath(), args: cm.args, headless: true, defaultViewport: { width: 1440, height: 950 } });
const p = await b.newPage();
await signIn(p, 'http://127.0.0.1:8080');
await p.goto('http://127.0.0.1:8080/admin/?t=' + Date.now() + '#/enquiries', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#nav', { timeout: 25000 }); await new Promise(r => setTimeout(r, 2500));
console.log(JSON.stringify(await p.evaluate(() => ({
  brand: document.querySelector('.wx-brand-sub') ? document.querySelector('.wx-brand-sub').textContent : null,
  title: document.querySelector('.wx-brand-sub') ? document.querySelector('.wx-brand-sub').title : null,
  assetsV: [...new Set([...document.querySelectorAll('link[href], script[src]')].map(e => (e.getAttribute('href') || e.getAttribute('src'))).filter(u => /[?&]v=/.test(u)).map(u => u.match(/v=[\w.-]+/)[0]))],
  badges: [...document.querySelectorAll('#nav .nav-bdg')].filter(x => x.offsetParent !== null && !x.textContent.trim()).length,
}))));
await b.close();
