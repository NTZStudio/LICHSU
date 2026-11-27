/* EXERCISES (trang Tra cứu): làm đề từ Contributor (đã duyệt) + MyProject (kể cả đề chưa đăng). Kiểu Azota.
   Luồng: danh sách file -> cài đặt đề -> làm bài (Làm đề / Đơn lẻ) -> kết quả + xem lại. Lưu cài đặt gần nhất + lịch sử trong localStorage. */
(function () {
  var LS = localStorage, LET = 'ABCDEFGH', SL = 'abcdefgh';
  function h(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function jget(k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var strip = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
  var CFG = 'sq_ex_cfg', HIS = 'sq_ex_his';
  var DEF = { p1: 1, p2: 1, n1: 0, n2: 0, mode: 'exam', shuf: 0, shufo: 0, time: 0, mins: 0, clock: 1, exp: 1, rev: 1 };
  var root = h('div', 'ex-root'), tab = 'my', q = '', st = null;
  var isBasic = function (p) { var t = p.type || 'basic'; return t === 'basic' || t === 'question'; };
  function files() {
    var C = window.SQC; if (!C) return [];
    if (tab === 'contrib') return (C.packs() || []).map(function (p) { return { key: 'c' + p.id, title: p.name, qs: p.questions || [], p2: p.part2 || [], tag: 'CONTRIBUTOR' }; });
    return C.my.all().filter(isBasic).map(function (p) { return { key: 'm' + p.id, title: p.title, qs: p.qs || [], p2: p.p2 || [], tag: p.pub ? 'ĐÃ ĐĂNG' : 'CHƯA ĐĂNG' }; });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function clk(s) { s = Math.max(0, Math.round(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function stop() { if (st && st.tm) clearInterval(st.tm); }

  /* ---------- 1. danh sách ---------- */
  var scr = '';
  function drawList() {
    scr = 'list'; stop(); st = null; root.textContent = '';
    var box = h('section', 'glass d-box'); box.appendChild(h('h3', '', 'EXERCISES · làm đề'));
    box.appendChild(h('p', 'd-sub', 'Chọn một file đề rồi cài đặt: bật/tắt Phần I, Phần II, số câu, chế độ làm bài và thời gian. MYPROJECT gồm cả đề bạn chưa đăng.'));
    var tg = h('div', 'ct-modes');
    [['my', 'MYPROJECT'], ['contrib', 'CONTRIBUTOR']].forEach(function (t) {
      var b = h('button', 'bank-chip ct-chip' + (tab === t[0] ? ' is-on' : ''), t[1]); b.type = 'button'; b.onclick = function () { tab = t[0]; drawList(); }; tg.appendChild(b);
    });
    box.appendChild(tg);
    var s = h('input', 'bank-search'); s.type = 'search'; s.placeholder = 'Tìm tên file đề…'; s.value = q; s.style.marginTop = '10px'; box.appendChild(s);
    var grid = h('div', 'ex-files'); box.appendChild(grid); root.appendChild(box);
    function paint() {
      grid.textContent = ''; var t = strip(q).split(/\s+/).filter(Boolean), L = files().filter(function (f) { var k = strip(f.title); return t.every(function (x) { return k.indexOf(x) > -1; }); });
      if (!L.length) grid.appendChild(h('div', 'cm-empty', tab === 'my' ? 'Chưa có đề nào trong MyProject. Tạo ở Dữ liệu › MYPROJECT.' : 'Chưa có bộ đề Contributor nào.'));
      L.forEach(function (f) {
        var c = h('button', 'ct-file'); c.type = 'button'; c.appendChild(h('span', 'ct-ftag', f.tag)); c.appendChild(h('h4', '', f.title));
        var m = []; if (f.qs.length) m.push(f.qs.length + ' câu Phần I'); if (f.p2.length) m.push(f.p2.length + ' câu Phần II'); if (!m.length) m.push('Trống');
        c.appendChild(h('div', 'ct-fm', m.join(' · '))); var hs = jget(HIS, {})[f.key]; if (hs) c.appendChild(h('div', 'ct-fs', 'Gần nhất: ' + hs.sc + '/10 · ' + new Date(hs.at).toLocaleDateString('vi-VN')));
        c.onclick = function () { if (!f.qs.length && !f.p2.length) return; drawSetup(f); }; grid.appendChild(c);
      });
    }
    s.oninput = function () { q = s.value; paint(); }; paint();
  }

  /* ---------- 2. cài đặt ---------- */
  function drawSetup(f) {
    scr = 'set'; stop(); root.textContent = ''; var c = Object.assign({}, DEF, jget(CFG, {}));
    if (!f.qs.length) c.p1 = 0; if (!f.p2.length) c.p2 = 0;
    c.n1 = Math.min(c.n1 || f.qs.length, f.qs.length); c.n2 = Math.min(c.n2 || f.p2.length, f.p2.length);
    var box = h('section', 'glass d-box ex-set'), bk = h('button', 'az-back', '← Quay lại danh sách'); bk.type = 'button'; bk.onclick = drawList; box.appendChild(bk);
    box.appendChild(h('h3', '', f.title)); box.appendChild(h('div', 'd-sub', f.qs.length + ' câu Phần I · ' + f.p2.length + ' câu Phần II'));
    function row(lab, node, note) { var r = h('div', 'ex-row'); r.appendChild(h('span', 'ex-lab', lab)); r.appendChild(node); if (note) r.appendChild(h('small', '', note)); box.appendChild(r); return r; }
    function chk(k, lab, on) { var l = h('label', 'ex-chk'), i = h('input'); i.type = 'checkbox'; i.checked = !!c[k]; i.onchange = function () { c[k] = i.checked ? 1 : 0; if (on) on(); }; l.appendChild(i); l.appendChild(h('span', '', lab)); return l; }
    function num(k, max, dis) { var i = h('input', 'ex-num'); i.type = 'number'; i.min = 1; i.max = max; i.value = c[k]; i.disabled = !!dis; i.onchange = function () { var v = Math.max(1, Math.min(max, parseInt(i.value, 10) || max)); c[k] = v; i.value = v; }; return i; }
    function part(k, nk, lab, total) {
      if (!total) return; var w = h('div', 'ex-inl'), n = num(nk, total, !c[k]); w.appendChild(chk(k, lab, function () { n.disabled = !c[k]; })); w.appendChild(h('span', 'ex-x', 'số câu')); w.appendChild(n); w.appendChild(h('span', 'ex-x', '/ ' + total)); row('', w);
    }
    part('p1', 'n1', 'Phần I', f.qs.length); part('p2', 'n2', 'Phần II', f.p2.length);
    var md = h('div', 'ex-seg'); [['exam', 'Làm đề (cả đề, nộp bài)'], ['single', 'Đơn lẻ (từng câu, có đáp án ngay)']].forEach(function (m) {
      var b = h('button', 'bank-chip ct-chip' + (c.mode === m[0] ? ' is-on' : ''), m[1]); b.type = 'button'; b.onclick = function () { c.mode = m[0]; [].forEach.call(md.children, function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on'); }; md.appendChild(b);
    }); row('Chế độ', md);
    var o = h('div', 'ex-inl'); o.appendChild(chk('shuf', 'Xáo thứ tự câu (cũng dùng để bốc ngẫu nhiên khi chọn ít câu)')); o.appendChild(chk('shufo', 'Xáo thứ tự đáp án')); row('Thứ tự', o);
    var tw = h('div', 'ex-inl'), mi = h('input', 'ex-num'); mi.type = 'number'; mi.min = 1; mi.max = 300; mi.value = c.mins || Math.max(5, Math.round(((c.p1 ? c.n1 : 0) * 0.75 + (c.p2 ? c.n2 : 0) * 2) / 5) * 5); mi.disabled = !c.time;
    mi.onchange = function () { c.mins = Math.max(1, Math.min(300, parseInt(mi.value, 10) || 45)); mi.value = c.mins; };
    tw.appendChild(chk('time', 'Giới hạn thời gian (đếm ngược, hết giờ tự nộp)', function () { mi.disabled = !c.time; })); tw.appendChild(mi); tw.appendChild(h('span', 'ex-x', 'phút')); tw.appendChild(chk('clock', 'Hiện đồng hồ')); row('Thời gian', tw);
    var sh = h('div', 'ex-inl'); sh.appendChild(chk('exp', 'Hiện giải thích khi xem đáp án')); sh.appendChild(chk('rev', 'Cho xem lại bài sau khi nộp')); row('Hiển thị', sh);
    box.appendChild(h('small', 'd-sub', 'Điểm: Phần I mỗi câu 0,25 · Phần II mỗi câu tối đa 1 (đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1). Quy về thang 10.'));
    var go = h('button', 'btn', 'Bắt đầu làm bài'); go.type = 'button'; go.style.marginTop = '14px';
    go.onclick = function () {
      if (!c.p1 && !c.p2) { alert('Hãy bật ít nhất một phần.'); return; }
      if (!c.mins) c.mins = parseInt(mi.value, 10) || 45; jset(CFG, c); start(f, c);
    };
    box.appendChild(go); root.appendChild(box);
  }

  /* ---------- 3. làm bài ---------- */
  function build(f, c) {
    var items = [];
    [['p1', f.qs, c.n1], ['p2', f.p2, c.n2]].forEach(function (P) {
      if (!c[P[0]]) return; var rows = P[1].slice(); if (c.shuf) rows = shuffle(rows); rows = rows.slice(0, P[2] || rows.length);
      rows.forEach(function (r) {
        var it = { part: P[0], r: r, ans: P[0] === 'p1' ? null : {}, done: false };
        if (P[0] === 'p1') { var idx = r[2].map(function (_, i) { return i; }); it.ord = c.shufo ? shuffle(idx) : idx; it.ok = LET.indexOf(r[3]); }
        else { var ix = r[2].map(function (_, i) { return i; }); it.ord = c.shufo ? shuffle(ix) : ix; }
        items.push(it);
      });
    });
    return items;
  }
  function score(it) {
    if (it.part === 'p1') return it.ans === it.ok ? 0.25 : 0;
    var n = 0; it.r[2].forEach(function (s, i) { if (it.ans[i] === !!s[1]) n++; }); return [0, 0.1, 0.25, 0.5, 1][Math.min(n, 4)] || 0;
  }
  function maxS(it) { return it.part === 'p1' ? 0.25 : 1; }
  function expOf(it) { return it.part === 'p1' ? it.r[4] : it.r[3] && it.r[3].exp; }
  function start(f, c) {
    stop(); st = { f: f, c: c, items: build(f, c), cur: 0, part: c.p1 ? 'p1' : 'p2', t0: Date.now(), left: c.time ? c.mins * 60 : 0, fin: false };
    if (!st.items.length) { alert('Đề không có câu nào.'); return drawSetup(f); }
    st.part = st.items[0].part; run();
    st.tm = setInterval(tick, 1000);
  }
  function tick() {
    if (!st || st.fin) return; var el = Math.round((Date.now() - st.t0) / 1000), d = st.c.time ? st.c.mins * 60 - el : el;
    if (st.c.time && d <= 0) { finish(true); return; } var e = document.getElementById('exClk'); if (e) { e.textContent = clk(d); e.classList.toggle('low', st.c.time && d < 60); }
  }
  function optRow(it, k, onpick, reveal) {
    var oi = it.ord[k], L = LET.charAt(k), ok = oi === it.ok, o = h('button', 'az-o ex-o'); o.type = 'button';
    o.appendChild(h('span', 'az-l', L)); o.appendChild(h('span', 'az-ot', it.r[2][oi]));
    if (it.ans === oi) o.classList.add('ex-sel');
    if (reveal) { if (ok) o.classList.add('ok'); else if (it.ans === oi) o.classList.add('ex-bad'); o.disabled = true; } else o.onclick = function () { onpick(oi); };
    return o;
  }
  function stmtRow(it, k, onpick, reveal) {
    var si = it.ord[k], s = it.r[2][si]; reveal = reveal || !!(it.sh && it.sh[si]); var row = h('div', 'az-o az-s ex-st'); row.appendChild(h('span', 'az-l', SL.charAt(k))); row.appendChild(h('span', 'az-ot', s[0]));
    var g = h('span', 'ex-tf');
    [[true, 'Đúng'], [false, 'Sai']].forEach(function (b) {
      var x = h('button', 'ex-tfb', b[1]); x.type = 'button'; if (it.ans[si] === b[0]) x.classList.add('ex-sel');
      if (reveal) { x.disabled = true; if (!!s[1] === b[0]) x.classList.add('ok'); else if (it.ans[si] === b[0]) x.classList.add('ex-bad'); } else x.onclick = function () { onpick(si, b[0]); [].forEach.call(g.children, function (y) { y.classList.remove('ex-sel'); }); x.classList.add('ex-sel'); };
      g.appendChild(x);
    }); row.appendChild(g); return row;
  }
  function card(it, no, o) {
    var cd = h('article', 'az-q ex-q'), hd = h('div', 'az-qh'); hd.appendChild(h('span', 'az-no', 'Câu ' + no)); cd.appendChild(hd);
    cd.appendChild(h('div', it.part === 'p1' ? 'az-qt' : 'az-tl', it.r[1])); var ol = h('div', 'az-opts');
    if (it.part === 'p1') it.ord.forEach(function (_, k) { var b = optRow(it, k, function (oi) { it.ans = oi; [].forEach.call(ol.children, function (x) { x.classList.remove('ex-sel'); }); b.classList.add('ex-sel'); o.change(it); }, o.reveal); ol.appendChild(b); });
    else it.ord.forEach(function (_, k) { ol.appendChild(stmtRow(it, k, function (si, v) { it.ans[si] = v; if (o.instant) { it.sh = it.sh || {}; it.sh[si] = 1; } o.change(it); }, o.reveal)); });
    cd.appendChild(ol);
    if (o.reveal) {
      var sc = score(it), tg = h('div', 'ex-res ' + (sc === maxS(it) ? 'ok' : sc > 0 ? 'half' : 'bad'), sc === maxS(it) ? 'Chính xác · +' + sc : sc > 0 ? 'Đúng một phần · +' + sc : ((it.part === 'p1' ? it.ans === null : !Object.keys(it.ans).length) ? 'Chưa trả lời · 0' : 'Sai · 0')); cd.appendChild(tg);
      if (it.part === 'p1' && !(it.ans === it.ok)) cd.appendChild(h('div', 'ex-key', 'Đáp án đúng: ' + LET.charAt(it.ord.indexOf(it.ok))));
      var ex = expOf(it); if (st.c.exp) { var eb = h('div', 'az-exp' + (ex ? '' : ' is-empty')); eb.appendChild(h('h4', '', 'GIẢI THÍCH')); eb.appendChild(h('div', 'az-expt', ex || 'Chưa có giải thích cho câu này.')); cd.appendChild(eb); }
    }
    return cd;
  }
  function answered(it) { return it.part === 'p1' ? it.ans !== null : Object.keys(it.ans).length === it.r[2].length; }
  function head(box, title) {
    var top = h('div', 'ex-top'); top.appendChild(h('b', '', title));
    if (st.c.clock || st.c.time) { var ck = h('span', 'ex-clk', ''); ck.id = 'exClk'; top.appendChild(ck); } box.appendChild(top); tick();
  }
  function run() { st.c.mode === 'single' ? runSingle() : runExam(); }
  function quit() { if (confirm('Thoát bài làm? Kết quả sẽ không được lưu.')) { stop(); drawSetup(st.f); } }

  /* Làm đề */
  function runExam() {
    root.textContent = ''; var wrap = h('div', 'ex-run'), main = h('div', 'ex-main'), side = h('aside', 'ex-side'); wrap.appendChild(main); wrap.appendChild(side); root.appendChild(wrap);
    var tb = h('div', 'az-box'); head(tb, st.f.title); var sm = h('div', 'ct-rm'); tb.appendChild(sm);
    var fin = h('button', 'btn', 'Nộp bài'); fin.type = 'button'; fin.onclick = function () { var left = st.items.filter(function (i) { return !answered(i); }).length; if (!left || confirm('Còn ' + left + ' câu chưa làm xong. Nộp bài?')) finish(false); };
    var qt = h('button', 'btn alt', 'Thoát'); qt.type = 'button'; qt.onclick = quit; tb.appendChild(fin); tb.appendChild(qt); side.appendChild(tb);
    var pb = h('div', 'az-box'), pg = h('div', 'az-tabs'); pb.appendChild(h('div', 'az-sh', 'PHẦN')); pb.appendChild(pg); side.appendChild(pb);
    var gb = h('div', 'az-box az-gbox'), grid = h('div', 'az-grid'); gb.appendChild(h('div', 'az-sh', 'DANH SÁCH CÂU')); gb.appendChild(grid); side.appendChild(gb);
    var cells = [];
    function paint() {
      main.textContent = ''; grid.textContent = ''; cells = []; pg.textContent = '';
      [['p1', 'Phần I'], ['p2', 'Phần II']].forEach(function (P) {
        var n = st.items.filter(function (i) { return i.part === P[0]; }).length; if (!n) return;
        var b = h('button', 'az-tab' + (st.part === P[0] ? ' is-on' : '')); b.type = 'button'; b.appendChild(document.createTextNode(P[1])); b.appendChild(h('small', '', String(n))); b.onclick = function () { st.part = P[0]; paint(); }; pg.appendChild(b);
      });
      var no = 0; st.items.forEach(function (it) {
        if (it.part !== st.part) return; no++; var n = no, cd = card(it, n, { change: function () { cell.classList.toggle('seen', answered(it)); upd(); } , reveal: false }), cell = h('button', 'az-n' + (answered(it) ? ' seen' : ''), String(n)); cell.type = 'button';
        cell.onclick = function () { cd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; main.appendChild(cd); grid.appendChild(cell);
      }); upd();
    }
    function upd() { var d = st.items.filter(answered).length; sm.textContent = 'Đã làm ' + d + '/' + st.items.length + ' câu'; }
    paint();
  }

  /* Đơn lẻ */
  function runSingle() {
    root.textContent = ''; var it = st.items[st.cur], box = h('section', 'glass d-box ex-one'); head(box, st.f.title + ' · Câu ' + (st.cur + 1) + '/' + st.items.length + ' · ' + (it.part === 'p1' ? 'Phần I' : 'Phần II'));
    var pr = h('div', 'ex-bar'), bi = h('i'); bi.style.width = Math.round(st.cur / st.items.length * 100) + '%'; pr.appendChild(bi); box.appendChild(pr);
    var area = h('div'); box.appendChild(area);
    function paint() {
      area.textContent = ''; area.appendChild(card(it, st.cur + 1, { reveal: it.done, instant: 1, change: function () { if (answered(it)) it.done = true; paint(); } }));
      paintBtn();
    }
    var nav = h('div', 'ct-row'), chk2 = h('button', 'btn alt', 'Kiểm tra'), nx = h('button', 'btn', 'Bỏ qua'), pv = h('button', 'btn alt', '‹ Câu trước'), qt = h('button', 'btn alt', 'Thoát'), en = h('button', 'btn alt', 'Kết thúc');
    [chk2, nx, pv, qt, en].forEach(function (b) { b.type = 'button'; });
    function paintBtn() { chk2.hidden = true; nx.textContent = it.done ? 'Câu tiếp ›' : 'Bỏ qua'; pv.disabled = st.cur === 0; }
    chk2.onclick = function () { it.done = true; paint(); };
    nx.onclick = function () { if (st.cur < st.items.length - 1) { st.cur++; } else { st.all = (st.all || []).concat(st.items); st.items = build(st.f, Object.assign({}, st.c, { shuf: 1 })); st.cur = 0; } run(); };
    pv.onclick = function () { if (st.cur > 0) { st.cur--; run(); } }; qt.onclick = quit; en.onclick = function () { finish(false); };
    nav.appendChild(pv); nav.appendChild(chk2); nav.appendChild(nx); nav.appendChild(en); nav.appendChild(qt); box.appendChild(nav); root.appendChild(box); paint();
  }

  /* ---------- 4. kết quả ---------- */
  function finish(timeout) {
    if (!st || st.fin) return; st.fin = true; stop(); if (st.c.mode === 'single') st.items = (st.all || []).concat(st.items).filter(function (i) { return i.done || answered(i); }); var tot = 0, mx = 0, ok = 0, p = { p1: [0, 0], p2: [0, 0] };
    st.items.forEach(function (it) { var s = score(it); tot += s; mx += maxS(it); p[it.part][0] += s; p[it.part][1] += maxS(it); if (s === maxS(it)) ok++; });
    var sc = mx ? Math.round(tot / mx * 1000) / 100 : 0, used = Math.round((Date.now() - st.t0) / 1000);
    var H = jget(HIS, {}); H[st.f.key] = { sc: sc, at: Date.now() }; jset(HIS, H);
    root.textContent = ''; var box = h('section', 'glass d-box ex-end');
    box.appendChild(h('h3', '', (timeout ? 'Hết giờ · ' : 'Kết quả · ') + st.f.title)); box.appendChild(h('div', 'ex-score', String(sc).replace('.', ',') + ' / 10'));
    var m = h('div', 'd-sub', 'Đúng hoàn toàn ' + ok + '/' + st.items.length + ' câu · Điểm thô ' + String(Math.round(tot * 100) / 100).replace('.', ',') + '/' + String(mx).replace('.', ',') + ' · Thời gian ' + clk(used)); box.appendChild(m);
    var sp = h('div', 'd-sub'); sp.textContent = ['p1', 'p2'].filter(function (k) { return p[k][1]; }).map(function (k) { return (k === 'p1' ? 'Phần I' : 'Phần II') + ': ' + String(Math.round(p[k][0] * 100) / 100).replace('.', ',') + '/' + p[k][1]; }).join('  ·  '); box.appendChild(sp);
    var row = h('div', 'ct-row'), again = h('button', 'btn', 'Làm lại'), set = h('button', 'btn alt', 'Đổi cài đặt'), lst = h('button', 'btn alt', 'Danh sách đề'); [again, set, lst].forEach(function (b) { b.type = 'button'; });
    var f = st.f, c = st.c; again.onclick = function () { start(f, c); }; set.onclick = function () { drawSetup(f); }; lst.onclick = drawList; [again, set, lst].forEach(function (b) { row.appendChild(b); }); box.appendChild(row); root.appendChild(box);
    if (!c.rev) return; var rv = h('div', 'ex-rv'), no = { p1: 0, p2: 0 };
    st.items.forEach(function (it) { no[it.part]++; rv.appendChild(card(it, no[it.part], { reveal: true })); }); root.appendChild(rv);
  }

  window.SQEX = { node: function () { if (!root.firstChild || scr === 'list') drawList(); return root; }, leave: stop };
})();
