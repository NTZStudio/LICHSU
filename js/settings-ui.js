/* Tab SETTING ở trang data: nền, độ sáng, tông màu, nhạc. Cần theme.js. */
(function(){
var SW=[['Cam (mặc định)',''],['Đỏ','#ff4d4d'],['Vàng','#ffd23d'],['Xanh lá','#3fcf7a'],['Ngọc','#1fcfc0'],['Xanh dương','#3d8bff'],['Tím','#a66bff'],['Hồng','#ff5fa8'],['Bạc','#d9d9e0']];
function h(t,a,c){var e=document.createElement(t);if(a)Object.keys(a).forEach(function(k){if(k==='text')e.textContent=a[k];else e.setAttribute(k,a[k]);});(c||[]).forEach(function(x){e.appendChild(x);});return e;}
function sec(title,note){var s=h('section',{class:'st-sec glass'});s.appendChild(h('h3',{text:title}));if(note)s.appendChild(h('p',{class:'st-note',text:note}));return s;}
function pick(accept,cb){var i=h('input',{type:'file',accept:accept,hidden:''});i.onchange=function(){var f=i.files[0];if(f)cb(f);};document.body.appendChild(i);i.click();setTimeout(function(){i.remove();},60000);}
window.sqSettingsMount=function(host){
 var T=window.SQTheme;if(!T){host.textContent='Không tải được cài đặt.';return;}
 function render(){host.innerHTML='';var S=T.get(),root=h('div',{class:'st'});
  /* NỀN */
  var s1=sec('NỀN','Chọn nền có sẵn hoặc tải ảnh / video của bạn. Nền tự lưu trong trình duyệt này.');
  var g=h('div',{class:'st-grid'});
  function card(label,on,fn,del){var b=h('button',{type:'button',class:'st-card'+(on?' on':'')},[h('span',{text:label})]);b.onclick=fn;if(del){var x=h('i',{class:'st-x',text:'×',title:'Xóa'});x.onclick=function(e){e.stopPropagation();del();};b.appendChild(x);}g.appendChild(b);return b;}
  card('Mặc định',S.bg.t==='default',function(){T.setBg({t:'default'});render();});
  card('Tắt nền',S.bg.t==='off',function(){T.setBg({t:'off'});render();});
  (((window.SQ_PRESETS||{}).bg)||[]).forEach(function(p){card(p.name,S.bg.t==='preset'&&S.bg.id===p.id,function(){T.setBg({t:'preset',id:p.id});render();});});
  s1.appendChild(g);
  var up=h('button',{type:'button',class:'btn alt',text:'+ Tải ảnh / video lên'});up.onclick=function(){pick('image/*,video/*',function(f){if(f.size>150*1048576){alert('File quá lớn (tối đa 150 MB).');return;}T.addAsset('bg',f).then(function(id){T.setBg({t:'custom',id:id});render();},function(){alert('Trình duyệt không cho lưu file (chế độ riêng tư?).');});});};
  s1.appendChild(up);
  T.assets('bg').then(function(a){a.forEach(function(r){card(r.name,S.bg.t==='custom'&&S.bg.id===r.id,function(){T.setBg({t:'custom',id:r.id});render();},function(){if(confirm('Xóa "'+r.name+'"?'))T.removeAsset(r.id).then(render);});});});
  /* ĐỘ SÁNG */
  var s2=sec('ĐỘ SÁNG NỀN');var val=h('b',{text:S.bright+'%'}),rg=h('input',{type:'range',min:10,max:120,value:S.bright,class:'st-range'});
  rg.oninput=function(){val.textContent=rg.value+'%';T.setBright(+rg.value);};s2.appendChild(h('label',{class:'st-row'},[rg,val]));
  /* TÔNG MÀU */
  var s3=sec('TÔNG MÀU CHỦ ĐẠO','Đổi màu nhấn của toàn bộ web.');var sw=h('div',{class:'st-sw'});
  SW.forEach(function(c){var b=h('button',{type:'button',class:'st-dot'+((S.accent||'')===c[1]?' on':''),title:c[0]});b.style.background=c[1]||'#ff8a1f';b.onclick=function(){T.setAccent(c[1]);render();};sw.appendChild(b);});
  var ci=h('input',{type:'color',class:'st-color',value:S.accent||'#ff8a1f',title:'Màu tự chọn'});ci.onchange=function(){T.setAccent(ci.value);render();};sw.appendChild(ci);s3.appendChild(sw);
  /* KHUNG */
  var s6=sec('MÀU KHUNG & ĐỘ MỜ ĐỤC','Mặc định là kính mờ. Chọn màu hoặc kéo độ mờ đục để phủ một lớp màu phía sau chữ (hữu ích khi tắt kính mờ).');
  var fc=h('input',{type:'color',class:'st-color',value:S.o.frc||'#0c0c12'}),fa=h('input',{type:'range',min:0,max:100,value:S.o.fa==null?60:S.o.fa,class:'st-range'}),fav=h('b',{text:(S.o.fa==null?60:S.o.fa)+'%'});
  fc.oninput=function(){T.setOpt('frc',fc.value);T.setOpt('fr',1);};fc.onchange=render;
  fa.oninput=function(){fav.textContent=fa.value+'%';T.setOpt('fa',+fa.value);T.setOpt('fr',1);};
  s6.appendChild(h('label',{class:'st-row'},[h('span',{text:'Màu khung'}),fc]));s6.appendChild(h('label',{class:'st-row'},[h('span',{text:'Độ mờ đục'}),fa,fav]));
  var fk=h('button',{type:'button',class:'btn alt',text:S.o.fr?'Về kính mờ mặc định':'Đang dùng: kính mờ mặc định'});fk.disabled=!S.o.fr;fk.onclick=function(){T.setOpt('fr',0);render();};s6.appendChild(fk);
  /* NHẠC */
  var s4=sec('NHẠC','Nhạc có sẵn hoặc file của bạn. Trình duyệt chỉ cho phát sau khi bạn chạm vào trang.');var M=T.music;
  var ctl=h('div',{class:'st-ctl'}),pb=h('button',{type:'button',class:'btn alt',text:M.playing()?'⏸ Tạm dừng':'▶ Phát'}),pv=h('button',{type:'button',class:'btn alt',text:'⏮'}),nx=h('button',{type:'button',class:'btn alt',text:'⏭'});
  pb.onclick=function(){M.toggle();};pv.onclick=function(){M.step(-1);};nx.onclick=function(){M.step(1);};ctl.appendChild(pv);ctl.appendChild(pb);ctl.appendChild(nx);
  var vr=h('input',{type:'range',min:0,max:100,value:S.m.vol,class:'st-range'});vr.oninput=function(){M.vol(+vr.value);};
  var lp=h('input',{type:'checkbox'});lp.checked=!!S.m.loop;lp.onchange=function(){M.loop(lp.checked);};
  s4.appendChild(ctl);s4.appendChild(h('label',{class:'st-row'},[h('span',{text:'Âm lượng'}),vr]));s4.appendChild(h('label',{class:'st-row'},[lp,h('span',{text:'Tự chuyển bài / lặp danh sách'})]));
  var ls=h('div',{class:'st-list'});s4.appendChild(ls);
  var tr=M.list(),c=M.cur();
  if(!tr.length)ls.appendChild(h('p',{class:'st-note',text:'Chưa có bài nào. Hãy tải file nhạc lên.'}));
  tr.forEach(function(t){var row=h('div',{class:'st-trk'+(c&&c.id===t.id&&S.m.on?' on':'')},[h('button',{type:'button',text:(c&&c.id===t.id&&M.playing()?'♪ ':'')+t.name})]);row.firstChild.onclick=function(){M.play(t.id);setTimeout(render,200);};
   if(!t.preset){var x=h('i',{class:'st-x',text:'×',title:'Xóa'});x.onclick=function(){if(confirm('Xóa "'+t.name+'"?'))T.removeAsset(t.id).then(render);};row.appendChild(x);}ls.appendChild(row);});
  var um=h('button',{type:'button',class:'btn alt',text:'+ Tải nhạc lên'});um.onclick=function(){pick('audio/*',function(f){if(f.size>80*1048576){alert('File quá lớn (tối đa 80 MB).');return;}T.addAsset('music',f).then(function(){render();},function(){alert('Trình duyệt không cho lưu file (chế độ riêng tư?).');});});};s4.appendChild(um);
  /* TÙY CHỌN KHÁC */
  var s5=sec('TÙY CHỌN KHÁC');
  [['nosel','Tắt quét chọn chữ (bôi đen) trên trang','Ô nhập, vùng soạn thảo và khối mã vẫn chọn được.'],['noanim','Giảm hiệu ứng chuyển động','Tắt animation, mượt hơn trên máy yếu.'],['noblur','Tắt hiệu ứng kính mờ','Giảm giật lag, tiết kiệm pin.'],['nobtn','Ẩn nút ♪ nhạc ở góc màn hình','Vẫn điều khiển nhạc được trong SETTING.']].forEach(function(o){
   var cb=h('input',{type:'checkbox'});cb.checked=!!S.o[o[0]];cb.onchange=function(){T.setOpt(o[0],cb.checked?1:0);};
   s5.appendChild(h('label',{class:'st-row st-sw2'},[cb,h('span',{},[h('b',{text:o[1]}),h('small',{text:o[2]})])]));});
  var fv=h('b',{text:S.o.font+'%'}),fr=h('input',{type:'range',min:85,max:130,step:5,value:S.o.font,class:'st-range'});
  fr.oninput=function(){fv.textContent=fr.value+'%';T.setOpt('font',+fr.value);};
  s5.appendChild(h('label',{class:'st-row'},[h('span',{text:'Cỡ chữ'}),fr,fv]));
  /* ĐẶT LẠI */
  var rs=h('button',{type:'button',class:'btn alt',text:'Khôi phục mặc định'});rs.onclick=function(){if(confirm('Đặt lại nền, màu và nhạc về mặc định? (file đã tải lên vẫn được giữ)')){T.reset();render();}};
  [s1,s2,s3,s6,s4,s5].forEach(function(s){root.appendChild(s);});root.appendChild(rs);host.appendChild(root);}
 T.on(function(){if(!host.hidden&&!host.contains(document.activeElement))render();});
 render();};
})();
