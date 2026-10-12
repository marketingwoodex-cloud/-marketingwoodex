import pptr from 'puppeteer-core';
import cm from '@sparticuz/chromium';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BASE='http://127.0.0.1:8080';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir = await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const browser=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const page=await browser.newPage();
await page.goto(BASE+'/admin/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#login-form, #nav',{timeout:25000});
if(await page.$('#l-email')){await page.type('#l-email',process.env.PREVIEW_EMAIL);await page.type('#l-pass',process.env.PREVIEW_PASS);await page.click('#l-btn');}
await page.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await page.waitForSelector('#nav',{timeout:25000});
await page.goto(BASE+'/admin/#/clients',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#nav',{timeout:25000});
await new Promise(r=>setTimeout(r,2600));
const out = await page.evaluate(()=>{
  const cs=getComputedStyle(document.documentElement);
  const t=n=>cs.getPropertyValue(n).trim();
  const th=document.querySelector('table.tbl thead th');
  const links=[...document.styleSheets].map(s=>({href:(s.href||'inline').split('/').pop(), rules:(()=>{try{return s.cssRules.length}catch(e){return 'blocked'}})()}));
  return {
    tokens:{ 'background-2':t('--background-2'), 'card-sub':t('--card-sub'), 'surface':t('--surface'), 'color-background-2':t('--color-background-2'), 'card':t('--card') },
    thBg: th?getComputedStyle(th).backgroundColor:null,
    thPad: th?getComputedStyle(th).padding:null,
    sheets: links,
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
