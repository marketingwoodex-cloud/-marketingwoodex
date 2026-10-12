import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
for (const mode of ['light','dark']) {
  await p.evaluate(m=>{localStorage.setItem('hs_theme',m);},mode);
  await p.goto('http://127.0.0.1:8080/admin/?theme='+mode+'&t='+Date.now()+'#/pipeline',{waitUntil:'domcontentloaded'});
  await p.waitForSelector('#nav',{timeout:25000}); await new Promise(r=>setTimeout(r,2800));
  const s = await p.evaluate(()=>{
    const kb=document.querySelector('.p19-kb'); const cols=[...document.querySelectorAll('.p19-col')];
    const cs=kb?getComputedStyle(kb):null;
    const k=document.querySelector('.p19-k b');
    return {kb:!!kb, cols:cols.length, kbDisplay:cs&&cs.display, kbCols:cs&&cs.gridTemplateColumns.slice(0,60), kbCssText:(kb&&kb.getAttribute('style')||'').slice(0,60),
      colW:cols[0]?Math.round(cols[0].getBoundingClientRect().width):0,
      kpiFont:k?{size:getComputedStyle(k).fontSize,color:getComputedStyle(k).color,text:k.textContent}:null,
      kpiCards:document.querySelectorAll('.p19-k').length,
      kpiCols:getComputedStyle(document.querySelector('.p19-kpi')).gridTemplateColumns.slice(0,60),
      cards:document.querySelectorAll('.p19-card').length};
  });
  console.log(mode, JSON.stringify(s));
}
await b.close();
