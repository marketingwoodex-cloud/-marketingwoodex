import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE='http://127.0.0.1:8080';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const browser=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const page=await browser.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,150)));
const calls=[];
page.on('request',r=>{ if(r.method()==='POST'&&/admin\.php/.test(r.url())){ let a='?'; try{a=JSON.parse(r.postData()||'{}').action||'?'}catch{}; calls.push(a); }});
await page.goto(BASE+'/admin/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#login-form, #nav',{timeout:25000});
if(await page.$('#l-email')){await page.type('#l-email',process.env.PREVIEW_EMAIL);await page.type('#l-pass',process.env.PREVIEW_PASS);await page.click('#l-btn');}
await page.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await page.waitForSelector('#nav',{timeout:25000});
const test = async (hash) => {
  const i=calls.length;
  await page.goto(BASE+'/admin/#'+hash,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nav',{timeout:25000});
  await new Promise(r=>setTimeout(r,2600));
  const s=await page.evaluate(()=>{
    const v=document.querySelector('#view')||document.body;
    const txt=(v.innerText||'').replace(/\s+/g,' ');
    return { h1:(v.querySelector('h1')||{}).textContent||null,
      isSoon: /coming soon|not built|in progress|soon/i.test(txt),
      len:txt.length, text:txt.slice(0,180),
      buttons:[...v.querySelectorAll('button,a.btn')].map(b=>(b.textContent||'').trim()).filter(Boolean).slice(0,12) };
  });
  console.log(`\n#${hash}`);
  console.log('   h1:', s.h1, '| comingSoon:', s.isSoon, '| textLen:', s.len);
  console.log('   text:', s.text.slice(0,130));
  console.log('   api :', [...new Set(calls.slice(i))].join(', ') || '(none)');
  console.log('   btns:', s.buttons.join(' | ').slice(0,120));
  return s;
};
await test('invoice/1');
await test('invoices/1');
await test('quote/1');
await test('quotes/1');
await test('clients/1');
await test('lead/1');
console.log('\npageErrors:', errs.length, errs.slice(0,3));
await browser.close();
