/* design-sweep.mjs — for every admin route, measure how much of the rendered screen still
   comes from the legacy sheets: inline colour literals, hex/rgb() in style attributes,
   legacy card/table class use, fonts, radii. Writes /tmp/design/sweep.json + one shot per
   offending route so the worst screens can be inspected first. */
import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const OUT='/tmp/design'; fs.mkdirSync(OUT,{recursive:true});
const NAV = JSON.parse(fs.readFileSync(process.argv[2]||'/tmp/design/routes.json','utf8'));
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push({route:null,msg:String(e.message).slice(0,80)}));
await signIn(p);
const rows=[];
for (const r of NAV) {
  errs.length=0;
  await p.evaluate((h)=>{location.hash=h;}, '#/'+r);
  await new Promise(x=>setTimeout(x,2100));
  const m = await p.evaluate(()=>{
    const v=document.querySelector('#view'); if(!v) return null;
    const all=[...v.querySelectorAll('*')];
    const inlineColour=[...v.querySelectorAll('[style]')].filter(e=>/rgb\(|#[0-9a-f]{3,6}|color\s*:/i.test(e.getAttribute('style')||'')).length;
    const inlineAny=[...v.querySelectorAll('[style]')].filter(e=>(e.getAttribute('style')||'').trim()).length;
    const legacyCls=new Set();
    all.forEach(e=>{ String(e.className||'').split(/\s+/).forEach(c=>{ if(/^(side|nav-|s1[0-9]|crm-kpi|crm-block|crm-imp|tbl|card|badge|pill|btn|seg|kpi|s17-k|preline-tbl)/.test(c)) legacyCls.add(c); }); });
    const radius={}, fonts={};
    all.slice(0,1400).forEach(e=>{const cs=getComputedStyle(e);
      if(cs.borderTopLeftRadius!=='0px') radius[cs.borderTopLeftRadius]=(radius[cs.borderTopLeftRadius]||0)+1;
      const f=cs.fontFamily.split(',')[0].replace(/"/g,''); fonts[f]=(fonts[f]||0)+1;});
    const head=v.querySelector('h1');
    return {
      title: head?head.textContent.trim().slice(0,28):(document.querySelector('.page-h h1')||{}).textContent||'?',
      nodes: all.length, inlineAny, inlineColour,
      legacyTop: [...legacyCls].slice(0,10),
      radius: Object.entries(radius).sort((a,b2)=>b2[1]-a[1]).slice(0,3),
      fonts: Object.entries(fonts).sort((a,b2)=>b2[1]-a[1]).slice(0,3),
      bg: getComputedStyle(document.body).backgroundColor,
      emptyMsg: /Loading…|Loading\.\.\.|Connecting|No data/i.test(v.innerText.slice(0,600)) ? v.innerText.slice(0,90).replace(/\s+/g,' ') : null,
    };
  });
  const row = { route: r, ...(m || {}), errors: errs.slice(0, 1).map(e => e.msg) };
  rows.push(row);
  if (m && (m.inlineColour > 6 || row.errors.length)) await p.screenshot({ path: path.join(OUT, r.replace(/\W/g, '_') + '.png') });
}
fs.writeFileSync('/tmp/design/sweep.json', JSON.stringify(rows,null,1));
const bad = rows.filter(r=>r.inlineColour>6 || r.errors.length);
console.log('routes', rows.length, 'with inline colour/errors:', bad.length);
console.log(bad.map(r=>r.route+' ic='+r.inlineColour+' err='+(r.errors[0]||'-').slice(0,40)).join('\n'));
console.log('fonts seen:', JSON.stringify(rows.flatMap(r=>r.fonts||[]).reduce((a,[f,n])=>{a[f]=(a[f]||0)+n;return a;},{})));
await b.close();
