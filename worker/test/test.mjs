// Chạy: node --no-warnings worker/test/test.mjs  (cần Node 22+, dùng node:sqlite giả lập D1)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/index.js';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const sdb = new DatabaseSync(':memory:');
sdb.exec(fs.readFileSync(path.join(here,'../schema.sql'),'utf8'));
sdb.exec(fs.readFileSync(path.join(here,'../seed.sql'),'utf8'));
const nz = a => a.map(x => x === undefined ? null : x);
const DB = { prepare(sql){ const st=sdb.prepare(sql); return { bind(...a){ a=nz(a); return {
  first: async()=>st.get(...a)||null, all: async()=>({results:st.all(...a)}), run: async()=>{const r=st.run(...a);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};} }; } }; } };
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const env={DB,ADMIN_EPOCH:'1',ADMIN_HASH:await sha('ADMTEST'),ALLOWED_ORIGIN:'*'};
let pass=0,fail=0;
const T=(n,c)=>{ if(c){pass++;} else {fail++;console.log('FAIL',n);} };
async function call(path,body,adm,ip='1.1.1.1'){const h={'content-type':'application/json','cf-connecting-ip':ip};if(adm)h['x-admin']=adm;
 const r=await worker.fetch(new Request('https://x'+path,{method:'POST',headers:h,body:JSON.stringify(body||{})}),env);return r.json();}
const A='a'.repeat(32),B='b'.repeat(32),C='c'.repeat(32),D='d'.repeat(32);
// admin
let r=await call('/api/admin/claim',{code:'sai'}); T('claim sai',!r.ok);
r=await call('/api/admin/claim',{code:'admtest'}); T('claim ok',r.ok&&r.token); const tok=r.token;
r=await call('/api/admin/claim',{code:'ADMTEST'},null,'2.2.2.2'); T('claim lần 2 bị khóa',!r.ok);
r=await call('/api/admin/list',{}); T('list không token',!r.ok);
r=await call('/api/admin/list',{},tok); T('list token',r.ok&&r.codes.length===7);
r=await call('/api/admin/create',{plan:'plus',max_uses:2,code:'ntz-test',days:30},tok); T('create',r.ok&&r.code==='NTZ-TEST');
r=await call('/api/admin/create',{plan:'plus',code:'NTZ-TEST'},tok); T('create trùng',!r.ok);
r=await call('/api/admin/create',{plan:'promax',max_uses:'',days:''},tok); T('create tự sinh',r.ok&&/^NTZ-/.test(r.code)); const pm=r.code;
// redeem
r=await call('/api/redeem',{code:'ntz-test',dev:A}); T('redeem A',r.ok&&r.plan==='plus'&&r.until>Date.now()); const kA=r.key;
r.max!==undefined&&T('redeem trả số lượt và ghi chú của mã',r.max===2&&r.left===1&&typeof r.note==='string');
r=await call('/api/status',{key:kA}); T('status ok',r.ok&&r.plan==='plus');
r=await call('/api/redeem',{code:'NTZ-TEST',dev:A,cur:kA}); T('cùng thiết bị: bị chặn vì đã có plus',!r.ok);
r=await call('/api/redeem',{code:'NTZ-TEST',dev:A}); T('cùng thiết bị không cur: cấp lại không trừ lượt',r.ok);
let li=await call('/api/admin/list',{},tok); T('used=1',li.codes.find(c=>c.code_plain==='NTZ-TEST').used===1);
r=await call('/api/status',{key:kA}); T('khóa cũ A bị thu hồi',!r.ok&&r.reason==='revoked');
r=await call('/api/redeem',{code:'NTZ-TEST',dev:B}); T('redeem B',r.ok); const kB=r.key;
r=await call('/api/redeem',{code:'NTZ-TEST',dev:C}); T('hết lượt',!r.ok&&/hết lượt/.test(r.msg));
// chuyển khóa
r=await call('/api/activate-key',{key:kB,dev:C}); T('chuyển B->C',r.ok); const kC=r.key;
r=await call('/api/status',{key:kB}); T('B mất gói',!r.ok);
r=await call('/api/activate-key',{key:kB,dev:D}); T('khóa cũ không dùng lại',!r.ok);
let k=kC; for(let i=0;i<2;i++){ r=await call('/api/rotate',{key:k,dev:C,cur:k}); T('rotate '+i,r.ok); k=r.key; }
r=await call('/api/rotate',{key:k,dev:C,cur:k}); T('quá 3 lần/ngày',!r.ok&&/3 lần/.test(r.msg));
r=await call('/api/status',{key:k}); T('khóa mới còn',r.ok);
// hủy
r=await call('/api/deactivate',{key:k}); T('deactivate',r.ok);
r=await call('/api/status',{key:k}); T('sau hủy',!r.ok);
li=await call('/api/admin/list',{},tok); T('hủy không hoàn lượt',li.codes.find(c=>c.code_plain==='NTZ-TEST').used===2);
// RELESE + cur cao hơn
r=await call('/api/redeem',{code:'RELESE',dev:A}); T('RELESE',r.ok&&r.plan==='plus'&&r.until===1795626000000); const kR=r.key;
r=await call('/api/redeem',{code:pm,dev:A,cur:kR}); T('nâng lên promax',r.ok&&r.plan==='promax'); const kP=r.key;
r=await call('/api/status',{key:kR}); T('khóa plus cũ bị thu hồi khi nâng',!r.ok);
r=await call('/api/redeem',{code:'RELESE',dev:A,cur:kP}); T('không hạ gói',!r.ok&&/trở lên/.test(r.msg));
r=await call('/api/code-info',{code:'NTZ-TEST'}); T('code-info',r.ok&&r.left===0);
// admin sửa / tắt / xóa
const id=li.codes.find(c=>c.code_plain==='NTZ-TEST').id;
r=await call('/api/admin/update',{id,max_uses:5,active:true},tok); T('update',r.ok);
r=await call('/api/redeem',{code:'NTZ-TEST',dev:D}); T('còn lượt sau khi tăng',r.ok);
r=await call('/api/admin/update',{id,active:false},tok); r=await call('/api/redeem',{code:'NTZ-TEST',dev:'e'.repeat(32)}); T('mã tắt',!r.ok);
r=await call('/api/admin/delete',{id},tok); T('delete',r.ok);
li=await call('/api/admin/list',{},tok); const keyId=li.keys[0].id; r=await call('/api/admin/revoke-key',{id:keyId},tok); T('revoke key',r.ok);
// chuyển admin
r=await call('/api/admin/transfer',{},tok); T('transfer',r.ok); const tr=r.transfer;
r=await call('/api/admin/accept',{transfer:'sai'},null,'3.3.3.3'); T('accept sai',!r.ok);
r=await call('/api/admin/accept',{transfer:tr},null,'3.3.3.3'); T('accept ok',r.ok); const tok2=r.token;
r=await call('/api/admin/list',{},tok); T('admin chủ vẫn giữ quyền',r.ok&&r.sessions.length===2&&r.owner===true);
r=await call('/api/admin/list',{},tok2); T('admin thêm là thường',r.ok&&r.owner===false);
const ownerH=r.sessions.find(x=>x.owner).h, normH=r.sessions.find(x=>!x.owner).h;
r=await call('/api/admin/transfer',{},tok2); T('admin thường không tạo link',!r.ok);
r=await call('/api/admin/revoke-session',{h:ownerH},tok2); T('admin thường không đăng xuất ai',!r.ok);
r=await call('/api/admin/revoke-others',{},tok2); T('admin thường không revoke-others',!r.ok);
r=await call('/api/admin/revoke-session',{h:ownerH},tok); r=await call('/api/admin/list',{},tok); T('không đăng xuất được chủ',r.ok);
r=await call('/api/admin/accept',{transfer:tr},null,'3.3.3.3'); T('link chuyển dùng 1 lần',!r.ok);
r=await call('/api/admin/revoke-session',{h:normH},tok); T('chủ đăng xuất admin thường',r.ok);
r=await call('/api/admin/list',{},tok2); T('admin thường mất quyền',!r.ok);
r=await call('/api/admin/transfer',{},tok); const tr4=r.transfer; r=await call('/api/admin/accept',{transfer:tr4,label:'web'},null,'3.3.3.3'); const tok4=r.token;
r=await call('/api/admin/set-owner',{h:ownerH,owner:false},tok); T('không tự bỏ chủ',!r.ok);
r=await call('/api/admin/revoke-others',{},tok); r=await call('/api/admin/list',{},tok4); T('chủ revoke-others',!r.ok);
// đổi epoch => hủy admin
env.ADMIN_EPOCH='2'; r=await call('/api/admin/list',{},tok); T('đổi epoch hủy admin',!r.ok);
r=await call('/api/admin/claim',{code:'ADMTEST'},null,'4.4.4.4'); T('claim lại sau đổi epoch',r.ok);const tok5=r.token;
// rate limit
for(let i=0;i<10;i++) await call('/api/redeem',{code:'sai'+i,dev:A},null,'9.9.9.9');
r=await call('/api/redeem',{code:'RELESE',dev:'z'.repeat(32)},null,'9.9.9.9'); T('rate limit',!r.ok&&/quá nhiều/.test(r.msg));

// ---- Cộng đồng: tài liệu văn bản ----
{
  const adm2 = tok5;
  let c = await call('/api/contrib/register',{name:'Lan Anh'},null,'6.6.6.6'); T('đăng ký contributor',c.ok);
  const cl = await call('/api/admin/ct-list',{},adm2); const acc = cl.accounts.find(a=>a.name==='Lan Anh');
  const ap = await call('/api/admin/ct-account',{id:acc.id,action:'approve'},adm2); T('duyệt contributor',ap.ok&&ap.ticket);
  const cc = await call('/api/contrib/claim',{ticket:ap.ticket},null,'6.6.6.6'); const ct = cc.token; T('nhận gói contributor',cc.ok&&ct);
  const callC = async (path, body, tk) => { const r = await worker.fetch(new Request('https://x'+path,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'6.6.6.6',...(tk?{'x-contrib':tk}:{})},body:JSON.stringify(body)}),env); return r.json(); };
  // --- gửi bộ đề loại Câu hỏi (Phần I + Phần II) ---
  const Q1=[['1','Câu một?',['a','b','c','d'],'A']];
  const P2=[['2','Tư liệu',[['mệnh đề a',1],['mệnh đề b',0],['mệnh đề c',1],['mệnh đề d',0]],{block:'BX_2',detect:['tư liệu']}]];
  let s1 = await callC('/api/contrib/submit',{title:'Chỉ Phần I',questions:Q1},ct); T('gửi Phần I như cũ',s1.ok&&s1.count===1&&s1.p2===0);
  let s2 = await callC('/api/contrib/submit',{title:'Có Phần II',questions:Q1,part2:P2},ct); T('gửi Phần I + Phần II',s2.ok&&s2.p1===1&&s2.p2===1&&s2.count===2);
  let s3 = await callC('/api/contrib/submit',{title:'Chỉ Phần II',questions:[],part2:P2},ct); T('gửi riêng Phần II',s3.ok&&s3.p1===0&&s3.p2===1);
  let s4 = await callC('/api/contrib/submit',{title:'Hỏng',questions:Q1,part2:[['9','tl',[['a',1]]]]},ct); T('Phần II thiếu mệnh đề bị từ chối',!s4.ok);
  let s5 = await callC('/api/contrib/submit',{title:'Rỗng',questions:[],part2:[]},ct); T('không có câu nào bị từ chối',!s5.ok);
  const mn = await callC('/api/contrib/mine',{},ct); const m2 = mn.subs.find(x=>x.id===s2.id), m1 = mn.subs.find(x=>x.id===s1.id);
  T('mine trả Phần II',m2&&m2.part2.length===1&&m2.part2[0][2][1][1]===0&&m2.questions.length===1);
  T('bộ đề cũ mine không có Phần II',m1&&m1.part2.length===0);
  const up = await callC('/api/contrib/submit',{id:s1.id,title:'Chỉ Phần I',questions:Q1,part2:P2},ct); T('sửa bộ đề thêm Phần II',up.ok&&up.p2===1);
  const lst = await call('/api/admin/ct-list',{},adm2); const as = lst.subs.find(x=>x.id===s2.id); T('admin thấy Phần II',lst.ok&&as&&as.part2.length===1);
  const pk = await call('/api/admin/ct-pack-create',{sub_ids:[s2.id,s3.id],name:'Gói thử Phần II'},adm2); T('gộp thành gói có Phần II',pk.ok&&pk.count===2);
  const pb = await callC('/api/contrib/packs',{}); const pp = pb.packs.find(x=>x.id===pk.id); T('gói công khai có Phần II',pp&&pp.questions.length===1&&pp.part2.length===1);
  const pk2 = await call('/api/admin/ct-pack-create',{sub_ids:[s1.id],name:'Gói thử Phần II',into:pk.id},adm2); const pb2 = await callC('/api/contrib/packs',{}); const pp2 = pb2.packs.find(x=>x.id===pk.id); T('gộp thêm vào gói giữ Phần II',pk2.ok&&pp2.part2.length===1);
  await call('/api/admin/ct-pack-delete',{id:pk.id},adm2);
  await call('/api/admin/ct-sub',{action:'delete',ids:[s1.id,s2.id,s3.id]},adm2);
  let r2 = await callC('/api/contrib/community-publish',{title:'Bài',html:'<p>x</p>'}); T('không có tên contributor thì không đăng được',!r2.ok);
  const evil = '<p onclick="alert(1)" style="color:red;background:url(javascript:x);font-size:20px">Xin <b>chào</b><script>alert(1)</script></p><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://ntz.dev/x" onclick="x">ok</a><iframe src="//evil"></iframe><div class="sqd-note evil other"><span class="fx-glow">hi</span></div><svg onload=alert(1)></svg>';
  r2 = await callC('/api/contrib/community-publish',{title:'Bài thử',html:evil},ct); T('đăng bài',r2.ok&&r2.id); const did = r2.id;
  const g = await callC('/api/contrib/community-get',{id:did});
  T('lấy bài công khai',g.ok&&g.doc.author==='Lan Anh'&&g.mine===false);
  const hh = g.doc.html;
  T('lọc script',!/script|alert\(1\)<\/|onerror|onclick|javascript:|iframe|<img|<svg/i.test(hh));
  T('giữ định dạng hợp lệ',/<b>chào<\/b>/.test(hh)&&/font-size:20px/.test(hh)&&/class="sqd-note"/.test(hh)&&/class="fx-glow"/.test(hh));
  T('lọc style nguy hiểm',!/url\(/.test(hh)&&/color:red/.test(hh));
  T('link https hợp lệ có rel',/<a href="https:\/\/ntz.dev\/x" target="_blank" rel="noopener noreferrer nofollow">ok<\/a>/.test(hh));
  T('đã đánh dấu sqdoc1',hh.startsWith('<!--sqdoc1-->'));
  r2 = await callC('/api/contrib/community-publish',{title:'Trang màu',html:'<!--sqdoc1;bg=#112233;ink=red;evil=1--><p>a</p>'},ct); T('đăng bài có cài đặt trang',r2.ok);
  const gc = await callC('/api/contrib/community-get',{id:r2.id}); T('giữ nền hợp lệ, bỏ màu chữ sai',gc.doc.html.startsWith('<!--sqdoc1;bg=#112233-->')&&!/evil|ink=/.test(gc.doc.html));
  await callC('/api/contrib/community-delete',{id:r2.id},ct);
  const g2 = await callC('/api/contrib/community-get',{id:did},ct); T('chủ bài nhận mine',g2.ok&&g2.mine===true);
  const ls = await callC('/api/contrib/community',{}); T('danh sách công khai không kèm html',ls.ok&&ls.docs.length===1&&!('html' in ls.docs[0])&&ls.docs[0].author==='Lan Anh');
  r2 = await callC('/api/contrib/community-publish',{id:did,title:'Bài thử 2',html:'<h1>Mới</h1><table><tr><td>1</td></tr></table>'},ct); T('sửa bài của mình',r2.ok&&r2.updated);
  r2 = await callC('/api/contrib/community-publish',{title:'Rỗng',html:'<p> </p>'},ct); T('bài trống bị từ chối',!r2.ok);
  r2 = await callC('/api/contrib/community-publish',{title:'Dài',html:'a'.repeat(200001)},ct); T('bài quá dài bị từ chối',!r2.ok);
  r2 = await callC('/api/contrib/community-publish',{title:'Câu',html:'<div class="sqd-q" data-k="mc" data-id="12" data-a="B"><div class="sqd-qq">Q?</div></div>'},ct); T('bài chỉ có khối câu hỏi được nhận',r2.ok);
  const mine = await callC('/api/contrib/community-mine',{},ct); T('danh sách bài của tôi',mine.ok&&mine.docs.length===2);
  const al = await call('/api/admin/ct-community',{},adm2); T('admin xem danh sách',al.ok&&al.docs.length===2);
  const dd = await callC('/api/contrib/community-delete',{id:did},ct); T('tác giả gỡ bài',dd.ok);
  const ad = await call('/api/admin/ct-community-delete',{ids:[r2.id]},adm2); T('admin xóa bài',ad.ok&&ad.deleted===1);
  const ls2 = await callC('/api/contrib/community',{}); T('danh sách trống sau khi xóa',ls2.ok&&ls2.docs.length===0);
}
// mã cũ trong seed
console.log('pass',pass,'fail',fail);
