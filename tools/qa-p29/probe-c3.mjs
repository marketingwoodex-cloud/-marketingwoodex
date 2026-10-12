import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message)+' :: '+String(e.stack||'').split('\n')[1]));
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await p.goto('http://127.0.0.1:8080/admin/#/clients/1',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#nav',{timeout:25000});
await new Promise(r=>setTimeout(r,3000));
console.log(await p.evaluate(()=>({
  c3ed: !!document.querySelector('#c3-ed'),
  c3lead: !!document.querySelector('#c3-lead'),
  cha: !!document.querySelector('.s17-cha'),
  header: (document.querySelector('#view .s17-ch')||{}).innerHTML ? document.querySelector('#view .s17-ch').innerHTML.slice(0,200) : null,
  tabs: document.querySelectorAll('.s17-c3t button').length,
})));
console.log('errors:', errs);
await b.close();
