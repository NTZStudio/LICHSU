/* Logic chính: nhận diện câu, so khớp đáp án, chấm, tự động dán. Cần nạp sau config.js và data/*.js */
var F=(CONFIG.features)||{}; // cờ tính năng theo phiên bản (xem versions.js)
function norm(s){return (s||'').toLowerCase().normalize('NFC').replace(/[""'’“”\.,;:!?()]/g,'').replace(/\s+/g,' ').trim();}

function jac(a,b){var ta=new Set(norm(a).split(' ')),tb=new Set(norm(b).split(' '));var i=0;ta.forEach(function(t){if(tb.has(t))i++;});var u=new Set([...ta,...tb]).size;return u?i/u:0;}

function detectQuestion1(qText){
  var t=norm(qText);
  var cands=[];
  QBANK1.concat(QBANK2).forEach(function(entry){
    var key=entry[0];
    var keys=Array.isArray(key)?key:[key];
    var ok=keys.every(function(k){return t.indexOf(norm(k))>=0;});
    if(ok) cands.push(entry[1]);
  });
  return cands.length?cands:null;
}

function matchToTarget(opts,target){
  var best={letter:null,score:-1};
  opts.forEach(function(o){
    var s = norm(o.text)===norm(target) ? 2 : jac(o.text,target);
    if(s>best.score){best={letter:o.letter,score:s};}
  });
  return best.letter;
}

function detectBlock(t){
  t=t.toLowerCase();
  // tư liệu của các bài thêm qua data/link-grader.js (EXTRA_BLOCKS) được kiểm tra trước
  var extra=window.EXTRA_BLOCKS||[];
  for(var xi=0;xi<extra.length;xi++){
    if(extra[xi].any.some(function(p){return t.includes(p);})) return extra[xi].key;
  }
  if(t.includes('còn tùy thuộc ở nhiều nhân tố')||t.includes('tr.424')||t.includes('trang 424'))return'B424';
  if(t.includes('đại hội xii của đảng cộng sản việt nam')||t.includes('cục diện thế giới theo xu hướng đa cực'))return'B_DAIHOI12';
  if(t.includes('quá trình ra đời và phát triển của hiệp hội các quốc gia đông nam á'))return'B20_BANG';
  if(t.includes('bảng dữ kiện về quá trình tồn tại')||t.includes('giai đoạn xác lập và phát triển của trật tự thế giới hai cực'))return'B_BANGGD';
  if(t.includes('tuyên bố asean')||t.includes('cộng đồng các quốc gia đông nam á hoà bình')||t.includes('cộng đồng các quốc gia đông nam á hòa bình'))return'B_ASEAN';
  if(t.includes('phân chia nhau phạm vi thế lực trên cơ sở thoả thuận'))return'B2';
  if(t.includes('vĩ tuyến 38'))return'B_VT38';
  if(t.includes('xakhalin'))return'B_XAKHALIN';
  if(t.includes('phần lan trở thành hai nước trung lập'))return'B_DUCTRUNGLAP';
  if(t.includes('một bị thương, một bị mất')||t.includes('nics')||t.includes('tr.401'))return'B9_22';
  
  if(t.includes('trung tâm điều hoà các nỗ lực quốc tế'))return'B1';
  if(t.includes('cộng hoà nhân dân trung hoa ra đời'))return'B13';
  if(t.includes('vành đai an toàn')||t.includes('3 mục tiêu cơ bản'))return'B14';
  if(t.includes('thực sự bị phá vỡ'))return'B15';
  
  if(t.includes('thúc đẩy mạnh mẽ quá trình toàn cầu hóa'))return'B17';
  if(t.includes('thông cáo thượng hải'))return'B18';
  if(t.includes('cạnh tranh sức mạnh tổng hợp quốc gia thay thế cho chạy đua vũ trang'))return'B19';
  if(t.includes('lào và mi-an-ma gia nhập asean')||t.includes('bru-nây gia nhập asean')||t.includes('cap-pu-chia gia nhập asean'))return'B20_BANG';
  if(t.includes('19-8-1991')||t.includes('cực liên xô'))return'B21';
  if(t.includes('hiệp ước abm')||t.includes('salt'))return'B11';
  if(t.includes('chủ nghĩa tơrunan')||t.includes('sứ mạng lãnh đạo thế giới tự do'))return'B12';
  if(t.includes('san francisco')||t.includes('truman'))return'B6';
  if(t.includes('bút-sơ')||t.includes('goóc-ba')||t.includes('ngưỡng cửa'))return'B10';
  if(t.includes('sớc-sin')||t.includes('ru-dơ-ven')||t.includes('xta-lin')){
    if(t.includes('thành lập liên hợp quốc và'))return'B5B';
    return'B5A';
  }
  if(t.includes('nguyên nhân sụp đổ')||t.includes('chạy đua vũ trang khiến'))return'B3';
  if(t.includes('trung tâm quyền lực')||t.includes('ấn độ')||t.includes('liên bang nga'))return'B4';
  if(t.includes('trang 227')||t.includes('đề phòng và thủ tiêu sự đe dọa'))return'LHQ25';
  if(t.includes('trang 228')||t.includes('phi thực dân hóa'))return'LHQ26';
  if(t.includes('cấm đe dọa sử dụng vũ lực'))return'B7';
  if(t.includes('thi hành những biện pháp tập thể có hiệu quả'))return'LHQ27';
  if(t.includes('làm tròn những nghĩa vụ'))return'LHQ28';
  if(t.includes('trang 417')||t.includes('biến động lớn ở đông âu và liên xô'))return'B_BIENDONG';
  return null;
}

function parseBlocks(raw){
  var lines=raw.split(/\r?\n/).map(function(l){return l.trim();});
  var blocks=[],cur=null;
  lines.forEach(function(line){
    var m=line.match(/^Câu\s*(\d+)/i);
    if(m){ if(cur)blocks.push(cur); cur={num:parseInt(m[1]),lines:[]}; }
    else if(cur){ cur.lines.push(line); }
  });
  if(cur)blocks.push(cur);
  return blocks;
}

function parseOptions1(lines,startIdx){
  var opts=[],i=startIdx+1;
  while(opts.length<4 && i<lines.length){
    var line=lines[i];
    if(line===''){i++;continue;}
    var m=line.match(/^([ABCD])[\.\):]\s*(.+)$/);
    if(m){opts.push({letter:m[1],text:m[2]});i++;continue;}
    if(/^[ABCD]\.?$/.test(line)){
      var letter=line.replace('.','');i++;
      while(i<lines.length&&lines[i]==='')i++;
      opts.push({letter:letter,text:lines[i]||''});i++;continue;
    }
    i++;
  }
  return opts;
}

function parseStatements(lines,startIdx){
  var st=[],i=startIdx+1;
  while(i<lines.length){
    var line=lines[i];
    var m=line.match(/^([abcd])\)\s*(.*)$/i);
    if(m){
      var letter=m[1].toLowerCase(), text=m[2];
      if(!text.trim()){
        var j=i+1;
        while(j<lines.length && lines[j]==='')j++;
        text=lines[j]||'';
        i=j;
      }
      st.push({letter:letter,text:text});
    }
    i++;
  }
  return st;
}

function matchAnswer1(opts){
  var best={letter:null,score:-1};
  opts.forEach(function(o){
    ANS1.forEach(function(a){
      var s = norm(o.text)===norm(a) ? 2 : jac(o.text,a);
      if(s>best.score){best={letter:o.letter,score:s};}
    });
  });
  return best.letter;
}

function matchTruth(text,statements){
  var scored=statements.map(function(s){return {truth:s[1],score:jac(text,s[0])};});
  scored.sort(function(a,b){return b.score-a.score;});
  var best=scored[0], second=scored[1]||{score:0};
  var uncertain = (best.score - second.score) < CONFIG.matching.uncertainGap;
  return {truth:best.truth, uncertain:uncertain};
}

function extractAnswerDirect(lines){
  for(var i=0;i<lines.length;i++){
    var l=lines[i].trim();
    var mSingle=l.match(/^Đáp án đúng\s*:\s*([ABCDabcd])\s*$/);
    if(mSingle) return {type:'single', value:mSingle[1].toUpperCase()};
    if(/^Đáp án đúng\s*:?\s*$/.test(l)){
      var res={}, j=i+1;
      while(j<lines.length){
        var l2=lines[j].trim();
        if(/^Thí sinh chọn/i.test(l2)) break;
        if(/^Câu làm sai/i.test(l2)) break;
        var m2=l2.match(/^([a-dA-D])\)\s*(Đúng|Sai)\b/);
        if(m2){ res[m2[1].toLowerCase()]=(m2[2]==='Đúng'?'Đ':'S'); }
        j++;
      }
      if(Object.keys(res).length>=2) return {type:'multi', value:res};
    }
  }
  return null;
}

function run(){
  var raw=document.getElementById('inp').value;
  if(!raw.trim()){document.getElementById('out').innerHTML='<div class="warn">Bạn chưa dán đề.</div>';return;}
  var blocks=parseBlocks(raw);
  var res1=[],res2=[],warn=[];
  blocks.forEach(function(b){
    var direct=extractAnswerDirect(b.lines);
    if(direct){
      if(direct.type==='single'){
        res1.push({num:b.num, ans:direct.value, low:false});
      } else {
        var order=['a','b','c','d'];
        var chuoi=order.map(function(l){return direct.value[l]||'?';}).join('');
        res2.push({num:b.num, chuoi:chuoi});
      }
      return;
    }
    var joined=b.lines.join('\n');
    var idx1=b.lines.findIndex(function(l){return /^chọn một đáp án đúng$/i.test(l.trim());});
    if(idx1<0){
      var altA=b.lines.findIndex(function(l){return /^A\.?$/.test(l.trim());});
      if(altA>0) idx1=altA-1;
    }
    var idx2=b.lines.findIndex(function(l){return /^chọn đúng hoặc sai$/i.test(l.trim());});
    if(idx1>=0){
      var opts=parseOptions1(b.lines,idx1);
      if(opts.length===4){
        var qText=b.lines.slice(0,idx1).join(' ');
        var targets=detectQuestion1(qText);
        var ans, low=false;
        if(targets){
          var best={letter:null,score:-1};
          targets.forEach(function(tt){
            var letter=matchToTarget(opts,tt);
            var opt=opts.find(function(o){return o.letter===letter;});
            var s = opt ? (norm(opt.text)===norm(tt)?2:jac(opt.text,tt)) : -1;
            if(s>best.score){best={letter:letter,score:s};}
          });
          ans=best.letter;
        }
        else { ans=matchAnswer1(opts); low=true; }
        res1.push({num:b.num, ans:ans, low:low});
      } else warn.push('Câu '+b.num+': không tách được đủ 4 đáp án.');
    } else if(idx2>=0){
      var tuLieu=b.lines.slice(0,idx2).join(' ');
      var blockId=detectBlock(tuLieu);
      var sts=parseStatements(b.lines,idx2);
      if(blockId && B[blockId] && sts.length>=4){
        var order=['a','b','c','d'];
        var chuoi=order.map(function(l){
          var s=sts.find(function(x){return x.letter===l;});
          if(!s) return '?';
          var m=matchTruth(s.text,B[blockId]);
          var ch = m.truth===1?'Đ':(m.truth===0?'S':'?');
          return m.uncertain ? ch.toLowerCase() : ch;
        }).join('');
        var lowConf = /[đs]/.test(chuoi);
        res2.push({num:b.num, chuoi:chuoi, low:lowConf});
      } else warn.push('Câu '+b.num+': không nhận diện được bộ tư liệu (Phần II).');
    }
  });
 
  // bản NTZ (cờ ntzCards): hiển thị dạng thẻ, xem js/ntz-cards.js
  if(F.ntzCards && typeof window.ntzRenderResults==='function'){
    document.getElementById('out').innerHTML=window.ntzRenderResults(res1,res2,warn);
    return;
  }
  var html='';
  if(res1.length){
    html+='<div class="result"><h3>PHẦN I</h3><div class="pack">';
    for(var i=0;i<res1.length;i+=CONFIG.output.part1PerLine){
      var chunk=res1.slice(i,i+CONFIG.output.part1PerLine);
      html+=chunk[0].num+'–'+chunk[chunk.length-1].num+': '+chunk.map(function(r){return (r.ans||'?')+(r.low?'*':'');}).join(', ')+'\n';
    }
    html+='</div>';
    if(res1.some(function(r){return r.low;})) html+='<div class="warn">* câu không nhận diện được qua ngân hàng câu hỏi, kết quả dò theo pool chung — nên kiểm tra lại thủ công.</div>';
    html+='</div>';
  }
  if(res2.length){
    html+='<div class="result"><h3>PHẦN II</h3><div class="pack">';
    res2.forEach(function(r){ html+='Câu '+r.num+': '+r.chuoi+'\n'; });
    html+='</div>';
    if(res2.some(function(r){return r.low;})) html+='<div class="warn">đ/s viết thường: điểm số giữa Đúng/Sai quá sít sao, nên kiểm tra lại thủ công.</div>';
    html+='</div>';
  }
  if(warn.length){
    html+='<div class="result"><h3>⚠️ Cảnh báo</h3><div class="pack">'+warn.join('\n')+'</div></div>';
  }
  if(!res1.length && !res2.length && !warn.length){
    html='<div class="result">Không tách được câu hỏi nào. Kiểm tra lại định dạng đề đã dán.</div>';
  }
  document.getElementById('out').innerHTML=html;
}

/* ===== v5: tự động dán ===== */

var inpEl=document.getElementById('inp');

var autoPasteEl=document.getElementById('autoPaste');

var autoRunEl=document.getElementById('autoRun');

var pstatusEl=document.getElementById('pstatus');

var lastClip=null;

function pstatus(m){pstatusEl.textContent=m;}

function saveOpt(k,v){try{localStorage.setItem(k,v?'1':'0');}catch(e){}}

function loadOpt(k,def){try{var v=localStorage.getItem(k);return v===null?def:v==='1';}catch(e){return def;}}

function applyPasted(text,note){
  inpEl.value=text;
  lastClip=text;
  pstatus(note);
  if(F.ntzComposer){
    // bản NTZ: ô nhập tự giãn và tự chấm khi có sự kiện input (xem js/ntz-ui.js)
    inpEl.dispatchEvent(new Event('input',{bubbles:true}));
  } else if(autoRunEl.checked) run();
}

// Trạng thái quyền đọc clipboard: 'granted' | 'prompt' | 'denied' | 'unknown' (Firefox/Safari không hỗ trợ truy vấn này)
async function clipPerm(){
  try{
    if(!navigator.permissions||!navigator.permissions.query) return 'unknown';
    return (await navigator.permissions.query({name:'clipboard-read'})).state;
  }catch(e){ return 'unknown'; }
}
var clipHinted=false; // chỉ nhắc một lần mỗi lần mở trang, tránh làm phiền mỗi khi quay lại tab

// manual=true: bấm nút (luôn dán, kể cả cùng nội dung); manual=false: tự động.
// gesture=true: vừa có thao tác của người dùng (vd. vừa bật ô tự động dán) nên được phép hiện hộp xin quyền.
// Tự động mà chưa được cấp quyền thì KHÔNG gọi readText: nếu gọi, trình duyệt sẽ hỏi lại mỗi lần quay lại tab.
async function pasteNow(manual,gesture){
  if(!F.autoPaste) return;
  if(!manual && !autoPasteEl.checked) return;
  if(!navigator.clipboard || !navigator.clipboard.readText){
    pstatus('Trình duyệt không cho đọc clipboard tự động. Hãy nhấn Ctrl+V vào trang.');
    return;
  }
  if(!manual && !gesture){
    var st=await clipPerm();
    if(st!=='granted'){
      if(!clipHinted){
        clipHinted=true;
        pstatus(st==='denied'
          ? 'Quyền đọc clipboard đang bị chặn cho trang này. Hãy nhấn Ctrl+V vào trang, hoặc cho phép lại trong cài đặt trang web.'
          : st==='prompt'
            ? 'Chưa được cấp quyền đọc clipboard. Bấm \u201cDán\u201d một lần và chọn Cho phép để web tự dán; hoặc nhấn Ctrl+V.'
            : 'Trình duyệt này không cho tự đọc clipboard. Hãy bấm nút Dán hoặc nhấn Ctrl+V.');
      }
      return;
    }
  }
  try{
    var text=await navigator.clipboard.readText();
    if(!text.trim()){ if(manual) pstatus('Clipboard đang trống.'); return; }
    if(!manual && text===lastClip) return; // không dán lại cùng một nội dung
    applyPasted(text, manual?'Đã dán từ clipboard.':'Đã tự động dán nội dung mới.');
  }catch(err){
    pstatus('Chưa đọc được clipboard. Hãy cho phép quyền truy cập, hoặc nhấn Ctrl+V vào trang.');
  }
}

autoPasteEl.addEventListener('change',function(){
  saveOpt(CONFIG.storageKeys.autoPaste,autoPasteEl.checked);
  if(autoPasteEl.checked){pstatus('Đã bật tự động dán.');pasteNow(false,true);}
  else pstatus('Đã tắt tự động dán.');
});
autoRunEl.addEventListener('change',function(){saveOpt(CONFIG.storageKeys.autoRun,autoRunEl.checked);});

window.addEventListener('focus',function(){pasteNow(false);});
document.addEventListener('visibilitychange',function(){if(!document.hidden)pasteNow(false);});

// Ctrl+V ở bất kỳ đâu trên trang (không cần xin quyền) khi đang bật tự động dán
document.addEventListener('paste',function(e){
  if(!autoPasteEl.checked) return;
  var text=e.clipboardData && e.clipboardData.getData('text');
  if(!text || !text.trim()) return;
  e.preventDefault();
  applyPasted(text,'Đã nhận nội dung từ Ctrl+V.');
});

autoPasteEl.checked=F.autoPaste&&loadOpt(CONFIG.storageKeys.autoPaste,CONFIG.autoPaste.defaultOn);
if(!F.autoPaste){ document.querySelector('.opts').style.display='none'; document.querySelector('.btn2').style.display='none'; }
autoRunEl.checked=loadOpt(CONFIG.storageKeys.autoRun,CONFIG.autoPaste.defaultAutoRun);
if(autoPasteEl.checked) pasteNow(false);

/* ===== Thông báo (nội dung lấy từ config.js) ===== */
function renderNotice(){
  var host=document.getElementById('notice');
  var n=CONFIG.notice;
  if(!host || !F.notice || !n || !n.enabled) return;
  var box=document.createElement('div');
  box.className='notice'; box.setAttribute('role','note');
  var t=document.createElement('strong'); t.textContent='🔔 '+n.title;
  var p=document.createElement('p');      p.textContent=n.message;
  var f=document.createElement('small');  f.textContent=n.from;
  box.appendChild(t); box.appendChild(p); box.appendChild(f);
  host.appendChild(box);
}
renderNotice();
