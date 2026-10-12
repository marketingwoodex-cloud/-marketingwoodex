import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const OUT='/tmp/side'; fs.mkdirSync(OUT,{recursive:true});
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,100)));
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
for (const mode of ['light','dark']) {
  await p.evaluate(m=>{localStorage.setItem('hs_theme',m);localStorage.setItem('wxaTheme',m);},mode);
  await p.goto('http://127.0.0.1:8080/admin/?theme='+mode+'&t='+Date.now()+'#/leads',{waitUntil:'domcontentloaded'});
  await p.waitForSelector('#nav',{timeout:25000});
  await new Promise(r=>setTimeout(r,2600));
  const info = await p.evaluate(()=>{
    const s=document.querySelector('.side'), a=s.querySelector('.nav-a'), on=s.querySelector('.nav-a.on');
    const cs=e=>getComputedStyle(e);
    const bb=e=>{const r=e.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)};};
    return { dark:document.documentElement.classList.contains('dark'),
      sideBg:cs(s).backgroundColor, sideW:Math.round(s.getBoundingClientRect().width),
      link:{...bb(a), font:cs(a).fontSize, weight:cs(a).fontWeight, color:cs(a).color, pad:cs(a).padding, radius:cs(a).borderRadius, gap:cs(a).gap, bg:cs(a).backgroundColor},
      active:on?{text:on.textContent.trim().slice(0,18), bg:cs(on).backgroundColor, color:cs(on).color, weight:cs(on).fontWeight}:null,
      heads:[...s.querySelectorAll('.nav-h')].map(h=>({t:h.textContent.trim().slice(0,14), font:cs(h).fontSize, ls:cs(h).letterSpacing, color:cs(h).color, tt:cs(h).textTransform})).slice(0,3),
      dots:[...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>4&&r.width<22&&Math.abs(r.width-r.height)<3&&cs(e).backgroundColor!=='rgba(0, 0, 0, 0)'&&!e.textContent.trim();}).length,
      firstItem:bb(s.querySelector('.nav-a')), brandFont: (()=>{const b2=s.querySelector('.side-brand b')||s.querySelector('.side-top b'); return b2?{t:b2.textContent, size:cs(b2).fontSize, weight:cs(b2).fontWeight}:null;})(),
    };
  });
  console.log(mode, JSON.stringify(info));
  await p.screenshot({path:path.join(OUT,mode+'-sidebar.png')});
  await p.screenshot({path:path.join(OUT,mode+'-clip.png'), clip:{x:0,y:0,width:280,height:950}});
}
console.log('pageErrors:', errs.length, errs.slice(0,2));
await b.close();
