/* Giao diện người dùng (nền, độ sáng, tông màu, nhạc). Nạp SAU site.js ở mọi trang. Lưu: localStorage 'sq_theme' + IndexedDB 'sq_assets'. */
(function(){
var K='sq_theme',D={bg:{t:'default'},bright:60,accent:'',m:{on:0,vol:50,track:'',loop:1},o:{v:1,nosel:1,noanim:0,noblur:0,nobtn:0,font:100,fr:0,frc:'#0c0c12',fa:60}},S,L=[];
function load(){var o={};try{o=JSON.parse(localStorage.getItem(K)||'{}')||{};}catch(e){}S=Object.assign({},D,o);S.bg=Object.assign({t:'default'},o.bg||{});S.m=Object.assign({},D.m,o.m||{});S.o=Object.assign({},D.o,o.o||{});if(!S.o.v){S.o.v=1;S.o.nosel=1;}}
function save(){try{localStorage.setItem(K,JSON.stringify(S));}catch(e){}}
function emit(){L.forEach(function(f){try{f();}catch(e){}});}
load();
var dbp;function db(){return dbp||(dbp=new Promise(function(res,rej){if(!window.indexedDB)return rej();var r=indexedDB.open('sq_assets',1);r.onupgradeneeded=function(){r.result.createObjectStore('f',{keyPath:'id'});};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};}));}
function tx(mode,fn){return db().then(function(d){return new Promise(function(res,rej){var t=d.transaction('f',mode),q=fn(t.objectStore('f'));t.oncomplete=function(){res(q&&q.result);};t.onerror=t.onabort=function(){rej(t.error);};});});}
var Store={put:function(r){return tx('readwrite',function(o){return o.put(r);});},get:function(i){return tx('readonly',function(o){return o.get(i);});},del:function(i){return tx('readwrite',function(o){return o.delete(i);});},all:function(){return tx('readonly',function(o){return o.getAll();});}};
var urls={};function url(rec){if(!urls[rec.id])urls[rec.id]=URL.createObjectURL(rec.blob);return urls[rec.id];}
/* ---- tông màu ---- */
function rgb(h){h=h.replace('#','');if(h.length==3)h=h.replace(/./g,'$&$&');var n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255];}
function hsl(c){var r=c[0]/255,g=c[1]/255,b=c[2]/255,M=Math.max(r,g,b),m=Math.min(r,g,b),l=(M+m)/2,h=0,s=0,d=M-m;if(d){s=l>.5?d/(2-M-m):d/(M+m);h=M==r?(g-b)/d+(g<b?6:0):M==g?(b-r)/d+2:(r-g)/d+4;h*=60;}return[h,s,l];}
function C(h,s,l){return'hsl('+Math.round((h+360)%360)+','+Math.round(s*100)+'%,'+Math.round(Math.max(0,Math.min(1,l))*100)+'%)';}
var AV=['--accent','--a0','--a1','--a2','--a3','--a4','--ar'];
function accent(){var st=document.documentElement.style;AV.forEach(function(n){st.removeProperty(n);});if(!S.accent)return;
 var c=rgb(S.accent),x=hsl(c),h=x[0],s=x[1],l=Math.max(x[2],.45);
 st.setProperty('--ar',c.join(','));st.setProperty('--a2',C(h,s,l));st.setProperty('--accent',C(h-3,s,l+.05));st.setProperty('--a1',C(h-6,s,l+.1));st.setProperty('--a0',C(h-8,Math.min(s,.9),.88));st.setProperty('--a3',C(h+8,s,l-.05));st.setProperty('--a4',C(h+14,s,l-.2));
 var m=document.querySelector('meta[name=theme-color]');if(m)m.content=C(h,s,.1);}
/* ---- tùy chọn khác ---- */
function opt(){var r=document.documentElement,c=r.classList;c.toggle('sq-fr',!!S.o.fr);r.style.setProperty('--fr',rgb(S.o.frc||'#0c0c12').join(','));r.style.setProperty('--fa',(S.o.fa==null?60:S.o.fa)/100);['nosel','noanim','noblur','nobtn'].forEach(function(k){c.toggle('sq-'+k,!!S.o[k]);});r.style.fontSize=S.o.font&&S.o.font!==100?S.o.font+'%':'';}
/* ---- nền ---- */
var v,im;
function els(){v=document.getElementById('vbg');if(!v)return false;im=document.getElementById('vbgi');if(!im){im=document.createElement('div');im.id='vbgi';im.setAttribute('aria-hidden','true');v.parentNode.insertBefore(im,v);}if(!v.dataset.s)v.dataset.s=v.getAttribute('src')||'';return true;}
function setVideo(src,poster){im.style.display='none';v.style.display='';if(v.dataset.s!==src){v.dataset.s=src;v.src=src;v.poster=poster||'';v.load();}var p=v.play&&v.play();if(p&&p.catch)p.catch(function(){});}
function setImage(src){v.pause();v.removeAttribute('src');v.dataset.s='';v.load();v.style.display='none';im.style.display='block';im.style.backgroundImage=src?'url("'+src+'")':'none';}
function bg(){if(!els())return;document.documentElement.style.setProperty('--vb',S.bright/100);
 var t=S.bg.t,def=function(){setVideo('asset/hero-bg.mp4','asset/hero-bg.jpg');};
 if(t==='off')return setImage('');
 if(t==='preset'){var p=((window.SQ_PRESETS||{}).bg||[]).filter(function(x){return x.id===S.bg.id;})[0];if(!p)return def();return p.type==='video'?setVideo(p.src,p.poster):setImage(p.src);}
 if(t==='custom'){Store.get(S.bg.id).then(function(r){if(!r)return def();r.mime.indexOf('video')===0?setVideo(url(r)):setImage(url(r));},def);return;}
 def();}
/* ---- nhạc ---- */
var au=new Audio(),tracks=[],btn,want=false;au.preload='auto';
function mlist(){return Store.all().catch(function(){return[];}).then(function(a){var pr=((window.SQ_PRESETS||{}).music||[]).map(function(p){return{id:p.id,name:p.name,src:p.src,preset:1};});return pr.concat((a||[]).filter(function(x){return x.kind==='music';}).map(function(x){return{id:x.id,name:x.name,blob:x.blob};}));}).then(function(t){tracks=t;return t;});}
function cur(){return tracks.filter(function(t){return t.id===S.m.track;})[0]||tracks[0];}
function src(t){return t.src||url(t);}
function ui(){if(!btn&&tracks.length){btn=document.createElement('button');btn.id='sqm';btn.type='button';btn.setAttribute('aria-label','Nhạc nền');btn.onclick=function(){M.toggle();};document.body.appendChild(btn);}
 if(btn){btn.hidden=!tracks.length;btn.className=S.m.on&&!au.paused?'on':'';btn.textContent=S.m.on?'♪':'♪̸';btn.title=S.m.on?'Tắt nhạc':'Bật nhạc';}}
var G=['pointerup','click','touchend','mouseup','keydown'],gon=false;
function gh(){if(S.m.on&&au.paused)tryPlay();}
function gest(){if(gon)return;gon=true;G.forEach(function(e){window.addEventListener(e,gh,true);});}
au.addEventListener('playing',function(){gon=false;G.forEach(function(e){window.removeEventListener(e,gh,true);});ui();});
function tryPlay(){var t=cur();if(!t)return;var s=src(t);if(au.dataset.id!==t.id){au.dataset.id=t.id;au.src=s;try{var sv=JSON.parse(sessionStorage.getItem('sq_mt')||'{}');if(sv.id===t.id&&sv.t)au.addEventListener('loadedmetadata',function f(){au.removeEventListener('loadedmetadata',f);try{au.currentTime=sv.t;}catch(e){}});}catch(e){}}
 au.volume=S.m.vol/100;var p=au.play();if(p&&p.catch)p.catch(gest);}
window.addEventListener('pageshow',function(){if(S.m.on&&au.paused&&tracks.length)tryPlay();});
window.addEventListener('pagehide',function(){if(au.dataset.id){try{sessionStorage.setItem('sq_mt',JSON.stringify({id:au.dataset.id,t:au.currentTime}));}catch(e){}}});
au.addEventListener('play',ui);au.addEventListener('pause',ui);
au.addEventListener('ended',function(){if(S.m.loop&&tracks.length)M.step(1);else{S.m.on=0;save();ui();emit();}});
setInterval(function(){if(!au.paused&&au.dataset.id){try{sessionStorage.setItem('sq_mt',JSON.stringify({id:au.dataset.id,t:au.currentTime}));}catch(e){}}},1000);
var M={list:function(){return tracks;},cur:function(){return cur();},
 play:function(id){S.m.track=id;S.m.on=1;save();au.dataset.id='';tryPlay();ui();emit();},
 toggle:function(){if(!tracks.length)return;S.m.on=S.m.on&&!au.paused?0:1;save();if(S.m.on)tryPlay();else au.pause();ui();emit();},
 step:function(d){if(!tracks.length)return;var i=tracks.indexOf(cur());M.play(tracks[(i+d+tracks.length)%tracks.length].id);},
 vol:function(n){S.m.vol=n;au.volume=n/100;save();},loop:function(b){S.m.loop=b?1:0;save();emit();},
 playing:function(){return!au.paused;}};
/* ---- API ---- */
function uid(){return'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
window.SQTheme={get:function(){return S;},on:function(f){L.push(f);},music:M,Store:Store,
 setBg:function(o){S.bg=o;save();bg();emit();},
 setOpt:function(k,v){S.o[k]=v;save();opt();},
 setBright:function(n){S.bright=n;save();document.documentElement.style.setProperty('--vb',n/100);},
 setAccent:function(h){S.accent=h||'';save();accent();emit();},
 addAsset:function(kind,file){var id=uid();return Store.put({id:id,kind:kind,name:file.name.replace(/\.[^.]+$/,''),mime:file.type||'',blob:file,at:Date.now()}).then(function(){if(kind==='music')return mlist().then(function(){return id;});return id;});},
 assets:function(kind){return Store.all().catch(function(){return[];}).then(function(a){return(a||[]).filter(function(x){return x.kind===kind;});});},
 thumb:function(rec){return url(rec);},
 removeAsset:function(id){return Store.del(id).then(function(){if(S.bg.id===id){S.bg={t:'default'};save();bg();}if(S.m.track===id){S.m.track='';if(au.dataset.id===id){au.pause();au.dataset.id='';}save();}return mlist();}).then(function(){ui();emit();});},
 reset:function(){S=JSON.parse(JSON.stringify(D));save();au.pause();accent();opt();bg();ui();emit();}};
function init(){accent();opt();bg();mlist().then(function(){ui();if(S.m.on)tryPlay();emit();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
