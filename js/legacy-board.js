/* Bảng thông báo cho trang Legacy. Nạp sau notices.js. */
(function(){
var NT=window.NOTICES||[],hid=[];try{hid=JSON.parse(localStorage.getItem('sq_nt_hide')||'[]');}catch(e){}
var vis=NT.filter(function(n){return hid.indexOf(n.id)<0;});if(!vis.length)return;
var st=document.createElement('style');st.textContent='.lb{border:1px solid #888;border-radius:3px;margin:0 0 14px;background:rgba(127,127,127,.08)}.lb summary{cursor:pointer;padding:8px 12px;font:700 12px system-ui;letter-spacing:.12em}.lb .nt{display:flex;gap:10px;padding:9px 12px;border-top:1px solid rgba(127,127,127,.3);border-left:3px solid #2563eb;font-size:14px;line-height:1.5}.lb .nt.warn{border-left-color:#dc2626}.lb .nt.ok{border-left-color:#16a34a}.lb .nt div{flex:1}.lb .nt b{display:block}.lb .nt small{opacity:.7}.lb .nt button{margin:0;padding:2px 8px;font-size:12px;background:transparent;color:inherit;border:1px solid rgba(127,127,127,.5);border-radius:3px}';
document.head.appendChild(st);
var b=document.createElement('details');b.className='lb';b.open=true;
function head(){b.firstChild.textContent='BẢNG THÔNG BÁO ('+b.querySelectorAll('.nt').length+')';}
b.innerHTML='<summary></summary>'+vis.map(function(n){return '<div class="nt '+(n.type||'info')+'"><div><b>'+n.title+'</b>'+n.msg+(n.from||n.date?'<br><small>'+(n.from||'')+(n.from&&n.date?' · ':'')+(n.date||'')+'</small>':'')+'</div><button type="button" data-h="'+n.id+'">Ẩn</button></div>';}).join('');
head();
b.addEventListener('click',function(e){var i=e.target.dataset&&e.target.dataset.h;if(!i)return;hid.push(i);try{localStorage.setItem('sq_nt_hide',JSON.stringify(hid));}catch(x){}e.target.closest('.nt').remove();if(!b.querySelector('.nt'))b.remove();else head();});
var a=document.querySelector('body>a');if(a)a.insertAdjacentElement('afterend',b);else document.body.insertBefore(b,document.body.firstChild);
})();
