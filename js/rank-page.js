/* Trang RANK ở data.html: quyền lợi hạng (ưu tiên) -> hạng kế tiếp -> thống kê -> thang 20 hạng. Cần window.SQR. */
(function(){
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}
function pct(a,b){return b?Math.round(a*100/b)+'%':'0%';}
window.sqRankPage=function(root){
 var S=window.SQR;if(!S){root.textContent='Không tải được dữ liệu hạng.';return;}
 var st=S.stats(),s=st.s,rk=S.rankOf(s.score||0),c=S.RC[rk.i];root.innerHTML='';root.style.setProperty('--rc',c[0]);root.style.setProperty('--rc2',c[1]);
 var h=el('section','glass rk-hero'),ic=el('div','rk-i');ic.innerHTML=S.icon(rk.i,110);h.appendChild(ic);
 var d=el('div');d.appendChild(el('div','rk-eb','HẠNG HIỆN TẠI · '+(rk.i+1)+' / '+S.R.length));d.appendChild(el('div','rk-name',rk.name));
 d.appendChild(el('div','rk-sm','Tổng '+(s.score||0)+' điểm rèn luyện'));
 var b=el('div','rk-bar');b.appendChild(el('i'));b.firstChild.style.width=(rk.next?Math.min(100,((s.score||0)-rk.from)*100/(rk.next-rk.from)):100)+'%';d.appendChild(b);
 d.appendChild(el('div','rk-sm',rk.next?'Còn '+(rk.next-(s.score||0))+' điểm để lên hạng '+rk.nname:'Bạn đã đạt hạng cao nhất.'));h.appendChild(d);root.appendChild(h);
 var q=el('section','glass rk-sec');q.appendChild(el('h3','','QUYỀN LỢI CỦA HẠNG HIỆN TẠI'));var u=el('ul','rk-pl');
 S.benefits(rk.i).forEach(function(x){var li=el('li','',x[0]);u.appendChild(li);});q.appendChild(u);root.appendChild(q);
 if(rk.next){var n=el('section','glass rk-sec');n.appendChild(el('h3','','HẠNG KẾ TIẾP · '+rk.nname.toUpperCase()));var u2=el('ul','rk-pl');
  S.benefits(rk.i+1).filter(function(x){return x[1];}).forEach(function(x){var li=el('li','',x[0]);li.appendChild(el('em','','MỚI'));u2.appendChild(li);});n.appendChild(u2);root.appendChild(n);}
 var t=el('section','glass rk-sec');t.appendChild(el('h3','','THỐNG KÊ'));var g=el('div','rk-st');
 [[s.score||0,'Tổng điểm'],[s.att||0,'Tổng lượt'],[s.ok||0,'Đúng'],[s.bad||0,'Sai'],[pct(s.ok||0,s.att||0),'Chính xác'],[s.best||0,'Combo cao nhất'],[s.nm||0,'Kỷ lục NIGHTMARE'],[st.q,'Câu đã làm']].forEach(function(x){var e=el('div');e.appendChild(el('b','',String(x[0])));e.appendChild(el('small','',x[1]));g.appendChild(e);});
 t.appendChild(g);root.appendChild(t);
 var l=el('section','glass rk-sec');l.appendChild(el('h3','','THANG 20 HẠNG'));var ol=el('ol','rk-lad');
 S.R.forEach(function(r,i){var li=el('li',i===rk.i?'on':i<rk.i?'done':'lock'),dv=el('div');li.innerHTML=S.icon(i,36);dv.appendChild(el('span','',(i+1)+'. '+r[1]));dv.appendChild(el('small','',S.perkText(i)));li.appendChild(dv);li.appendChild(el('em','',r[0]+' điểm'));ol.appendChild(li);});
 l.appendChild(ol);root.appendChild(l);
};
})();
