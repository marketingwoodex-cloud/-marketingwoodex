import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,110)));
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(() => {
  const side = document.querySelector('.side') || document.querySelector('#nav');
  const out = { tag: side.tagName, cls: side.className };
  // any node whose own text looks like a CSS var
  out.varText = [...side.querySelectorAll('*')].filter(e => /var\(--/.test((e.textContent||'').trim()) && e.children.length === 0)
      .map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent.trim().slice(0,40), parent: e.parentElement.className.slice(0,40) }));
  // any attribute containing var(
  out.varAttrs = [...side.querySelectorAll('*')].flatMap(e => [...e.attributes].filter(a => /var\(--/.test(a.value)).map(a => ({ tag: e.tagName, cls: String(e.className).slice(0,30), attr: a.name, val: a.value.slice(0,50) }))).slice(0, 12);
  // the first nav link's full markup, so the structure is visible
  out.firstLink = (side.querySelector('.nav-a') || {}).outerHTML?.slice(0, 700);
  // blue dots: small round elements
  out.dots = [...side.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 4 && r.width < 24 && Math.abs(r.width - r.height) < 3 && cs.borderRadius.includes('px') && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; })
    .map(e => ({ tag: e.tagName, cls: String(e.className).slice(0, 34), w: Math.round(e.getBoundingClientRect().width), bg: getComputedStyle(e).backgroundColor, text: (e.textContent||'').trim().slice(0,12), hidden: e.hasAttribute('hidden'), display: getComputedStyle(e).display })).slice(0, 14);
  out.sideBg = getComputedStyle(side).backgroundColor;
  out.linkFont = (() => { const a = side.querySelector('.nav-a'); const cs = a && getComputedStyle(a); return cs ? { size: cs.fontSize, weight: cs.fontWeight, color: cs.color, pad: cs.padding, radius: cs.borderRadius, gap: cs.gap } : null; })();
  return out;
}), null, 1));
console.log('pageErrors:', errs.length);
await b.close();
