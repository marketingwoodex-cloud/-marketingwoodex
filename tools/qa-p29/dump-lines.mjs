import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { signIn } from './lib-signin.mjs';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); await signIn(p);
const out = await p.evaluate(async()=>{
  const W=window.WXA; const m=await W.api('s17_meta'); const r=await W.api('leads_list');
  const distinct={}; (r.leads||[]).forEach(l=>{distinct[String(l.line)]=(distinct[String(l.line)]||0)+1;});
  const srcs={}; (r.leads||[]).forEach(l=>{srcs[String(l.source)]=(srcs[String(l.source)]||0)+1;});
  return {linesMeta:m.lines, distinctLines:distinct, srcs, stages:(r.leads||[]).map(l=>l.stage), nextAt:(r.leads||[]).map(l=>l.next_at||null), vals:(r.leads||[]).map(l=>l.value)};
});
console.log(JSON.stringify(out));
await b.close();
