/* leads-inter.mjs — click-level checks on the Leads screen (browser perspective) */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
await signIn(p);
await p.evaluate(()=>{location.hash='#/leads';}); await new Promise(r=>setTimeout(r,2600));
const kpi = await p.evaluate(()=>[...document.querySelectorAll('#s17-kpi .crm-kpi-card')].map(c=>({l:c.querySelector('.crm-kpi-lbl').textContent, v:c.querySelector('.crm-kpi-val').textContent, s:(c.querySelector('.wx-kpi-sub')||{}).textContent, b:(c.querySelector('.crm-kpi-badge')||{}).textContent, spark:c.querySelectorAll('.crm-kpi-spark path').length})));
console.log('KPI', JSON.stringify(kpi));
const stage = await p.evaluate(()=>[...document.querySelectorAll('#s17-stage-card .wx-brow')].map(r=>r.querySelector('.wx-brow-l').textContent+':'+r.querySelector('.wx-brow-v').textContent));
console.log('STAGE', JSON.stringify(stage), 'foot:', await p.evaluate(()=>document.querySelector('#s17-stage-card .wx-card-foot').textContent));
const src = await p.evaluate(()=>[...document.querySelectorAll('#s17-src-card .wx-brow')].map(r=>r.querySelector('.wx-brow-l').textContent+':'+r.querySelector('.wx-brow-v').textContent));
console.log('SRC', JSON.stringify(src));
console.log('FU', await p.evaluate(()=>({g:!!document.querySelector('#s17-fu-card .wx-gauge'), num:document.querySelector('.wx-gauge-num').textContent, legend:[...document.querySelectorAll('.wx-legend span')].map(s=>s.textContent.replace(/\s+/g,' ').trim())})));
// line filter clicks
const lines = await p.evaluate(()=>[...document.querySelectorAll('#s17-lines button')].map(b=>b.textContent));
console.log('LINES', JSON.stringify(lines));
for (const label of ['Furniture','Interior','Design','Commercial','All lines']) {
  const clicked = await p.evaluate(l=>{const b=[...document.querySelectorAll('#s17-lines button')].find(x=>x.textContent.trim()===l); if(!b) return false; b.click(); return true;}, label);
  await new Promise(r=>setTimeout(r,700));
  const st = await p.evaluate(()=>({rows:document.querySelectorAll('#s17-rows tr[data-id]').length, lbl:document.querySelector('#s17-count-lbl').textContent, kpi:document.querySelector('#s17-kpi .crm-kpi-val').textContent}));
  console.log('LINE', label, clicked, JSON.stringify(st));
}
// month stepping + stage filter + search
await p.evaluate(()=>{const b=[...document.querySelectorAll('#s17-lines button')].find(x=>x.textContent.trim()==='All lines'); b&&b.click();}); await new Promise(r=>setTimeout(r,500));
await p.select('#s17-stage','won'); await new Promise(r=>setTimeout(r,600));
console.log('STAGE=won rows', await p.evaluate(()=>document.querySelectorAll('#s17-rows tr[data-id]').length));
await p.select('#s17-stage',''); await new Promise(r=>setTimeout(r,300));
await p.type('#s17-qs','tariq'); await new Promise(r=>setTimeout(r,600));
console.log('SEARCH tariq rows', await p.evaluate(()=>document.querySelectorAll('#s17-rows tr[data-id]').length));
await p.evaluate(()=>{const i=document.querySelector('#s17-qs'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true}));}); await new Promise(r=>setTimeout(r,400));
console.log('pageErrors', errs.length, errs.slice(0,3));
await b.close();
