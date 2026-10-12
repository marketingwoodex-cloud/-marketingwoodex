import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:1000}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await p.goto('http://127.0.0.1:8080/admin/#/invoice/1',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#nav',{timeout:25000});
await new Promise(r=>setTimeout(r,2600));
const link = await p.evaluate(()=>{ const a=[...document.querySelectorAll('#view .wx-iv-client a')].find(x=>/Client 360/.test(x.textContent)); return a?{href:a.getAttribute('href'),text:a.textContent.trim()}:null; });
console.log('Client 360 link:', JSON.stringify(link));
if (link) { await p.click('#view .wx-iv-client a'); await new Promise(r=>setTimeout(r,3000));
  console.log('after click:', JSON.stringify(await p.evaluate(()=>({hash:location.hash, h1:(document.querySelector('#view h1')||{}).textContent, card:!!document.querySelector('#view .wx-details')})))); }
console.log('pageErrors:', errs.length, errs.slice(0,3));
await b.close();
