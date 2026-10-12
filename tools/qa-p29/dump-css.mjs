import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
await p.evaluate(()=>{location.hash='#/pipeline';}); await new Promise(r=>setTimeout(r,3000));
const css = await p.evaluate(()=>[...document.querySelectorAll('style')].map(s=>s.textContent).filter(t=>/\.p19-kpi/.test(t)).join('\n/* ---- second block ---- */\n'));
fs.writeFileSync('/tmp/pipeline-injected.css', css);
console.log('bytes', css.length, 'rules', (css.match(/\}/g)||[]).length);
// also capture the p19 element structure for reference
const dom = await p.evaluate(()=>{const v=document.querySelector('#view'); return v? v.className+' | '+v.querySelectorAll('*').length+' nodes | p19 classes: '+[...new Set([...v.querySelectorAll('[class]')].flatMap(e=>String(e.className).split(/\s+/).filter(c=>/^p19/.test(c))))].slice(0,14).join(' ') : 'none';});
console.log(dom);
await b.close();
