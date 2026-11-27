/* Gói dịch vụ: BASIC / PLUS / PROMAX.
   - Có máy chủ (window.SQ_API trong js/sq-config.js): mã/khóa kiểm tra bằng Cloudflare Worker (worker/).
   - Chưa cấu hình máy chủ: chế độ cục bộ cũ (mã chỉ lưu SHA-256, kiểm tra trên trình duyệt). */
(function(){
var API=String(window.SQ_API||'').replace(/\/+$/,'');
var K='sq_plan',U='sq_usage',LIMIT=2,KEY='sq_key',CA='sq_cache',DV='sq_dev',MS='sq_msg',O='sq_owned',E='sq_exp',R={basic:0,plus:1,promax:2};
var OFFLINE=864e5; /* ngoại tuyến tối đa 24 giờ */
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function ss(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}
function norm(s){return String(s||'').toUpperCase().replace(/\s+/g,'');}
function dev(){var d=ls(DV);if(!d||d.length<16){d=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(x){return x.toString(16).padStart(2,'0');}).join('');ss(DV,d);}return d;}
/* ---------- chế độ cục bộ (cũ) ---------- */
var H={
 "c5bd657c890d04b2f749a680cc844cac8825e111cd775df72b1b87662c0be04c": "plus",
 "81575b5d0a0aeb7278b7983b74c7c6924f24778df5078b687a34366f5dcf8abe": "plus",
 "9f39998566919fe6356186c6d587372bad06ddbfa3907607b3ab91cd5a9de8c5": "plus",
 "631b7ebc40dc5d7b701fad334790643845c81af582ab1cdfb6a9e44082af86f7": "promax",
 "e175a66185ec2c48394c551753914760c085babdae9783e176ecfbcca254957b": "promax",
 "8d59eaccc1e3939ced8208be8750f921fccf69ecfd7dc7ee76f9ce2e460e1e84": "promax"
};
var T={"f7913548fde6f7641ad97727ed925195425503a1647933ee96671afbe29b4661":{plan:'plus',until:new Date(2026,10,26).getTime()}};
function lchk(){var e=+ls(E)||0;if(e&&Date.now()>=e){ss(K,'basic');ss(O,'basic');ss(E,null);}}
function lowned(){lchk();var p=ls(K)||'basic',o=ls(O)||'basic';if(R[o]==null)o='basic';if(R[p]!=null&&R[p]>R[o]){o=p;ss(O,o);}return o;}
async function sha(s){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}
async function lactivate(code){
  if(!(window.crypto&&crypto.subtle))return{ok:false,msg:'Cần mở web bằng HTTPS hoặc localhost để kiểm tra mã.'};
  var h=await sha(norm(code)),t=T[h];
  if(t){if(Date.now()>=t.until)return{ok:false,msg:'Mã này đã hết hạn.'};var w=lowned();ss(K,t.plan);if(R[t.plan]>R[w]){ss(O,t.plan);ss(E,String(t.until));}return{ok:true,plan:t.plan,until:R[t.plan]>R[w]?t.until:0};}
  var p=H[h];if(!p)return{ok:false,msg:'Mã không đúng. Vui lòng kiểm tra lại.'};
  ss(E,null);var o=lowned();ss(K,p);ss(O,R[p]>R[o]?p:o);return{ok:true,plan:p};
}
/* ---------- chế độ máy chủ ---------- */
function cache(){try{return JSON.parse(ls(CA)||'null');}catch(e){return null;}}
function save(key,plan,until){ss(KEY,key);ss(CA,JSON.stringify({plan:plan,until:until||null,t:Date.now()}));}
function clear(){ss(KEY,null);ss(CA,null);}
function sowned(){var c=cache();if(!c||!ls(KEY)||R[c.plan]==null)return'basic';var n=Date.now();if(n-c.t>OFFLINE||(c.until&&n>=c.until))return'basic';return c.plan;}
async function post(path,body){
  try{var r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});var j=await r.json();return j;}
  catch(e){return{ok:false,net:true,msg:'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'};}
}
/* ---------- chung ---------- */
function admTok(){return !!ls('sq_admin');}
function admOn(){return admTok()&&ls('sq_adm_off')!=='1';}
function admPlan(){var p=ls('sq_adm_plan');return admOn()&&p&&R[p]!=null?p:null;}
function owned(){var a=admPlan();if(a)return a;return API?sowned():lowned();}
function get(){var a=admPlan();if(a)return a;var o=owned(),v=ls(K);return(v&&R[v]!=null&&R[v]<=R[o])?v:o;}
function use(p){if(R[p]==null||R[p]>R[owned()])return false;if(admPlan())return true;ss(K,p);return true;}
async function activate(input){
  var s=String(input||'').trim();if(!s)return{ok:false,msg:'Hãy nhập mã hoặc khóa.'};
  if(!API)return lactivate(s);
  var isKey=/^SQK-/i.test(s.replace(/\s+/g,'')),cur=ls(KEY);
  if(isKey&&cur&&norm(s)===norm(cur))return{ok:true,plan:sowned(),same:true};
  var r=await post(isKey?'/api/activate-key':'/api/redeem',isKey?{key:s,dev:dev(),cur:cur}:{code:s,dev:dev(),cur:cur});
  if(!r.ok)return{ok:false,msg:r.msg||'Có lỗi xảy ra.'};
  save(r.key,r.plan,r.until);ss(K,r.plan);return{ok:true,plan:r.plan,until:r.until||0,key:r.key,isKey:isKey,note:r.note||'',max:r.max==null?null:r.max,left:r.left==null?null:r.left};
}
async function rotate(){var k=ls(KEY);if(!API||!k)return{ok:false,msg:'Chưa có khóa để tạo mới.'};var r=await post('/api/rotate',{key:k,dev:dev(),cur:k});if(!r.ok)return{ok:false,msg:r.msg};save(r.key,r.plan,r.until);return{ok:true,key:r.key};}
async function deactivate(){var k=ls(KEY);if(!API||!k)return{ok:false,msg:'Chưa có gói để hủy.'};var r=await post('/api/deactivate',{key:k});if(!r.ok&&!r.net)return{ok:false,msg:r.msg};if(r.net)return r;var prev=owned(),sn=ls('sq_seen'),RK={basic:0,plus:1,promax:2,admin:3};clear();ss(K,'basic');if(RK[prev]!=null&&(RK[sn]==null||RK[sn]<RK[prev]))ss('sq_seen',prev);ss('sq_lossmsg','Bạn đã hủy kích hoạt gói trên trình duyệt này.');return{ok:true};}
async function codeInfo(code){if(!API)return{ok:false,msg:'Chưa cấu hình máy chủ.'};return post('/api/code-info',{code:code});}
async function sync(){
  if(!API)return;var k=ls(KEY);if(!k)return;var before=sowned();
  var r=await post('/api/status',{key:k});if(r.net)return;
  if(r.ok){save(k,r.plan,r.until);}
  else{clear();ss(K,'basic');ss(MS,r.msg||'Gói không còn hiệu lực.');}
  if(sowned()!==before)location.reload();
}
function takeMsg(){var m=ls(MS);if(m)ss(MS,null);return m;}
function load(){var o={};try{o=JSON.parse(ls(U)||'{}');}catch(e){}return o.d===new Date().toDateString()?o.n:0;}
function left(){return get()==='basic'?Math.max(0,LIMIT-load()):Infinity;}
function consume(){if(get()!=='basic')return true;var n=load();if(n>=LIMIT)return false;ss(U,JSON.stringify({d:new Date().toDateString(),n:n+1}));return true;}
function info(){var c=cache();return{server:!!API,plan:owned(),until:c&&c.until||0,key:ls(KEY)||'',hasKey:!!ls(KEY),test:admPlan()};}
var ADM={token:admTok,on:admOn,plan:admPlan,
 setOn:function(v){ss('sq_adm_off',v?null:'1');},
 setPlan:function(p){ss('sq_adm_plan',p&&R[p]!=null?p:null);},
 wipe:function(){[KEY,CA,K,O,E,MS].forEach(function(k){ss(k,null);});},
 resetUsage:function(){ss(U,null);},
 newDevice:function(){ss(DV,null);}};
function site(page){var s=String(window.SQ_SITE||'');if(!s||location.protocol!=='file:')return new URL(page,location.href).href.split('#')[0];return s.replace(/\/*$/,'/')+page;}
window.SQ={site:site,admin:ADM,get:get,owned:owned,use:use,rank:function(){return R[get()];},activate:activate,rotate:rotate,deactivate:deactivate,codeInfo:codeInfo,sync:sync,takeMsg:takeMsg,info:info,left:left,consume:consume,LIMIT:LIMIT,API:API,dev:dev};
if(API){setTimeout(sync,50);setInterval(sync,300000);document.addEventListener('visibilitychange',function(){if(!document.hidden)sync();});}
})();
