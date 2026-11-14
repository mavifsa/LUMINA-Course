/* Lumina shared core — dipakai oleh index.html dan content-manager.html
   Isi: penyimpanan data CMS, akun (password di-hash), dan pembersih HTML. */
(function(){
"use strict";
var KEY="luminaCMS", EXPORT_KEY="luminaExportedAt", SESSION_KEY="luminaSession";
var DEFAULT_ADMIN={user:"admin",pass:"lumina2026",name:"Administrator"};
var SECTIONS=["general","listening","swo","reading"];
var QSECTIONS=["listening","swo","reading"];
var MAT_SECTIONS=["listening","swo","reading"];   /* bagian yang punya halaman daftar skill sendiri */
var LINK_GROUPS=["routine"];                      /* tombol tautan bebas (hanya Suggested Practice Routine) */

/* ---------- helpers ---------- */
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uid(p){return (p||"id")+"-"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function safeUrl(u){
 u=String(u==null?"":u).trim();
 if(/^(https?:\/\/|mailto:)/i.test(u))return u;
 if(!/^[a-z][a-z0-9+.\-]*:/i.test(u)&&/^[\w\-.\/%~]+(\?[\w\-.=&%]*)?(#[\w\-]*)?$/.test(u))return u;
 return "";
}
function safeColor(c){return /^#[0-9a-f]{6}$/i.test(c||"")?c:"";}
function normalizeAudioUrl(u){
 u=String(u||"").trim(); if(!u)return "";
 var m=u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)||u.match(/drive\.google\.com\/open\?(?:[^#]*&)?id=([\w-]+)/)||u.match(/drive\.google\.com\/uc\?(?:[^#]*&)?id=([\w-]+)/);
 if(m)return "https://drive.google.com/uc?export=download&id="+m[1];
 return u;
}

/* ---------- SHA-256 (murni JS, tidak butuh HTTPS) ---------- */
var K=[],H0=[];
(function(){
 var n=2,c=0;
 while(c<64){
  var p=true;for(var i=2;i*i<=n;i++){if(n%i===0){p=false;break;}}
  if(p){ if(c<8)H0[c]=(Math.pow(n,1/2)%1)*4294967296|0; K[c]=(Math.pow(n,1/3)%1)*4294967296|0; c++; }
  n++;
 }
})();
function sha256(str){
 var data=new TextEncoder().encode(str), l=data.length, total=((l+9+63)>>6)<<6;
 var buf=new Uint8Array(total); buf.set(data); buf[l]=0x80;
 var dv=new DataView(buf.buffer);
 dv.setUint32(total-8,Math.floor(l*8/4294967296)); dv.setUint32(total-4,(l*8)>>>0);
 var h=H0.slice(), w=new Int32Array(64);
 function rr(x,n){return (x>>>n)|(x<<(32-n));}
 for(var off=0;off<total;off+=64){
  for(var i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
  for(i=16;i<64;i++){
   var a15=w[i-15],a2=w[i-2];
   var s0=rr(a15,7)^rr(a15,18)^(a15>>>3), s1=rr(a2,17)^rr(a2,19)^(a2>>>10);
   w[i]=(w[i-16]+s0+w[i-7]+s1)|0;
  }
  var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
  for(i=0;i<64;i++){
   var S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f)^(~e&g), t1=(hh+S1+ch+K[i]+w[i])|0;
   var S0=rr(a,2)^rr(a,13)^rr(a,22), mj=(a&b)^(a&c)^(b&c), t2=(S0+mj)|0;
   hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
  }
  h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;
  h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;
 }
 return h.map(function(x){return (x>>>0).toString(16).padStart(8,"0");}).join("");
}
function hashPassword(user,pass){return sha256("lumina|"+String(user).toLowerCase()+"|"+pass);}

/* ---------- pembersih HTML (hanya tag aman + warna) ---------- */
var ALLOWED={B:1,STRONG:1,I:1,EM:1,U:1,S:1,SPAN:1,MARK:1,P:1,BR:1,UL:1,OL:1,LI:1,H3:1,H4:1,A:1,DIV:1,BLOCKQUOTE:1,HR:1,SUB:1,SUP:1};
var DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,LINK:1,META:1,NOSCRIPT:1,TEMPLATE:1,SVG:1,MATH:1,FORM:1,INPUT:1,BUTTON:1,TEXTAREA:1,SELECT:1};
var COLOR_RE=/^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*(,\s*\d{1,3}\s*){2}(,\s*[\d.]+\s*)?\)|[a-z]{3,20})$/i;
function cleanStyle(el){
 var out=[],props=["color","background-color"];
 for(var i=0;i<props.length;i++){var v=(el.style.getPropertyValue(props[i])||"").trim(); if(v&&COLOR_RE.test(v))out.push(props[i]+":"+v);}
 return out.join(";");
}
function walk(src,dst,doc){
 Array.prototype.slice.call(src.childNodes).forEach(function(ch){
  if(ch.nodeType===3){dst.appendChild(doc.createTextNode(ch.nodeValue));return;}
  if(ch.nodeType!==1)return;
  var tag=ch.tagName;
  if(DROP[tag])return;
  if(!ALLOWED[tag]){walk(ch,dst,doc);return;}
  var el=doc.createElement(tag.toLowerCase());
  if(tag==="A"){var href=safeUrl(ch.getAttribute("href")); if(href){el.setAttribute("href",href);el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer");}}
  var st=cleanStyle(ch); if(st)el.setAttribute("style",st);
  walk(ch,el,doc); dst.appendChild(el);
 });
}
function sanitizeHTML(html){
 var src=new DOMParser().parseFromString("<body>"+String(html||""),"text/html").body;
 var doc=document.implementation.createHTMLDocument("");
 var wrap=doc.createElement("div"); walk(src,wrap,doc); return wrap.innerHTML;
}
/* pembersih "kaya": mempertahankan class Tailwind, tabel, dan struktur kartu (untuk halaman Skill) */
var RICH={DIV:1,SPAN:1,P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,S:1,MARK:1,UL:1,OL:1,LI:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,A:1,TABLE:1,THEAD:1,TBODY:1,TFOOT:1,TR:1,TH:1,TD:1,CODE:1,PRE:1,BLOCKQUOTE:1,HR:1,SUB:1,SUP:1,SMALL:1};
var CLASS_RE=/^[\w\s\-:\/\[\]\.%#(),!@=+*]*$/;
function walkRich(src,dst,doc){
 Array.prototype.slice.call(src.childNodes).forEach(function(ch){
  if(ch.nodeType===3){dst.appendChild(doc.createTextNode(ch.nodeValue));return;}
  if(ch.nodeType!==1)return;
  var tag=ch.tagName;
  if(DROP[tag])return;
  if(!RICH[tag]){walkRich(ch,dst,doc);return;}
  var el=doc.createElement(tag.toLowerCase());
  var cls=ch.getAttribute("class"); if(cls&&cls.length<600&&CLASS_RE.test(cls))el.setAttribute("class",cls);
  var rid=ch.getAttribute("id"); if(rid&&/^quiz-[a-z-]{1,30}$/.test(rid))el.setAttribute("id",rid); /* hanya id kuis yang dipakai skrip halaman */
  if(tag==="A"){var href=safeUrl(ch.getAttribute("href")); if(href){el.setAttribute("href",href);el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer");}}
  if(tag==="TD"||tag==="TH"){["colspan","rowspan"].forEach(function(a){var v=ch.getAttribute(a); if(v&&/^\d{1,2}$/.test(v))el.setAttribute(a,v);});}
  var st=cleanStyle(ch); if(st)el.setAttribute("style",st);
  walkRich(ch,el,doc); dst.appendChild(el);
 });
}
function sanitizeRich(html){
 var src=new DOMParser().parseFromString("<body>"+String(html||""),"text/html").body;
 var doc=document.implementation.createHTMLDocument("");
 var wrap=doc.createElement("div"); walkRich(src,wrap,doc); return wrap.innerHTML;
}
function textToHTML(t){return String(t||"").split(/\n{2,}/).map(function(p){return "<p>"+esc(p).replace(/\n/g,"<br>")+"</p>";}).join("");}

/* ---------- data bawaan ---------- */
function defaults(){
 return {
  version:3, updatedAt:0,
  materials:[],
  questions:{
   listening:[
    {q:"What are the speakers mainly discussing?",o:["A class schedule","A report that needs to be completed","A meeting with Professor Allen","A change in research topic"],a:1,e:"They discuss checking the figures and submitting the report before the deadline."},
    {q:"What does the man still need to do?",o:["Write the introduction","Meet the professor","Check the figures","Print the report"],a:2,e:"He says he still needs to check the figures in the final section."},
    {q:"When does the professor want to receive the report?",o:["Tonight","Tomorrow before noon","Tomorrow evening","Next week"],a:1,e:"The woman says the professor wants it before noon tomorrow."}
   ],
   swo:[
    {q:"The committee _____ the final decision yesterday.",o:["make","makes","made","making"],a:2,e:"The time expression 'yesterday' requires the simple past: made."},
    {q:"The new library, _____ last year, is already popular with students.",o:["complete","completed","was completing","which completing"],a:1,e:"The past participle 'completed' works as a reduced passive adjective clause."},
    {q:"Neither the students nor the teacher _____ aware of the schedule change.",o:["were","are","have","was"],a:3,e:"With neither...nor, the verb agrees with the nearer subject. 'Teacher' is singular, so use was."},
    {q:"The researcher collected the data carefully, _____ the results were reliable.",o:["because","so","although","unless"],a:1,e:"'So' introduces the result: careful collection led to reliable results."}
   ],
   reading:[
    {q:"What is the main idea of the passage?",o:["Why cities should remove old trees","The benefits of urban trees and the need for careful planning","How birds migrate through cities","Why all tree species grow well on sidewalks"],a:1,e:"The passage describes several benefits and explains why tree selection and maintenance matter."},
    {q:"According to the passage, how can trees help manage rainwater?",o:["By preventing all rainfall","By making streets wider","By intercepting water and improving soil absorption","By directing water into buildings"],a:2,e:"The passage states that leaves intercept some water and roots can improve soil absorption."},
    {q:"The word 'intercepted' is closest in meaning to _____.",o:["collected or caught","heated","destroyed","measured"],a:0,e:"In context, leaves catch or hold some of the rainwater."},
    {q:"Why might a tree be unsuitable for a narrow sidewalk?",o:["It may attract too many birds","Its roots may damage pavement or pipes","It cannot receive sunlight","It may stop all traffic"],a:1,e:"The passage specifically mentions possible damage from roots."}
   ]
  },
  audio:[{id:"audio-sample",title:"Sample conversation (browser voice)",url:"",script:"Woman: Have you finished the report for Professor Allen? Man: Almost. I still need to check the figures in the final section. Woman: The professor said he would like to receive it before noon tomorrow. Man: That should be fine. I will review it tonight and send it first thing in the morning. Woman: Great. Let me know if you need me to check anything."}],
  reading:{title:"Urban Trees and City Life",passage:"<p>Urban trees provide benefits that extend beyond their appearance. Their leaves can provide shade, reducing the amount of heat absorbed by streets and buildings. Trees also help manage rainwater: some water is intercepted by leaves, while roots can improve the soil's ability to absorb rainfall. In addition, urban vegetation creates habitats for birds and insects. However, planting trees in cities requires careful planning. Species must be selected according to local climate, available space, and maintenance needs. A tree that grows well in a park may not be suitable for a narrow sidewalk where roots could damage pavement or underground pipes. Therefore, successful urban forestry depends not simply on planting more trees, but on choosing appropriate species and caring for them over time.</p>"},
  links:{routine:[]},
  /* daftar tombol halaman skill untuk tiap bagian Materi (muncul setelah tombol "Buka Materi ..." diklik) */
  materialPages:{
   listening:[],
   swo:[
    {label:"Skill 1: Subject & Verb",file:"materiswoskill1.html"},
    {label:"Skill 2",file:"materiswoskill2.html"},
    {label:"Skill 3",file:"materiswoskill3.html"},
    {label:"Skill 4",file:"materiswoskill4.html"},
    {label:"Skill 5",file:"materiswoskill5.html"},
    {label:"Skill 6",file:"materiswoskill6.html"}
   ],
   reading:[]
  },
  skills:{},
  accounts:[],
  settings:{requireLogin:false}
 };
}
function seedAdmin(){return {user:DEFAULT_ADMIN.user,name:DEFAULT_ADMIN.name,role:"admin",hash:hashPassword(DEFAULT_ADMIN.user,DEFAULT_ADMIN.pass)};}
function validQ(q){return q&&typeof q.q==="string"&&Array.isArray(q.o)&&q.o.length>=2&&typeof q.a==="number";}
function cleanPages(arr){
 return (Array.isArray(arr)?arr:[]).filter(function(p){return p&&p.label&&p.file;}).map(function(p){return {id:p.id||uid("p"),label:String(p.label),file:String(p.file)};});
}

function normalize(d){
 var base=defaults(); d=(d&&typeof d==="object")?d:{};
 var out={version:3,updatedAt:Number(d.updatedAt)||0};
 out.materials=(Array.isArray(d.materials)?d.materials:[]).filter(function(m){return m&&m.title;}).map(function(m){
  return {id:m.id||uid("m"),section:SECTIONS.indexOf(m.section)>=0?m.section:"general",title:String(m.title),html:String(m.html||""),color:safeColor(m.color),updated:Number(m.updated)||0};
 });
 out.questions={};
 QSECTIONS.forEach(function(s){
  var arr=d.questions&&d.questions[s];
  out.questions[s]=Array.isArray(arr)?arr.filter(validQ).map(function(q){return {id:q.id||uid("q"),q:q.q,o:q.o.map(String),a:q.a,e:String(q.e||""),topic:String(q.topic||"")};}):base.questions[s].map(function(q){q.id=uid("q");return q;});
 });
 out.audio=Array.isArray(d.audio)?d.audio.filter(function(a){return a&&a.title;}).map(function(a){return {id:a.id||uid("audio"),title:String(a.title),url:String(a.url||""),script:String(a.script||"")};}):base.audio;
 out.reading=(d.reading&&typeof d.reading.passage==="string")?{title:String(d.reading.title||""),passage:d.reading.passage}:base.reading;
 out.links={};
 LINK_GROUPS.forEach(function(g){
  var arr=d.links&&d.links[g];
  out.links[g]=Array.isArray(arr)?arr.filter(function(l){return l&&l.label&&l.url;}).map(function(l){return {id:l.id||uid("l"),label:String(l.label),url:String(l.url)};}):base.links[g].map(function(l){l.id=uid("l");return l;});
 });

 /* daftar halaman skill per bagian Materi.
    Data lama (skillPages + links listening/swo/reading) otomatis dipindahkan ke sini. */
 out.materialPages={};
 if(d.materialPages&&typeof d.materialPages==="object"){
  MAT_SECTIONS.forEach(function(s){out.materialPages[s]=cleanPages(d.materialPages[s]);});
 }else{
  var oldLinks=(d.links&&typeof d.links==="object")?d.links:{};
  MAT_SECTIONS.forEach(function(s){
   var list=s==="swo"?cleanPages(Array.isArray(d.skillPages)?d.skillPages:base.materialPages.swo):[];
   (Array.isArray(oldLinks[s])?oldLinks[s]:[]).forEach(function(l){
    if(l&&l.label&&l.url&&!list.some(function(x){return x.file===String(l.url);}))list.push({id:uid("p"),label:String(l.label),file:String(l.url)});
   });
   out.materialPages[s]=list;
  });
 }
 /* kompatibilitas: skillPages = daftar halaman Structure */
 out.skillPages=out.materialPages.swo.map(function(p){return {label:p.label,file:p.file};});

 out.skills={};
 if(d.skills&&typeof d.skills==="object"){
  Object.keys(d.skills).forEach(function(k){
   var s=d.skills[k]; if(!s||typeof s!=="object")return;
   var secs={}; if(s.sections&&typeof s.sections==="object")Object.keys(s.sections).forEach(function(sk){if(typeof s.sections[sk]==="string")secs[sk]=s.sections[sk];});
   out.skills[k]={title:String(s.title||""),sections:secs,quiz:Array.isArray(s.quiz)?s.quiz:null,updated:Number(s.updated)||0};
  });
 }
 out.accounts=(Array.isArray(d.accounts)?d.accounts:[]).filter(function(a){return a&&a.user&&a.hash;}).map(function(a){return {user:String(a.user).toLowerCase(),name:String(a.name||a.user),role:a.role==="admin"?"admin":"student",hash:String(a.hash)};});
 if(!out.accounts.some(function(a){return a.role==="admin";}))out.accounts.unshift(seedAdmin());
 out.settings={requireLogin:!!(d.settings&&d.settings.requireLogin)};
 return out;
}

function migrateOld(){
 var d=defaults();
 try{var q=JSON.parse(localStorage.getItem("luminaQuestions")||"null"); if(q)QSECTIONS.forEach(function(s){(q[s]||[]).forEach(function(x){d.questions[s].push(x);});});}catch(e){}
 try{
  var m=JSON.parse(localStorage.getItem("luminaMaterials")||"null");
  var map={"Listening":"listening","Structure & Written Expression":"swo","Reading":"reading"};
  if(m)m.forEach(function(x){d.materials.push({section:map[x.category]||"general",title:x.title,html:textToHTML(x.content)});});
 }catch(e){}
 return d;
}

/* ---------- simpan / muat ---------- */
function hasLocal(){try{return !!localStorage.getItem(KEY);}catch(e){return false;}}
function fetchPublished(){
 return fetch("lumina-data.json?v="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){return j?normalize(j):null;}).catch(function(){return null;});
}
function load(){
 var d=null;
 try{var raw=localStorage.getItem(KEY); if(raw)d=JSON.parse(raw);}catch(e){}
 if(d)return Promise.resolve(normalize(d));
 return fetchPublished().then(function(p){return p||normalize(migrateOld());});
}
function loadLocal(){try{var raw=localStorage.getItem(KEY);return raw?normalize(JSON.parse(raw)):null;}catch(e){return null;}}
function save(d){d.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(d));return true;}catch(e){return false;}}
function getExportedAt(){try{return Number(localStorage.getItem(EXPORT_KEY))||0;}catch(e){return 0;}}
function download(d){
 var blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
 var u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download="lumina-data.json";document.body.appendChild(a);a.click();a.remove();
 setTimeout(function(){URL.revokeObjectURL(u);},1500);
 try{localStorage.setItem(EXPORT_KEY,String(Date.now()));}catch(e){}
}

/* ---------- akun & sesi ---------- */
var memSession=null;
function findAccount(d,user){user=String(user||"").trim().toLowerCase();for(var i=0;i<d.accounts.length;i++){if(d.accounts[i].user===user)return d.accounts[i];}return null;}
function checkLogin(d,user,pass){var a=findAccount(d,user);return(a&&a.hash===hashPassword(a.user,pass))?a:null;}
function getSession(){try{var s=sessionStorage.getItem(SESSION_KEY);return s?JSON.parse(s):memSession;}catch(e){return memSession;}}
function setSession(a){
 memSession=a?{user:a.user}:null;
 try{if(a)sessionStorage.setItem(SESSION_KEY,JSON.stringify(memSession));else sessionStorage.removeItem(SESSION_KEY);}catch(e){}
}
function currentAccount(d){var s=getSession();return s?findAccount(d,s.user):null;}
function isDefaultPassword(a){return !!a&&a.hash===hashPassword(a.user,DEFAULT_ADMIN.pass);}

window.Lumina={
 KEY:KEY,EXPORT_KEY:EXPORT_KEY,DEFAULT_ADMIN:DEFAULT_ADMIN,SECTIONS:SECTIONS,QSECTIONS:QSECTIONS,MAT_SECTIONS:MAT_SECTIONS,LINK_GROUPS:LINK_GROUPS,
 esc:esc,uid:uid,safeUrl:safeUrl,safeColor:safeColor,normalizeAudioUrl:normalizeAudioUrl,
 sha256:sha256,hashPassword:hashPassword,sanitizeHTML:sanitizeHTML,sanitizeRich:sanitizeRich,textToHTML:textToHTML,
 defaults:defaults,normalize:normalize,load:load,loadLocal:loadLocal,save:save,hasLocal:hasLocal,fetchPublished:fetchPublished,
 getExportedAt:getExportedAt,download:download,
 findAccount:findAccount,checkLogin:checkLogin,getSession:getSession,setSession:setSession,currentAccount:currentAccount,isDefaultPassword:isDefaultPassword
};
})();
