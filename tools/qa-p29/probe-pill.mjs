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
await p.goto('http://127.0.0.1:8080/admin/?theme=light&t=' + Date.now() + '#/pipeline', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.p19-card', { timeout: 25000 }); await new Promise(r => setTimeout(r, 2500));
console.log(JSON.stringify(await p.evaluate(() => {
  const c = document.querySelector('.p19-card');
  const kid = [...c.querySelectorAll('*')].map(e => ({ tag: e.tagName, cls: e.className, text: (e.textContent || '').trim().slice(0, 34), bg: getComputedStyle(e).backgroundColor, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
  return { html: c.innerHTML.replace(/\s+/g, ' ').slice(0, 480), kid: kid.filter(k => k.bg !== 'rgba(0, 0, 0, 0)' && k.h > 6) };
}), null, 1));
await b.close();
