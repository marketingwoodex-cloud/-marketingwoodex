import pptr from 'puppeteer-core'; import cm from '@sparticuz/chromium';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const ROOT=path.resolve('node_modules');
const { inflate } = await import(pathToFileURL(path.join(ROOT,'@sparticuz/chromium/build/lambdafs.js')).href);
const libDir=await inflate(path.join(ROOT,'@sparticuz/chromium/bin/al2023.tar.br'));
process.env.LD_LIBRARY_PATH=[path.join(libDir,'lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
const b=await pptr.launch({executablePath:await cm.executablePath(),args:cm.args,headless:true,defaultViewport:{width:1440,height:950}});
const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERROR:',String(e.message).slice(0,120)));
p.on('response',async r=>{ if(r.url().includes('admin.php')) console.log('API',r.status(), (await r.text().catch(()=>'')).slice(0,70)); });
p.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE-ERR:',m.text().slice(0,120)); });
await p.goto('http://127.0.0.1:8080/admin/',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#l-email',{timeout:40000});
for(let i=0;i<4;i++){
  const st=await p.evaluate(()=>({tok:sessionStorage.getItem('wxaTok'), emailVal:document.querySelector('#l-email').value, passLen:document.querySelector('#l-pass').value.length, btnDisabled:document.querySelector('#l-btn').disabled, toast:[...document.querySelectorAll('.toast,.wxtoast,[role=alert]')].map(x=>x.textContent.trim()).join('|').slice(0,80)}));
  console.log('state'+i, JSON.stringify(st));
  if(st.tok) break;
  await p.click('#l-btn').catch(e=>console.log('click err',e.message.slice(0,60)));
  await new Promise(r=>setTimeout(r,4000));
}
await b.close();
