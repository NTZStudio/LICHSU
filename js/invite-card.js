/* Thẻ mời kích hoạt (danh thiếp ngang) hiện khi mở link #code=… hoặc #keycode=… Dùng ở index.html; admin.html có nút xem thử (preview:true).
   window.sqInvite({kind:'code'|'keycode', val, ci, preview}) -> {el, go, no, msg, close()}. ci = kết quả SQ.codeInfo (plan,left,days,until) hoặc {ok:false,msg}. */
(function(){
var I={
 basic:'<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/></svg>',
 plus:'<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 promax:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.3"/><path d="M5.4 10.6a7 7 0 0 1 13.2 0"/><path d="M7.6 15.4a6 6 0 0 0 8.8 0"/><path d="M1.8 12h5.6M16.6 12h5.6"/></svg>',
 key:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>'};
var P={
 basic:{n:'BASIC',rgb:'157,176,196',g:'linear-gradient(90deg,#e4ebf3,#9db0c4)',t:'Tra cứu đủ Phần I và II · 2 lượt chấm mỗi ngày'},
 plus:{n:'PLUS',rgb:'255,166,43',g:'linear-gradient(90deg,#ffd98f,#ff9a1f 55%,#ff6a1a)',t:'Chấm không giới hạn · Tự động dán · Tự chấm'},
 promax:{n:'PROMAX',rgb:'255,207,102',g:'linear-gradient(90deg,#fff3cf,#ffc23d 38%,#ff7a1a 72%,#e23a1c)',t:'Mọi tính năng PLUS · Tra cứu nâng cao · Chia theo bài'}};
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function dt(ms){return new Date(ms-1).toLocaleDateString('vi-VN');}
window.sqInvite=function(o){
 if(document.querySelector('.bc-modal'))return null;
 var key=o.kind==='keycode',ci=o.ci||null,ok=!!(ci&&ci.ok&&P[ci.plan]),pl=ok?ci.plan:'',p=P[pl]||{n:key?'KHÓA GÓI':'MÃ KÍCH HOẠT',rgb:'255,166,43',g:'linear-gradient(90deg,#ffd98f,#ff9a1f 55%,#ff6a1a)',t:key?'Khôi phục gói đã mở khóa lên trình duyệt này':'Nhập mã để mở khóa gói của bạn'};
 var bad=!key&&ci&&!ci.ok,val=String(o.val||'');
 var shown=key?(val.length>12?val.slice(0,8)+'••••••••'+val.slice(-4):val):val.slice(0,28);
 var rows=[['<dt>'+(key?'KHÓA':'MÃ')+'</dt><dd><code>'+esc(shown)+'</code></dd>']];
 if(key)rows.push(['<dt>CHUYỂN GÓI</dt><dd>Thiết bị cũ mất gói</dd>']);
 else if(ok){rows.push(['<dt>THỜI HẠN DÙNG</dt><dd>'+(ci.days?esc(ci.days)+' ngày':ci.until?'Đến hết '+dt(ci.until):'Vĩnh viễn')+'</dd>']);rows.push(['<dt>LƯỢT CÒN LẠI</dt><dd>'+(ci.left==null?'Không giới hạn':esc(ci.left))+'</dd>']);}
 var tag=bad?'<p class="bc-tag err">'+esc(ci.msg||'Mã không hợp lệ.')+'</p>':'<p class="bc-tag">'+esc(p.t)+'</p>';
 var md=document.createElement('div');md.className='modal bc-modal';md.setAttribute('role','dialog');md.setAttribute('aria-modal','true');
 md.innerHTML='<div class="bc-tilt"><div class="bc'+(bad?' bad':'')+'" style="--bcr:'+p.rgb+';--bcg:'+p.g+'">'+
  '<div class="bc-em"><div class="bc-hex"><div class="bc-hexin">'+(I[pl]||I.key)+'</div></div><div class="bc-brand"><img src="asset/logo.png" alt=""><span>SỬ QUÁN</span></div></div>'+
  '<div class="bc-body"><div class="bc-top"><span class="bc-eyebrow">'+(key?'THƯ MỜI · KHÓA GÓI':'THƯ MỜI KÍCH HOẠT')+'</span>'+(o.preview?'<span class="bc-kind">XEM THỬ</span>':'')+'</div>'+
  '<h3 class="bc-name">'+esc(p.n)+'</h3>'+tag+'<div class="bc-rule"></div>'+
  '<dl class="bc-info">'+rows.map(function(r){return'<div>'+r[0]+'</div>';}).join('')+'</dl>'+
  (key?'<p class="bc-warn">Gói sẽ chuyển sang trình duyệt này. <b>Trình duyệt hoặc thiết bị đang dùng gói này sẽ mất gói ngay.</b></p>':'')+
  '<div class="bc-act"><button type="button" class="bc-go">Kích hoạt</button><button type="button" class="btn alt bc-no">Để sau</button></div><div class="bc-msg" role="status"></div></div><i class="bc-shine"></i></div></div>';
 document.body.appendChild(md);
 var tilt=md.querySelector('.bc-tilt'),r={el:md,go:md.querySelector('.bc-go'),no:md.querySelector('.bc-no'),msg:md.querySelector('.bc-msg'),close:function(){md.remove();}};
 if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){
  md.addEventListener('pointermove',function(e){var b=tilt.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;tilt.style.setProperty('--ry',(x*8).toFixed(2)+'deg');tilt.style.setProperty('--rx',(-y*6).toFixed(2)+'deg');});
  md.addEventListener('pointerleave',function(){tilt.style.setProperty('--ry','0deg');tilt.style.setProperty('--rx','0deg');});}
 setTimeout(function(){try{r.go.focus({preventScroll:true});}catch(e){}},700);
 return r;};
})();
