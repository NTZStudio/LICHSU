/* Hiệu ứng khi mất gói (hết hạn / bị thu hồi / mất quyền ADMIN): thẻ quyền hạn bay vào, biểu tượng hạ cấp từng bậc, bấm TIẾP TỤC để dùng web.
   Nhớ bậc cao nhất người dùng đã thấy ở localStorage.sq_seen. Xem thử: thêm #lossfx=promax-basic (hoặc admin-basic, plus-basic...) vào địa chỉ trang. */
(function(){
if(!window.SQ)return;
var RK={basic:0,plus:1,promax:2,admin:3},ORDER=['basic','plus','promax','admin'];
var TI={basic:{n:'BASIC',own:['Chấm đề 2 lượt mỗi ngày','Dán đề thủ công'],keep:['Chấm đề 2 lượt mỗi ngày','Tra cứu Phần I và Phần II','Dán đề thủ công']},
 plus:{n:'PLUS',own:['Chấm đề không giới hạn','Tự động dán và tự chấm'],keep:['Chấm đề không giới hạn','Tự động dán và tự chấm','Tra cứu Phần I và Phần II']},
 promax:{n:'PROMAX',own:['Tra cứu nâng cao: câu đầy đủ, đúng/sai, ID câu','Chia theo bài, ưu tiên bài mới'],keep:['Mọi tính năng của PLUS','Tra cứu nâng cao và chia theo bài']},
 admin:{n:'ADMIN',own:['Trang quản trị, quản lý mã và khóa gói','Thử mọi gói'],keep:[]}};
var GL={basic:'rgba(120,120,135,.35)',plus:'rgba(255,170,50,.55)',promax:'rgba(255,110,30,.7)',admin:'rgba(255,70,50,.75)'};
var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z"/></svg>';
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function ss(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}
function eff(){try{return SQ.admin.token()?'admin':SQ.owned();}catch(e){return'basic';}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var cur=eff(),seen=ls('sq_seen'),m=/#lossfx=(\w+)-(\w+)/i.exec(location.hash||''),demo=null,from,to;
if(m&&RK[m[1].toLowerCase()]!=null&&RK[m[2].toLowerCase()]!=null&&RK[m[1].toLowerCase()]>RK[m[2].toLowerCase()])demo=[m[1].toLowerCase(),m[2].toLowerCase()];
function schedule(){if(RK[cur]==null||cur==='admin'||cur==='basic')return;var u=0;try{u=(SQ.info()||{}).until||0;}catch(e){}if(!u)u=+ls('sq_exp')||0;var d=u-Date.now();if(u&&d>0&&d<2147e6)setTimeout(function(){location.reload();},d+800);}
function show(from,to,isDemo,message){
if(document.querySelector('.lfx'))return;
var steps=[],lost=[],r;
for(r=RK[from]-1;r>=RK[to];r--)steps.push(ORDER[r]);
for(r=RK[from];r>RK[to];r--)lost=lost.concat(TI[ORDER[r]].own);
var why=message||(from==='admin'?'Quyền ADMIN không còn hiệu lực trên trình duyệt này.':'Gói của bạn đã hết hạn hoặc không còn hiệu lực.');
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var el=document.createElement('div');el.className='lfx';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','lfxT');
el.innerHTML='<div class="lfx-card" tabindex="-1"><div class="lfx-top"><span>THẺ QUYỀN HẠN</span><i>SỬ QUÁN</i></div>'+
 '<div class="lfx-icw"><div class="lfx-ico">'+STAR+'</div></div>'+
 '<div class="lfx-nmw"><span class="lfx-nm"></span></div>'+
 '<h2 id="lfxT"></h2><p class="lfx-why">'+esc(why)+'</p>'+
 '<ul class="lfx-list"></ul>'+
 '<div class="lfx-act"><button type="button" class="btn" disabled>TIẾP TỤC</button><a href="index.html#goi">Xem các gói</a></div></div>';
document.body.appendChild(el);
var card=el.querySelector('.lfx-card'),icw=el.querySelector('.lfx-icw'),ico=el.querySelector('.lfx-ico'),nm=el.querySelector('.lfx-nm'),h2=el.querySelector('h2'),ul=el.querySelector('.lfx-list'),go=el.querySelector('button');
var T=[],done=false,items=[];
function at(ms,fn){T.push(setTimeout(fn,ms));}
function setTier(t){ico.className='lfx-ico t-'+t;icw.style.setProperty('--gl',GL[t]);}
function flip(txt){nm.classList.remove('in');nm.classList.add('out');at(0,function(){});setTimeout(function(){nm.textContent=txt;nm.classList.remove('out');nm.classList.add('in');},280);}
function mk(cls,txt){var li=document.createElement('li');li.className=cls;li.textContent=txt;ul.appendChild(li);items.push(li);return li;}
ul.innerHTML='';
var hd1=mk('hd','Đã mất');lost.forEach(function(t){mk('lost',t);});
var hd2=mk('hd','Vẫn còn');TI[to].keep.forEach(function(t){mk('keep',t);});
setTier(from);nm.textContent=TI[from].n;h2.textContent=(from==='admin'?'Quyền ADMIN':'Gói '+TI[from].n)+' đã hết hiệu lực';
document.body.style.overflow='hidden';
requestAnimationFrame(function(){el.classList.add('on');card.focus();});
function finish(){done=true;T.forEach(clearTimeout);T=[];icw.classList.remove('shake','drop');setTier(to);nm.className='lfx-nm';nm.textContent=TI[to].n;
 h2.textContent='Bạn đang ở gói '+TI[to].n;card.classList.add('lowered');
 items.forEach(function(li){li.classList.add('show');if(li.classList.contains('lost'))li.classList.add('strike');});go.disabled=false;go.focus();}
if(reduce){finish();}
else{
 var base=1200;
 steps.forEach(function(s,i){var b=base+i*900;
  at(b,function(){icw.classList.add('shake');});
  at(b+420,function(){icw.classList.remove('shake');icw.classList.add('drop');setTier(s);flip(TI[s].n);});
  at(b+900,function(){icw.classList.remove('drop');});});
 var t0=base+steps.length*900+100;
 at(t0,function(){h2.textContent='Bạn đang ở gói '+TI[to].n;card.classList.add('lowered');hd1.classList.add('show');});
 var k=0;lost.forEach(function(){var li=items[1+k];at(t0+250+k*140,function(){li.classList.add('show');});at(t0+250+lost.length*140+200+k*90,function(){li.classList.add('strike');});k++;});
 var t1=t0+250+lost.length*140+200+lost.length*90+150;
 at(t1,function(){hd2.classList.add('show');});
 TI[to].keep.forEach(function(_,i){at(t1+250+i*140,function(){items[2+lost.length+i].classList.add('show');});});
 at(t1+250+TI[to].keep.length*140+150,function(){done=true;go.disabled=false;go.focus();});
 card.addEventListener('click',function(e){if(!done&&!e.target.closest('a,button'))finish();});
}
function close(){if(!isDemo)ss('sq_seen',cur);el.classList.remove('on');document.body.style.overflow='';setTimeout(function(){el.remove();var b=document.querySelector('.plan-btn');if(b){b.classList.add('pulse');setTimeout(function(){b.classList.remove('pulse');},1600);}},400);}
go.addEventListener('click',close);
el.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();(go.disabled?card:go).focus();}});
window.addEventListener('storage',function(e){if(!isDemo&&e.key==='sq_seen'&&e.newValue===cur&&document.body.contains(el))close();});

}
window.SQ_FX=window.SQ_FX||{};window.SQ_FX.loss=function(f,t){f=String(f).toLowerCase();t=String(t).toLowerCase();if(RK[f]!=null&&RK[t]!=null&&RK[f]>RK[t])show(f,t,true,'Đây là bản xem thử, gói của bạn không bị thay đổi.');};
if(demo){show(demo[0],demo[1],true,'');}
else if(RK[seen]==null||RK[cur]>RK[seen]){ss('sq_seen',cur);ss('sq_lossmsg',null);schedule();}
else if(RK[cur]===RK[seen]){schedule();}
else{var msg=window.SQ_LOSSMSG||ls('sq_lossmsg')||'';window.SQ_LOSSMSG=null;ss('sq_lossmsg',null);show(seen,cur,false,msg);}
})();
