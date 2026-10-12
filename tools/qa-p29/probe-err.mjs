import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage();
const seen=[];
p.on('pageerror', async e => {
  let state=null;
  try { state = await p.evaluate(()=>({ hash: location.hash, view: !!document.querySelector('#view'), c3ed: !!document.querySelector('#c3-ed'), modalOpen: !document.querySelector('#modal').hidden, viewLen: (document.querySelector('#view')||{innerHTML:''}).innerHTML.length, h1: (document.querySelector('#view h1')||{}).textContent })); } catch(_) {}
  seen.push({ msg: String(e.message).slice(0,80), line: String(e.stack||'').split('\n')[1]||'', state });
});
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
const step = async (label, fn) => { await fn(); await new Promise(r=>setTimeout(r,1800)); console.log('step:', label, '| errors so far:', seen.length); };

await step('goto clients/1', ()=>p.goto('http://127.0.0.1:8080/admin/?theme=light&t='+Date.now()+'#/clients/1',{waitUntil:'domcontentloaded'}));
await step('goto clients list', ()=>p.goto('http://127.0.0.1:8080/admin/?theme=light#/clients',{waitUntil:'domcontentloaded'}));
await step('open add modal', ()=>p.click('#cm-add'));
await step('press Escape', ()=>p.keyboard.press('Escape'));
await step('closeModal()', ()=>p.evaluate(()=>window.WXA.closeModal()));
console.log(JSON.stringify(seen,null,1));
await b.close();
