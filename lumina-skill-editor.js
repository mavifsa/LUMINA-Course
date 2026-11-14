/* Lumina Skill Editor — mengedit halaman materi (Skill 1–8) langsung pada tampilannya.
   Pasang di halaman materi dengan dua baris sebelum </body>:
     <script src="lumina-core.js"></script>
     <script src="lumina-skill-editor.js"></script>
   Buka halaman dengan ?edit=1 (atau dari Content Manager) lalu masuk sebagai admin. */
(function(){
"use strict";
var L=window.Lumina; if(!L)return;
var PID=(location.pathname.split("/").pop()||"index").replace(/\.html?$/i,"")||"page";
var wantEdit=/[?&]edit(=|&|$)/.test(location.search);
var cms=null, editing=false, selected=null, dirty=false;
var HL=["#fff3a3","#c9f2d9","#ffd3de","#cfe3ff","#ffdcb0"], TC=["#dc2626","#2563eb","#16a34a","#d97706","#7c3aed"];
function esc(s){return L.esc(s);}
function dec(s){var t=document.createElement("textarea");t.innerHTML=String(s==null?"":s);return t.value;}

/* sembunyikan sebentar agar tidak berkedip saat konten tersimpan diterapkan */
var hide=document.createElement("style");hide.id="lum-hide";hide.textContent="main{visibility:hidden}";document.head.appendChild(hide);
function reveal(){var h=document.getElementById("lum-hide");if(h)h.remove();}
setTimeout(reveal,2500);

var css=document.createElement("style");
css.textContent=[
".lum-sel{outline:2px dashed #e11d48!important;outline-offset:2px}",
"body.lum-edit{padding-bottom:150px}",
"body.lum-edit main .tab-content{outline:2px dashed #14b8a6;outline-offset:6px;border-radius:10px}",
"body.lum-edit main .tab-content:focus{outline-style:solid}",
"#lum-bar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99999;width:max-content;max-width:96vw;background:#0f172a;color:#cbd5e1;border-radius:14px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;justify-content:center;box-shadow:0 10px 40px #0009;font:600 12px 'Plus Jakarta Sans',system-ui,sans-serif}",
"#lum-bar button,.lum-fab{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:7px;min-width:28px;height:28px;padding:0 9px;font:inherit;cursor:pointer}",
"#lum-bar button:hover{background:#334155}",
"#lum-bar button:disabled{opacity:.4;cursor:not-allowed}",
"#lum-bar .sw{min-width:20px;width:20px;height:20px;padding:0;border-radius:50%}",
"#lum-bar .sep{width:1px;height:22px;background:#334155;margin:0 3px}",
"#lum-bar .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}",
"#lum-bar .pri{background:#14b8a6;color:#04201c;border-color:#14b8a6}",
"#lum-bar .dng{background:#7f1d1d;border-color:#991b1b;color:#fecaca}",
".lum-fab{position:fixed;right:14px;bottom:14px;z-index:99998;height:36px;box-shadow:0 6px 20px #0006}",
".lum-modal{position:fixed;inset:0;background:#0009;z-index:100000;display:grid;place-items:center;padding:16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif}",
".lum-card{background:#fff;color:#0f172a;border-radius:14px;padding:20px;width:100%;max-width:640px;max-height:90vh;overflow:auto}",
".lum-card h3{margin:0 0 12px;font-size:17px}",
".lum-card label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#475569;margin-bottom:10px}",
".lum-card input[type=text],.lum-card input[type=password],.lum-card textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}",
".lum-card .b{border:0;border-radius:8px;padding:9px 14px;font:700 12px inherit;cursor:pointer;background:#0f172a;color:#fff}",
".lum-card .b.s{background:#e2e8f0;color:#334155}.lum-card .b.d{background:#fee2e2;color:#991b1b}",
".lum-q{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px;background:#f8fafc}",
".lum-opt{display:flex;gap:8px;align-items:center;margin-bottom:6px}.lum-opt input[type=text]{flex:1}",
".lum-err{color:#b91c1c;font-size:12px;margin:0 0 10px}",
"#lum-toast{position:fixed;left:50%;top:70px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:9px 16px;border-radius:9px;font:600 13px system-ui;z-index:100001;opacity:0;transition:.25s;pointer-events:none}",
"#lum-toast.on{opacity:1}"
].join("\n");
document.head.appendChild(css);

function toast(m){var t=document.getElementById("lum-toast");if(!t){t=document.createElement("div");t.id="lum-toast";document.body.appendChild(t);}t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on");},2400);}
function isAdmin(){var a=L.currentAccount(cms);return !!a&&a.role==="admin";}
function sections(){return Array.prototype.slice.call(document.querySelectorAll("main .tab-content"));}

/* ---------- menerapkan konten tersimpan ---------- */
function cleanQ(q,i){
 var opts=(q.options||[]).map(function(o){return {text:L.sanitizeHTML(o.text),isCorrect:!!o.isCorrect};});
 return {id:i+1,question:L.sanitizeHTML(q.question),options:opts,explanation:L.sanitizeHTML(q.explanation)};
}
function setScoreText(){var el=document.getElementById("quiz-score");if(el&&typeof quizQuestions!=="undefined")el.textContent="0 / "+quizQuestions.length;}
function applySaved(){
 var s=cms.skills&&cms.skills[PID];
 if(s){
  if(s.title){var h1=document.querySelector("header h1");if(h1)h1.textContent=s.title;}
  sections().forEach(function(sec){if(typeof s.sections[sec.id]==="string")sec.innerHTML=L.sanitizeRich(s.sections[sec.id]);});
  if(Array.isArray(s.quiz)&&typeof quizQuestions!=="undefined"){
   quizQuestions.length=0;s.quiz.forEach(function(q,i){quizQuestions.push(cleanQ(q,i));});
   if(typeof userAnswers!=="undefined")Object.keys(userAnswers).forEach(function(k){delete userAnswers[k];});
  }
 }
 if(typeof renderQuiz==="function")renderQuiz();
 setScoreText();
}

/* ---------- login ---------- */
function modal(html){var m=document.createElement("div");m.className="lum-modal";m.innerHTML='<div class="lum-card">'+html+'</div>';document.body.appendChild(m);return m;}
function showLogin(){
 var m=modal('<h3>🔒 Login admin</h3><p style="margin:0 0 12px;font-size:13px;color:#64748b">Masuk dengan akun admin untuk mengedit halaman ini.</p><form id="lum-lf"><label>Username<input type="text" id="lum-u" autocomplete="username" required></label><label>Password<input type="password" id="lum-p" autocomplete="current-password" required></label><p class="lum-err" id="lum-e" style="display:none"></p><div style="display:flex;gap:8px"><button class="b" type="submit">Masuk</button><button class="b s" type="button" id="lum-c">Batal</button></div></form>');
 var fails=0;
 m.querySelector("#lum-u").focus();
 m.querySelector("#lum-c").onclick=function(){m.remove();};
 m.querySelector("#lum-lf").onsubmit=function(e){
  e.preventDefault();
  var a=L.checkLogin(cms,m.querySelector("#lum-u").value,m.querySelector("#lum-p").value),er=m.querySelector("#lum-e");
  if(!a||a.role!=="admin"){fails++;er.textContent=a?"Akun ini bukan admin.":"Username atau password salah.";er.style.display="block";if(fails>=5){m.querySelector("button[type=submit]").disabled=true;er.textContent="Terlalu banyak percobaan. Muat ulang halaman.";}return;}
  L.setSession(a);m.remove();enterEdit();
 };
}

/* ---------- toolbar ---------- */
function buildBar(){
 var sw=function(k,c){return '<button type="button" class="sw" data-'+k+'="'+c+'" style="background:'+c+'" title="'+(k==="hl"?"Sorot":"Warna teks")+'"></button>';};
 var bar=document.createElement("div");bar.id="lum-bar";
 bar.innerHTML=
 '<button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-cmd="underline"><u>U</u></button>'+
 '<span class="sep"></span><span class="lbl">Sorot</span>'+HL.map(function(c){return sw("hl",c);}).join("")+'<button data-hl="transparent" title="Hapus sorotan">✕</button>'+
 '<span class="sep"></span><span class="lbl">Warna</span>'+TC.map(function(c){return sw("fg",c);}).join("")+'<button data-fg="inherit" title="Warna asli">✕</button>'+
 '<span class="sep"></span><button data-cmd="link">🔗</button><button data-cmd="unlink" title="Hapus link">⛓✕</button><button data-cmd="removeFormat" title="Bersihkan format">Tx</button>'+
 '<span class="sep"></span><span class="lbl">Kartu</span><button data-blk="dup" title="Gandakan kartu/baris terpilih">⧉ Gandakan</button><button data-blk="up">↑</button><button data-blk="down">↓</button><button data-blk="del" class="dng">🗑 Hapus</button><button data-blk="note">＋ Catatan</button>'+
 '<span class="sep"></span><button data-act="quiz">❓ Soal kuis</button><button data-act="save" class="pri">💾 Simpan</button><button data-act="reset" class="dng" title="Kembalikan ke tampilan asli">↺ Asli</button><button data-act="exit">Keluar</button>'+
 '<div style="flex-basis:100%;text-align:center;font-size:11px;color:#94a3b8;font-weight:500">Klik teks untuk mengetik · blok teks lalu pilih warna · klik sebuah kartu/baris (garis merah putus-putus) lalu gunakan tombol Kartu</div>';
 document.body.appendChild(bar);
 bar.addEventListener("mousedown",function(e){if(e.target.closest("button"))e.preventDefault();});
 bar.addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.dataset.act){ACT[b.dataset.act]();return;}
  if(b.dataset.blk){BLK[b.dataset.blk]();return;}
  document.execCommand("styleWithCSS",false,!!(b.dataset.hl||b.dataset.fg));
  if(b.dataset.hl){if(!document.execCommand("hiliteColor",false,b.dataset.hl))document.execCommand("backColor",false,b.dataset.hl);dirty=true;}
  else if(b.dataset.fg){document.execCommand("foreColor",false,b.dataset.fg==="inherit"?"#334155":b.dataset.fg);dirty=true;}
  else{
   var c=b.dataset.cmd;
   if(c==="link"){var u=prompt("Alamat link (https://…)");if(u===null)return;var s=L.safeUrl(u);if(s)document.execCommand("createLink",false,s);else alert("Link tidak valid.");}
   else document.execCommand(c,false,null);
   dirty=true;
  }
 });
}

/* ---------- pilih & ubah kartu ---------- */
function findBlock(el,sec){
 if(el.closest("#quiz-container"))return null;
 while(el&&el!==sec){
  if(el.parentElement!==sec){
   var d=getComputedStyle(el).display,cls=typeof el.className==="string"?el.className:"";
   if(el.tagName==="TR"||el.tagName==="LI"||(/rounded/.test(cls)&&/^(block|flex|grid|list-item)$/.test(d)))return el;
  }
  el=el.parentElement;
 }
 return null;
}
function select(el){
 if(selected)selected.classList.remove("lum-sel");
 selected=el;if(el)el.classList.add("lum-sel");
}
var BLK={
 need:function(){if(!selected){alert("Klik dulu pada kartu atau baris yang ingin diubah (akan muncul garis merah putus-putus).");return false;}return true;},
 dup:function(){if(!BLK.need())return;var c=selected.cloneNode(true);c.classList.remove("lum-sel");selected.after(c);select(c);dirty=true;toast("Kartu digandakan");},
 up:function(){if(!BLK.need())return;var p=selected.previousElementSibling;if(p){p.before(selected);dirty=true;}},
 down:function(){if(!BLK.need())return;var n=selected.nextElementSibling;if(n){n.after(selected);dirty=true;}},
 del:function(){if(!BLK.need())return;if(!confirm("Hapus kartu/baris yang dipilih?"))return;var s=selected;select(null);s.remove();dirty=true;},
 note:function(){
  var n=document.createElement("div");
  n.className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1";
  n.innerHTML='<div class="font-bold text-slate-900">Judul catatan</div><p class="text-slate-700 leading-relaxed">Tulis isi catatan di sini…</p>';
  if(selected)selected.after(n);
  else{var sec=document.querySelector("main .tab-content:not(.hidden)");var host=sec&&sec.firstElementChild;if(!host)return;host.appendChild(n);}
  dirty=true;n.scrollIntoView({behavior:"smooth",block:"center"});select(n);
 }
};

/* ---------- simpan, kuis, keluar ---------- */
function latestBase(){return L.loadLocal()||cms;}
function persist(mutate){
 var base=latestBase();mutate(base);
 if(!L.save(base)){alert("Gagal menyimpan: penyimpanan browser penuh atau diblokir.");return false;}
 cms=base;return true;
}
function ensureEntry(base){if(!base.skills[PID])base.skills[PID]={title:"",sections:{},quiz:null,updated:0};return base.skills[PID];}
function saveAll(){
 var out={};
 sections().forEach(function(sec){
  var c=sec.cloneNode(true);
  c.removeAttribute("contenteditable");
  Array.prototype.forEach.call(c.querySelectorAll("[contenteditable]"),function(x){x.removeAttribute("contenteditable");});
  Array.prototype.forEach.call(c.querySelectorAll(".lum-sel"),function(x){x.classList.remove("lum-sel");});
  var qc=c.querySelector("#quiz-container");if(qc)qc.innerHTML="";
  out[sec.id]=L.sanitizeRich(c.innerHTML);
 });
 var h1=document.querySelector("header h1");
 var ok=persist(function(base){var e=ensureEntry(base);e.sections=out;e.title=h1?h1.textContent.trim():"";e.updated=Date.now();});
 if(ok){dirty=false;toast("Tersimpan ✓ — unduh lumina-data.json di Content Manager untuk dipublikasikan");}
}
function quizModal(){
 if(typeof quizQuestions==="undefined"){alert("Halaman ini tidak memiliki kuis.");return;}
 var data=quizQuestions.map(function(q){return {q:dec(q.question),e:dec(q.explanation),o:q.options.map(function(o){return {t:dec(o.text),c:!!o.isCorrect};})};});
 var m=modal('<h3>❓ Soal kuis</h3><div id="lum-ql"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b s" id="lum-qa" type="button">＋ Soal baru</button><button class="b" id="lum-qs" type="button">Simpan soal</button><button class="b s" id="lum-qc" type="button">Batal</button></div><p class="lum-err" id="lum-qe" style="display:none;margin-top:10px"></p>');
 var list=m.querySelector("#lum-ql");
 function sync(){ // baca isian ke data
  Array.prototype.forEach.call(list.querySelectorAll(".lum-q"),function(card,i){
   data[i].q=card.querySelector(".q").value;data[i].e=card.querySelector(".e").value;
   Array.prototype.forEach.call(card.querySelectorAll(".lum-opt"),function(row,j){data[i].o[j].t=row.querySelector("input[type=text]").value;data[i].o[j].c=row.querySelector("input[type=radio]").checked;});
  });
 }
 function draw(){
  list.innerHTML=data.map(function(q,i){
   return '<div class="lum-q"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Soal '+(i+1)+'</b><button class="b d" type="button" data-del="'+i+'">Hapus</button></div>'+
   '<label>Pertanyaan<textarea class="q" rows="2">'+esc(q.q)+'</textarea></label>'+
   '<div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:4px">Pilihan (pilih bulatan untuk jawaban benar)</div>'+
   q.o.map(function(o,j){return '<div class="lum-opt"><input type="radio" name="c'+i+'" '+(o.c?"checked":"")+'><b style="width:16px">'+"ABCDEF"[j]+'</b><input type="text" value="'+esc(o.t)+'"></div>';}).join("")+
   '<label style="margin-top:8px">Pembahasan<textarea class="e" rows="3">'+esc(q.e)+'</textarea></label></div>';
  }).join("")||'<p style="color:#64748b;font-size:13px">Belum ada soal.</p>';
 }
 draw();
 list.addEventListener("click",function(e){var d=e.target.closest("[data-del]");if(!d)return;sync();if(confirm("Hapus soal ini?")){data.splice(Number(d.dataset.del),1);draw();}});
 m.querySelector("#lum-qa").onclick=function(){sync();data.push({q:"",e:"",o:[0,1,2,3].map(function(j){return {t:"",c:j===0};})});draw();list.lastElementChild.scrollIntoView();};
 m.querySelector("#lum-qc").onclick=function(){m.remove();};
 m.querySelector("#lum-qs").onclick=function(){
  sync();var er=m.querySelector("#lum-qe");
  for(var i=0;i<data.length;i++){
   var q=data[i];
   if(!q.q.trim()||!q.e.trim()||q.o.some(function(o){return !o.t.trim();})||!q.o.some(function(o){return o.c;})){er.textContent="Soal "+(i+1)+": lengkapi pertanyaan, semua pilihan, pembahasan, dan pilih jawaban benar.";er.style.display="block";return;}
  }
  var store=data.map(function(q,i){return {id:i+1,question:esc(q.q.trim()),explanation:esc(q.e.trim()),options:q.o.map(function(o){return {text:esc(o.t.trim()),isCorrect:o.c};})};});
  var ok=persist(function(base){var e=ensureEntry(base);e.quiz=store;e.updated=Date.now();});
  if(!ok)return;
  quizQuestions.length=0;store.forEach(function(q,i){quizQuestions.push(cleanQ(q,i));});
  if(typeof userAnswers!=="undefined")Object.keys(userAnswers).forEach(function(k){delete userAnswers[k];});
  renderQuiz();setScoreText();m.remove();toast("Soal kuis tersimpan ✓");
 };
}
var ACT={
 save:saveAll,quiz:quizModal,
 reset:function(){
  if(!confirm("Kembalikan halaman ini ke tampilan asli? Semua hasil edit halaman ini akan hilang."))return;
  if(persist(function(base){delete base.skills[PID];}))location.href=location.pathname;
 },
 exit:function(){
  if(dirty&&!confirm("Ada perubahan yang belum disimpan. Keluar tanpa menyimpan?"))return;
  location.href=location.pathname;
 }
};

/* ---------- mode edit ---------- */
function enterEdit(){
 if(editing)return;editing=true;
 var fab=document.querySelector(".lum-fab");if(fab)fab.remove();
 document.body.classList.add("lum-edit");
 sections().forEach(function(s){s.contentEditable="true";});
 var qc=document.getElementById("quiz-container");if(qc)qc.contentEditable="false";
 var h1=document.querySelector("header h1");if(h1)h1.contentEditable="true";
 buildBar();
 document.addEventListener("input",function(){dirty=true;});
 document.addEventListener("click",function(e){
  if(!editing||e.target.closest("#lum-bar,.lum-modal"))return;
  var sec=e.target.closest("main .tab-content");
  select(sec?findBlock(e.target,sec):null);
 });
 window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue="";}});
 toast("Mode edit aktif");
}
function setup(){
 if(isAdmin()){
  if(wantEdit)enterEdit();
  else{var f=document.createElement("button");f.className="lum-fab";f.textContent="✏️ Edit halaman";f.onclick=enterEdit;document.body.appendChild(f);}
 }else if(wantEdit)showLogin();
}

L.load().then(function(d){
 cms=d;applySaved();reveal();setup();
}).catch(function(){reveal();});
})();
