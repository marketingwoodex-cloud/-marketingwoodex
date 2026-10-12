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
for (const mode of ['light','dark']) {
  await p.evaluate(m=>{localStorage.setItem('hs_theme',m);localStorage.setItem('wxaTheme',m);},mode);
  await p.goto('http://127.0.0.1:8080/admin/?theme='+mode+'&t='+Date.now()+'#/clients/1',{waitUntil:'domcontentloaded'});
  await p.waitForSelector('#nav',{timeout:25000});
  await new Promise(r=>setTimeout(r,2600));
  console.log(mode, await p.evaluate(()=>{
    const t=document.querySelector('#view .tabs'); if(!t) return null;
    const on=t.querySelector('button.on,button.active');
    const off=[...t.querySelectorAll('button')].find(x=>x!==on);
    const cs=getComputedStyle(t), c1=on?getComputedStyle(on):null, c2=off?getComputedStyle(off):null;
    return { trackBg: cs.backgroundColor, border: cs.borderColor, active: on?{bg:c1.backgroundColor, color:c1.color, text:on.textContent} : null, inactive: off?{color:c2.color, text:off.textContent}:null };
  }));
  await p.screenshot({path:'/tmp/tabs-'+mode+'.png'});
}
console.log('errors:', errs);
await b.close();
