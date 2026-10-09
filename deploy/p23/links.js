#!/usr/bin/env node
// Usage: node links.js <extracted-zip-dir>   (reports local href/src targets that do not exist)
const fs=require('fs'),path=require('path');
const root=process.argv[2];
let htmls=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name==='Woodex Live P23.zip')continue;walk(p);}else if(/\.(html|php)$/.test(e.name))htmls.push(p);}})(root);
const refRe=/(?:href|src|poster|data-src)\s*=\s*["'](\/[^"'?#]*[^"'?#]*)[?#][^"']*["']|(?:href|src|poster|data-src)\s*=\s*["'](\/[^"'?#]*)["']/g;
const missing=new Map();
function exists(rel){
  let p=path.join(root,rel);
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return true;
  if(rel.endsWith('/')&&fs.existsSync(path.join(p,'index.html')))return true;
  if(!path.extname(p)&&fs.existsSync(p+'.html'))return true;
  if(!path.extname(p)&&fs.existsSync(path.join(p,'index.html')))return true;
  return false;
}
let total=0,checked=0;
for(const f of htmls){
  const src=fs.readFileSync(f,'utf8');
  let m;
  while((m=refRe.exec(src))){
    total++;
    let rel=(m[1]||m[2]);
    if(!rel||rel.startsWith('//'))continue;
    if(/\.(php|html?)$/.test(rel)||/\/$/.test(rel)){if(exists(rel))continue;}
    else if(exists(rel))continue;
    checked++;
    if(!missing.has(rel))missing.set(rel,new Set());
    missing.get(rel).add(path.relative(root,f));
  }
}
const arr=[...missing.entries()].sort((a,b)=>b[1].size-a[1].size);
console.log(`html/php files scanned: ${htmls.length}; refs: ${total}; unresolved: ${checked}; unique missing: ${arr.length}`);
for(const [rel,set] of arr.slice(0,40))console.log(`MISSING ${rel}  (${set.size} file(s): ${[...set].slice(0,3).join(', ')})`);
