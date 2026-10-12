import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
const r = await p.evaluate(async () => {
  location.hash = '#/pipeline'; await new Promise(x => setTimeout(x, 2600));
  const card = document.querySelector('.p19-card'); const cs = e => getComputedStyle(e);
  const info = e => ({ cls: String(e.className || e.tagName).slice(0, 22), w: Math.round(e.getBoundingClientRect().width), sh: e.scrollWidth, disp: cs(e).display, ws: cs(e).whiteSpace, ovx: cs(e).overflowX, pad: cs(e).padding, box: cs(e).boxSizing, minw: cs(e).minWidth });
  const col = card.closest('.p19-col');
  return { col: info(col), colPad: cs(col).padding, colOverflow: cs(col).overflow, colBg: cs(col).backgroundColor,
    list: info(card.closest('.p19-list')), card: info(card), kids: [...card.children].map(info),
    ct: info(card.querySelector('.p19-ct')), ctn: info(card.querySelector('.p19-ctn')),
    b: info(card.querySelector('.p19-ct b')), small: (() => { const s = card.querySelector('.p19-ct small'); return s ? info(s) : null; })(),
    tags: info(card.querySelector('.p19-tags')), tag: info(card.querySelector('.p19-tags span')),
    cf: info(card.querySelector('.p19-cf')), age: info(card.querySelector('.p19-age')) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
