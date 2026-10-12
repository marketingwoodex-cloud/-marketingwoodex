import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage();
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
const r = await p.evaluate(async () => {
  const out = {};
  for (const a of ['invs_list','quotes_list','clients_master','leads_list','dash_data']) {
    try { const x = await window.WXA.api(a); out[a] = { keys: Object.keys(x||{}), sample: JSON.stringify(x).slice(0, 260) }; }
    catch (e) { out[a] = { error: String(e.message).slice(0,90) }; }
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
