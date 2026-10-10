const fs=require('fs'),path=require('path');const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const variant=process.argv[2],theme=process.env.THEME||'light',adminDir=path.join(variant,'admin');
const html=fs.readFileSync(path.join(adminDir,'index.html'),'utf8').replace(/<base[^>]*>/i,'');
class L extends ResourceLoader{fetch(url){const u=new URL(url);if(u.host!=='localhost')return null;let f=path.join(adminDir,u.pathname.replace(/^\/admin\//,''));if(!fs.existsSync(f))f=path.join(variant,u.pathname.replace(/^\//,''));if(!fs.existsSync(f)||fs.statSync(f).isDirectory())return Promise.reject(new Error('404'));return Promise.resolve(fs.readFileSync(f));}}
const user={id:1,name:'QA Owner',role:'owner',email:'o@qa.test'};
const R=a=>a==='status'?{ok:true,needsSetup:false,driver:'mysql',builderLocked:false,user}:a==='me'?{ok:true,user,caps:{},builderToken:null}:a==='dashboard'?{ok:true,stats:{pages:0,folders:{}},kpi:{}}:{ok:true,avatars:{},rows:[],items:[],list:[],leads:[],chats:[],total:0,per:20,pages:[],tpls:[],sources:[],team:[],stages:[],users:[],flows:{},camps:[],pending:0,unread:0};
const vc=new VirtualConsole();
const dom=new JSDOM(html,{url:'http://localhost/admin/index.html#/security',runScripts:'dangerously',resources:new L(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){
 win.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};win.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 win.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
 win.HTMLElement.prototype.scrollIntoView=function(){};
 win.fetch=(u,o)=>{let a='';try{a=JSON.parse(o&&o.body||'{}').action}catch(e){}return Promise.resolve({status:200,ok:true,json:()=>Promise.resolve(R(a))})};
 win.sessionStorage.setItem('wxaTok','qa');win.localStorage.setItem('wxaTheme',theme);}});
const w=dom.window;
setTimeout(()=>{const d=w.document;const cs=s=>{const el=d.querySelector(s);return el?w.getComputedStyle(el):null};
 const side=cs('#side'),main=cs('.main'),view=cs('#view'),brand=cs('#side .brand b'),role=cs('#sf-role');
 console.log(`THEME=${theme} html.class="${d.documentElement.className}"`);
 console.log('  sidebar  #side background :', side&&side.backgroundColor, '| color:', side&&side.color);
 console.log('  .main    background       :', main&&main.backgroundColor);
 console.log('  #view    background       :', view&&view.backgroundColor);
 console.log('  brand text color          :', brand&&brand.color, '| sf-role color:', role&&role.color);
 w.close();process.exit(0);},1600);
