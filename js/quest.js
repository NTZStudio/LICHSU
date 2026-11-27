/* QUEST + SAVE. QUEST/SAVE/HARDCORE/bảng 20 hạng: mọi gói. Chọn bài, NIGHTMARE: PLUS trở lên (SQ.rank()>=1).
   Nguồn câu: ADV_BANK (Phần I = trắc nghiệm 4 đáp án; Phần II = Đúng/Sai đơn hoặc bảng nhiều mệnh đề) + mệnh đề Đúng/Sai ngân hàng cũ (B).
   Phần I ngân hàng cũ (chỉ cụm + đáp án) không đủ câu hỏi/đáp án nên không đưa vào.
   SAVE: localStorage 'sq_quest_v1' {q:{id:{r,w,k,l,g,at,h,t,o,a,p,c,s}}, s:{score,att,ok,bad,best,nm}} - chỉ trên thiết bị. */
(function () {
  var KEY = 'sq_quest_v1', LET = 'ABCDEFGH';
  var $ = function (id) { return document.getElementById(id); };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function strip(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(a, b) { return b ? Math.round(a * 100 / b) + '%' : '0%'; }
  function fmt(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
  function plan() { try { return (window.SQ && SQ.rank && SQ.rank()) || 0; } catch (e) { return 0; } }
  function chips(host, defs, on, click) {
    host.innerHTML = '';
    defs.forEach(function (d) { var b = el('button', 'bank-chip' + (on(d[0]) ? ' is-on' : ''), d[1]); b.type = 'button'; b.addEventListener('click', function () { click(d[0]); }); host.appendChild(b); });
  }

  var D = { v: 1, q: {}, s: { score: 0, att: 0, ok: 0, bad: 0, best: 0, nm: 0 } };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.q && raw.s) D = raw; } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }

  /* điểm / combo / hạng */
  var BASE = { mcq: 10, tf: 6 }, TIERS = [[1, 2, 1], [3, 5, 1.5], [6, 9, 2], [10, 14, 2.5], [15, 0, 3]];
  function mult(c) { var m = 1; TIERS.forEach(function (t) { if (c >= t[0]) m = t[2]; }); return m; }
  var R20 = [[0, 'Thường dân'], [100, 'Tập sự'], [300, 'Học trò'], [600, 'Sĩ tử'], [1000, 'Đồng sinh'], [1600, 'Tú tài'], [2400, 'Cử nhân'], [3400, 'Hương cống'], [4600, 'Giải nguyên'], [6000, 'Hội nguyên'],
    [8000, 'Đình nguyên'], [10500, 'Tiến sĩ'], [13500, 'Bảng nhãn'], [17000, 'Thám hoa'], [21000, 'Trạng nguyên'], [26000, 'Sử quan'], [32000, 'Sử gia'], [40000, 'Đại sử gia'], [50000, 'Sử thánh'], [65000, 'Huyền thoại']];
  function ranks() { return R20; }
  function rankOf(sc) { var L = ranks(), i = 0; L.forEach(function (r, k) { if (sc >= r[0]) i = k; }); var n = L[i + 1]; return { i: i, name: L[i][1], from: L[i][0], next: n ? n[0] : null, nname: n ? n[1] : '' }; }


  /* 20 icon hạng: hành trình tới Gargantua (hố đen). Màu thép/đồng -> vàng -> cam/đỏ -> tím -> xanh plasma -> trắng vàng.
     Quả cầu nhỏ dần rồi tối đen, vành đĩa tăng dần, hạng 20 có vòng sáng photon. Chấm nhỏ bên dưới = bậc trong nhóm 4 hạng. */
  var RC = [['#8d97a8', '#d5dbe4'], ['#8a5a35', '#e0a268'], ['#9aa3b0', '#f1f4f8'], ['#a56b3a', '#f0b878'], ['#b8860b', '#ffe08a'], ['#c99a2e', '#fff0b0'], ['#d9a21b', '#ffd24d'], ['#e6a117', '#ffe58a'], ['#f59e0b', '#ffd070'], ['#f97316', '#ffc27a'],
    ['#ff7a1a', '#ffd9a0'], ['#ef4444', '#ffb199'], ['#dc2626', '#ff9f7a'], ['#e11d48', '#ffa7b8'], ['#c026d3', '#ffa0f0'], ['#9333ea', '#d8b4fe'], ['#6366f1', '#bfd0ff'], ['#38bdf8', '#e0f6ff'], ['#a5f3fc', '#ffffff'], ['#ffb347', '#fff4d6']];
  var STAR = [[14, 18, 1], [50, 20, 1.1], [18, 47, .9], [48, 45, 1], [10, 32, .8], [54, 33, .9], [26, 10, .8], [40, 53, .9], [22, 23, .7], [43, 12, .7]], _ic = 0;
  function rankIcon(i, sz) {
    var c = RC[i], t = i / 19, id = 'ri' + (++_ic), r = i < 15 ? Math.max(5, 13 - i * .55) : 5 + (i - 15) * 1.5, dark = i >= 15, n = i < 2 ? 0 : 1 + Math.floor(i / 7), step = i % 4, rot = ' transform="rotate(-18 32 32)"';
    var s = '<svg class="qz-ic" width="' + sz + '" height="' + sz + '" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'o" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="' + (dark ? '#2b2b3a' : c[1]) + '"/><stop offset="1" stop-color="' + (dark ? '#000' : c[0]) + '"/></radialGradient></defs>' +
      '<circle cx="32" cy="32" r="29" fill="#090b13" stroke="url(#' + id + 'g)" stroke-width="3"/>';
    STAR.slice(0, Math.floor(i / 2)).forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] + '" fill="' + c[1] + '" opacity=".8"/>'; });
    for (var k = 0; k < n; k++) { var R = Math.min(r + 7 + k * 4 + i * .25, 26); s += '<ellipse cx="32" cy="32" rx="' + R + '" ry="' + (R * .3) + '"' + rot + ' fill="none" stroke="url(#' + id + 'g)" stroke-width="' + (1.2 + t * 1.6) + '" opacity="' + (.95 - k * .22) + '"/>'; }
    s += '<circle cx="32" cy="32" r="' + r + '" fill="url(#' + id + 'o)"/>';
    if (n) { var F = Math.min(r + 7 + i * .25, 26); s += '<path d="M' + (32 - F) + ' 32A' + F + ' ' + (F * .3) + ' 0 0 0 ' + (32 + F) + ' 32"' + rot + ' fill="none" stroke="url(#' + id + 'g)" stroke-width="' + (1.4 + t * 1.8) + '"/>'; }
    if (i >= 15) { var L = r + 3.5, w = 1.2 + (i - 15) * .5; s += '<path d="M' + (32 - L) + ' 32A' + L + ' ' + L + ' 0 0 1 ' + (32 + L) + ' 32" fill="none" stroke="url(#' + id + 'g)" stroke-width="' + w + '" opacity=".9"/>'; if (i >= 17) s += '<path d="M' + (32 - L) + ' 32A' + L + ' ' + L + ' 0 0 0 ' + (32 + L) + ' 32" fill="none" stroke="url(#' + id + 'g)" stroke-width="' + (w * .6) + '" opacity=".6"/>'; }
    if (i === 19) s += '<circle cx="32" cy="32" r="' + (r + 1.6) + '" fill="none" stroke="#fff6dd" stroke-width="1.3"/><circle cx="32" cy="32" r="' + (r + 1.6) + '" fill="none" stroke="#ffb347" stroke-width="3.2" opacity=".35"/>';
    if (i >= 10) s += '<path d="M52 12l1.4 3.6L57 17l-3.6 1.4L52 22l-1.4-3.6L47 17l3.6-1.4z" fill="' + c[1] + '"/>';
    for (var j = 0; j <= step; j++) s += '<circle cx="' + (32 + (j - step / 2) * 6) + '" cy="52" r="1.7" fill="url(#' + id + 'g)"/>';
    return s + '</svg>';
  }
  /* đặc quyền theo hạng i (0..19), cộng dồn */
  function perks(i) { return { sc: i, time: i, hint: Math.floor(i / 4), shield: Math.floor(i / 6), spare: i >= 15 ? 1 : 0, aura: i >= 10, ring: i >= 19 }; }
  function perkText(i) {
    if (!i) return 'Khởi đầu hành trình';
    var sp = []; if (i % 4 === 0) sp.push('mở 50/50 x' + i / 4); if (i % 6 === 0) sp.push('Khiên combo x' + i / 6);
    if (i === 10) sp.push('hào quang'); if (i === 15) sp.push('mạng dự phòng'); if (i === 19) sp.push('Vành Gargantua');
    return '+' + i + '% điểm, +' + i + '% giờ' + (sp.length ? ' · ' + sp.join(', ') : '');
  }
  function benefits(i) {
    if (!i) return [['Khởi đầu hành trình, chưa có đặc quyền', false]];
    var p = perks(i), o = perks(i - 1), L = [];
    L.push(['+' + p.sc + '% điểm mọi câu', p.sc !== o.sc]); L.push(['+' + p.time + '% giờ HARDCORE', p.time !== o.time]);
    if (p.hint) L.push(['Gợi ý 50/50: ' + p.hint + ' lượt mỗi phiên (trắc nghiệm)', p.hint !== o.hint]);
    if (p.shield) L.push(['Khiên giữ combo: ' + p.shield + ' lượt mỗi phiên', p.shield !== o.shield]);
    if (p.spare) L.push(['Mạng dự phòng khi chơi chế độ 1 mạng', p.spare !== o.spare]);
    if (p.aura) L.push(['Hào quang quanh icon hạng', p.aura !== o.aura]);
    if (p.ring) L.push(['Vành sáng Gargantua (hạng tối cao)', p.ring !== o.ring]);
    return L;
  }
  function rkIdx() { return rankOf(D.s.score).i; }

  /* gom câu hỏi */
  var pool = null;
  function chunks(a) { if (a.length <= 4) return [a]; var o = [], i = 0; for (; i + 4 <= a.length; i += 4) o.push(a.slice(i, i + 4)); if (i < a.length) o.push(a.slice(a.length - 4)); return o; }
  function buildPool() {
    if (pool) return pool; pool = [];
    var A = window.ADV_BANK || {};
    Object.keys(A).forEach(function (n) {
      var d = A[n], L = d.title || ('Bài ' + n);
      (d.questions || []).forEach(function (q) {
        var ai = LET.indexOf(q[3]);
        if (q[0] && q[1] && q[2] && q[2].length >= 2 && ai > -1 && q[2][ai]) pool.push({ k: 'mcq', id: String(q[0]), g: String(n), src: L, text: q[1], opts: q[2], ans: ai });
      });
      (d.part2 || []).forEach(function (p) {
        var sts = (p[2] || []).filter(function (s) { return s && s[0] && (s[1] === 0 || s[1] === 1); }).map(function (s) { return [s[0], s[1] === 1]; });
        if (!p[0] || !sts.length) return;
        (p[2] || []).forEach(function (s, i) { if (s && s[0] && (s[1] === 0 || s[1] === 1)) pool.push({ k: 'tf', id: p[0] + '.' + 'abcdefghijkl'.charAt(i), g: String(n), src: L, ctx: p[1], text: s[0], ans: s[1] === 1 }); });
        chunks(sts).forEach(function (c, k, all) { if (c.length >= 2) pool.push({ k: 'tfx', id: String(p[0]) + (all.length > 1 ? '#' + (k + 1) : ''), g: String(n), src: L, ctx: p[1], sts: c }); });
      });
    });
    if (typeof B !== 'undefined') Object.keys(B).forEach(function (name, bi) {
      var sts = B[name].filter(function (s) { return s && s[0] && (s[1] === 0 || s[1] === 1); }).map(function (s) { return [s[0], s[1] === 1]; });
      var id = 'CL' + (bi + 1 < 10 ? '0' : '') + (bi + 1);
      sts.forEach(function (s, i) { pool.push({ k: 'tf', id: id + '.' + 'abcdefghijkl'.charAt(i), g: 'CL', src: 'Câu còn lại', ctx: 'Bộ ' + name, text: s[0], ans: s[1] }); });
      chunks(sts).forEach(function (c, k, all) { if (c.length >= 2) pool.push({ k: 'tfx', id: id + (all.length > 1 ? '#' + (k + 1) : ''), g: 'CL', src: 'Câu còn lại', ctx: 'Bộ ' + name, sts: c }); });
    });
    return pool;
  }
  function groups() { var m = {}; buildPool().forEach(function (p) { m[p.g] = p.src; }); return Object.keys(m).sort(function (a, b) { return a === 'CL' ? 1 : b === 'CL' ? -1 : a - b; }).map(function (g) { return [g, m[g]]; }); }

  /* trạng thái */
  function fresh() { var pk = perks(rkIdx()), off = opt && opt.mode === 'nm'; return { att: 0, ok: 0, bad: 0, score: 0, combo: 0, best: 0, log: [], over: false, hint: off ? 0 : pk.hint, shield: off ? 0 : pk.shield, spare: pk.spare }; }
  var S = fresh(), opt = { mode: 'normal', kind: 'all', auto: true, wrong: false, sec: 30, life: false, lessons: [] };
  var cur = null, locked = false, timer = null, tick = null, recent = [], mounted = false, T = {};
  var qMain, qSide, sMain, sSide, svF = 'all', svS = 'recent', svQ = '', svL = 'all';
  function lifeOn() { return opt.mode === 'nm' || (opt.mode === 'hard' && opt.life); }
  function limit() { var s = opt.mode === 'hard' ? Math.round(opt.sec * (1 + perks(rkIdx()).time / 100)) : opt.mode === 'nm' ? Math.max(10, 25 - Math.floor(S.ok / 5)) : 0; return cur && cur.k === 'tfx' ? s * 2 : s; }

  function eligible() {
    return buildPool().filter(function (p) {
      if (opt.mode !== 'nm' && opt.kind !== 'all' && p.k !== opt.kind) return false;
      if (opt.mode !== 'nm' && plan() >= 1 && opt.lessons.length && opt.lessons.indexOf(p.g) < 0) return false;
      if (opt.wrong && opt.mode !== 'nm') { var r = D.q[p.id]; return !!(r && r.w > 0); }
      return true;
    });
  }
  function pick() {
    var e = eligible(); if (!e.length) return null;
    var c = e;
    if (opt.mode === 'nm' || opt.kind === 'all') {
      var W = opt.mode === 'nm' ? { tfx: .4, mcq: .4, tf: .2 } : { mcq: .45, tf: .3, tfx: .25 }, x = Math.random(), k = 'mcq';
      if (x < W.tfx && opt.mode === 'nm') k = 'tfx'; else if (opt.mode === 'nm') k = x < .8 ? 'mcq' : 'tf'; else k = x < .45 ? 'mcq' : x < .75 ? 'tf' : 'tfx';
      var ck = e.filter(function (p) { return p.k === k; }); if (ck.length) c = ck;
    }
    var bias = opt.mode === 'nm' ? .5 : (opt.wrong ? 0 : .3);
    if (Math.random() < bias) { var wr = c.filter(function (p) { var r = D.q[p.id]; return r && r.w > r.r; }); if (wr.length) c = wr; }
    var f = c.filter(function (p) { return recent.indexOf(p.id) < 0; }); if (f.length) c = f;
    var p = c[Math.floor(Math.random() * c.length)];
    recent.push(p.id); if (recent.length > Math.min(40, e.length >> 1)) recent.shift();
    return p;
  }

  function mount() {
    if (mounted) return; mounted = true;
    var qr = $('questRoot'); qr.classList.add('az');
    qMain = el('div', 'az-main'); qSide = el('aside', 'az-side qz-side'); qr.appendChild(qMain); qr.appendChild(qSide);
    qSide.innerHTML =
      '<div class="az-box"><div class="az-sh">ĐIỂM</div><div class="qz-big"><b id="qs-score">0</b><small>điểm phiên này</small></div><div class="qz-rk"><span id="qs-rank"></span><span id="qs-total"></span></div><div class="qz-pb"><i id="qs-rbar"></i></div><div class="qz-sm" id="qs-next"></div></div>' +
      '<div class="az-box"><div class="az-sh">COMBO <span id="qs-life" class="qz-life"></span></div><div class="qz-combo"><b id="qs-combo">0</b><span id="qs-mult">x1</span></div>' +
      '<div class="qz-stats"><div><b id="qs-ok">0</b><small>Đúng</small></div><div><b id="qs-bad">0</b><small>Sai</small></div><div><b id="qs-acc">0%</b><small>Chính xác</small></div><div><b id="qs-best">0</b><small>Combo cao nhất</small></div></div><div class="qz-log" id="qs-log"></div></div>' +
      '<div class="az-box"><div class="az-sh">CHẾ ĐỘ</div><div class="qz-kind" id="qs-mode"></div><div class="qz-sm" id="qs-note"></div>' +
      '<div id="qs-hard" hidden><label class="qz-chk">Thời gian mỗi câu: <b id="qs-secv">30s</b></label><input type="range" id="qs-sec" min="5" max="120" step="5" value="30" class="qz-rg"><label class="qz-chk"><input type="checkbox" id="qs-lifeck"> Chỉ 1 mạng (sai là dừng)</label></div>' +
      '<div id="qs-misc"><div class="az-sh" style="margin-top:12px">LOẠI CÂU</div><div class="qz-kind" id="qs-kind"></div>' +
      '<div class="az-sh" style="margin-top:12px">CHỌN BÀI <small id="qs-lk"></small></div><div class="qz-kind" id="qs-lsn"></div>' +
      '<label class="qz-chk"><input type="checkbox" id="qs-auto"> Tự chuyển câu sau khi chấm</label><label class="qz-chk"><input type="checkbox" id="qs-wrong"> Chỉ luyện câu từng sai (SAVE)</label></div>' +
      '<button type="button" class="qz-btn" id="qs-reset">Bắt đầu phiên mới</button></div>' +
      '<div class="az-box"><div class="az-sh">BẢNG TÍNH ĐIỂM</div><table class="qz-tb" id="qs-tb"><thead><tr><th>Combo</th><th>Hệ số</th></tr></thead><tbody></tbody></table><div class="qz-sm">Trắc nghiệm <b>10</b> · Đúng/Sai đơn <b>6</b> · Đúng/Sai bảng <b>24</b> (đúng hết) hoặc <b>4</b>/mệnh đề, nhân hệ số combo. HARDCORE x1,5. NIGHTMARE x2 và tăng dần theo combo.</div></div>' +
      '<div class="az-box"><div class="az-sh">ĐẶC QUYỀN HẠNG</div><div id="qs-pk"></div></div><div class="az-box"><div class="az-sh">THỨ HẠNG</div><div id="qs-rt"></div></div>';
    var tb = $('qs-tb').lastChild;
    TIERS.forEach(function (t) { var tr = el('tr'); tr.appendChild(el('td', '', t[1] ? (t[0] === t[1] ? '' + t[0] : t[0] + '–' + t[1]) : t[0] + '+')); tr.appendChild(el('td', '', 'x' + fmt(t[2]))); tb.appendChild(tr); });
    $('qs-auto').onchange = function () { opt.auto = this.checked; };
    $('qs-wrong').onchange = function () { opt.wrong = this.checked; next(); };
    $('qs-sec').oninput = function () { opt.sec = +this.value; $('qs-secv').textContent = opt.sec + 's'; };
    $('qs-sec').onchange = function () { next(); };
    $("qs-lifeck").onchange = function () { opt.life = this.checked; reset(); };
    $('qs-reset').onclick = reset;
    document.addEventListener('keydown', keys);

    var sr = $('saveRoot'); sr.classList.add('az');
    sMain = el('div', 'az-main'); sSide = el('aside', 'az-side sv-side'); sr.appendChild(sMain); sr.appendChild(sSide);
    sSide.innerHTML = '<div class="az-box az-sbox" id="sv-box"></div><div class="az-box"><div class="az-sh">TỔNG QUAN</div><div class="qz-stats" id="sv-sum"></div><div class="qz-sm" id="sv-rank"></div></div>' +
      '<div class="az-box"><div class="az-sh">PHÂN BỐ THEO BÀI</div><div id="sv-l"></div></div>' +
      '<div class="az-box"><div class="az-sh">LỌC</div><div class="bank-chips" id="sv-f"></div><div class="az-sh" style="margin-top:12px">SẮP XẾP</div><div class="bank-chips" id="sv-s"></div></div>' +
      '<div class="az-box"><div class="az-sh">HÀNH ĐỘNG</div><button type="button" class="qz-btn" id="sv-prac">Luyện lại câu từng sai</button><button type="button" class="qz-btn qz-danger" id="sv-clear">Xóa toàn bộ dữ liệu</button><div class="qz-sm">Dữ liệu chỉ lưu trong trình duyệt của thiết bị này. Xóa dữ liệu trình duyệt hoặc đổi thiết bị sẽ không còn lịch sử.</div></div>';
    $('sv-prac').onclick = function () { opt.wrong = true; opt.mode = 'normal'; opt.kind = 'all'; if (window.SQ_LOOKUP) window.SQ_LOOKUP.setMode('quest'); };
    $('sv-clear').onclick = function () {
      if (!confirm('Xóa toàn bộ lịch sử làm bài trên thiết bị này? Không thể khôi phục.')) return;
      D = { v: 1, q: {}, s: { score: 0, att: 0, ok: 0, bad: 0, best: 0, nm: 0 } }; persist(); S = fresh(); renderSave(); if (qMain) updSide();
    };
  }

  function syncOpts() {
    var P = plan() >= 1, nm = opt.mode === 'nm';
    chips($('qs-mode'), [['normal', 'Thường'], ['hard', 'HARDCORE'], ['nm', P ? 'NIGHTMARE' : 'NIGHTMARE 🔒']], function (k) { return opt.mode === k; }, setModeQ);
    chips($('qs-kind'), [['all', 'Tất cả'], ['mcq', 'Trắc nghiệm'], ['tf', 'Đúng/Sai đơn'], ['tfx', 'Đúng/Sai bảng']], function (k) { return opt.kind === k; }, function (k) { opt.kind = k; next(); });
    var gs = groups();
    chips($('qs-lsn'), [['all', 'Tất cả']].concat(gs), function (k) { return k === 'all' ? !opt.lessons.length : opt.lessons.indexOf(k) > -1; }, function (k) {
      if (!P) { $('qs-note').textContent = 'Chọn bài (một hoặc nhiều bài) dành cho PLUS trở lên.'; return; }
      if (k === 'all') opt.lessons = []; else { var i = opt.lessons.indexOf(k); if (i > -1) opt.lessons.splice(i, 1); else opt.lessons.push(k); }
      next();
    });
    $('qs-lk').textContent = P ? '(chọn nhiều bài)' : '🔒 PLUS';
    $('qs-hard').hidden = opt.mode !== 'hard'; $('qs-misc').hidden = false;
    $('qs-kind').parentNode.hidden = false;
    Array.prototype.forEach.call($('qs-misc').children, function (c, i) { c.hidden = nm; });
    $('qs-note').textContent = nm ? 'NIGHTMARE: 1 mạng, câu dày đặc, thời gian giảm dần, điểm tăng theo combo. Không có cài đặt.' : opt.mode === 'hard' ? 'HARDCORE: hết giờ tự hiện đáp án đúng và được 0 điểm câu đó.' : '';
    $('qs-auto').checked = opt.auto; $('qs-wrong').checked = opt.wrong; $("qs-lifeck").checked = opt.life; $('qs-sec').value = opt.sec; $('qs-secv').textContent = opt.sec + 's';
  }
  function setModeQ(k) {
    if (k === 'nm' && plan() < 1) { $('qs-note').textContent = 'NIGHTMARE dành cho PLUS trở lên. Nhập mã tại trang chủ để mở.'; return; }
    opt.mode = k; reset();
  }
  function reset() { S = fresh(); recent = []; next(); }

  /* hiện câu */
  function stopT() { clearInterval(tick); clearTimeout(timer); }
  function next() {
    stopT(); locked = false; qMain.innerHTML = ''; syncOpts();
    var p = pick(); cur = p;
    if (!p) { qMain.appendChild(el('div', 'qz-empty', opt.wrong ? 'Chưa có câu nào từng sai theo bộ lọc hiện tại. Làm thêm QUEST hoặc tắt "Chỉ luyện câu từng sai".' : 'Không có câu phù hợp với bộ lọc.')); updSide(); return; }
    var card = el('article', 'az-q qz-card'), top = el('div', 'az-qh'), left = el('span', 'qz-l');
    left.appendChild(el('span', 'az-no', 'Câu ' + (S.att + 1)));
    left.appendChild(el('span', 'qz-chip', p.k === 'mcq' ? 'Trắc nghiệm' : p.k === 'tf' ? 'Đúng / Sai' : 'Đúng / Sai · bảng'));
    left.appendChild(el('span', 'qz-chip', p.src));
    top.appendChild(left); top.appendChild(el('span', 'az-id', 'ID ' + p.id)); card.appendChild(top);
    var tm = el('div', 'qz-tm'), tmb = el('i'), tmt = el('b'); tm.hidden = true; tm.appendChild(tmb); tm.appendChild(tmt); card.appendChild(tm);
    if (p.ctx && p.k !== 'mcq') card.appendChild(el('div', 'az-tl', p.ctx));
    card.appendChild(el('div', 'az-qt', p.k === 'tf' ? 'Nhận định sau đúng hay sai?\n' + p.text : p.k === 'tfx' ? 'Chọn Đúng hoặc Sai cho từng nhận định:' : p.text));
    var box = el('div', 'az-opts qz-opts'), btns = [], picks = [];
    if (p.k === 'mcq') {
      shuffle(p.opts.map(function (t, i) { return i; })).forEach(function (idx, pos) {
        var b = el('button', 'az-o qz-o'); b.type = 'button'; b.setAttribute('data-good', idx === p.ans ? '1' : '0');
        b.appendChild(el('span', 'az-l', LET.charAt(pos))); b.appendChild(el('span', 'az-ot', p.opts[idx]));
        b.onclick = function () { finish(idx === p.ans, p.opts[idx], b); }; box.appendChild(b); btns.push(b);
      });
    } else if (p.k === 'tf') {
      [['1', 'Đúng', true], ['2', 'Sai', false]].forEach(function (x) {
        var b = el('button', 'az-o qz-o'); b.type = 'button'; b.setAttribute('data-good', p.ans === x[2] ? '1' : '0');
        b.appendChild(el('span', 'az-l', x[0])); b.appendChild(el('span', 'az-ot', x[1]));
        b.onclick = function () { finish(p.ans === x[2], x[2], b); }; box.appendChild(b); btns.push(b);
      });
    } else {
      p.sts.forEach(function (s, i) {
        var row = el('div', 'az-o az-s qz-row'), bt = el('span', 'qz-tfb'); row.appendChild(el('span', 'az-l', 'abcdefgh'.charAt(i))); row.appendChild(el('span', 'az-ot', s[0]));
        [['Đúng', true], ['Sai', false]].forEach(function (x) {
          var b = el('button', 'qz-tfx', x[0]); b.type = 'button';
          b.onclick = function () { if (locked) return; picks[i] = x[1]; Array.prototype.forEach.call(bt.children, function (c) { c.classList.remove('on'); }); b.classList.add('on'); };
          bt.appendChild(b);
        });
        row.appendChild(bt); box.appendChild(row); btns.push(row);
      });
    }
    card.appendChild(box);
    var res = el('div', 'qz-res'); res.hidden = true; card.appendChild(res);
    var bar = el('div', 'qz-bar'); bar.appendChild(el('i')); bar.hidden = true; card.appendChild(bar);
    var act = el('div', 'qz-act'), go = el('button', 'qz-btn', 'Chấm điểm'), sk = el('button', 'qz-btn qz-ghost', 'Bỏ qua câu'), nb = el('button', 'qz-btn', 'Câu tiếp theo →');
    go.type = sk.type = nb.type = 'button'; go.hidden = p.k !== 'tfx'; nb.hidden = true; sk.hidden = opt.mode === 'nm';
    go.onclick = function () { gradeX(); }; sk.onclick = next; nb.onclick = function () { if (S.over) S = fresh(); next(); };
    var hb = null;
    if (p.k === 'mcq' && S.hint > 0 && opt.mode !== 'nm') {
      hb = el('button', 'qz-btn qz-ghost', 'Gợi ý 50/50 (' + S.hint + ')'); hb.type = 'button';
      hb.onclick = function () {
        if (locked || S.hint < 1) return; S.hint--;
        shuffle(btns.filter(function (b) { return b.getAttribute('data-good') === '0'; })).slice(0, 2).forEach(function (b) { b.disabled = true; b.className += ' qz-dim'; });
        hb.hidden = true; updSide();
      };
    }
    act.appendChild(go); if (hb) act.appendChild(hb); act.appendChild(sk); act.appendChild(nb);
    act.appendChild(el('small', 'qz-sm', p.k === 'mcq' ? 'Phím tắt: A–D / 1–4 · Enter, Space: câu tiếp' : p.k === 'tf' ? 'Phím tắt: 1/Đ = Đúng · 2/S = Sai · Enter, Space: câu tiếp' : 'Enter: chấm điểm / câu tiếp'));
    card.appendChild(act); qMain.appendChild(card);
    T = { btns: btns, picks: picks, res: res, bar: bar, nb: nb, go: go, sk: sk, tm: tm, hb: hb };
    var sec = limit();
    if (sec) {
      var end = Date.now() + sec * 1000; tm.hidden = false;
      tick = setInterval(function () {
        var left_ = end - Date.now();
        if (left_ <= 0) { stopT(); timeout(); return; }
        tmb.style.width = (left_ / (sec * 10)) + '%'; tmt.textContent = Math.ceil(left_ / 1000) + 's'; tm.className = 'qz-tm' + (left_ < 5000 ? ' low' : '');
      }, 100);
    }
    updSide();
  }
  function gradeX() {
    if (locked || !cur || cur.k !== 'tfx') return;
    var n = 0; cur.sts.forEach(function (s, i) { if (T.picks[i] === s[1]) n++; });
    finish(n === cur.sts.length, T.picks.slice(), null, n);
  }
  function timeout() { if (locked || !cur) return; finish(false, null, null, 0, true); }

  /* chấm */
  function finish(good, pickVal, picked, nOk, timedOut) {
    if (locked || !cur) return; locked = true; stopT();
    var p = cur, total = p.k === 'tfx' ? p.sts.length : 1, pts = 0, m = 1, nm = opt.mode === 'nm', shielded = false, spared = false, pk = perks(rkIdx());
    if (p.k !== 'tfx') nOk = good ? 1 : 0;
    var all = good && !timedOut;
    S.att++; D.s.att++;
    if (all) { S.ok++; D.s.ok++; S.combo++; if (S.combo > S.best) S.best = S.combo; } else { S.bad++; D.s.bad++; if (S.shield > 0) { S.shield--; shielded = true; } else S.combo = 0; }
    if (!timedOut) {
      var base = p.k === 'tfx' ? (all ? 24 : nOk * 4) : (all ? BASE[p.k] : 0);
      m = (all ? mult(S.combo) : 1) * (opt.mode === 'hard' ? 1.5 : nm ? 2 + Math.min(S.combo, 40) * 0.1 : 1);
      pts = Math.round(base * m * (1 + pk.sc / 100));
    }
    S.score += pts; D.s.score += pts; if (S.best > D.s.best) D.s.best = S.best;
    if (nm && S.score > (D.s.nm || 0)) D.s.nm = S.score;
    var r = D.q[p.id] || { r: 0, w: 0, h: '' };
    r.r += all ? 1 : 0; r.w += all ? 0 : 1; r.at = Date.now(); r.k = p.k; r.l = p.src; r.g = p.g; r.h = (r.h + (all ? '1' : '0')).slice(-10);
    if (p.k === 'mcq') { r.t = p.text; r.o = p.opts; r.a = p.ans; r.p = timedOut ? '' : pickVal; }
    else if (p.k === 'tf') { r.t = p.text; r.c = (p.ctx || '').slice(0, 400); r.a = p.ans; r.p = timedOut ? null : pickVal; }
    else { r.t = (p.ctx || '').slice(0, 200); r.s = p.sts; r.p = timedOut ? [] : pickVal; }
    D.q[p.id] = r; persist();
    S.log.unshift({ ok: all, pts: pts, id: p.id }); if (S.log.length > 24) S.log.pop();
    if (p.k === 'tfx') {
      T.btns.forEach(function (row, i) {
        var s = p.sts[i], pk = timedOut ? undefined : T.picks[i], ok = pk === s[1];
        row.className += ok ? ' ok' : ' bad'; row.lastChild.remove();
        row.appendChild(el('span', 'az-tf ' + (s[1] ? 'qz-t' : 'qz-f'), 'Đáp án: ' + (s[1] ? 'Đúng' : 'Sai')));
      });
      T.go.hidden = true;
    } else T.btns.forEach(function (b) { b.disabled = true; if (b.getAttribute('data-good') === '1') b.className += ' ok'; else if (b === picked) b.className += ' bad'; });
    T.sk.hidden = true; if (T.hb) T.hb.hidden = true;
    if (lifeOn() && !all) { if (S.spare > 0) { S.spare--; spared = true; } else S.over = true; }
    var cmb = shielded ? 'Khiên giữ combo' : 'combo về 0';
    var txt = timedOut ? 'HẾT GIỜ · đáp án đúng đã hiện · 0 điểm' : all ? 'ĐÚNG! +' + pts + ' điểm' + (m > 1 ? ' · hệ số x' + fmt(m) : '') : p.k === 'tfx' ? 'ĐÚNG ' + nOk + '/' + total + ' mệnh đề · +' + pts + ' điểm · ' + cmb : 'SAI · đáp án đúng đã tô xanh · ' + cmb;
    T.res.hidden = false; T.res.className = 'qz-res ' + (all ? 'is-ok' : 'is-bad'); T.res.textContent = txt + (spared ? ' · Mạng dự phòng hồi sinh!' : '') + (S.over ? ' · HẾT MẠNG: ' + S.score + ' điểm, combo cao nhất ' + S.best : '');
    updSide(); T.nb.hidden = false; T.nb.textContent = S.over ? 'Chơi lại ↻' : 'Câu tiếp theo →';
    if (opt.auto && !S.over) {
      var ms = nm ? (all ? 700 : 1800) : (all ? 1300 : 3200); T.bar.hidden = false; T.bar.firstChild.style.animation = 'qzbar ' + ms + 'ms linear forwards'; timer = setTimeout(next, ms);
    }
  }
  function keys(e) {
    var qr = $('questRoot'); if (!qr || qr.hidden || !cur || e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    var k = e.key, u = k.toUpperCase();
    if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); if (locked) { T.nb.click(); } else if (cur.k === 'tfx' && k === 'Enter') gradeX(); return; }
    if (locked || cur.k === 'tfx') return;
    var i = cur.k === 'mcq' ? (LET.indexOf(u) > -1 ? LET.indexOf(u) : /^[1-9]$/.test(k) ? +k - 1 : -1) : (k === '1' || u === 'Đ' || u === 'D') ? 0 : (k === '2' || u === 'S') ? 1 : -1;
    if (i > -1 && T.btns[i]) { e.preventDefault(); T.btns[i].click(); }
  }
  function popRank(i) { if (!window.sqRankUp) return; setTimeout(function () { clearTimeout(timer); stopT(); sqRankUp(i, { onClose: function () { if (opt.auto && locked && !S.over) next(); } }); }, 60); }
  function updSide() {
    $('qs-score').textContent = S.score;
    var rk = rankOf(D.s.score), L = ranks();
    if (D.s.rk == null) { D.s.rk = rk.i; persist(); } else if (rk.i > D.s.rk) { D.s.rk = rk.i; persist(); popRank(rk.i); }
    var rr = $('qs-rank'); rr.innerHTML = rankIcon(rk.i, 26); rr.appendChild(document.createTextNode('Hạng ' + (rk.i + 1) + ': ' + rk.name)); $('qs-total').textContent = 'Tổng ' + D.s.score + ' điểm';
    $('qs-rbar').style.width = (rk.next ? Math.min(100, (D.s.score - rk.from) * 100 / (rk.next - rk.from)) : 100) + '%';
    $('qs-next').textContent = rk.next ? 'Còn ' + (rk.next - D.s.score) + ' điểm để lên hạng ' + rk.nname : 'Bạn đã đạt hạng cao nhất.';
    $('qs-combo').textContent = S.combo; $('qs-mult').textContent = 'x' + fmt(mult(S.combo || 1) * (opt.mode === 'hard' ? 1.5 : opt.mode === 'nm' ? 2 + Math.min(S.combo, 40) * 0.1 : 1));
    $('qs-ok').textContent = S.ok; $('qs-bad').textContent = S.bad; $('qs-acc').textContent = pct(S.ok, S.att); $('qs-best').textContent = S.best;
    $('qs-life').textContent = lifeOn() ? (S.over ? '♡ hết mạng' : '♥ 1 mạng') : '';
    var lg = $('qs-log'); lg.innerHTML = ''; S.log.forEach(function (x) { var d = el('i', x.ok ? 'ok' : 'bad'); d.title = (x.ok ? 'Đúng +' + x.pts : 'Sai') + ' · ID ' + x.id; lg.appendChild(d); });
    var ti = -1; TIERS.forEach(function (t, i) { if (S.combo >= t[0]) ti = i; });
    Array.prototype.forEach.call($('qs-tb').lastChild.children, function (tr, i) { tr.className = i === ti ? 'on' : ''; });
    $('qs-combo').parentNode.className = 'qz-combo' + (S.combo >= 3 ? ' hot' : '');
    var rt = $('qs-rt'), pb = $('qs-pk'); rt.innerHTML = ''; pb.innerHTML = '';
    var pk = perks(rk.i), hd = el('div', 'qz-pkh' + (pk.aura ? ' aura' : '') + (pk.ring ? ' gar' : '')), tx = el('div');
    hd.innerHTML = rankIcon(rk.i, 56); tx.appendChild(el('b', '', 'Hạng ' + (rk.i + 1) + ' · ' + rk.name)); tx.appendChild(el('small', '', perkText(rk.i))); hd.appendChild(tx); pb.appendChild(hd);
    var pl = el('ul', 'qz-pl');
    ['+' + pk.sc + '% điểm mọi câu', '+' + pk.time + '% giờ HARDCORE', 'Gợi ý 50/50: ' + S.hint + '/' + pk.hint + ' lượt (trắc nghiệm)', 'Khiên giữ combo: ' + S.shield + '/' + pk.shield + ' lượt', 'Mạng dự phòng: ' + S.spare + '/' + pk.spare + ' (chế độ 1 mạng)'].forEach(function (x) { pl.appendChild(el('li', '', x)); });
    pb.appendChild(pl); if (opt.mode === 'nm') pb.appendChild(el('div', 'qz-sm', 'NIGHTMARE: tắt gợi ý, khiên và giờ cộng thêm; vẫn có thưởng điểm và mạng dự phòng.'));
    var ul = el('ol', 'qz-rt');
    L.forEach(function (r, i) { var li = el('li', i === rk.i ? 'on' : i < rk.i ? 'done' : 'lock'), d = el('div'); li.innerHTML = rankIcon(i, 32); d.appendChild(el('span', '', (i + 1) + '. ' + r[1])); d.appendChild(el('small', '', perkText(i))); li.appendChild(d); li.appendChild(el('em', '', r[0])); ul.appendChild(li); });
    rt.appendChild(ul); var cu = ul.querySelector('li.on'); if (cu) ul.scrollTop = Math.max(0, cu.offsetTop - 70);
    if (D.s.nm) rt.appendChild(el('div', 'qz-sm', 'Kỷ lục NIGHTMARE: ' + D.s.nm + ' điểm'));
  }

  /* SAVE */
  function detail(o) {
    var box = el('div', 'az-opts sv-det');
    if (o.k === 'mcq' && o.o) o.o.forEach(function (t, i) {
      var ok = i === o.a, bad = o.p === t && !ok, d = el('div', 'az-o' + (ok ? ' ok' : '') + (bad ? ' bad' : ''));
      d.appendChild(el('span', 'az-l', LET.charAt(i))); d.appendChild(el('span', 'az-ot', t)); if (ok) d.appendChild(el('span', 'az-m', '✓')); else if (bad) d.appendChild(el('span', 'sv-pk', 'Bạn chọn'));
      box.appendChild(d);
    });
    else if (o.k === 'tf' && typeof o.a === 'boolean') {
      if (o.c) box.appendChild(el('div', 'az-tl', o.c));
      [true, false].forEach(function (v) { var ok = v === o.a, bad = o.p === v && !ok, d = el('div', 'az-o' + (ok ? ' ok' : '') + (bad ? ' bad' : '')); d.appendChild(el('span', 'az-l', v ? 'Đ' : 'S')); d.appendChild(el('span', 'az-ot', v ? 'Đúng' : 'Sai')); if (ok) d.appendChild(el('span', 'az-m', '✓')); else if (bad) d.appendChild(el('span', 'sv-pk', 'Bạn chọn')); box.appendChild(d); });
    } else if (o.k === 'tfx' && o.s) {
      if (o.t) box.appendChild(el('div', 'az-tl', o.t));
      o.s.forEach(function (s, i) {
        var pk = o.p && o.p[i], bad = typeof pk === 'boolean' && pk !== s[1], d = el('div', 'az-o az-s ' + (s[1] ? 'is-true' : 'is-false') + (bad ? ' bad' : ''));
        d.appendChild(el('span', 'az-l', 'abcdefgh'.charAt(i))); d.appendChild(el('span', 'az-ot', s[0])); d.appendChild(el('span', 'az-tf', s[1] ? 'Đúng' : 'Sai')); if (bad) d.appendChild(el('span', 'sv-pk', 'Bạn chọn: ' + (pk ? 'Đúng' : 'Sai'))); box.appendChild(d);
      });
    } else return null;
    return box;
  }
  function renderSave() {
    var s = D.s, keys_ = Object.keys(D.q), by = {};
    $('sv-sum').innerHTML = '';
    [[keys_.length, 'Câu đã làm'], [s.att, 'Tổng lượt'], [s.ok, 'Đúng'], [s.bad, 'Sai'], [pct(s.ok, s.att), 'Chính xác'], [s.best, 'Combo cao nhất']].forEach(function (x) { var d = el('div'); d.appendChild(el('b', '', '' + x[0])); d.appendChild(el('small', '', x[1])); $('sv-sum').appendChild(d); });
    var sr_ = rankOf(s.score); $('sv-rank').innerHTML = rankIcon(sr_.i, 24); $('sv-rank').appendChild(document.createTextNode(' Tổng ' + s.score + ' điểm · Hạng ' + (sr_.i + 1) + ' ' + sr_.name));
    keys_.forEach(function (id) { var o = D.q[id], g = o.g || 'CL'; (by[g] = by[g] || { n: 0, r: 0, w: 0, l: o.l || g }); by[g].n++; by[g].r += o.r; by[g].w += o.w; });
    var lh = $('sv-l'); lh.innerHTML = '';
    function lrow(g, name, n, r, w) {
      var b = el('button', 'sv-lr' + (svL === g ? ' on' : '')); b.type = 'button';
      b.appendChild(el('span', 'sv-ln', name)); b.appendChild(el('small', '', n + ' câu · đúng ' + r + ' · sai ' + w));
      var bar = el('i', 'sv-bar'), gi = el('i', 'g'); gi.style.width = pct(r, r + w); bar.appendChild(gi); b.appendChild(bar);
      b.onclick = function () { svL = g; renderSave(); }; lh.appendChild(b);
    }
    lrow('all', 'Tất cả bài', keys_.length, s.ok, s.bad);
    Object.keys(by).sort(function (a, b) { return a === 'CL' ? 1 : b === 'CL' ? -1 : a - b; }).forEach(function (g) { lrow(g, by[g].l, by[g].n, by[g].r, by[g].w); });
    chips($('sv-f'), [['all', 'Tất cả'], ['wrong', 'Từng sai'], ['hard', 'Sai nhiều hơn đúng'], ['clean', 'Chưa từng sai']], function (k) { return svF === k; }, function (k) { svF = k; renderSave(); });
    chips($('sv-s'), [['recent', 'Gần nhất'], ['wrong', 'Sai nhiều'], ['right', 'Đúng nhiều'], ['id', 'ID']], function (k) { return svS === k; }, function (k) { svS = k; renderSave(); });
    var nw = 0; keys_.forEach(function (k) { if (D.q[k].w > 0) nw++; });
    $('sv-prac').disabled = !nw; $('sv-prac').textContent = 'Luyện lại câu từng sai (' + nw + ')';
    var tk = strip(svQ.trim()).split(/\s+/).filter(Boolean);
    var rows = keys_.map(function (id) { var o = D.q[id]; o.id = id; return o; }).filter(function (o) {
      if (svL !== 'all' && (o.g || 'CL') !== svL) return false;
      if (svF === 'wrong' && !(o.w > 0)) return false; if (svF === 'hard' && !(o.w > o.r)) return false; if (svF === 'clean' && o.w > 0) return false;
      var key = strip(o.id + ' ' + (o.t || '') + ' ' + (o.l || '')); return tk.every(function (t) { return key.indexOf(t) > -1; });
    });
    rows.sort(function (a, b) { return svS === 'wrong' ? b.w - a.w || b.at - a.at : svS === 'right' ? b.r - a.r || b.at - a.at : svS === 'id' ? (a.id.length - b.id.length || (a.id < b.id ? -1 : 1)) : b.at - a.at; });
    sMain.innerHTML = '';
    if (!rows.length) sMain.appendChild(el('div', 'qz-empty', keys_.length ? 'Không có câu nào khớp bộ lọc.' : 'Chưa có dữ liệu. Vào QUEST làm vài câu, kết quả sẽ tự lưu ở đây.'));
    rows.slice(0, 300).forEach(function (o) {
      var c = el('article', 'az-q sv-row'), h = el('div', 'az-qh'), l = el('span', 'qz-l'), idb = el('button', 'az-id', 'ID ' + o.id); idb.type = 'button'; idb.title = 'Bấm để sao chép ID';
      idb.onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(o.id).catch(function () {}); idb.textContent = 'Đã chép'; setTimeout(function () { idb.textContent = 'ID ' + o.id; }, 1000); };
      l.appendChild(idb); if (o.l) l.appendChild(el('span', 'qz-chip', o.l)); l.appendChild(el('span', 'qz-chip', o.k === 'mcq' ? 'Trắc nghiệm' : o.k === 'tfx' ? 'Đúng/Sai bảng' : 'Đúng/Sai'));
      var sc = el('span', 'sv-sc'); sc.appendChild(el('span', 'sv-r', 'Đúng ' + o.r)); sc.appendChild(el('span', 'sv-w', 'Sai ' + o.w)); h.appendChild(l); h.appendChild(sc); c.appendChild(h);
      c.appendChild(el('div', 'sv-t', o.k === 'tfx' ? 'Câu Đúng/Sai dạng bảng' : o.t || ''));
      var dt = detail(o), last = o.h.slice(-1) === '1';
      if (dt) { dt.hidden = last; c.appendChild(dt); }
      var f = el('div', 'sv-f'), dots = el('span', 'qz-log'); o.h.split('').forEach(function (ch) { dots.appendChild(el('i', ch === '1' ? 'ok' : 'bad')); }); f.appendChild(dots);
      if (dt) { var tg = el('button', 'qz-btn qz-ghost sv-tg', last ? 'Xem đáp án' : 'Ẩn đáp án'); tg.type = 'button'; tg.onclick = function () { dt.hidden = !dt.hidden; tg.textContent = dt.hidden ? 'Xem đáp án' : 'Ẩn đáp án'; }; f.appendChild(tg); }
      f.appendChild(el('small', 'qz-sm', o.at ? 'Lần cuối: ' + new Date(o.at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''));
      c.appendChild(f); sMain.appendChild(c);
    });
    return 'Hiện ' + rows.length + ' / ' + keys_.length + ' câu đã lưu' + (rows.length > 300 ? ' (hiển thị 300 câu đầu)' : '');
  }

  window.SQR = { R: R20, RC: RC, rankOf: rankOf, icon: rankIcon, perks: perks, perkText: perkText, benefits: benefits, stats: function () { return { s: D.s, q: Object.keys(D.q).length }; } };
  window.SQQ = {
    show: function (mode) {
      mount();
      if (mode === 'quest') { next(); } else { stopT(); renderSave(); }
    },
    hide: function () { stopT(); },
    box: function (mode) { mount(); return mode === 'save' ? $('sv-box') : null; },
    apply: function (mode, q) { if (mode !== 'save') return ''; mount(); svQ = q || ''; return renderSave(); },
    size: function () { return buildPool().length; },
    icon: rankIcon
  };
})();
