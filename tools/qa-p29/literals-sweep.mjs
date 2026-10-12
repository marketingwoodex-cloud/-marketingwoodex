/* literals-sweep.mjs — aggregated literal-colour audit across every admin route. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const routes=JSON.parse(fs.readFileSync('/tmp/design/routes.json','utf8'));
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
const total={};
for (const r of routes) {
  await p.evaluate(h=>{location.hash=h;}, '#/'+r);
  await new Promise(x=>setTimeout(x,2000));
  const hits = await p.evaluate(()=>{
    const v=document.querySelector('#view'); if(!v) return [];
    const g={};
    [...v.querySelectorAll('[style]')].forEach(e=>{ const s=e.getAttribute('style')||'';
      const m=s.match(/[^;]*(rgb\(|#[0-9a-f]{3,6})[^;]*/ig); if(!m) return;
      m.forEach(part=>{ const key=part.trim().replace(/\s+/g,' ').slice(0,80); g[key]=(g[key]||0)+1; }); });
    return Object.entries(g);
  });
  if (hits.length) { console.log('--- '+r+' ---'); hits.sort((a,c)=>c[1]-a[1]).slice(0,8).forEach(([k,n])=>{console.log('   '+n+'× '+k); total[k]=(total[k]||0)+n;}); }
}
fs.writeFileSync('/tmp/design/literals.json', JSON.stringify(total,null,1));
console.log('=== TOP LITERALS ACROSS ALL ROUTES ===');
Object.entries(total).sort((a,c)=>c[1]-a[1]).slice(0,22).forEach(([k,n])=>console.log(String(n).padStart(4),k));
await b.close();
