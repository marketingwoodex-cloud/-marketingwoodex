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
await p.evaluate(()=>{location.hash='#/leads';}); await new Promise(r=>setTimeout(r,1500));
await p.evaluate(()=>document.body.focus());
let seen=null;
for(let i=0;i<28 && !seen;i++){
  await p.keyboard.press('Tab');
  seen = await p.evaluate(()=>{
    const a=document.activeElement; if(!a) return null;
    const cls=a.className||''; if(!/nav-/.test(String(cls))) return null;
    const cs=getComputedStyle(a);
    return {cls:String(cls).slice(0,30), txt:(a.textContent||'').trim().slice(0,20), outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor, box:cs.boxShadow.slice(0,44), fv:a.matches(':focus-visible')};
  });
}
console.log('KEYBOARD FOCUS:', JSON.stringify(seen));
await b.close();
