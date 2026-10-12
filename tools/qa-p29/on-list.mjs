import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage();
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
for (const r of ['leads','apps','pipeline']) {
  await p.evaluate(h=>{location.hash=h;}, '#/'+r);
  await new Promise(x=>setTimeout(x,1600));
  const info = await p.evaluate(()=>({
    hash: location.hash,
    ons: [...document.querySelectorAll('.side .nav-a.on')].map(a=>({t:a.querySelector('.nav-t')?.textContent.trim(), i:a.querySelector('i')?.dataset.i})),
    aria: [...document.querySelectorAll('.side .nav-a[aria-current="page"]')].map(a=>a.querySelector('.nav-t')?.textContent.trim()),
    expanded: [...document.querySelectorAll('.side .nav-h')].map(h=>h.getAttribute('aria-expanded')).join(','),
  }));
  console.log(JSON.stringify(info));
}
await b.close();
