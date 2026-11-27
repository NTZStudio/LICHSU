/* Thanh đầu trang + chân trang dùng chung. Nạp SAU plans.js. Mỗi trang đặt <body data-page="index|grade|lookup">. */
(function(){
var g=document.createElement('video');g.id='vbg';g.setAttribute('aria-hidden','true');g.src='asset/hero-bg.mp4';g.poster='asset/hero-bg.jpg';g.muted=true;g.loop=true;g.autoplay=true;g.playsInline=true;g.setAttribute('playsinline','');g.setAttribute('muted','');g.defaultMuted=true;g.controls=false;g.removeAttribute('controls');g.disablePictureInPicture=true;g.setAttribute('disableremoteplayback','');g.setAttribute('webkit-playsinline','');g.tabIndex=-1;document.body.insertBefore(g,document.body.firstChild);
(function(){function go(){g.muted=true;var p=g.play&&g.play();if(p&&p.catch)p.catch(function(){});}
go();['loadeddata','canplay','pause'].forEach(function(e){g.addEventListener(e,function(){if(g.paused&&!document.hidden)go();});});
['touchstart','touchend','pointerdown','click','scroll','keydown'].forEach(function(e){window.addEventListener(e,function h(){if(g.paused)go();else window.removeEventListener(e,h,true);},{capture:true,passive:true});});
document.addEventListener('visibilitychange',function(){if(!document.hidden)go();});window.addEventListener('pageshow',go);})();
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){g.autoplay=false;}else{g.play&&g.play().catch(function(){});}
var P=document.body.dataset.page,plan=SQ.get();
document.body.dataset.plan=plan;
var A=SQ.admin,adm=A.on(),ap=A.plan();
var N=[['index','index.html','HOME'],['grade','grade.html','GRADE'],['lookup','lookup.html','LOOKUP'],['data','data.html','DATA']];
if(adm)N.push(['admin','admin.html','ADMIN']);
var NI={index:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',grade:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',lookup:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',admin:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'};
var pl=adm?'admin':plan,pn=adm?'ADMIN'+(ap?' · '+ap.toUpperCase():''):plan.toUpperCase();
document.body.insertAdjacentHTML('afterbegin','<header class="top"><a class="brand" href="index.html"><img src="asset/logo.png" alt="Logo Sử Quán"><span>SỬ QUÁN</span></a><nav>'+
 N.map(function(n){return '<a href="'+n[1]+'"'+(n[0]===P?' class="on"':'')+' title="'+n[2]+'" aria-label="'+n[2]+'"><svg class="ni" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+NI[n[0]]+'</svg><span class="nl">'+n[2]+'</span></a>';}).join('')+'</nav><a class="plan-btn b-'+pl+'" href="'+(adm?'admin.html':'index.html#goi')+'" title="'+(adm?'Tài khoản ADMIN'+(ap?' · đang thử gói '+ap.toUpperCase():'')+' · bấm để vào trang quản trị':'Gói hiện tại: '+plan.toUpperCase()+' · bấm để xem các gói')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z"/></svg>'+pn+'</a></header>');
(function(){var nv=document.querySelector('header.top nav');if(!nv)return;function fit(){nv.classList.remove('ico');if(nv.scrollWidth>nv.clientWidth+1)nv.classList.add('ico');}
fit();window.addEventListener('resize',fit);window.addEventListener('orientationchange',fit);window.addEventListener('load',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);})();
var tm=SQ.takeMsg&&SQ.takeMsg();if(tm){window.SQ_LOSSMSG=tm;setTimeout(function(){if(!window.SQ_LOSSMSG)return;var tt=document.createElement('div');tt.className='sq-toast';tt.textContent=window.SQ_LOSSMSG;window.SQ_LOSSMSG=null;document.body.appendChild(tt);setTimeout(function(){tt.remove();},9000);tt.onclick=function(){tt.remove();};},1500);}
var pl2=document.createElement('script');pl2.src='js/plan-loss.js?v=3';document.head.appendChild(pl2);
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.cf-paste');if(!b)return;var i=b.parentNode.querySelector('input');if(!i)return;
 if(navigator.clipboard&&navigator.clipboard.readText)navigator.clipboard.readText().then(function(t){i.value=t.trim();i.dispatchEvent(new Event('input',{bubbles:true}));i.focus();},function(){i.focus();});else i.focus();});
var L=[['v4','v4'],['v5','v5'],['lsu-alpha1','LSU Alpha 1'],['ntz-x0-3-000','NTZ X0.3.000']];
var f=document.createElement('div');f.className='foot';
f.innerHTML='Sử Quán 1.0 · '+(A.token()&&!adm?'<a href="admin.html">Admin (đang tắt)</a> · ':'')+'<details><summary>Phiên bản Legacy (cũ)</summary>'+L.map(function(l){return '<button type="button" data-s="'+l[0]+'">'+l[1]+'</button>';}).join('')+'</details>';
f.addEventListener('click',function(e){var s=e.target.dataset&&e.target.dataset.s;if(!s)return;try{sessionStorage.setItem('ls_legacy_pick',s);}catch(x){}location.href='legacy/index.html#/'+s;});
(document.querySelector('.wrap')||document.body).appendChild(f);
})();
