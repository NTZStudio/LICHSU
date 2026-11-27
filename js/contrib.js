/* Sử Quán · Contributor + MyProject.
   - MyProject: bộ đề lưu trong trình duyệt (localStorage sq_myproj), không lên máy chủ.
   - Contributor: tài khoản do admin duyệt, gửi bộ đề cho admin; gói đã duyệt công khai cho mọi người (cache sq_ct_cache).
   - Chế độ nguồn đáp án (sq_src): main | contrib | myproject. Trang Chấm gọi SQC.inject() trước link-grader.js. */
(function () {
  var API = (window.SQ_API || '').replace(/\/$/, ''), LS = localStorage;
  var K = { my: 'sq_myproj', cache: 'sq_ct_cache', src: 'sq_src', pend: 'sq_ct_pend', tok: 'sq_ct_tok', name: 'sq_ct_name' };
  var $ = function (i) { return document.getElementById(i); };
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function jget(k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var strip = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
  async function call(path, body, tok) {
    if (!API) return { ok: false, msg: 'Chưa cấu hình máy chủ (js/sq-config.js).' };
    var hd = { 'content-type': 'application/json' }; if (tok) hd['x-contrib'] = tok;
    try { var r = await fetch(API + path, { method: 'POST', headers: hd, body: JSON.stringify(body || {}) }); return await r.json(); }
    catch (e) { return { ok: false, msg: 'Không kết nối được máy chủ.' }; }
  }

  /* ---------- định dạng văn bản <-> câu hỏi ---------- */
  function parse(text) {
    var qs = [], err = [], cur = null, n = 0, seen = {};
    function fin() {
      if (!cur) return;
      var bad = cur.o.length !== 4 || !cur.a || !cur.q;
      if (bad) err.push('Câu ' + (cur.id || ('#' + (qs.length + err.length + 1))) + ': thiếu nội dung, đủ 4 đáp án A–D hoặc dòng "Đáp án: X".');
      else if (seen[cur.id]) err.push('ID trùng: ' + cur.id);
      else { seen[cur.id] = 1; qs.push([cur.id, cur.q, cur.o, cur.a]); }
      cur = null;
    }
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var l = raw.trim(), m;
      if (!l) { return; }
      if ((m = l.match(/^(?:đáp án|dap an|đ\/a|ans(?:wer)?)\s*[:\-=]\s*([A-Da-d])\b/i))) { if (cur) { cur.a = m[1].toUpperCase(); fin(); } return; }
      if ((m = l.match(/^([A-D])\s*[\.\)]\s*(.+)$/))) { if (cur) cur.o.push(m[2].trim()); return; }
      if (cur && !cur.o.length && !cur.a && !/^\S+\s*\|/.test(l)) { cur.q += ' ' + l; return; }
      fin(); n++;
      var i = l.indexOf('|');
      cur = i > 0 ? { id: l.slice(0, i).trim(), q: l.slice(i + 1).trim(), o: [], a: '' } : { id: 'Q' + n, q: l, o: [], a: '' };
    });
    fin();
    return { qs: qs, err: err };
  }
  function ser(qs) { return (qs || []).map(function (r) { return r[0] + ' | ' + r[1] + '\n' + r[2].map(function (o, i) { return 'ABCD'[i] + '. ' + o; }).join('\n') + '\nĐáp án: ' + r[3]; }).join('\n\n'); }


  /* ---------- loại CÂU HỎI: dán đề Azota -> tự nhận ID, câu hỏi, đáp án đúng -> file lessonN.js ---------- */
  var NOISE = /^(hiểu|biết|vận dụng cao|vận dụng|nhận biết|thông hiểu)$/i;
  var nz = function (x) { return String(x == null ? '' : x).toLowerCase().replace(/\s+/g, ' ').trim(); };
  function detectOf(tl) {
    var L = String(tl).split('\n').map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length > 25 && !/^đọc đoạn/i.test(x); });
    if (!L.length) return [];
    L.sort(function (a, b) { return b.length - a.length; });
    var t = L[0].toLowerCase(), out = [];
    function cut(a, n) { var i = a > 0 && t[a - 1] !== ' ' ? t.indexOf(' ', a) + 1 : a, e = t.lastIndexOf(' ', i + n); return t.slice(i, e > i ? e : i + n).trim(); }
    out.push(t.length > 60 ? cut(10, 38) : t.slice(0, 40).trim());
    if (t.length > 110) out.push(cut(Math.floor(t.length / 2), 36));
    return out.filter(Boolean);
  }
  function parseBlock(b) {
    var L = b.lines.filter(function (x) { return !NOISE.test(x); }), iA = -1, ia = -1, i, m, l;
    for (i = 0; i < L.length; i++) { if (iA < 0 && /^A\s*[\.\)]/.test(L[i])) iA = i; if (ia < 0 && /^a\s*\)/.test(L[i])) ia = i; }
    if (ia >= 0 && (iA < 0 || ia < iA)) {
      var tl = L.slice(0, ia).join('\n').trim(), sts = [], tr = {}, inAns = false;
      for (i = ia; i < L.length; i++) {
        l = L[i];
        if (!inAns) {
          if (/^đáp án/i.test(l)) { inAns = true; continue; }
          if (sts.length < 4 && (m = l.match(new RegExp('^' + 'abcd'[sts.length] + '\\s*\\)\\s*(.*)$')))) { sts.push(m[1]); continue; }
          if (sts.length) sts[sts.length - 1] += ' ' + l;
        } else {
          if (/^(thí sinh|câu làm sai)/i.test(l)) break;
          if ((m = l.match(/^([a-d])\s*\)\s*(đúng|sai)\b/i)) && !(m[1].toLowerCase() in tr)) tr[m[1].toLowerCase()] = /^đ/i.test(m[2]) ? 1 : 0;
        }
      }
      sts = sts.map(function (x) { return x.trim(); });
      if (!tl || sts.length !== 4 || sts.some(function (x) { return !x; })) return { err: 'Câu ' + b.id + ' (Phần II): không tách được tư liệu và đủ 4 mệnh đề a–d.' };
      if (['a', 'b', 'c', 'd'].some(function (k) { return !(k in tr); })) return { err: 'Câu ' + b.id + ' (Phần II): thiếu "Đáp án đúng" của a–d.' };
      return { p2: [b.id, tl, sts.map(function (x, k) { return [x, tr['abcd'[k]]]; }), { block: 'BX_' + b.id, detect: detectOf(tl) }] };
    }
    if (iA >= 0) {
      var stem = L.slice(0, iA).join(' ').trim(), opts = [], ans = '';
      for (i = iA; i < L.length; i++) {
        l = L[i];
        if ((m = l.match(/^đáp án(?: đúng)?\s*[:\-=]?\s*([A-D])\b/i))) { ans = m[1].toUpperCase(); break; }
        if (opts.length < 4 && (m = l.match(new RegExp('^' + 'ABCD'[opts.length] + '\\s*[\\.\\)]\\s*(.*)$')))) { opts.push(m[1]); continue; }
        if (opts.length) opts[opts.length - 1] += ' ' + l;
      }
      opts = opts.map(function (x) { return x.trim(); });
      if (!stem || opts.length !== 4 || opts.some(function (x) { return !x; }) || !ans) return { err: 'Câu ' + b.id + ' (Phần I): thiếu nội dung, đủ 4 đáp án A–D hoặc dòng "Đáp án đúng".' };
      return { p1: [b.id, stem, opts, ans] };
    }
    return { err: 'Câu ' + b.id + ': không nhận ra là Phần I hay Phần II.' };
  }
  function parseExam(text) {
    var blocks = [], cur = null, res = { p1: [], p2: [], err: [] };
    String(text || '').replace(/ /g, ' ').split(/\r?\n/).forEach(function (raw) {
      var l = raw.trim(), m; if (!l) return;
      if (l.length < 80 && /^ph[ầa]n\s*(?:i{1,2}|[12])\b/i.test(l)) return;
      if ((m = l.match(/^câu\s*\d*\s*[\.:]?\s*\(?\s*ID\s*[:：]?\s*(\d+)\s*\)?\s*(.*)$/i))) { cur = { id: m[1], lines: m[2] ? [m[2]] : [] }; blocks.push(cur); return; }
      if ((m = l.match(/^\[?(\d{6,})\]?\s*\|\s*(.+)$/))) { cur = { id: m[1], lines: [m[2]] }; blocks.push(cur); return; }
      if (cur) cur.lines.push(l);
    });
    blocks.forEach(function (b) { var r = parseBlock(b); if (r.err) res.err.push(r.err); else if (r.p1) res.p1.push(r.p1); else res.p2.push(r.p2); });
    return res;
  }
  function same1(a, b) { return nz(a[1]) === nz(b[1]) && nz(a[2]['ABCDEFGH'.indexOf(a[3])]) === nz(b[2]['ABCDEFGH'.indexOf(b[3])]); }
  function same2(a, b) { if (nz(a[1]) !== nz(b[1]) || a[2].length !== b[2].length) return false; var k = function (r) { return r[2].map(function (x) { return nz(x[0]) + '|' + x[1]; }).sort().join('\n'); }; return k(a) === k(b); }
  function mergeExam(acc, res) {
    var out = { added: 0, dup: 0, conf: [] };
    [['p1', 'qs', same1], ['p2', 'p2', same2]].forEach(function (k) {
      res[k[0]].forEach(function (r) {
        var list = acc[k[1]], ex = list.filter(function (x) { return x[0] === r[0]; });
        if (ex.some(function (x) { return k[2](x, r); })) { out.dup++; return; }
        if (ex.length) out.conf.push(r[0]);
        list.push(r); out.added++;
      });
      acc[k[1]].sort(function (a, b) { return Number(a[0]) - Number(b[0]) || 0; });
    });
    return out;
  }
  function lessonSrc(n, title, qs, p2) {
    var ex = {}, any = false;
    qs = (qs || []).map(function (r) { if (r[4]) { ex[r[0]] = r[4]; any = true; } return r.slice(0, 4); });
    p2 = (p2 || []).map(function (r) { var m = r[3]; if (m && m.exp) { ex[r[0]] = m.exp; any = true; var c = {}; Object.keys(m).forEach(function (k) { if (k !== 'exp') c[k] = m[k]; }); return [r[0], r[1], r[2], c]; } return r; });
    var j = function (r) { return '    ' + JSON.stringify(r); }, blk = function (a) { return a.length ? '[\n' + a.map(j).join(',\n') + '\n  ]' : '[]'; };
    return '(window.ADV_BANK = window.ADV_BANK || {})[' + n + '] = {\n  title: ' + JSON.stringify(title) + ',\n  grade: true,\n  questions: ' + blk(qs) + ',\n  part2: ' + blk(p2) + '\n};\n'
      + (any ? 'Object.assign(window.ADV_EXPLAIN = window.ADV_EXPLAIN || {}, ' + JSON.stringify(ex, null, 2) + ');\n' : '');
  }

  /* ---------- MyProject ---------- */
  var my = {
    all: function () { return jget(K.my, []); },
    save: function (list) { jset(K.my, list); },
    put: function (id, o) { var l = my.all(), i = l.findIndex(function (x) { return x.id === id; }); var rec = { id: id || ('p' + Date.now().toString(36)), title: o.title, type: o.type || 'basic', qs: o.qs || [], p2: o.p2 || [], text: o.text || '', pub: o.pub || null, at: Date.now() }; if (i >= 0) l[i] = rec; else l.unshift(rec); my.save(l); return rec.id; },
    del: function (id) { my.save(my.all().filter(function (x) { return x.id !== id; })); }
  };
  var isBasic = function (p) { var t = p.type || 'basic'; return t === 'basic' || t === 'question'; };

  /* ---------- Contributor: gói đã duyệt (công khai) ---------- */
  var src = function () { var s = LS.getItem(K.src); return s === 'contrib' || s === 'myproject' ? s : 'main'; };
  function packs() { return (jget(K.cache, {}).packs) || []; }
  async function sync(cb) {
    var r = await call('/api/contrib/packs');
    if (r && r.ok) {
      var old = JSON.stringify(packs()), nw = JSON.stringify(r.packs);
      jset(K.cache, { t: Date.now(), packs: r.packs });
      if (cb) cb(old !== nw);
    } else if (cb) cb(false, r);
  }
  function inject() {
    var A = (window.ADV_BANK = window.ADV_BANK || {}), s = src();
    if (s === 'contrib') {
      packs().forEach(function (p) { A[1000 + p.id] = { title: p.name + ' (Contributor)', grade: true, questions: p.questions, part2: p.part2 || [] }; });
      var c = jget(K.cache, {});
      if (!c.t || Date.now() - c.t > 600000) sync(function (changed) { if (changed && !sessionStorage.getItem('sq_ct_rl')) { sessionStorage.setItem('sq_ct_rl', '1'); location.reload(); } });
    } else if (s === 'myproject') {
      var E = (window.ADV_EXPLAIN = window.ADV_EXPLAIN || {});
      my.all().forEach(function (p, i) { if (!isBasic(p)) return; A[2000 + i] = { title: p.title + ' (MyProject)', grade: true, questions: p.qs, part2: p.p2 || [] };
        (p.qs || []).forEach(function (r) { if (r[4]) E[r[0]] = r[4]; }); (p.p2 || []).forEach(function (r) { if (r[3] && r[3].exp) E[r[0]] = r[3].exp; }); });
    }
  }

  /* ---------- thanh chọn nguồn (trang Chấm) ---------- */
  function modeBar(host) {
    var bar = h('div', 'ct-modes'), cur = src();
    [['main', 'CHÍNH THỨC'], ['contrib', 'CONTRIBUTOR'], ['myproject', 'MYPROJECT']].forEach(function (m) {
      var on = m[0] === cur, b = h('button', 'bank-chip ct-chip' + (on ? ' is-on' : ''), (on ? '✓ ' : '') + m[1]); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.onclick = function () { if (m[0] === cur) return; LS.setItem(K.src, m[0]); sessionStorage.removeItem('sq_ct_rl'); location.reload(); };
      bar.appendChild(b);
    });
    var n = cur === 'contrib' ? packs().reduce(function (a, p) { return a + p.questions.length + (p.part2 || []).length; }, 0) : cur === 'myproject' ? my.all().reduce(function (a, p) { return a + (isBasic(p) ? p.qs.length + (p.p2 || []).length : 0); }, 0) : 0;
    var info = h('span', 'ct-info', cur === 'main' ? 'Chỉ dùng dữ liệu của web.' : 'Đang cộng thêm ' + n + ' câu từ ' + (cur === 'contrib' ? 'Contributor' : 'MyProject') + '.');
    bar.appendChild(info);
    var wrap = h('div', 'ct-src'); wrap.appendChild(h('div', 'ntz-adv-s', 'NGUỒN ĐÁP ÁN')); wrap.appendChild(bar); if (window.sqFocusMount) window.sqFocusMount(wrap); host.insertBefore(wrap, host.firstChild);
  }

  /* ---------- tra cứu (trang Tra cứu): kiểu Azota ----------
     Mặc định chỉ hiện danh sách FILE (thẻ bên trái, khung cuộn bên phải). Bấm một file mới mở bài:
     bộ đề = thẻ câu kiểu ADVANCE + ô tìm trong file + lưới số câu; văn bản/cộng đồng = tờ tài liệu + tìm trong bài.
     Ô tìm kiếm dùng chung (#q) đổi nghĩa theo trạng thái: danh sách = tìm tên file, đang mở = tìm trong file. */
  var views = {}, LET = 'ABCDEFGH', cm = { docs: null, loading: false, err: '', cache: {} };
  var idCmp = function (a, b) { a = String(a[0]); b = String(b[0]); return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); };
  var qel = function () { return $('q'); };
  function view(mode) {
    if (views[mode]) return views[mode];
    var root = $(mode === 'contrib' ? 'contribRoot' : 'myRoot');
    var v = views[mode] = { mode: mode, root: root, sel: null, built: '', part: 'p1', items: [], secs: [], tabEls: {}, hits: [], hi: 0, cnt: '', lim: { m: 60, s: 100 },
      main: h('div', 'az-main'), side: h('aside', 'az-side'), top: h('div'), box: h('div', 'az-box az-sbox'), nav: h('div', 'ct-nav') };
    root.classList.add('az'); root.appendChild(v.main); root.appendChild(v.side);
    v.top.hidden = true; v.side.appendChild(v.top); v.side.appendChild(v.box); v.side.appendChild(v.nav);
    if (mode === 'contrib') {
      if (window.SQ_CM_OPEN) { v.sel = { kind: 'cdoc', key: 'c' + window.SQ_CM_OPEN, id: window.SQ_CM_OPEN }; window.SQ_CM_OPEN = 0; }
      sync(function (ch) { if (ch && window.SQ_LOOKUP) v.render && v.render(); });
    }
    return v;
  }
  function metaOf(f) {
    var a = [];
    if (f.kind === 'exam') { if (f.qs.length) a.push(f.qs.length + ' câu Phần I'); if (f.p2.length) a.push(f.p2.length + ' câu Phần II'); if (!a.length) a.push('Trống'); }
    else if (f.kind === 'cdoc' && f.sub) a.push('Tác giả ' + f.sub);
    if (f.at) a.push(fdate(f.at));
    return a.join(' · ');
  }
  function files(v, tab) {
    var out = [];
    if (v.mode === 'contrib') {
      if (tab !== 'community') packs().forEach(function (p) { out.push({ key: 'e' + p.id, kind: 'exam', tag: 'BỘ ĐỀ', title: p.name, qs: p.questions || [], p2: p.part2 || [], sub: 'Contributor', at: p.at }); });
      if (tab !== 'exams') (cm.docs || []).forEach(function (d) { out.push({ key: 'c' + d.id, kind: 'cdoc', id: d.id, tag: 'CỘNG ĐỒNG', title: d.title, sub: d.author, at: d.at, snip: d.snippet }); });
    } else my.all().forEach(function (p) {
      if (p.type === 'text') out.push({ key: 'm' + p.id, kind: 'mydoc', tag: 'VĂN BẢN', title: p.title, text: p.text || '', snip: window.SQDoc ? SQDoc.toText(p.text || '').slice(0, 140) : String(p.text || '').slice(0, 140), at: p.at });
      else out.push({ key: 'm' + p.id, kind: 'exam', tag: p.type === 'question' ? 'CÂU HỎI' : 'CƠ BẢN', title: p.title, qs: p.qs || [], p2: p.p2 || [], at: p.at });
    });
    return out;
  }
  function findFile(v, s) {
    if (s.kind === 'cdoc') {
      var d = (cm.docs || []).filter(function (x) { return x.id === s.id; })[0], r = cm.cache[s.id], dd = r && r.doc;
      return { key: s.key, kind: 'cdoc', id: s.id, tag: 'CỘNG ĐỒNG', title: d ? d.title : dd ? dd.title : 'Bài cộng đồng', sub: d ? d.author : dd ? dd.author : '', at: d ? d.at : dd ? dd.at : 0 };
    }
    return files(v, 'all').filter(function (x) { return x.key === s.key; })[0] || null;
  }
  function openFile(v, f) {
    v.sel = { kind: f.kind, key: f.key, id: f.id }; cm.err = '';
    var i = qel(); if (i) i.value = '';
    v.render(); try { v.root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
  function goBack(v) { v.sel = null; v.built = ''; var i = qel(); if (i) i.value = ''; v.render(); }
  function backBtn(v) { var b = h('button', 'az-back', '← Quay lại danh sách'); b.type = 'button'; b.onclick = function () { goBack(v); }; return b; }

  /* --- trạng thái 1: danh sách file --- */
  function fileCard(v, f) {
    var c = h('button', 'ct-file'); c.type = 'button';
    c.appendChild(h('span', 'ct-ftag', f.tag)); c.appendChild(h('h4', '', f.title)); c.appendChild(h('div', 'ct-fm', metaOf(f)));
    if (f.snip) c.appendChild(h('div', 'ct-fs', f.snip));
    c.onclick = function () { openFile(v, f); }; return c;
  }
  function fileRow(v, f) {
    var b = h('button', 'ct-fi'); b.type = 'button'; b.title = f.title;
    b.appendChild(h('b', '', f.title)); b.appendChild(h('small', '', f.tag + ' · ' + metaOf(f)));
    b.onclick = function () { openFile(v, f); }; return b;
  }
  function more(label, fn) { var b = h('button', 'btn alt ct-more', label); b.type = 'button'; b.onclick = fn; return b; }
  function tabsBox(v, cur) {
    var box = h('div', 'az-box'), g = h('div', 'az-tabs'), n = cm.docs ? cm.docs.length : '…', e = packs().length,
      xe = e + my.all().reduce(function (a, p) { return a + (isBasic(p) ? 1 : 0); }, 0);   /* số file đề EXERCISES làm được (Contributor + MyProject) */
    box.appendChild(h('div', 'az-sh', 'DANH MỤC'));
    CTABS.forEach(function (x) {
      var t = h('button', 'az-tab' + (x[0] === cur ? ' is-on' : '')), c = x[0] === 'all' ? (cm.docs ? e + n : '…') : x[0] === 'exams' ? e : x[0] === 'community' ? n : xe;
      t.type = 'button'; t.setAttribute('aria-pressed', x[0] === cur ? 'true' : 'false'); t.appendChild(document.createTextNode(x[1])); t.appendChild(h('small', '', String(c)));
      t.onclick = function () { try { sessionStorage.setItem('sq_ctab', x[0]); } catch (er) {} v.lim = { m: 60, s: 100 }; v.render(); };
      g.appendChild(t);
    });
    box.appendChild(g); return box;
  }
  function renderLib(v, toks) {
    var tab = v.mode === 'contrib' ? ctab() : 'exams';
    v.box.hidden = false; v.built = 'lib|' + tab; v.top.hidden = true; v.top.textContent = ''; v.main.textContent = ''; v.nav.textContent = '';
    if (v.mode === 'contrib') { if (tab !== 'exams' && tab !== 'exercises' && !cm.docs) loadCm(v); v.nav.appendChild(tabsBox(v, tab)); }
    v.box.hidden = tab === 'exercises';
    if (tab === 'exercises') { v.main.appendChild(window.SQEX ? window.SQEX.node() : h('div', 'cm-empty', 'Không tải được EXERCISES.')); return ''; }
    var all = files(v, tab), list = all.filter(function (f) { var k = strip(f.title + ' ' + (f.sub || '') + ' ' + (f.snip || '')); return toks.every(function (t) { return k.indexOf(t) > -1; }); });
    if (cm.err) v.main.appendChild(h('div', 'cm-empty', cm.err));
    if (!list.length) {
      var loading = v.mode === 'contrib' && tab !== 'exams' && !cm.docs && !cm.err;
      v.main.appendChild(h('div', 'cm-empty', all.length ? 'Không có file nào khớp từ khóa.' : loading ? 'Đang tải…' : v.mode === 'contrib' ? (tab === 'community' ? 'Chưa có bài nào trên cộng đồng.' : 'Chưa có bộ đề Contributor nào được duyệt.') : 'MyProject trống. Vào Dữ liệu › MYPROJECT để tạo bộ đề.'));
    } else {
      var left = v.lim.m, groups = tab === 'all' && v.mode === 'contrib' ? [['EXAMS', 'exam'], ['COMMUNITY', 'cdoc']] : [[null, null]];
      groups.forEach(function (g) {
        var part = list.filter(function (f) { return !g[1] || f.kind === g[1]; }); if (!part.length) return;
        if (g[0]) v.main.appendChild(h('div', 'ct-sec', g[0] + ' · ' + part.length));
        var grid = h('div', 'ct-fgrid'); part.slice(0, Math.max(0, left)).forEach(function (f) { grid.appendChild(fileCard(v, f)); }); left -= part.length; v.main.appendChild(grid);
      });
      if (list.length > v.lim.m) v.main.appendChild(more('Hiện thêm file', function () { v.lim.m += 60; v.render(); }));
    }
    var gb = h('div', 'az-box az-gbox'), sc = h('div', 'ct-fl');
    gb.appendChild(h('div', 'az-sh', 'TẤT CẢ FILE · ' + list.length));
    list.slice(0, v.lim.s).forEach(function (f) { sc.appendChild(fileRow(v, f)); });
    if (list.length > v.lim.s) sc.appendChild(more('Hiện thêm', function () { v.lim.s += 100; v.render(); }));
    if (!list.length) sc.appendChild(h('div', 'd-sub', 'Chưa có file.'));
    var wrap = h('div'); wrap.appendChild(sc); gb.appendChild(wrap); v.nav.appendChild(gb);
    return list.length + ' file';
  }

  /* --- trạng thái 2a: mở bộ đề (thẻ câu kiểu Azota) --- */
  function qCard(part, r, no) {
    var card = h('article', 'az-q'), hd = h('div', 'az-qh'), ib = h('button', 'az-id', 'ID ' + r[0]), ol = h('div', 'az-opts'), key, ex;
    hd.appendChild(h('span', 'az-no', 'Câu ' + no)); ib.type = 'button'; ib.title = 'Bấm để sao chép ID';
    ib.onclick = function () { try { navigator.clipboard.writeText(String(r[0])); } catch (e) {} ib.textContent = 'Đã chép'; setTimeout(function () { ib.textContent = 'ID ' + r[0]; }, 1100); };
    hd.appendChild(ib); card.appendChild(hd);
    if (part === 'p1') {
      card.appendChild(h('div', 'az-qt', r[1]));
      r[2].forEach(function (tx, k) {
        var L = LET.charAt(k), ok = L === r[3], o = h('div', 'az-o' + (ok ? ' ok' : ''));
        o.appendChild(h('span', 'az-l', L)); o.appendChild(h('span', 'az-ot', tx)); if (ok) { var m = h('span', 'az-m', '✓'); m.setAttribute('aria-label', 'Đáp án đúng'); o.appendChild(m); }
        ol.appendChild(o);
      });
      key = r[0] + ' ' + r[1] + ' ' + r[2].join(' '); ex = r[4];
    } else {
      card.appendChild(h('div', 'az-tl', r[1]));
      r[2].forEach(function (s, k) {
        var t = !!s[1], o = h('div', 'az-o az-s ' + (t ? 'is-true' : 'is-false'));
        o.appendChild(h('span', 'az-l', 'abcdefgh'.charAt(k))); o.appendChild(h('span', 'az-ot', s[0])); o.appendChild(h('span', 'az-tf', t ? 'Đúng' : 'Sai')); ol.appendChild(o);
      });
      key = r[0] + ' ' + r[1] + ' ' + r[2].map(function (s) { return s[0] + (s[1] ? ' dung' : ' sai'); }).join(' '); ex = r[3] && r[3].exp;
    }
    card.appendChild(ol);
    var eb = h('div', 'az-exp' + (ex ? '' : ' is-empty')); eb.appendChild(h('h4', '', 'GIẢI THÍCH')); eb.appendChild(h('div', 'az-expt', ex || 'Chưa có giải thích cho câu này.')); card.appendChild(eb);
    return { el: card, key: strip(key + ' cau ' + no) };
  }
  function sideTitle(v, f) {
    v.top.textContent = ''; v.top.hidden = false;
    var tb = h('div', 'az-box'); tb.appendChild(backBtn(v)); tb.appendChild(h('h3', 'ct-rt', f.title)); tb.appendChild(h('div', 'ct-rm', metaOf(f))); v.top.appendChild(tb);
  }
  function buildExam(v, f) {
    v.built = 'x|' + f.key; v.items = []; v.secs = []; v.tabEls = {}; v.part = f.qs.length ? 'p1' : 'p2';
    v.main.textContent = ''; v.nav.textContent = ''; sideTitle(v, f);
    var tb = h('div', 'az-box'), tg = h('div', 'az-tabs'); tb.appendChild(h('div', 'az-sh', 'PHẦN'));
    [['p1', 'Phần I'], ['p2', 'Phần II']].forEach(function (p) {
      var b = h('button', 'az-tab'); b.type = 'button'; b.appendChild(document.createTextNode(p[1])); b.appendChild(h('small', '', '0'));
      b.onclick = function () { v.part = p[0]; v.render(); }; v.tabEls[p[0]] = b; tg.appendChild(b);
    });
    tb.appendChild(tg); v.nav.appendChild(tb);
    var gb = h('div', 'az-box az-gbox'), gw = h('div'), grid = h('div', 'az-grid'), lg = h('div', 'az-leg');
    gb.appendChild(h('div', 'az-sh', 'DANH SÁCH CÂU')); gw.appendChild(grid); gb.appendChild(gw);
    lg.appendChild(h('i', 'cur')); lg.appendChild(document.createTextNode('Đang xem')); lg.appendChild(h('i', 'seen')); lg.appendChild(document.createTextNode('Đã xem')); gb.appendChild(lg); v.nav.appendChild(gb);
    [['p1', 'Phần I', f.qs.slice().sort(idCmp)], ['p2', 'Phần II', f.p2.slice().sort(idCmp)]].forEach(function (P) {
      if (!P[2].length) return;
      var sec = h('section', 'az-sec'), S = { el: sec, part: P[0], items: [] };
      sec.appendChild(h('h3', 'az-sech', f.title + ' · ' + P[1] + ' · ' + P[2].length + ' câu'));
      P[2].forEach(function (r, i) {
        var no = i + 1, c = qCard(P[0], r, no), cell = h('button', 'az-n', String(no)), it = { el: c.el, cell: cell, part: P[0], key: c.key };
        cell.type = 'button'; cell.title = 'Câu ' + no + ' · ID ' + r[0];
        cell.onclick = function () {
          v.items.forEach(function (x) { x.cell.classList.remove('cur'); }); cell.classList.add('cur', 'seen');
          c.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); c.el.classList.remove('flash'); void c.el.offsetWidth; c.el.classList.add('flash');
        };
        sec.appendChild(c.el); grid.appendChild(cell); v.items.push(it); S.items.push(it);
      });
      v.main.appendChild(sec); v.secs.push(S);
    });
  }
  function applyExam(v, f, toks) {
    var n = 0, per = { p1: 0, p2: 0 };
    v.items.forEach(function (it) {
      var hit = toks.every(function (t) { return it.key.indexOf(t) > -1; }), ok = hit && it.part === v.part;
      if (hit) per[it.part]++; it.el.hidden = !ok; it.cell.hidden = !ok; if (ok) n++;
    });
    v.secs.forEach(function (s) { s.el.hidden = s.part !== v.part || !s.items.some(function (i) { return !i.el.hidden; }); });
    ['p1', 'p2'].forEach(function (k) { var b = v.tabEls[k]; b.lastChild.textContent = per[k]; b.classList.toggle('is-on', k === v.part); b.setAttribute('aria-pressed', k === v.part ? 'true' : 'false'); });
    if (!n) { if (!v.empty) { v.empty = h('div', 'cm-empty', 'Không tìm thấy câu phù hợp.'); } if (!v.empty.parentNode) v.main.appendChild(v.empty); } else if (v.empty && v.empty.parentNode) v.empty.remove();
    return 'Hiện ' + n + ' câu · ' + (v.part === 'p1' ? 'Phần I' : 'Phần II') + ' · ' + f.title;
  }

  /* --- trạng thái 2b: mở văn bản / bài cộng đồng, tìm trong bài --- */
  function unmark(root) { [].slice.call(root.querySelectorAll('mark.ct-hit')).forEach(function (m) { var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); }); }
  function mark(root, phrase) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      var s = tn.nodeValue, st = '', map = [], i, k, x;
      for (i = 0; i < s.length; i++) { x = strip(s.charAt(i)); for (k = 0; k < x.length; k++) { st += x.charAt(k); map.push(i); } }
      var at = st.indexOf(phrase); if (at < 0) return;
      var frag = document.createDocumentFragment(), last = 0;
      while (at > -1) {
        var a = map[at], b = map[at + phrase.length - 1] + 1;
        if (a >= last) { frag.appendChild(document.createTextNode(s.slice(last, a))); var m = document.createElement('mark'); m.className = 'ct-hit'; m.textContent = s.slice(a, b); frag.appendChild(m); last = b; }
        at = st.indexOf(phrase, at + phrase.length);
      }
      frag.appendChild(document.createTextNode(s.slice(last))); tn.parentNode.replaceChild(frag, tn);
    });
  }
  function jump(v, d, first) {
    if (!v.hits.length) return;
    if (v.hits[v.hi]) v.hits[v.hi].classList.remove('cur');
    v.hi = first ? 0 : (v.hi + d + v.hits.length) % v.hits.length;
    var m = v.hits[v.hi]; m.classList.add('cur'); try { m.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    if (v.fc) v.fc.textContent = (v.hi + 1) + '/' + v.hits.length + ' kết quả';
  }
  function findIn(v, toks) {
    if (!v.host) return;
    unmark(v.host); v.hits = []; v.hi = 0;
    if (toks.length) { mark(v.host, toks.join(' ')); v.hits = [].slice.call(v.host.querySelectorAll('mark.ct-hit')); }
    v.cnt = toks.length ? v.hits.length + ' kết quả trong bài' : '';
    if (v.fc) v.fc.textContent = v.cnt || 'Gõ từ khóa để tìm trong bài.';
    jump(v, 0, true);
    var ce = $('count'); if (ce) ce.textContent = v.cnt;
  }
  function buildDoc(v, f) {
    v.built = 'd|' + f.key; v.hits = []; v.hi = 0; v.cnt = ''; v.main.textContent = ''; v.nav.textContent = ''; sideTitle(v, f);
    var fb = h('div', 'az-box'), row = h('div', 'ct-frow'), pv = h('button', 'btn alt', '↑ Trước'), nx = h('button', 'btn alt', '↓ Sau');
    pv.type = nx.type = 'button'; pv.onclick = function () { jump(v, -1); }; nx.onclick = function () { jump(v, 1); };
    v.fc = h('div', 'ct-fc', 'Gõ từ khóa để tìm trong bài.'); fb.appendChild(h('div', 'az-sh', 'TÌM TRONG BÀI')); fb.appendChild(v.fc); row.appendChild(pv); row.appendChild(nx); fb.appendChild(row); v.nav.appendChild(fb);
    var host = v.host = h('div', 'ct-docbox'); v.main.appendChild(host);
    if (f.kind === 'mydoc') {
      host.appendChild(h('h2', 'cm-title', f.title)); var tx = h('div', 'cm-doc ct-txt'); tx.style.marginTop = '12px';
      if (window.SQDoc && SQDoc.isDoc(f.text)) { tx.style.whiteSpace = 'normal'; SQDoc.render(tx, f.text); } else tx.textContent = f.text; host.appendChild(tx); return;
    }
    var r = cm.cache[f.id];
    if (r) { drawReader(host, r, f.id, function (gone) { if (gone) { cm.docs = null; delete cm.cache[f.id]; } goBack(v); }, null, true); return; }
    host.appendChild(h('div', 'cm-empty', 'Đang mở bài…'));
    call('/api/contrib/community-get', { id: f.id }, LS.getItem(K.tok)).then(function (x) {
      if (!v.sel || v.sel.key !== f.key) return;
      if (x.ok) cm.cache[f.id] = x; else { cm.err = x.msg || 'Không mở được bài.'; v.sel = null; }
      v.built = ''; v.render();
    });
  }
  function renderList(mode, query) {
    var v = view(mode), toks = strip(query).split(/\s+/).filter(Boolean), inp = qel(), f = null;
    v.render = function () { var c = renderList(mode, (qel() || {}).value || ''), ce = $('count'); if (ce && c != null) ce.textContent = c; };
    if (v.sel) { f = findFile(v, v.sel); if (!f) v.sel = null; }
    if (!f) { if (inp) inp.placeholder = 'Tìm tên file…'; return renderLib(v, toks); }
    if (f.kind === 'exam') {
      if (inp) inp.placeholder = 'Tìm trong file từ câu 1: nội dung, đáp án, ID…';
      if (v.built !== 'x|' + f.key) buildExam(v, f);
      return applyExam(v, f, toks);
    }
    if (inp) inp.placeholder = 'Tìm trong bài…';
    var fresh = v.built !== 'd|' + f.key; if (fresh) buildDoc(v, f);
    clearTimeout(v.ht);
    if (fresh) findIn(v, toks); else v.ht = setTimeout(function () { findIn(v, toks); }, 160);
    return v.cnt;
  }
  window.SQC = {
    parse: parse, ser: ser, my: my, src: src, inject: inject, modeBar: modeBar, call: call, packs: packs, sync: sync,
    apply: function (mode, q) { return renderList(mode, q); },
    box: function (mode) { return view(mode).box; },
    show: function (mode) { view(mode); renderList(mode, (qel() || {}).value || ''); },
    hide: function () {}
  };

  /* ---------- thông báo khi admin duyệt (mọi trang có nạp file này) ---------- */
  function banner(msg, btn, href, onx) {
    if ($('ctBan')) return;
    var b = h('div', 'ct-ban'); b.id = 'ctBan'; b.appendChild(h('span', '', msg));
    var a = h('a', 'btn', btn); a.href = href; b.appendChild(a);
    var x = h('button', 'btn2', '×'); x.type = 'button'; x.onclick = function () { b.remove(); if (onx) onx(); }; b.appendChild(x);
    document.body.appendChild(b);
  }
  async function notify() {
    var p = LS.getItem(K.pend); if (!p || LS.getItem(K.tok) || /data\.html/.test(location.pathname)) return;
    var r = await call('/api/contrib/status', { pend: p });
    if (r.ok && r.status === 'approved') banner('Admin đã duyệt tài khoản Contributor của bạn. Vé đang chờ bạn nhận.', 'Nhận vé', 'data.html#contrib');
    else if (r.ok && r.status === 'rejected') banner('Yêu cầu Contributor của bạn chưa được duyệt.', 'Xem', 'data.html#contrib');
  }
  if (LS.getItem(K.pend)) window.addEventListener('DOMContentLoaded', function () { setTimeout(notify, 600); });

  /* ---------- giao diện trang Dữ liệu ---------- */
  var TYPES = [['basic', 'Cơ bản'], ['text', 'Văn bản'], ['question', 'Câu hỏi']];
  var TLAB = { basic: 'CƠ BẢN', text: 'VĂN BẢN', question: 'CÂU HỎI' };
  /* Khung tạo PROJECT: tên file, loại tài liệu, nhập dữ liệu. o.wrap là khối bọc (ẩn đến khi bấm Tạo PROJECT). */
  function editor(root, o) {
    var w = h('div', 'ct-ed ct-split'), L = h('div', 'ct-left'), R = h('div', 'ct-right');
    var t = h('input', 'ct-title'), ta = h('textarea', 'ct-ta'), st = h('div', 'ct-st'), row = h('div', 'ct-row'), tr = h('div', 'ct-types'), chips = {}, type = 'basic', acc = { qs: [], p2: [] }, timer = 0;
    var btns = [], doc = window.SQDoc ? SQDoc.editor({ onchange: function () { clearTimeout(rvT); rvT = setTimeout(rv, 350); saveSoon(); } }) : null, rvT = 0, dnote = h('div', 'ct-docnote'), dmount = h('div', 'ct-docmount');
    var view = 'card'; try { view = LS.getItem('sq_edview') === 'code' ? 'code' : 'card'; } catch (e) {}
    var lab3 = h('label', 'ct-lab', 'Nhập dữ liệu'), qadd = h('button', 'btn', 'Thêm vào file'), numBox = h('div', 'ct-setting'), num = h('input'), qclr = h('button', 'btn alt', 'Xóa hết câu'), qclr2 = h('button', 'btn alt ct-clr', 'Xóa sạch đề'), qdup = h('button', 'btn alt ct-dup', 'Quét câu trùng');
    var det = h('details', 'ct-help'), fhead = h('div', 'ct-fh'), fl = h('div', 'ct-fl'), fname = h('span', 'ct-fn'), fsub = h('span', 'ct-fsub'), vm = h('div', 'ct-seg'), vb = {}, bexp = h('button', 'ct-xb'), bcp = h('button', 'ct-cb'), bcpt = h('span', '', 'Sao chép'), bext = h('span', '', 'Xuất file');
    var code = h('textarea', 'ct-pre'), cards = h('div', 'ct-cards'), fbody = h('div', 'ct-fbody'), finfo = h('div', 'ct-st'), hint = h('div', 'ct-hint');
    t.placeholder = 'Tên file (ví dụ: Bài 7 · Chiến tranh lạnh)'; t.maxLength = 80;
    qadd.type = qclr.type = qclr2.type = qdup.type = bexp.type = bcp.type = 'button'; num.type = 'number'; num.min = '1'; num.value = '7'; num.className = 'ct-num'; code.readOnly = true; code.spellcheck = false;
    det.appendChild(h('summary', '', 'Định dạng loại Cơ bản'));
    det.appendChild(h('pre', '', 'ID | Câu hỏi\nA. ...\nB. ...\nC. ...\nD. ...\nĐáp án: B\n\n(mỗi câu cách nhau một dòng trống)\n\nHoặc dán thẳng đề Azota (Câu 1 ID:...)'));
    dnote.innerHTML = 'Loại <b>Văn bản</b> dùng để <b>đăng lên Cộng đồng</b> cho mọi người đọc. Quét chọn chữ trong tờ tài liệu bên phải rồi dùng công cụ ở đây. Chỉ Contributor có tên mới đăng được.';
    if (doc) dmount.appendChild(doc.page);
    hint.textContent = 'Nhấn đúp vào ID, câu hỏi, đáp án hoặc tư liệu để sửa (Enter lưu, Esc hủy). Bấm chữ cái đáp án hoặc nút Đúng/Sai để chọn đáp án đúng. Mọi thay đổi tự lưu.';

    function srcNow() {
      if (type === 'text') return doc ? doc.html() : ta.value;
      var n = acc.qs.length + acc.p2.length;
      return n ? lessonSrc(num.value || '7', t.value.trim() || 'Bài mới', acc.qs, type === 'basic' ? [] : acc.p2) : '';
    }
    function txtNow() { return doc ? doc.html() : ta.value.slice(0, 100000); }
    function hasData() { return type === 'text' ? (doc ? doc.hasContent() : !!ta.value.trim()) : acc.qs.length + acc.p2.length > 0; }
    function save(force) {
      if (!o.autosave || !t.value.trim() || !(force || hasData())) return;
      o.autosave({ type: type, qs: acc.qs.slice(), p2: acc.p2.slice(), text: type === 'text' ? txtNow() : '', pub: api.pub }, t.value.trim(), api);
    }
    function saveSoon() { clearTimeout(timer); timer = setTimeout(save, 500); }
    function chg() { acc.qs.sort(function (a, b) { return Number(a[0]) - Number(b[0]) || 0; }); acc.p2.sort(function (a, b) { return Number(a[0]) - Number(b[0]) || 0; }); save(true); rv(); }

    /* nhấn đúp để sửa ngay tại chỗ */
    function editable(el, get, set, multi) {
      el.classList.add('ct-edt'); el.title = 'Nhấn đúp để sửa';
      el.addEventListener('dblclick', function (ev) {
        ev.stopPropagation(); try { getSelection().removeAllRanges(); } catch (e) {} if (el.querySelector('textarea')) return;
        var old = get(), ie = h('textarea', 'ct-ie'), done = false;
        ie.value = old; ie.rows = Math.max(1, Math.min(10, Math.ceil(old.length / 60) + (old.split('\n').length - 1)));
        el.textContent = ''; el.appendChild(ie); ie.focus(); ie.select();
        function fin(ok) { if (done) return; done = true; var v = ie.value.trim(); if (ok && v && v !== old) { set(v); chg(); } else rv(); }
        ie.addEventListener('blur', function () { fin(true); });
        ie.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.preventDefault(); fin(false); }
          else if (e.key === 'Enter' && (!multi || e.ctrlKey || e.metaKey)) { e.preventDefault(); fin(true); }
        });
      });
    }
    function head(no, r, list) {
      var c = h('div', 'ct-card'), ch = h('div', 'ct-ch'), id = h('span', 'ct-cid', 'ID ' + r[0]), x = h('button', 'ct-cx', '×');
      ch.appendChild(h('span', 'ct-cn', 'Câu ' + no)); ch.appendChild(id); x.type = 'button'; x.title = 'Xóa câu này';
      x.onclick = function () { if (confirm('Xóa câu ID ' + r[0] + '?')) { list.splice(list.indexOf(r), 1); chg(); } };
      ch.appendChild(x); c.appendChild(ch);
      editable(id, function () { return r[0]; }, function (v) { r[0] = v.replace(/\s+/g, '').slice(0, 40); }, false);
      id.textContent = 'ID ' + r[0];
      return c;
    }
    function card1(r, no) {
      var c = head(no, r, acc.qs), q = h('div', 'ct-cq', r[1]);
      editable(q, function () { return r[1]; }, function (v) { r[1] = v; }, false); q.textContent = r[1]; c.appendChild(q);
      r[2].forEach(function (op, i) {
        var L2 = 'ABCDEFGH'[i], on = r[3] === L2, rw = h('div', 'ct-co' + (on ? ' ok' : '')), b = h('span', 'ct-let', on ? '✓' : L2), tx = h('span', 'ct-ot', op);
        b.title = 'Chọn ' + L2 + ' là đáp án đúng'; b.onclick = function () { if (r[3] !== L2) { r[3] = L2; chg(); } };
        editable(tx, function () { return r[2][i]; }, function (v) { r[2][i] = v; }, false); tx.textContent = op;
        rw.appendChild(b); rw.appendChild(tx); c.appendChild(rw);
      });
      extras(c, r[2].length, 8, function () { r[2].push('Đáp án mới'); chg(); }, function () { var k = r[2].length - 1; if (r[3] === 'ABCDEFGH'[k]) r[3] = 'A'; r[2].pop(); chg(); }, 'đáp án',
        function () { return r[4] || ''; }, function (v) { r[4] = v; });
      return c;
    }
    /* khối cuối thẻ: giải thích (nhấn đúp để sửa) + thêm/bớt đáp án hoặc mệnh đề */
    function extras(c, n, max, add, del, what, getE, setE) {
      var ex = getE(), ee = h('div', 'ct-exp' + (ex ? '' : ' is-empty'), ex ? 'Giải thích: ' + ex : '＋ Thêm giải thích cho câu này');
      editable(ee, getE, setE, true); ee.textContent = ex ? 'Giải thích: ' + ex : '＋ Thêm giải thích cho câu này';
      if (!ex) { ee.title = 'Bấm để nhập giải thích'; ee.onclick = function () { ee.dispatchEvent(new MouseEvent('dblclick', { bubbles: false })); }; }
      c.appendChild(ee);
      var cc = h('div', 'ct-cc'), a = h('button', 'ct-mini', '＋ ' + what), d = h('button', 'ct-mini', '− bớt ' + what);
      a.type = d.type = 'button'; a.disabled = n >= max; d.disabled = n <= 2; a.onclick = add; d.onclick = del;
      cc.appendChild(a); cc.appendChild(d); c.appendChild(cc);
    }
    function card2(r, no) {
      var c = head(no, r, acc.p2), tl = h('div', 'ct-ctl', r[1]);
      editable(tl, function () { return r[1]; }, function (v) { r[1] = v; r[3] = r[3] || { block: 'BX_' + r[0] }; r[3].detect = detectOf(v); }, true); tl.textContent = r[1]; c.appendChild(tl);
      r[2].forEach(function (sx, i) {
        var rw = h('div', 'ct-co ct-st2'), b = h('span', 'ct-let', 'abcdefgh'[i]), tx = h('span', 'ct-ot', sx[0]), tf = h('button', 'ct-tf ' + (sx[1] ? 'ok' : 'no'), sx[1] ? 'Đúng' : 'Sai');
        tf.type = 'button'; tf.title = 'Bấm để đổi Đúng/Sai'; tf.onclick = function () { sx[1] = sx[1] ? 0 : 1; chg(); };
        editable(tx, function () { return sx[0]; }, function (v) { sx[0] = v; }, false); tx.textContent = sx[0];
        rw.appendChild(b); rw.appendChild(tx); rw.appendChild(tf); c.appendChild(rw);
      });
      extras(c, r[2].length, 8, function () { r[2].push(['Mệnh đề mới', 0]); chg(); }, function () { r[2].pop(); chg(); }, 'mệnh đề',
        function () { return (r[3] && r[3].exp) || ''; }, function (v) { r[3] = r[3] || { block: 'BX_' + r[0] }; r[3].exp = v; });
      return c;
    }

    /* ---------- Khung THÊM CÂU HỎI (nằm ngay trong bảng bên phải) ---------- */
    var LT = 'ABCDEFGH', qph = h('button', 'ct-card ct-addph'), qform = h('div', 'ct-qf'), qmsg = h('div', 'ct-st');
    var F = { open: false, part: 1, id: '', q: '', n: 4, o: ['', '', '', ''], a: -1, n2: 4, s: [], exp: '' };
    qph.type = 'button'; qform.hidden = true; qph.appendChild(h('span', 'ct-plus', '＋')); var pt = h('span', 'ct-phx'); pt.appendChild(h('b', '', 'Thêm câu hỏi mới')); pt.appendChild(h('small', '', 'Phần I hoặc II · tự đặt ID, số đáp án, đáp án đúng, giải thích')); qph.appendChild(pt);
    qph.onclick = function () { F.open = true; drawForm(); qform.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    for (var si = 0; si < 4; si++) F.s.push({ t: '', v: null });
    function nextId() { var m = 0; acc.qs.concat(acc.p2).forEach(function (r) { var v = Number(r[0]); if (isFinite(v) && v > m) m = v; }); return String(Math.floor(m) + 1); }
    function fmsg(t, bad) { qmsg.textContent = t; qmsg.className = 'ct-st' + (bad ? ' bad' : ''); }
    function fresize(arr, n, mk) { while (arr.length < n) arr.push(mk()); arr.length = n; }
    function stepper(label, get, set) {
      var r = h('div', 'ct-setting'), m = h('button', 'ct-mini', '−'), v = h('b', '', String(get())), p = h('button', 'ct-mini', '+');
      m.type = p.type = 'button'; m.disabled = get() <= 2; p.disabled = get() >= 8;
      m.onclick = function () { set(get() - 1); drawForm(); }; p.onclick = function () { set(get() + 1); drawForm(); };
      r.appendChild(h('span', 'ct-lab', label)); r.appendChild(m); r.appendChild(v); r.appendChild(p); return r;
    }
    function drawForm() {
      qform.textContent = ''; qph.hidden = F.open; qform.hidden = !F.open; if (!F.open) return;
      var p2ok = type === 'question'; if (!p2ok && F.part === 2) F.part = 1;
      var seg = h('div', 'ct-seg');
      [[1, 'PHẦN I · Trắc nghiệm'], [2, 'PHẦN II · Đúng/Sai']].forEach(function (k) {
        var b = h('button', 'bank-chip ct-chip' + (F.part === k[0] ? ' is-on' : ''), k[1]); b.type = 'button';
        if (k[0] === 2 && !p2ok) { b.disabled = true; b.title = 'Phần II chỉ có ở loại Câu hỏi. Hãy đổi loại tài liệu ở cột trái.'; b.style.opacity = '.4'; }
        b.onclick = function () { F.part = k[0]; drawForm(); }; seg.appendChild(b);
      });
      qform.appendChild(seg);
      qform.appendChild(h('label', 'ct-lab', 'ID câu'));
      var idi = h('input', 'ct-qi'); idi.value = F.id; idi.placeholder = 'Để trống = tự đặt ' + nextId(); idi.maxLength = 40; idi.oninput = function () { F.id = idi.value; }; qform.appendChild(idi);
      qform.appendChild(h('label', 'ct-lab', F.part === 1 ? 'Câu hỏi' : 'Tư liệu / đoạn dẫn'));
      var qi = h('textarea', 'ct-qi'); qi.rows = F.part === 1 ? 3 : 4; qi.value = F.q; qi.placeholder = F.part === 1 ? 'Nội dung câu hỏi…' : 'Đoạn tư liệu của câu…'; qi.oninput = function () { F.q = qi.value; }; qform.appendChild(qi);
      if (F.part === 1) {
        qform.appendChild(stepper('Số đáp án (A–' + LT[F.n - 1] + ')', function () { return F.n; }, function (n) { F.n = Math.max(2, Math.min(8, n)); fresize(F.o, F.n, function () { return ''; }); if (F.a >= F.n) F.a = -1; }));
        for (var i = 0; i < F.n; i++) (function (i) {
          var on = F.a === i, rw = h('div', 'ct-co' + (on ? ' ok' : '')), b = h('span', 'ct-let', on ? '✓' : LT[i]), inp = h('input', 'ct-qi');
          b.title = 'Chọn ' + LT[i] + ' là đáp án đúng'; b.onclick = function () { F.a = i; drawForm(); };
          inp.value = F.o[i]; inp.placeholder = 'Đáp án ' + LT[i]; inp.oninput = function () { F.o[i] = inp.value; };
          rw.appendChild(b); rw.appendChild(inp); qform.appendChild(rw);
        })(i);
        qform.appendChild(h('div', 'ct-hint', 'Bấm chữ cái để chọn đáp án đúng.'));
      } else {
        qform.appendChild(stepper('Số mệnh đề (a–' + 'abcdefgh'[F.n2 - 1] + ')', function () { return F.n2; }, function (n) { F.n2 = Math.max(2, Math.min(8, n)); fresize(F.s, F.n2, function () { return { t: '', v: null }; }); }));
        for (var k = 0; k < F.n2; k++) (function (k) {
          var x = F.s[k], rw = h('div', 'ct-co ct-st2'), b = h('span', 'ct-let', 'abcdefgh'[k]), inp = h('input', 'ct-qi'), ty = h('button', 'ct-tf' + (x.v === 1 ? ' ok' : ''), 'Đúng'), fs = h('button', 'ct-tf' + (x.v === 0 ? ' no' : ''), 'Sai');
          ty.type = fs.type = 'button'; ty.onclick = function () { x.v = 1; drawForm(); }; fs.onclick = function () { x.v = 0; drawForm(); };
          inp.value = x.t; inp.placeholder = 'Mệnh đề ' + 'abcdefgh'[k]; inp.oninput = function () { x.t = inp.value; };
          rw.appendChild(b); rw.appendChild(inp); rw.appendChild(ty); rw.appendChild(fs); qform.appendChild(rw);
        })(k);
      }
      qform.appendChild(h('label', 'ct-lab', 'Giải thích (không bắt buộc)'));
      var ei = h('textarea', 'ct-qi'); ei.rows = 2; ei.value = F.exp; ei.placeholder = 'Vì sao đáp án đúng…'; ei.oninput = function () { F.exp = ei.value; }; qform.appendChild(ei);
      var br = h('div', 'ct-row'), ba = h('button', 'btn', 'Thêm câu'), bb = h('button', 'btn alt', 'Thêm câu trống'), bc = h('button', 'btn alt', 'Đóng');
      ba.type = bb.type = bc.type = 'button'; ba.onclick = function () { addQ(false); }; bb.onclick = function () { addQ(true); }; bc.onclick = function () { F.open = false; drawForm(); };
      bb.title = 'Thêm ngay một câu mẫu rồi nhấn đúp vào từng phần để sửa';
      br.appendChild(ba); br.appendChild(bb); br.appendChild(bc); qform.appendChild(br); qform.appendChild(qmsg);
    }
    function addQ(blank) {
      if (!t.value.trim()) return fmsg('Hãy nhập tên file trước khi thêm câu.', 1);
      var id = String(F.id || '').replace(/\s+/g, '').slice(0, 40) || nextId(), list = F.part === 1 ? acc.qs : acc.p2, exp = F.exp.trim(), row;
      if (list.some(function (r) { return r[0] === id; })) return fmsg('ID ' + id + ' đã có trong Phần ' + (F.part === 1 ? 'I' : 'II') + '. Hãy đổi ID khác.', 1);
      if (F.part === 1) {
        var opts = F.o.map(function (x, i) { return blank ? (x.trim() || 'Đáp án ' + LT[i]) : x.trim(); }), q = blank ? (F.q.trim() || 'Câu hỏi mới (nhấn đúp để sửa)') : F.q.trim(), a = F.a;
        if (!blank) {
          if (!q) return fmsg('Chưa nhập nội dung câu hỏi.', 1);
          if (opts.some(function (x) { return !x; })) return fmsg('Còn đáp án để trống.', 1);
          if (a < 0) return fmsg('Hãy bấm chữ cái để chọn đáp án đúng.', 1);
        } else if (a < 0) a = 0;
        row = [id, q, opts, LT[a]]; if (exp) row.push(exp);
      } else {
        var tl = blank ? (F.q.trim() || 'Tư liệu mới (nhấn đúp để sửa)') : F.q.trim(), sts = F.s.map(function (x, i) { return [blank ? (x.t.trim() || 'Mệnh đề ' + 'abcdefgh'[i]) : x.t.trim(), x.v === 1 ? 1 : 0]; });
        if (!blank) {
          if (!tl) return fmsg('Chưa nhập tư liệu.', 1);
          if (F.s.some(function (x) { return !x.t.trim(); })) return fmsg('Còn mệnh đề để trống.', 1);
          if (F.s.some(function (x) { return x.v == null; })) return fmsg('Hãy chọn Đúng/Sai cho mọi mệnh đề.', 1);
        }
        var meta = { block: 'BX_' + id, detect: detectOf(tl) }; if (exp) meta.exp = exp;
        row = [id, tl, sts, meta];
      }
      list.push(row);
      F.id = ''; F.q = ''; F.exp = ''; F.o = F.o.map(function () { return ''; }); F.a = -1; F.s = F.s.map(function () { return { t: '', v: null }; });
      chg(); drawForm(); fmsg('Đã thêm câu ID ' + id + ' vào Phần ' + (F.part === 1 ? 'I' : 'II') + '.');
    }
    function safeName() { return t.value.replace(/[\\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); }
    function fileName() { return type === 'text' ? (safeName() || 'tai-lieu') + (doc ? '.html' : '.txt') : (safeName() || 'lesson' + (num.value || '7')) + '.js'; }
    function rv() {
      var isT = type === 'text', hasDoc = isT && !!doc;
      fname.textContent = fileName();
      fsub.textContent = isT ? (hasDoc ? 'Tài liệu · HTML' : 'Văn bản · TXT') : 'Dữ liệu bài · JS' + (hasData() ? ' · ' + (acc.qs.length + acc.p2.length) + ' câu' : '');
      var showCards = !isT && view === 'card', showDoc = hasDoc && view === 'card';
      vm.hidden = isT && !hasDoc; code.hidden = isT ? showDoc : showCards; cards.hidden = !showCards; hint.hidden = !showCards; dmount.hidden = !showDoc;
      fbody.className = 'ct-fbody' + (showCards ? ' ct-long' : '') + (showDoc ? ' ct-doc' : '');
      vb.card.textContent = hasDoc ? 'Tài liệu' : 'Từng câu';
      ['code', 'card'].forEach(function (k) { vb[k].className = 'bank-chip ct-chip' + (view === k ? ' is-on' : ''); vb[k].setAttribute('aria-pressed', view === k ? 'true' : 'false'); });
      if (!isT || !showDoc) code.value = srcNow();
      finfo.textContent = isT ? (hasDoc ? doc.text().length + ' ký tự · ' + Math.round(srcNow().length / 1024 * 10) / 10 + ' KB' : ta.value.length + ' ký tự') : acc.qs.length + ' câu Phần I' + (type === 'question' ? ' · ' + acc.p2.length + ' câu Phần II' : '');
      cards.textContent = '';
      if (!showCards) return;
      if (!acc.qs.length && !acc.p2.length) { cards.appendChild(h('div', 'bank-empty', 'Chưa có câu nào. Dán đề ở bên trái hoặc bấm vào khung bên dưới để thêm từng câu.')); cards.appendChild(qph); cards.appendChild(qform); return; }
      if (acc.qs.length) { cards.appendChild(h('div', 'ct-sec', 'PHẦN I · ' + acc.qs.length + ' câu')); acc.qs.forEach(function (r, i) { cards.appendChild(card1(r, i + 1)); }); }
      if (acc.p2.length) { cards.appendChild(h('div', 'ct-sec', 'PHẦN II · ' + acc.p2.length + ' câu')); acc.p2.forEach(function (r, i) { cards.appendChild(card2(r, i + 1)); }); }
      cards.appendChild(qph); cards.appendChild(qform);
    }
    function paint() {
      TYPES.forEach(function (x) { var on = x[0] === type; chips[x[0]].className = 'bank-chip ct-chip' + (on ? ' is-on' : ''); chips[x[0]].textContent = (on ? '✓ ' : '') + x[1]; chips[x[0]].setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var hasDoc = type === 'text' && !!doc;
      det.hidden = type !== 'basic'; qadd.hidden = qclr2.hidden = qdup.hidden = numBox.hidden = type === 'text'; if (type === 'text') F.open = false; drawForm();
      lab3.hidden = ta.hidden = hasDoc; if (doc) doc.tool.hidden = !hasDoc; dnote.hidden = !hasDoc;
      btns.forEach(function (x) { x.el.hidden = (!!x.cfg.textOnly && type !== 'text') || (!!x.cfg.basicOnly && hasDoc); });
      lab3.textContent = type === 'text' ? 'Nội dung' : 'Dán đề vào đây';
      ta.style.minHeight = type === 'text' ? '' : '170px';
      ta.placeholder = type === 'text' ? 'Ghi nội dung bất kỳ theo ý bạn: ghi chú, tóm tắt, tư liệu…' : type === 'question' ? 'Dán nguyên đề vào đây (cả Phần I và Phần II, có "Câu 1 ID:..." và "Đáp án đúng: ..."). Web tự tìm ID, câu hỏi, đáp án đúng rồi ghi vào file bài. Dán thêm lần sau thì chỉ thêm câu mới.' : '615416873 | Nội dung câu hỏi?\nA. Đáp án A\nB. Đáp án B\nC. Đáp án C\nD. Đáp án D\nĐáp án: B\n\nCó thể dán nhiều câu cùng lúc, mỗi câu cách nhau một dòng trống. Dán thêm lần sau thì chỉ thêm câu mới.';
      rv();
    }
    function addPaste() {
      if (type === 'text' || !ta.value.trim()) return;
      if (!t.value.trim()) { st.textContent = 'Hãy nhập tên file trước khi dán đề.'; st.className = 'ct-st bad'; return; }
      var res = parseExam(ta.value), note = '';
      if (!res.p1.length && !res.p2.length) { var bs = parse(ta.value); res = { p1: bs.qs, p2: [], err: bs.err }; }
      if (type === 'basic' && res.p2.length) { note = 'Loại Cơ bản chỉ có Phần I, bỏ qua ' + res.p2.length + ' câu Phần II (dùng loại Câu hỏi để lưu cả hai phần).'; res.p2 = []; }
      if (!res.p1.length && !res.p2.length) { st.textContent = res.err.length ? res.err.slice(0, 3).join(' | ') : note || 'Không tìm thấy câu nào. Mỗi câu cần dòng "Câu N ID:..." (hoặc "ID | câu hỏi").'; st.className = 'ct-st bad'; return; }
      var mg = mergeExam(acc, res), m = ['Thêm ' + mg.added + ' câu mới', 'bỏ qua ' + mg.dup + ' câu trùng'];
      if (mg.conf.length) m.push('ID trùng nhưng khác nội dung (đã thêm, hãy kiểm tra): ' + mg.conf.slice(0, 5).join(', '));
      if (res.err.length) m.push(res.err.length + ' câu lỗi bị bỏ qua: ' + res.err.slice(0, 2).join(' | '));
      if (note) m.push(note);
      st.textContent = m.join(' · '); st.className = 'ct-st' + (res.err.length || mg.conf.length ? ' bad' : '');
      ta.value = ''; save(true); rv();
    }
    TYPES.forEach(function (x) {
      var b = h('button', 'bank-chip ct-chip', x[1]); b.type = 'button'; chips[x[0]] = b;
      b.onclick = function () { if (type === x[0]) return; type = x[0]; paint(); };
      tr.appendChild(b);
    });
    [['card', 'Từng câu'], ['code', 'Code']].forEach(function (k) {
      var b = h('button', 'bank-chip ct-chip', k[1]); b.type = 'button'; vb[k[0]] = b;
      b.onclick = function () { view = k[0]; try { LS.setItem('sq_edview', view); } catch (e) {} rv(); };
      vm.appendChild(b);
    });
    ta.addEventListener('input', function () { if (type === 'text' && !doc) { rv(); saveSoon(); } });
    ta.addEventListener('paste', function () { if (type !== 'text') setTimeout(addPaste, 0); });
    qadd.onclick = addPaste;
    num.addEventListener('input', rv); t.addEventListener('input', function () { rv(); saveSoon(); });
    function resetForm() { F.open = false; F.part = 1; F.id = ''; F.q = ''; F.n = 4; F.o = ['', '', '', '']; F.a = -1; F.n2 = 4; F.s = []; F.exp = ''; }
    function wipe(persist) { acc = { qs: [], p2: [] }; ta.value = ''; resetForm(); st.textContent = ''; st.className = 'ct-st'; if (persist) save(true); drawForm(); rv(); }
    qdup.onclick = function () {
      var rem = 0, conf = [];
      [['qs', same1], ['p2', same2]].forEach(function (k) {
        var keep = [];
        acc[k[0]].forEach(function (r) {
          var ex = keep.filter(function (x) { return x[0] === r[0]; });
          if (ex.some(function (x) { return k[1](x, r); })) { rem++; return; }
          if (ex.length) conf.push(r[0]);
          keep.push(r);
        });
        acc[k[0]] = keep;
      });
      var m = [rem ? 'Đã xóa ' + rem + ' câu trùng' : 'Không có câu trùng'];
      if (conf.length) m.push('ID trùng nhưng khác nội dung (giữ nguyên, hãy kiểm tra): ' + conf.slice(0, 8).join(', '));
      st.textContent = m.join(' · '); st.className = 'ct-st' + (conf.length ? ' bad' : '');
      if (rem) { save(true); rv(); }
    };
    qclr.onclick = qclr2.onclick = function () { if (acc.qs.length + acc.p2.length && !confirm('Xóa toàn bộ câu (cả Phần I và Phần II) trong file này?')) return; wipe(true); };
    bcp.onclick = function () { var v = srcNow(); if (!v) return; try { navigator.clipboard.writeText(v).then(function () { bcpt.textContent = 'Đã sao chép'; setTimeout(function () { bcpt.textContent = 'Sao chép'; }, 1200); }); } catch (e) { code.select(); } };
    bexp.onclick = function () { var v = srcNow(); if (!v) { st.textContent = 'File đang trống.'; st.className = 'ct-st bad'; return; } if (type === 'text' && doc) { SQDoc.exportHtml(t.value.trim() || 'Tài liệu', v).then(function (x) { dl(fileName(), x, 'text/html'); }); return; } dl(fileName(), v, type === 'text' ? 'text/plain' : 'text/javascript'); };
    var nl = h('label', 'ct-lab', 'Số bài trong file (ADV_BANK[N])'); numBox.appendChild(nl); numBox.appendChild(num); numBox.appendChild(qclr);
    var api = { id: null, pub: null, open: function () { if (o.wrap) o.wrap.hidden = false; w.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, hide: function () { if (o.wrap) o.wrap.hidden = true; },
      set: function (title, d) { d = d || {}; t.value = title || ''; type = d.type === 'text' ? 'text' : d.type === 'question' ? 'question' : 'basic'; ta.value = type === 'text' && !doc ? (d.text || '') : ''; if (type === 'text' && doc) doc.set(d.text || ''); acc = type === 'text' ? { qs: [], p2: [] } : { qs: (d.qs || []).slice(), p2: type === 'question' ? (d.p2 || []).slice() : [] }; api.id = d.id || null; api.pub = d.pub || null; st.textContent = ''; resetForm(); paint(); },
      clear: function () { clearTimeout(timer); api.set('', null); } };
    (o.buttons || []).forEach(function (b) {
      var x = h('button', 'btn' + (b.alt ? ' alt' : ''), b.label); x.type = 'button'; btns.push({ el: x, cfg: b });
      x.onclick = function () {
        if (b.fn && b.close) return b.fn(api);
        if (!t.value.trim()) return o.msg('Hãy nhập tên file.', 1);
        if (b.textOnly && type !== 'text') return o.msg('Chỉ loại Văn bản mới đăng lên cộng đồng.', 1);
        if (b.basicOnly && type === 'text') return o.msg('Loại Văn bản không gửi cho admin được. Hãy đăng lên cộng đồng, lưu vào MyProject hoặc xuất file.', 1);
        if (b.basicOnly && acc.qs.some(function (r) { return r[2].length !== 4; })) return o.msg('Gửi cho admin hiện chỉ nhận câu có đúng 4 đáp án A–D. Hãy chỉnh các câu có số đáp án khác 4, hoặc lưu vào MyProject.', 1);
        if (type === 'text') { if (!hasData()) return o.msg('Chưa có nội dung.', 1); var tx = txtNow(); if (doc && tx.length > SQDoc.MAX) return o.msg('Tài liệu quá dài (' + Math.round(tx.length / 1000) + 'k ký tự, tối đa ' + SQDoc.MAX / 1000 + 'k). Hãy chia thành nhiều bài.', 1); return b.fn({ type: 'text', qs: [], p2: [], text: tx, pub: api.pub }, t.value.trim(), api); }
        if (!(acc.qs.length + acc.p2.length)) return o.msg('File đang trống. Hãy dán đề trước.', 1);
        b.fn({ type: type, qs: acc.qs.slice(), p2: type === 'question' ? acc.p2.slice() : [], text: '' }, t.value.trim(), api);
      };
      row.appendChild(x);
    });
    L.appendChild(h('label', 'ct-lab', 'Tên file')); L.appendChild(t);
    L.appendChild(h('label', 'ct-lab', 'Loại tài liệu')); L.appendChild(tr);
    L.appendChild(dnote); if (doc) L.appendChild(doc.tool); L.appendChild(lab3); L.appendChild(det); L.appendChild(ta); L.appendChild(qadd); L.appendChild(qclr2); L.appendChild(qdup); L.appendChild(st); L.appendChild(numBox); L.appendChild(row);
    bcp.type = bexp.type = 'button'; bcp.title = 'Sao chép nội dung file'; bexp.title = 'Tải file về máy';
    bcp.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>'; bcp.appendChild(bcpt);
    bexp.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>'; bexp.appendChild(bext);
    var ficon = h('span', 'ct-ficon'); ficon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
    var ftx = h('div', 'ct-ftx'); ftx.appendChild(fname); ftx.appendChild(fsub); fl.appendChild(ficon); fl.appendChild(ftx);
    fhead.appendChild(fl); fhead.appendChild(vm); fhead.appendChild(bcp); fhead.appendChild(bexp);
    fbody.appendChild(dmount); fbody.appendChild(code); fbody.appendChild(cards);
    R.appendChild(fhead); R.appendChild(hint); R.appendChild(fbody); R.appendChild(finfo);
    w.appendChild(L); w.appendChild(R); root.appendChild(w);
    paint(); return api;
  }
  function dl(name, text, mime) { var a = h('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  async function submit(id, t, qs, p2, say) {
    p2 = p2 || [];
    var tok = LS.getItem(K.tok); if (!tok) return say('Cần đăng nhập Contributor để gửi cho admin (tab CONTRIBUTOR).', 1);
    var r = await call('/api/contrib/submit', { id: id, title: t, questions: qs, part2: p2 }, tok);
    if (r.ok && p2.length && r.p2 !== p2.length) say('Máy chủ chưa cập nhật để nhận Phần II, nên chỉ Phần I được gửi. Hãy deploy lại Worker rồi gửi lại.', 1);
    else if (r.ok) say('Đã gửi ' + (r.p1 != null ? r.p1 + ' câu Phần I' + (r.p2 ? ' + ' + r.p2 + ' câu Phần II' : '') : r.count + ' câu') + ' cho admin. Chờ duyệt.'); else { if (/đăng nhập/.test(r.msg || '')) { LS.removeItem(K.tok); } say(r.msg || 'Gửi thất bại.', 1); }
    if (window.SQC_refresh) window.SQC_refresh();
    return !!r.ok;
  }
  /* ---------- Cộng đồng: đăng / đọc tài liệu văn bản ---------- */
  var fdate = function (t) { return new Date(t).toLocaleDateString('vi-VN'); };
  var NEED_NAME = 'Cần có tên Contributor mới đăng được lên cộng đồng. Vào Dữ liệu › CONTRIBUTOR, nhập tên và đăng ký, admin duyệt xong là đăng được.';
  async function publishDoc(d, title, e, say, after) {
    var tok = LS.getItem(K.tok);
    if (!tok) return say(NEED_NAME, 1);
    if (!window.SQDoc) return say('Thiếu js/sqdoc.js trên trang này.', 1);
    if (!d.text || !SQDoc.isDoc(d.text)) return say('Hãy soạn nội dung trong tờ tài liệu rồi mới đăng.', 1);
    var r = await call('/api/contrib/community-publish', { id: e.pub || null, title: title, html: d.text }, tok);
    if (r.ok) { e.pub = r.id; say(r.updated ? 'Đã cập nhật bài trên cộng đồng.' : 'Đã đăng lên cộng đồng với tên «' + (LS.getItem(K.name) || '') + '».'); if (after) after(r); if (window.SQC_refreshCm) window.SQC_refreshCm(); }
    else { if (/đăng nhập/i.test(r.msg || '')) LS.removeItem(K.tok); say(r.msg || 'Đăng thất bại.', 1); }
  }
  /* Cộng đồng nằm trong LOOKUP › CONTRIBUTOR › COMMUNITY (xem renderList) */
  function drawReader(host, r, id, back, say, nobk) {
    host.textContent = '';
    var d = r.doc, tok = LS.getItem(K.tok), bar = h('div', 'cm-bar'), bk = h('button', 'btn alt', '← Back'); bk.type = 'button'; bk.onclick = back; if (!nobk) bar.appendChild(bk);
    function act(l, f) { var b = h('button', 'btn alt', l); b.type = 'button'; b.onclick = function () { f(b); }; bar.appendChild(b); }
    act('Sao chép link', function (b) { var u = location.origin + location.pathname.replace(/[^\/]*$/, '') + 'lookup.html#community-' + id; navigator.clipboard.writeText(u).then(function () { b.textContent = 'Đã sao chép'; setTimeout(function () { b.textContent = 'Sao chép link'; }, 1200); }, function () { prompt('Sao chép thủ công:', u); }); });
    act('Lưu vào MyProject', function (b) { my.put(null, { title: (d.title + ' · ' + d.author).slice(0, 80), type: 'text', text: d.html }); b.textContent = 'Đã lưu bản sao'; setTimeout(function () { b.textContent = 'Lưu vào MyProject'; }, 1500); });
    act('Xuất file', function () { SQDoc.exportHtml(d.title, d.html).then(function (x) { dl((d.title.replace(/[\\\/:*?"<>|]+/g, '').trim() || 'tai-lieu') + '.html', x, 'text/html'); }); });
    if (r.mine) act('Gỡ bài của tôi', async function () { if (!confirm('Gỡ bài «' + d.title + '» khỏi cộng đồng? Không thể hoàn tác.')) return; var x = await call('/api/contrib/community-delete', { id: id }, tok); if (x.ok) back(true); else alert(x.msg || 'Không gỡ được.'); });
    host.appendChild(bar); host.appendChild(h('h2', 'cm-title', d.title));
    var mt = h('div', 'cm-meta'); mt.appendChild(document.createTextNode('Tác giả ')); mt.appendChild(h('b', '', d.author)); mt.appendChild(document.createTextNode(' · đăng ' + fdate(d.created) + (d.at !== d.created ? ' · sửa ' + fdate(d.at) : ''))); host.appendChild(mt);
    if (r.mine) host.appendChild(h('div', 'd-sub', 'Đây là bài của bạn. Muốn sửa, vào Dữ liệu › CONTRIBUTOR › Tài liệu đã đăng lên cộng đồng.'));
    var dh = h('div', 'cm-doc'); dh.style.marginTop = '12px'; host.appendChild(dh);
    if (window.SQDoc) SQDoc.render(dh, d.html); else dh.appendChild(h('div', 'cm-empty', 'Thiếu js/sqdoc.js trên trang này.'));
  }
  function loadCm(v) {
    if (cm.loading) return; cm.loading = true;
    call('/api/contrib/community').then(function (r) { cm.loading = false; cm.docs = r.ok ? r.docs : []; cm.err = r.ok ? '' : (r.msg || 'Không tải được danh sách.'); if (v.render) v.render(); });
  }
  var CTABS = [['all', 'ALL'], ['exams', 'EXAMS'], ['community', 'COMMUNITY'], ['exercises', 'EXERCISES']];
  function ctab() { var t = ''; try { t = sessionStorage.getItem('sq_ctab'); } catch (e) {} return CTABS.some(function (x) { return x[0] === t; }) ? t : 'all'; }
  function mountMy(root) {
    root.textContent = '';
    var box = h('section', 'glass d-box'); box.appendChild(h('h3', '', 'MyProject · lưu ngay trong trình duyệt'));
    box.appendChild(h('p', 'd-sub', 'Project ở đây không gửi lên máy chủ (riêng loại Văn bản có thể đăng lên Cộng đồng nếu bạn là Contributor). Chọn chế độ MYPROJECT ở trang Nhập bài (loại Cơ bản và Câu hỏi) hoặc Tra cứu (loại Cơ bản) để dùng. Xóa dữ liệu trình duyệt là mất, nên hãy xuất JSON để sao lưu.'));
    var msg = h('div', 'ct-msg'); function say(t, bad) { msg.textContent = t; msg.className = 'ct-msg' + (bad ? ' bad' : ''); }
    var list = h('div', 'ct-sets'), eb = h('section', 'glass d-box'); eb.hidden = true; eb.appendChild(h('h3', '', 'Tạo PROJECT'));
    var ed = editor(eb, { msg: say, wrap: eb, autosave: function (d, t, e) { e.id = my.put(e.id, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: d.pub }); draw(); }, buttons: [
      { label: 'Lưu vào MyProject', fn: function (d, t, e) { e.id = my.put(e.id, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: d.pub }); say('Đã lưu.'); draw(); } },
      { label: 'Đăng lên cộng đồng', textOnly: 1, fn: function (d, t, e) { publishDoc(d, t, e, say, function () { e.id = my.put(e.id, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: e.pub }); draw(); }); } },
      { label: 'Gửi cho admin', alt: 1, basicOnly: 1, fn: function (d, t) { submit(null, t, d.qs, d.p2, say); } },
      { label: 'Đóng', alt: 1, close: 1, fn: function (e) { e.hide(); } }
    ] });
    var create = h('button', 'btn', '＋ Tạo PROJECT'); create.type = 'button'; create.onclick = function () { ed.clear(); ed.open(); };
    function draw() {
      list.textContent = ''; var L = my.all();
      if (!L.length) list.appendChild(h('div', 'd-sub', 'Chưa có project nào.'));
      L.forEach(function (p) {
        var r = h('div', 'ct-set'), bs = isBasic(p); r.appendChild(h('b', '', p.title)); r.appendChild(h('span', 'ct-tag', TLAB[p.type || 'basic'])); r.appendChild(h('span', 'd-sub', bs ? (p.type === 'question' ? p.qs.length + ' câu Phần I · ' + (p.p2 || []).length + ' câu Phần II' : p.qs.length + ' câu') : (window.SQDoc ? SQDoc.toText(p.text || '').length : (p.text || '').length) + ' ký tự'));
        if (p.pub) r.appendChild(h('span', 'ct-tag approved', 'ĐÃ ĐĂNG CỘNG ĐỒNG'));
        [['Sửa', function () { ed.set(p.title, { type: p.type, qs: p.qs, p2: p.p2, text: p.text, id: p.id, pub: p.pub }); ed.open(); }], ['Xuất JSON', function () { dl(p.title + '.json', JSON.stringify({ title: p.title, type: p.type || 'basic', questions: p.qs, part2: p.p2 || [], text: p.text })); }], ['Xóa', function () { if (confirm('Xóa project "' + p.title + '"?')) { my.del(p.id); draw(); } }]].forEach(function (a) { var b = h('button', 'btn alt', a[0]); b.type = 'button'; b.onclick = a[1]; r.appendChild(b); });
        list.appendChild(r);
      });
    }
    var imp = h('input'); imp.type = 'file'; imp.accept = '.json,application/json'; imp.hidden = true;
    imp.onchange = function () { var f = imp.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { try { var d = JSON.parse(fr.result), arr = Array.isArray(d) ? d : [d], n = 0; arr.forEach(function (x) { if (!x || !x.title) return; if (x.type === 'text' && typeof x.text === 'string') { my.put(null, { title: String(x.title).slice(0, 80), type: 'text', text: x.text.slice(0, 200000) }); n++; } else if ((Array.isArray(x.questions) && x.questions.length) || (Array.isArray(x.part2) && x.part2.length)) { my.put(null, { title: String(x.title).slice(0, 80), type: x.type === 'question' ? 'question' : 'basic', qs: x.questions || [], p2: x.part2 || [] }); n++; } }); say('Đã nhập ' + n + ' project.'); draw(); } catch (e) { say('File JSON không hợp lệ.', 1); } }; fr.readAsText(f); imp.value = ''; };
    var tools = h('div', 'ct-row'), bi = h('button', 'btn alt', 'Nhập JSON'), be = h('button', 'btn alt', 'Xuất tất cả'); bi.type = be.type = 'button';
    bi.onclick = function () { imp.click(); }; be.onclick = function () { dl('myproject.json', JSON.stringify(my.all().map(function (p) { return { title: p.title, type: p.type || 'basic', questions: p.qs, part2: p.p2 || [], text: p.text }; }))); };
    tools.appendChild(create); tools.appendChild(bi); tools.appendChild(be); tools.appendChild(imp);
    box.appendChild(tools); box.appendChild(list); root.appendChild(box); root.appendChild(eb); root.appendChild(msg); draw();
  }
  function mountContrib(root) {
    root.textContent = '';
    var tok = LS.getItem(K.tok), pend = LS.getItem(K.pend), box = h('section', 'glass d-box'), msg = h('div', 'ct-msg');
    function say(t, bad) { msg.textContent = t; msg.className = 'ct-msg' + (bad ? ' bad' : ''); }
    function again() { mountContrib(root); }
    window.SQC_refresh = null; window.SQC_refreshCm = null;
    if (tok) {
      box.appendChild(h('h3', '', 'Contributor · ' + (LS.getItem(K.name) || '')));
      box.appendChild(h('p', 'd-sub', 'Tạo PROJECT rồi gửi cho admin. Khi được duyệt, project xuất hiện ở chế độ CONTRIBUTOR cho mọi người dùng, kể cả gói BASIC. Gửi admin hiện chỉ nhận loại Cơ bản; loại Câu hỏi lưu vào MyProject và tải file lesson. Loại Văn bản thì đăng thẳng lên Cộng đồng (LOOKUP › CONTRIBUTOR › COMMUNITY) bằng tên Contributor của bạn.'));
      var myId = null, eb = h('section', 'glass d-box'); eb.hidden = true; eb.appendChild(h('h3', '', 'Tạo PROJECT'));
      var ed = editor(eb, { msg: say, wrap: eb, autosave: function (d, t) { myId = my.put(myId, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: d.pub }); }, buttons: [
        { label: 'Đăng lên cộng đồng', textOnly: 1, fn: function (d, t, e) { publishDoc(d, t, e, say, function () { myId = my.put(myId, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: e.pub }); }); } },
        { label: 'Gửi cho admin', basicOnly: 1, fn: function (d, t, e) { submit(null, t, d.qs, d.p2, say).then(function (ok) { if (!ok) return; myId = null; e.clear(); e.hide(); }); } },
        { label: 'Lưu vào MyProject', alt: 1, fn: function (d, t, e) { myId = my.put(myId, { title: t, type: d.type, qs: d.qs, p2: d.p2, text: d.text, pub: d.pub }); say('Đã lưu vào MyProject.'); } },
        { label: 'Đóng', alt: 1, close: 1, fn: function (e) { e.hide(); } }
      ] });
      var row = h('div', 'ct-row'), create = h('button', 'btn', '＋ Tạo PROJECT'); create.type = 'button'; create.onclick = function () { myId = null; ed.clear(); ed.open(); };
      var out = h('button', 'btn alt', 'Đăng xuất'); out.type = 'button'; out.onclick = async function () { await call('/api/contrib/logout', {}, tok); LS.removeItem(K.tok); again(); };
      row.appendChild(create); row.appendChild(out); box.appendChild(row);
      root.appendChild(box); root.appendChild(eb);
      var ls = h('section', 'glass d-box'); ls.appendChild(h('h3', '', 'Project đã gửi')); var body = h('div', 'ct-sets'); ls.appendChild(body); root.appendChild(ls);
      var cs = h('section', 'glass d-box'); cs.appendChild(h('h3', '', 'Tài liệu đã đăng lên cộng đồng')); var cbody = h('div', 'ct-sets'); cs.appendChild(cbody); root.appendChild(cs); root.appendChild(msg);
      window.SQC_refreshCm = async function () {
        var r = await call('/api/contrib/community-mine', {}, tok); cbody.textContent = '';
        if (!r.ok) { cbody.appendChild(h('div', 'd-sub', r.msg || 'Không tải được.')); return; }
        if (!r.docs.length) cbody.appendChild(h('div', 'd-sub', 'Chưa đăng bài nào. Tạo PROJECT loại Văn bản rồi bấm Đăng lên cộng đồng.'));
        r.docs.forEach(function (x) {
          var row = h('div', 'ct-set'); row.appendChild(h('b', '', x.title)); row.appendChild(h('span', 'd-sub', fdate(x.at) + ' · ' + Math.max(1, Math.round(x.size / 1024)) + ' KB'));
          var eb2 = h('button', 'btn alt', 'Sửa'), db = h('button', 'btn alt danger', 'Gỡ'); eb2.type = db.type = 'button';
          eb2.onclick = async function () { var g = await call('/api/contrib/community-get', { id: x.id }, tok); if (!g.ok) return say(g.msg || 'Không mở được bài.', 1); myId = null; ed.set(g.doc.title, { type: 'text', text: g.doc.html, pub: x.id }); ed.open(); };
          db.onclick = async function () { if (!confirm('Gỡ bài «' + x.title + '» khỏi cộng đồng?')) return; var d = await call('/api/contrib/community-delete', { id: x.id }, tok); if (d.ok) { say('Đã gỡ bài.'); window.SQC_refreshCm(); } else say(d.msg || 'Không gỡ được.', 1); };
          row.appendChild(eb2); row.appendChild(db); cbody.appendChild(row);
        });
      };
      window.SQC_refresh = async function () {
        var r = await call('/api/contrib/mine', {}, tok); body.textContent = '';
        if (!r.ok) { if (/đăng nhập/i.test(r.msg || '')) { LS.removeItem(K.tok); again(); } else body.appendChild(h('div', 'd-sub', r.msg)); return; }
        if (!r.subs.length) body.appendChild(h('div', 'd-sub', 'Chưa gửi project nào.'));
        r.subs.forEach(function (s) {
          var row = h('div', 'ct-set'); row.appendChild(h('b', '', s.title)); row.appendChild(h('span', 'd-sub', s.questions.length + ' câu' + ((s.part2 || []).length ? ' Phần I · ' + s.part2.length + ' câu Phần II' : '')));
          row.appendChild(h('span', 'ct-tag ' + s.status, { pending: 'CHỜ DUYỆT', approved: 'ĐÃ DUYỆT', rejected: 'BỊ TỪ CHỐI' }[s.status] || s.status));
          if (s.note) row.appendChild(h('span', 'd-sub', 'Ghi chú admin: ' + s.note));
          if (s.status !== 'approved') { var b = h('button', 'btn alt', 'Sửa'); b.type = 'button'; b.onclick = function () { ed.set(s.title, { type: (s.part2 || []).length ? 'question' : 'basic', qs: s.questions, p2: s.part2 || [], id: s.id }); ed.open(); }; row.appendChild(b); }
          body.appendChild(row);
        });
      };
      window.SQC_refresh(); window.SQC_refreshCm(); return;
    }
    box.appendChild(h('h3', '', 'Tài khoản Contributor'));
    if (!pend) {
      box.appendChild(h('p', 'd-sub', 'Chỉ cần nhập tên và đăng ký. Admin duyệt xong bạn sẽ nhận thông báo kèm vé để mở gói Contributor, sau đó có nút Tạo PROJECT.'));
      var n = h('input', 'ct-title'); n.placeholder = 'Tên Contributor'; n.maxLength = 30; var go = h('button', 'btn', 'Đăng ký'); go.type = 'button';
      go.onclick = async function () { var r = await call('/api/contrib/register', { name: n.value }); if (r.ok) { LS.setItem(K.pend, r.pend); LS.setItem(K.name, r.name); again(); } else say(r.msg, 1); };
      box.appendChild(n); box.appendChild(go);
    } else {
      var st = h('div', 'd-sub', 'Đang kiểm tra…'); box.appendChild(st);
      var poll = async function () {
        var r = await call('/api/contrib/status', { pend: pend });
        if (!r.ok) { if (r.msg && /Không tìm thấy/.test(r.msg)) { LS.removeItem(K.pend); again(); } else st.textContent = r.msg; return; }
        if (r.status === 'pending') { st.textContent = 'Đã gửi đăng ký «' + r.name + '». Đang chờ admin duyệt…'; clearTimeout(window.SQC_t); window.SQC_t = setTimeout(function () { if (document.body.contains(st)) poll(); }, 10000); }
        else if (r.status === 'rejected') { st.textContent = 'Đăng ký «' + r.name + '» chưa được duyệt.'; var rb = h('button', 'btn', 'Đăng ký lại'); rb.type = 'button'; rb.onclick = function () { LS.removeItem(K.pend); again(); }; box.appendChild(rb); }
        else if (r.ticket) {
          st.textContent = 'Admin đã duyệt «' + r.name + '». Đây là vé Contributor của bạn:';
          var code = h('code', 'ct-ticket', r.ticket), cl = h('button', 'btn', 'Nhận gói Contributor'); cl.type = 'button';
          cl.onclick = async function () { var c = await call('/api/contrib/claim', { ticket: r.ticket }); if (c.ok) { LS.setItem(K.tok, c.token); LS.setItem(K.name, c.name); LS.removeItem(K.pend); again(); } else say(c.msg, 1); };
          box.appendChild(code); box.appendChild(cl);
        } else { st.textContent = '«' + r.name + '» đã được duyệt và vé đã dùng ở nơi khác. Hãy nhập lại vé bên dưới hoặc nhờ admin cấp lại.'; }
      };
      poll();
    }
    var tb = h('div', 'ct-tk'); tb.appendChild(h('div', 'd-sub', 'Đã có vé hoặc mã kích hoạt Contributor? Nhập vào đây:'));
    var ti = h('input', 'ct-title'); ti.placeholder = 'CTB-XXXX-XXXX-XXXX'; var tg = h('button', 'btn alt', 'Kích hoạt'); tg.type = 'button';
    tg.onclick = async function () { var c = await call('/api/contrib/claim', { ticket: ti.value }); if (c.ok) { LS.setItem(K.tok, c.token); LS.setItem(K.name, c.name); LS.removeItem(K.pend); again(); } else say(c.msg, 1); };
    tb.appendChild(ti); tb.appendChild(tg); box.appendChild(tb); root.appendChild(box); root.appendChild(msg);
  }
  window.SQC.parseExam = parseExam; window.SQC.mergeExam = mergeExam; window.SQC.lessonSrc = lessonSrc; window.SQC.mountMy = mountMy; window.SQC.mountContrib = mountContrib;
})();
