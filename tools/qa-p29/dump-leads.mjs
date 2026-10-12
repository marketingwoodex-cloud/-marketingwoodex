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
  const W=window.WXA;
  const r=await W.api('leads_list');
  return {keys:Object.keys(r).slice(0,12), lead:r.leads&&r.leads[0], n:r.leads&&r.leads.length, sources:r.sources, ts:r.teamSources, team:(r.team||[]).map(t=>t.name)};
});
console.log(JSON.stringify(out,null,1).slice(0,2400));
await b.close();
