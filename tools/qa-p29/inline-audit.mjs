/* inline-audit.mjs <route> — every inline style attribute on the screen that carries a
   colour literal (hex / rgb / colour keyword), grouped, so the source can be fixed. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const route=process.argv[2]||'dashboard';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
for (const mode of ['light','dark']) {
  await p.evaluate(m=>{localStorage.setItem('hs_theme',m);},mode);
  await p.goto('http://127.0.0.1:8080/admin/?theme='+mode+'&t='+Date.now()+'#/'+route,{waitUntil:'domcontentloaded'});
  await p.waitForSelector('#nav',{timeout:25000}); await new Promise(r=>setTimeout(r,2500));
  const out = await p.evaluate(()=>{
    const v=document.querySelector('#view'); const g={};
    [...v.querySelectorAll('[style]')].forEach(e=>{ const s=e.getAttribute('style')||'';
      if(!/(rgb\(|#[0-9a-f]{3,6})/i.test(s)) return;
      const key=e.tagName.toLowerCase()+'.'+String(e.className||'').split(/\s+/).slice(0,3).join('.');
      const kk=key+' :: '+s.slice(0,110);
      g[kk]=(g[kk]||0)+1; });
    return Object.entries(g).sort((a,b2)=>b2[1]-a[1]).slice(0,18);
  });
  console.log('=== '+mode+' ('+route+') ===');
  out.forEach(([k,n])=>console.log(String(n).padStart(3),k));
}
await b.close();
