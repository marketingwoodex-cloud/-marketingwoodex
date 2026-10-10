const fs=require('fs'),path=require('path');
const Engine=require('php-parser');
const parser=new Engine({parser:{extractDoc:false,suppressErrors:false,version:'8.2'},ast:{withPositions:false}});
const roots=process.argv.slice(2);
let files=[];
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory()){if(!/node_modules|vendor|\.git/.test(f))walk(p);}else if(p.endsWith('.php'))files.push(p);}}
roots.forEach(r=>{ if(fs.statSync(r).isDirectory()) walk(r); else files.push(r); });
let ok=0,bad=[];
for(const f of files){
  try{ parser.parseCode(fs.readFileSync(f,'utf8'),f); ok++; }
  catch(e){ bad.push(`${f}:${e.lineNumber||'?'} ${e.message}`); }
}
console.log(`parsed OK: ${ok}/${files.length}`);
bad.forEach(b=>console.log('  FAIL '+b));
