import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE='http://127.0.0.1:8080', OUT='/tmp/flow2'; fs.mkdirSync(OUT,{recursive:true});
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const browser=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const page=await browser.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,150)));
const calls=[];
page.on('request',r=>{ if(r.method()==='POST'&&/admin\.php/.test(r.url())){ let a='?'; try{a=JSON.parse(r.postData()||'{}').action||'?'}catch{}; calls.push({action:a}); }});
await page.goto(BASE+'/admin/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#login-form, #nav',{timeout:25000});
if(await page.$('#l-email')){await page.type('#l-email',process.env.PREVIEW_EMAIL);await page.type('#l-pass',process.env.PREVIEW_PASS);await page.click('#l-btn');}
await page.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await page.waitForSelector('#nav',{timeout:25000});

// find a real invoice id from the API via the UI's own list
const invIds = await page.evaluate(async () => {
  const r = await window.WXA.api('invs_list', {});
  const items = (r.items || r.rows || r.invoices || []);
  return items.slice(0,3).map(x => ({ id: x.id, no: x.no || x.number, client: x.client }));
});
const qIds = await page.evaluate(async () => {
  const r = await window.WXA.api('quotes_list', {});
  const items = (r.items || r.rows || []);
  return items.slice(0,3).map(x => ({ id: x.id, no: x.no, status: x.status }));
});
console.log('invoices found:', JSON.stringify(invIds));
console.log('quotes found  :', JSON.stringify(qIds));

const probe = async (route, ms=2500) => {
  await page.goto(`${BASE}/admin/#/${route}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#nav',{timeout:25000});
  await new Promise(r=>setTimeout(r,ms));
  return page.evaluate(()=>{
    const v=document.querySelector('#view')||document.body;
    const txt=(v.innerText||'').replace(/\s+/g,' ');
    return { h1:(v.querySelector('h1')||{}).textContent||null, text:txt.slice(0,260),
      buttons:[...v.querySelectorAll('button,a.btn')].map(b=>(b.textContent||'').trim()).filter(Boolean).slice(0,20) };
  });
};

if (invIds[0]) {
  const i=calls.length;
  const s = await probe('invoices/'+invIds[0].id);
  await page.screenshot({path:path.join(OUT,'invoice-detail.png')});
  console.log('\n[invoice detail]', JSON.stringify(s,null,1));
  console.log('api:', [...new Set(calls.slice(i).map(c=>c.action))].join(', '));
  // try to open the payment form
  const pay = await page.evaluate(()=>{
    const b=[...document.querySelectorAll('button,a')].find(x=>/payment|pay |paid|receive/i.test(x.textContent||''));
    if(b){b.click();return b.textContent.trim();} return null;
  });
  await new Promise(r=>setTimeout(r,1800));
  const payForm = await page.evaluate(()=>({
    modal:!!document.querySelector('.modal:not([hidden]),dialog[open],[role=dialog]:not([hidden])'),
    fields:[...document.querySelectorAll('.modal input,.modal select,dialog input,[role=dialog] input')].map(x=>x.name||x.id||x.type).slice(0,10),
  }));
  await page.screenshot({path:path.join(OUT,'invoice-payment.png')});
  console.log('payment button:', pay, '| form:', JSON.stringify(payForm));
}
if (qIds[0]) {
  const i=calls.length;
  const s = await probe('quotes/'+qIds[0].id);
  await page.screenshot({path:path.join(OUT,'quote-detail.png')});
  console.log('\n[quote detail]', JSON.stringify(s,null,1));
  console.log('api:', [...new Set(calls.slice(i).map(c=>c.action))].join(', '));
}
console.log('\npageErrors:', errs.length, errs.slice(0,2));
await browser.close();
