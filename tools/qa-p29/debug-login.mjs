import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERROR:',String(e.message).slice(0,140)));
p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE-ERR:',m.text().slice(0,140));});
p.on('requestfailed',r=>console.log('REQFAIL:',r.url().slice(0,90),r.failure()?.errorText));
p.on('response',r=>{const u=r.url(); if(/admin\.php|\.js\?|\.css\?/.test(u) && r.status()>=400) console.log('HTTP',r.status(),u.slice(0,90));});
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2500));
const pre = await p.evaluate(()=>({ids:{email:!!document.querySelector('#l-email'),pass:!!document.querySelector('#l-pass'),btn:!!document.querySelector('#l-btn'),form:!!document.querySelector('#login-form')},authHidden:document.querySelector('#auth')?.hidden, ver:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href')).slice(-3)}));
console.log('PRE',JSON.stringify(pre));
if(pre.ids.email){
  await p.type('#l-email',process.env.PREVIEW_EMAIL); await p.type('#l-pass',process.env.PREVIEW_PASS); await p.click('#l-btn');
  await new Promise(r=>setTimeout(r,6000));
  const post = await p.evaluate(()=>({tok:sessionStorage.getItem('wxaTok'), appHidden:document.querySelector('#app')?.hidden, toast:(document.querySelector('.toast')||document.querySelector('#toast')||{}).textContent, err:(document.querySelector('#l-err')||{}).textContent, authHidden:document.querySelector('#auth')?.hidden}));
  console.log('POST',JSON.stringify(post));
}
await b.close();
