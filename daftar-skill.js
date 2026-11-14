/* Halaman daftar skill (Structure / Listening / Reading).
   Dipakai oleh daftar-swo.html, daftar-listening.html, daftar-reading.html.
   Membaca data dari lumina-core.js (Lumina.load) -> cms.skillPages. */
(function(){
 var L=window.Lumina, SEC=window.SEC||"swo";
 var META={
  swo:{title:"Structure & Written Expression",sub:"Pilih skill yang ingin dipelajari.",color:"#bd7922",icon:"✍️"},
  listening:{title:"Listening Comprehension",sub:"Pilih skill yang ingin dipelajari.",color:"#16866b",icon:"🎧"},
  reading:{title:"Reading Comprehension",sub:"Pilih skill yang ingin dipelajari.",color:"#7952b5",icon:"📖"}
 }[SEC]||{};

 /* Menentukan bagian dari nama file: materilisteningskill3.html -> listening, dst.
    File lain (mis. materiswoskill1.html) dianggap Structure. */
 function secOf(file){
  var f=String(file||"").toLowerCase();
  if(f.indexOf("listening")>-1)return "listening";
  if(f.indexOf("reading")>-1)return "reading";
  return "swo";
 }
 function num(p){var m=String(p.file+" "+p.label).match(/skill\s*(\d+)/i);return m?parseInt(m[1],10):9999;}

 var css=document.createElement("style");
 css.textContent=
 ":root{--red:#981f34;--red-dark:#751629;--ink:#20283a;--muted:#697589;--bg:#f4f6fa;--line:#e6eaf1}"+
 "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,'Segoe UI',Arial,sans-serif;padding-bottom:60px}"+
 ".hero{background:linear-gradient(115deg,var(--red-dark),#b52b43 58%,#8c1b30);color:#fff;padding:16px max(5vw,22px)}"+
 ".hero-in{max-width:900px;margin:auto}.eyebrow{font-size:9px;letter-spacing:2px;color:#ffdce2;font-weight:700}"+
 ".hero h1{font-size:clamp(20px,3vw,28px);margin:5px 0 3px}.hero p{margin:0;font-size:12px;color:#ffe9ed}"+
 ".wrap{max-width:900px;margin:22px auto;padding:0 20px}"+
 ".back{display:inline-block;margin-bottom:14px;color:var(--red);font-weight:700;font-size:13px;text-decoration:none}"+
 ".panel{background:#fff;border:1px solid var(--line);border-radius:17px;padding:22px;box-shadow:0 5px 22px #26334b08}"+
 ".panel h2{margin:0 0 4px;font-size:20px}.panel>p{margin:0 0 18px;color:var(--muted);font-size:13px}"+
 ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}"+
 ".skill{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid var(--line);border-left:5px solid var(--c);border-radius:11px;background:#fff;color:var(--ink);text-decoration:none;font-weight:650;font-size:13.5px;transition:.15s}"+
 ".skill:hover{transform:translateY(-2px);box-shadow:0 8px 20px #26334b14}"+
 ".skill .n{flex:none;min-width:34px;height:34px;border-radius:9px;background:var(--c);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800;padding:0 6px}"+
 ".skill .go{margin-left:auto;color:#98a1b1}"+
 ".empty{padding:22px;text-align:center;color:var(--muted);font-size:13px;background:#f5f7fb;border-radius:11px;line-height:1.6}"+
 "details.cm{border:1px solid var(--line);border-left:5px solid var(--c,#cbd5e1);border-radius:10px;padding:10px 14px;margin-top:10px;background:#fff}"+
 "details.cm summary{cursor:pointer;font-weight:700;font-size:14px}.cm-body{font-size:13.5px;line-height:1.75;color:#434e62;margin-top:10px}"+
 "h3.sub{font-size:14px;margin:26px 0 4px}"+
 ".gate{position:fixed;inset:0;background:linear-gradient(115deg,var(--red-dark),#b52b43 58%,#8c1b30);display:grid;place-items:center;padding:20px;z-index:9}"+
 ".gate div{background:#fff;border-radius:16px;padding:24px;max-width:380px;text-align:center;font-size:14px;line-height:1.6}"+
 ".gate a{display:inline-block;margin-top:10px;background:var(--red);color:#fff;padding:10px 16px;border-radius:9px;text-decoration:none;font-weight:700;font-size:13px}";
 document.head.appendChild(css);

 var app=document.getElementById("app");
 app.innerHTML=
  '<header class="hero"><div class="hero-in"><div class="eyebrow">LUMINA LEARNING PLATFORM</div>'+
  '<h1>'+L.esc(META.icon+" "+META.title)+'</h1><p>'+L.esc(META.sub)+'</p></div></header>'+
  '<div class="wrap"><a class="back" href="index.html">← Kembali ke TOEFL Materials</a>'+
  '<section class="panel"><h2>Daftar Skill</h2><p>Klik salah satu skill untuk membuka halaman materinya.</p>'+
  '<div id="list" class="grid"></div><div id="extra"></div></section></div>';

 L.load().then(function(cms){
  /* hormati pengaturan "Wajibkan login" */
  if(cms.settings&&cms.settings.requireLogin&&!L.currentAccount(cms)){
   var g=document.createElement("div");g.className="gate";
   g.innerHTML='<div><b>Silakan log in dulu</b><br>Halaman ini hanya untuk pengguna yang sudah login.<br><a href="index.html">Ke halaman login</a></div>';
   document.body.appendChild(g);return;
  }
  var pages=(cms.skillPages||[]).filter(function(p){return secOf(p.file)===SEC;})
   .sort(function(a,b){return num(a)-num(b);});
  var list=document.getElementById("list");
  if(!pages.length){
   list.className="";
   list.innerHTML='<div class="empty">Belum ada skill untuk bagian ini.<br>Admin dapat menambahkannya di Content Manager → <b>Halaman Skill</b>.</div>';
  }else{
   list.innerHTML=pages.map(function(p){
    var u=L.safeUrl(p.file)||p.file;
    var m=String(p.label).match(/skill\s*(\d+)/i);
    var label=String(p.label).replace(/^\s*skill\s*\d+\s*[:\-–]?\s*/i,"")||p.label;
    return '<a class="skill" style="--c:'+META.color+'" href="'+L.esc(u)+'"><span class="n">'+(m?m[1]:"•")+'</span><span>'+L.esc(label)+'</span><span class="go">→</span></a>';
   }).join("");
  }
  /* materi tambahan yang ditambahkan lewat menu "Materi" pada bagian ini */
  var extra=(cms.materials||[]).filter(function(m){return m.section===SEC;});
  if(extra.length){
   document.getElementById("extra").innerHTML='<h3 class="sub">Materi tambahan</h3>'+extra.map(function(m){
    return '<details class="cm" style="--c:'+L.esc(L.safeColor(m.color)||"#cbd5e1")+'"><summary>'+L.esc(m.title)+'</summary><div class="cm-body">'+L.sanitizeHTML(m.html)+'</div></details>';
   }).join("");
  }
 });
})();
