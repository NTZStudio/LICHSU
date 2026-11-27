/* Hiệu ứng mở gói: window.sqUnlock({ok,plan,key,until,note,max,left,isKey,input,admin}). Dùng ở index.html (mở gói) và admin.html (đăng nhập admin).
   Cường độ hiệu ứng tăng theo gói: basic < plus < promax < admin (bảng L). Thẻ gói hiện: hạn dùng (đếm ngược hoặc vĩnh viễn), số lượt của mã, bảng thông báo (<10 lượt hoặc mã 1 lần), ghi chú, đặc quyền, khung khóa, [Sao chép] [Xác nhận = tải lại]. */
(function(){
var I={
 basic:'<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/></svg>',
 plus:'<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
 promax:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.3"/><path d="M5.4 10.6a7 7 0 0 1 13.2 0"/><path d="M7.6 15.4a6 6 0 0 0 8.8 0"/><path d="M1.8 12h5.6M16.6 12h5.6"/></svg>',
 admin:'<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z"/><path d="M9 12l2.2 2.2L15.5 9.8"/></svg>'};
var P={
 basic:{n:'BASIC',c:'#9db0c4',g:'linear-gradient(90deg,#d5deea,#9db0c4)',k:['Tự tra cứu đủ Phần I và Phần II, không giới hạn','QUEST: luyện nhanh ngẫu nhiên, có combo và bảng điểm','QUEST: chế độ HARDCORE (đếm giờ, tùy chọn 1 mạng, chỉnh thời gian)','Bảng 20 thứ hạng có icon riêng, càng lên cao càng tới Gargantua, kèm đặc quyền (thưởng điểm, 50/50, khiên combo, mạng dự phòng)','SAVE: lưu lịch sử đúng/sai từng câu trên thiết bị','2 lượt chấm đề (GRADE) mỗi ngày','Dán đề thủ công','Chấm ưu tiên bài mới nhất (mặc định)']},
 plus:{n:'PLUS',c:'#ffa62b',g:'linear-gradient(90deg,#ffd27a,#ff9a1f 55%,#ff6a1a)',k:['Gồm mọi tính năng của BASIC','QUEST: chọn một hoặc nhiều bài để ôn tập','QUEST: chế độ NIGHTMARE (1 mạng, câu dày đặc, điểm tăng dần)','Chấm đề không giới hạn mỗi ngày','Tự động dán từ clipboard','Tự chấm: dán là ra đáp án, khỏi bấm nút','Bài trọng tâm: tự chọn bài ưu tiên khi chấm, chính xác hơn với bài cũ']},
 promax:{n:'PROMAX',c:'#ffcf66',g:'linear-gradient(90deg,#fff0c2,#ffc23d 35%,#ff7a1a 70%,#e23a1c)',k:['Gồm mọi tính năng của PLUS','Tra cứu nâng cao: câu đầy đủ, đáp án đúng/sai, ID câu','Chia theo bài, ưu tiên bài mới','Độ chắc chắn và ước tính điểm khi chấm','Tùy biến thẻ đáp án: kiểu khung, màu từng đáp án, sắp xếp từng câu','Giao diện đáp án mới: 4 kiểu Phần I, 4 kiểu Phần II, có xem trước','Chế độ SENTENCE: hiện từng câu kiểu Azota, tự tra ID câu hỏi','Tự cuộn tới kết quả để thấy đủ các câu trong một màn hình']},
 admin:{n:'ADMIN',c:'#4da3ff',g:'linear-gradient(90deg,#e6f2ff,#6db6ff 45%,#8a6bff)',k:['Tạo, sửa, tắt, xóa mã kích hoạt','Thu hồi khóa gói của người dùng','Quản lý phiên admin trên nhiều thiết bị','Chế độ test, sao lưu và dọn dữ liệu']}};
/* sp: số tia lửa, m: tầm bay, w: số sóng, amp: biên độ rung, fl: độ chói, sd: giây rung, rays: tia sáng xoay, shk: rung cả màn hình, bolt: tia sét */
var L={basic:{sp:12,m:.8,w:1,amp:.6,fl:.55,sd:.5,rays:0,shk:0,bolt:0},plus:{sp:30,m:1.1,w:2,amp:1,fl:.9,sd:.75,rays:0,shk:0,bolt:0},
 promax:{sp:64,m:1.5,w:3,amp:1.6,fl:1,sd:1,rays:1,shk:1,bolt:0},admin:{sp:100,m:1.9,w:4,amp:2.2,fl:1,sd:1.25,rays:1,shk:2,bolt:1}};
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return(n<10?'0':'')+n;}
function cd(ms){if(ms<=0)return'Đã hết hạn';var d=Math.floor(ms/864e5),h=Math.floor(ms/36e5)%24,m=Math.floor(ms/6e4)%60,s=Math.floor(ms/1e3)%60;return'Còn '+(d?d+' ngày ':'')+pad(h)+':'+pad(m)+':'+pad(s);}
function copy(t,b){var done=function(){var o=b.dataset.t||b.textContent;b.dataset.t=o;b.textContent='Đã sao chép ✓';setTimeout(function(){b.textContent=o;},1800);};
 function fb(){var a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done();}catch(e){}a.remove();}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb();}
function uses(r){ /* -> {line, banners[]} theo số lượt của mã */
 var inp=String(r.input||'').replace(/\s+/g,'').toUpperCase().slice(0,24),B=[],line;
 if(r.admin)return{line:'',B:B};
 if(r.isKey)return{line:'Khóa gói đã nhập. Chúc bạn một ngày vui vẻ!',B:B};
 var lim=r.max!=null&&r.left!=null;
 if(!lim)line='<b>'+(esc(inp)||'CODE')+'</b> đã nhập. Chúc bạn một ngày vui vẻ!';
 else if(r.max===1)line='Mã dùng 1 lần này đã được gắn với bạn.';
 else line='Mã này còn <b>'+r.left+'</b> lượt sử dụng.';
 if(lim&&r.max===1)B.push(['one','Mã dùng 1 lần, dành riêng cho một người','Lượt duy nhất đã được dùng cho bạn. Vui lòng không chia sẻ mã này cho ai khác.']);
 else if(lim&&r.left<10)B.push(['low',r.left===0?'Đây là lượt cuối cùng của mã':'Mã sắp hết lượt','Mã này '+(r.left===0?'đã dùng hết lượt, không ai nhập được nữa.':'chỉ còn '+r.left+' lượt sử dụng.')]);
 return{line:line,B:B};}
window.sqUnlock=function(r){
 if(!r||!r.ok||document.querySelector('.ul'))return;
 var pl=r.admin?'admin':(P[r.plan]?r.plan:'plus'),p=P[pl],T=L[pl],key=r.key||(!r.admin&&window.SQ&&SQ.info?SQ.info().key:'')||'';
 var sp='';for(var i=0;i<T.sp;i++){var a=Math.round(i*(360/T.sp)+Math.random()*8),d=Math.round((140+Math.random()*190)*T.m),w=10+Math.round(Math.random()*22*T.m);
  sp+='<i style="--a:'+a+'deg;--d:'+d+'px;--w:'+w+'px;--dl:'+(Math.random()*.12).toFixed(2)+'s'+(i%3?'':';--sc:#fff')+'"></i>';}
 var wv='';for(var j=0;j<T.w;j++)wv+='<i class="ul-wave'+(j%2?' w2':'')+'" style="--wd:'+(j*.11).toFixed(2)+'s;--ws:'+(9+j*3)+'"></i>';
 var bo='';if(T.bolt)for(var b=0;b<10;b++)bo+='<i class="ul-bolt" style="--a:'+(b*36+Math.round(Math.random()*14))+'deg;--dl:'+(b*.04).toFixed(2)+'s"></i>';
 var k=0,rv=function(c,h){return'<div class="'+c+' ul-rv" style="--i:'+(k++)+'">'+h+'</div>';},rows=[];
 if(r.admin)rows.push(rv('ul-exp','<span>PHIÊN QUẢN TRỊ</span><b>Lưu trên thiết bị này đến khi bị đăng xuất</b>'));
 else if(r.until)rows.push(rv('ul-exp','<span>HẠN DÙNG</span><b data-until="'+r.until+'"></b><small>đến hết '+new Date(r.until-1).toLocaleString('vi-VN')+'</small>'));
 else rows.push(rv('ul-exp','<span>THỜI GIAN DÙNG</span><b>Vĩnh viễn trên thiết bị này</b>'));
 var U=uses(r);
 if(U.line)rows.push(rv('ul-use',U.line));
 if(U.B.length)rows.push(rv('ul-board',U.B.map(function(x){return'<div class="ul-nt '+x[0]+'"><b>'+esc(x[1])+'</b>'+esc(x[2])+'</div>';}).join('')));
 if(r.note)rows.push(rv('ul-note','<span>GHI CHÚ CỦA GÓI</span>'+esc(r.note)));
 var perks=p.k.map(function(t){return'<li class="ul-rv" style="--i:'+(k++)+'"><b></b>'+esc(t)+'</li>';}).join('');
 var el=document.createElement('div');el.className='ul t-'+pl+(T.shk?' shk':'');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.style.cssText='--uc:'+p.c+';--ug:'+p.g+';--n:'+k+';--amp:'+T.amp+';--fl:'+T.fl+';--sd:'+T.sd+'s;--sh:'+T.shk;
 el.innerHTML='<div class="ul-fx"><i class="ul-flash"></i>'+(T.rays?'<i class="ul-rays"></i>':'')+wv+bo+'<div class="ul-sp">'+sp+'</div></div><div class="ul-ico">'+I[pl]+'</div>'+
 '<div class="ul-card"><div class="ul-badge">'+I[pl]+'</div><div class="ul-eyebrow">'+(r.admin?'QUYỀN QUẢN TRỊ':r.isKey?'ĐÃ KÍCH HOẠT LẠI GÓI':'ĐÃ MỞ KHÓA GÓI')+'</div><h2 class="ul-name">'+p.n+'</h2>'+
 rows.join('')+'<ul class="ul-perks">'+perks+'</ul>'+
 (key?'<div class="ul-key"><span>Khóa gói của bạn (hãy lưu lại)</span><code>'+esc(key)+'</code><small>Nhập khóa này ở trình duyệt khác thì gói chuyển sang đó và nơi này mất gói. Đừng gửi cho người không muốn chuyển gói.</small></div>':'')+
 '<div class="ul-act">'+(key?'<button type="button" class="ul-copy">Sao chép khóa</button>':'')+'<button type="button" class="ul-ok">Xác nhận</button></div></div>';
 document.body.appendChild(el);document.documentElement.classList.add('ul-open');
 var q=function(s){return el.querySelector(s);};
 if(key)q('.ul-copy').onclick=function(){copy(key,this);};
 var iv=0;q('.ul-ok').onclick=function(){if(r.preview){clearInterval(iv);el.remove();document.documentElement.classList.remove('ul-open');return;}location.reload();};
 var tick=function(){[].forEach.call(el.querySelectorAll('[data-until]'),function(n){n.textContent=cd(+n.dataset.until-Date.now());});};tick();if(r.until)iv=setInterval(tick,1000);
 var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,boom=1000+T.sd*1000;
 function st(c,ms){setTimeout(function(){el.classList.add(c);},ms);}
 requestAnimationFrame(function(){el.classList.add('on');});
 if(reduce)st('go-card',50);else{st('go-fly',50);st('go-shake',1000);st('go-boom',boom);st('go-card',boom+250);}
 setTimeout(function(){var b=q('.ul-ok');if(b)b.focus({preventScroll:true});},(reduce?400:boom+250+400)+(k+2)*180+500);
};
})();
