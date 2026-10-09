#!/usr/bin/env node
// Usage: npm i php-parser && node phplint.js <extracted-zip-dir>
const fs=require('fs'),path=require('path');
const parser=require('php-parser');
const engine=new parser({php:{parser:{suppressErrors:false,extractDoc:false},lex:{mode:parser.ParserEngineExtension}}});
const root=process.argv[2];
const skip=new Set(['Woodex Live P23.zip']);
let files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.php'))files.push(p);}})(root);
let bad=0;
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  if(/^<<<<<<< |^>>>>>>> |^={7}$/m.test(src)){console.log('CONFLICT  '+path.relative(root,f));bad++;continue;}
  try{engine.parseCode(src,f);}catch(e){console.log('SYNTAX    '+path.relative(root,f)+'  ::  '+String(e.message).split('\n')[0]);bad++;}
}
console.log(`\nchecked ${files.length} php files, ${bad} problem files`);
