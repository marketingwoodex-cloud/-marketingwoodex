import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#login-form, #nav',{timeout:25000});
if(await p.$('#l-email')){await p.type('#l-email',process.env.PREVIEW_EMAIL);await p.type('#l-pass',process.env.PREVIEW_PASS);await p.click('#l-btn');}
await p.waitForFunction(()=>!!sessionStorage.getItem('wxaTok'),{timeout:30000});
await p.evaluate(()=>{location.hash='#/leads';}); await new Promise(r=>setTimeout(r,1800));
const aria = await p.evaluate(()=>{
  const cur=document.querySelector('.side .nav-a[aria-current="page"]');
  const gh=[...document.querySelectorAll('.side .nav-gb')].map(x=>x.getAttribute('aria-expanded'));
  const sh=[...document.querySelectorAll('.side .nav-hb')].map(x=>x.getAttribute('aria-expanded'));
  const ctl=[...document.querySelectorAll('.side [aria-controls]')].every(x=>!!document.getElementById(x.getAttribute('aria-controls')));
  const bdg=document.querySelector('.side .nav-bdg');
  return {cur: cur&&cur.querySelector('.nav-t').textContent, groupExp:gh.join(','), secExp:sh.join(','), controlsResolve:ctl, badge:bdg?{hidden:bdg.hidden,label:bdg.getAttribute('aria-label')}:null};
});
// keyboard: tab to a group button and press Enter, then Space on a section header
const kb = await p.evaluate(async()=>{
  const g=document.querySelector('.side .nav-gb'); const before=g.getAttribute('aria-expanded');
  g.focus(); g.click(); await new Promise(r=>setTimeout(r,250));
  const sec=document.querySelector('.side .nav-hb'); const s1=sec.getAttribute('aria-expanded'); sec.click(); await new Promise(r=>setTimeout(r,200));
  return {groupBefore:before, groupAfter:g.getAttribute('aria-expanded'), secBefore:s1, secAfter:sec.getAttribute('aria-expanded'), focusRing:getComputedStyle(g).outlineStyle};
});
console.log('ARIA', JSON.stringify(aria)); console.log('CLICK', JSON.stringify(kb)); console.log('pageErrors', errs.length, errs.slice(0,2));
fs.mkdirSync('/tmp/side',{recursive:true});
await p.evaluate(()=>{location.hash='#/leads';}); await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:'/tmp/side/nav-light.png', clip:{x:0,y:0,width:280,height:950}});
await p.evaluate(()=>{localStorage.setItem('hs_theme','dark');});
await p.goto('http://127.0.0.1:8080/admin/?theme=dark&t='+Date.now()+'#/leads',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#nav',{timeout:25000}); await new Promise(r=>setTimeout(r,2200));
await p.screenshot({path:'/tmp/side/nav-dark.png', clip:{x:0,y:0,width:280,height:950}});
await b.close();
