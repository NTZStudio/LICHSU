/* Hiệu ứng LÊN HẠNG: sqRankUp(i, {onClose, preview}). i = 0..19. Cần window.SQR (xuất từ quest.js).
   Trình tự: nền mờ -> hạt sáng từ mọi phía hội tụ vào tâm, quả cầu sáng dần -> bùng nổ -> thẻ hạng (icon, tên, quyền lợi lần lượt) -> [Xác nhận].
   Hạng càng cao càng nhiều lớp: hạt, tia sáng, sóng, rung màn hình, cực quang (>=12), vành thấu kính (>=15), vành Gargantua (19). */
(function(){
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
window.sqRankUp=function(i,o){
 o=o||{};var S=window.SQR;if(!S||document.querySelector('.ru'))return;
 i=Math.max(0,Math.min(S.R.length-1,i|0));var c=S.RC[i],t=i/19,dur=+(1.3+t*.9).toFixed(2),nIn=Math.round(16+i*5),nSp=Math.round(20+i*6),rings=1+Math.floor(i/5);
 var pin='',sp='',rg='',k;
 for(k=0;k<nIn;k++){var dl=+(Math.random()*dur*.45).toFixed(2);pin+='<i style="--a:'+Math.round(k*360/nIn+Math.random()*10)+'deg;--r:'+Math.round(420+Math.random()*520)+'px;--w:'+Math.round(14+Math.random()*(20+i*2))+'px;--dl:'+dl+'s'+(k%3?'':';--pc:#fff')+'"></i>';}
 for(k=0;k<nSp;k++)sp+='<i style="--a:'+Math.round(k*360/nSp+Math.random()*8)+'deg;--d:'+Math.round(160+Math.random()*(200+i*14))+'px;--w:'+Math.round(10+Math.random()*(20+i))+'px'+(k%3?'':';--pc:#fff')+'"></i>';
 for(k=0;k<rings;k++)rg+='<i class="ru-ring" style="--wd:'+(k*.12).toFixed(2)+'s;--ws:'+(8+k*3)+'"></i>';
 var lens=i>=15?'<svg class="ru-lens" viewBox="-100 -100 200 200"><ellipse rx="92" ry="24" fill="none" stroke="var(--c2)" stroke-width="2"/>'+(i>=17?'<ellipse rx="70" ry="18" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>':'')+'</svg>':'';
 var ben=S.benefits(i).map(function(b,j){return'<li style="--i:'+j+'"><b></b>'+esc(b[0])+(b[1]&&i?'<em>MỚI</em>':'')+'</li>';}).join('');
 var el=document.createElement('div');el.className='ru'+(i>=3?' rays':'')+(i>=12?' aur':'')+(i>=9?' shk':'')+(i===19?' gar':'');
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.style.cssText='--c1:'+c[0]+';--c2:'+c[1]+';--dur:'+dur+'s;--sh:'+(i>=9?(1+(i-9)*.3).toFixed(2):0)+';--n:'+S.benefits(i).length;
 el.innerHTML='<div class="ru-fx"><i class="ru-aur"></i><i class="ru-rays"></i><i class="ru-orb"></i><i class="ru-flash"></i>'+rg+lens+'<div class="ru-pin">'+pin+'</div><div class="ru-sp">'+sp+'</div></div>'+
 '<div class="ru-card"><div class="ru-ic">'+S.icon(i,110)+'</div><div class="ru-eb">'+(o.preview?'XEM TRƯỚC · ':'')+'LÊN HẠNG</div><h2 class="ru-nm">'+esc(S.R[i][1])+'</h2><div class="ru-no">Hạng '+(i+1)+' / '+S.R.length+' · từ '+S.R[i][0]+' điểm</div>'+
 '<ul class="ru-bl">'+ben+'</ul><button type="button" class="ru-ok">Xác nhận</button></div>';
 document.body.appendChild(el);document.documentElement.classList.add('ru-open');
 el.querySelector('.ru-ok').onclick=function(){el.remove();document.documentElement.classList.remove('ru-open');if(o.onClose)o.onClose();};
 var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,boom=Math.round((dur+.15)*1000);
 function st(cl,ms){setTimeout(function(){el.classList.add(cl);},ms);}
 requestAnimationFrame(function(){el.classList.add('on');});
 if(reduce)st('go-card',50);else{st('go-in',80);st('go-boom',80+boom);st('go-card',80+boom+300);}
 setTimeout(function(){var b=el.querySelector('.ru-ok');if(b)b.focus({preventScroll:true});},(reduce?300:80+boom+300)+(S.benefits(i).length+1)*160+500);
};
})();
