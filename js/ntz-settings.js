/* SETTING (trước là "Cài đặt kích thước đáp án"): chế độ QUICK (kích thước + tùy biến thẻ PROMAX) và SENTENCE (sắp ra mắt).
   Khung cài đặt ở cuối trang (cờ features.ntzCardSettings). Nạp sau ntz-cards.js.
   Ba thanh trượt: chiều ngang, chiều dọc, tỉ lệ scale. Giá trị được đặt thành biến CSS --u-w, --u-h, --u-k trên <html>
   (css/ntz.css đọc các biến này), nên kết quả đang hiển thị đổi kích thước ngay khi kéo. Lưu trong localStorage.
   Chỉ giá trị người dùng đã chỉnh mới được lưu; chưa chỉnh thì CSS dùng mặc định (màn hẹp có mặc định chiều cao riêng). */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  if (!F.ntzCardSettings) return;

  var root = document.documentElement;
  var KEY = ((CONFIG.storageKeys || {}).ntzCardSize) || 'ls_ntzCardSize';
  var mq = window.matchMedia ? window.matchMedia('(max-width:520px)') : null;
  var narrow = function () { return !!(mq && mq.matches); };

  // k = tỉ lệ scale, tính bằng %
  var SPEC = [
    { key: 'w', label: 'Chiều ngang', min: 28, max: 110, step: 1, unit: 'px', def: function () { return 58; } },
    { key: 'h', label: 'Chiều dọc',   min: 36, max: 140, step: 1, unit: 'px', def: function () { return narrow() ? 56 : 64; } },
    { key: 'k', label: 'Tỉ lệ (scale)', min: 50, max: 200, step: 5, unit: '%', def: function () { return 100; } }
  ];

  var saved = {};
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    SPEC.forEach(function (s) {
      var n = Number(raw[s.key]);
      if (raw[s.key] != null && isFinite(n)) saved[s.key] = Math.min(s.max, Math.max(s.min, n));
    });
  } catch (e) {}

  function persist() {
    try {
      if (Object.keys(saved).length) localStorage.setItem(KEY, JSON.stringify(saved));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function apply() {
    if (saved.w != null) root.style.setProperty('--u-w', saved.w); else root.style.removeProperty('--u-w');
    if (saved.h != null) root.style.setProperty('--u-h', saved.h); else root.style.removeProperty('--u-h');
    if (saved.k != null) root.style.setProperty('--u-k', saved.k / 100); else root.style.removeProperty('--u-k');
    // đã chỉnh chiều ngang → giữ đúng cỡ đó, màn hẹp thì cuộn ngang
    root.classList.toggle('ntz-fixed-w', saved.w != null);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ---------- dựng khung SETTING ở cuối trang ---------- */
  var box = el('details', 'ntz-settings');
  box.appendChild(el('summary', '', '⚙️ SETTING'));
  var body = el('div', 'ntz-set-body');
  box.appendChild(body);

  // ô đầu tiên: chuyển chế độ
  var modeRow = el('div', 'ntz-mode');
  modeRow.setAttribute('role', 'group'); modeRow.setAttribute('aria-label', 'Chế độ');
  var bQuick = el('button', 'on', 'QUICK'); bQuick.type = 'button';
  var bSent = el('button', '', 'SENTENCE'); bSent.type = 'button';
  bSent.appendChild(el('small', '', 'Từng câu · PROMAX'));
  modeRow.appendChild(bQuick); modeRow.appendChild(bSent);
  body.appendChild(modeRow);
  var quick = el('div', 'ntz-quick');
  body.appendChild(quick);
  var sentPanel = el('div', 'ntz-sentpanel'); sentPanel.hidden = true; body.appendChild(sentPanel);   // js/ntz-sentence.js điền nội dung
  var sentNote = el('div', 'ntz-x-lock'); sentNote.hidden = true; body.appendChild(sentNote);
  function syncMode() {
    var m = window.ntzMode ? window.ntzMode.get() : 'quick';
    bQuick.className = m === 'quick' ? 'on' : ''; bSent.className = m === 'sentence' ? 'on' : '';
    quick.hidden = m === 'sentence'; sentPanel.hidden = m !== 'sentence'; sentNote.hidden = true;
  }
  window.ntzModeSync = syncMode;
  bQuick.addEventListener('click', function () { if (window.ntzMode) window.ntzMode.set('quick'); syncMode(); });
  bSent.addEventListener('click', function () {
    if (!window.ntzX.pro() || !window.ntzMode) {
      sentNote.innerHTML = '🔒 Chế độ <b>SENTENCE</b> (hiện từng câu, tra ID, kiểu Azota) dành cho gói <b>PROMAX</b>. <a href="index.html#goi">Xem gói</a>';
      sentNote.hidden = false; return;
    }
    window.ntzMode.set('sentence'); syncMode();
  });

  var inputs = {}, vals = {};
  SPEC.forEach(function (s) {
    var id = 'ntzSet_' + s.key;
    var row = el('div', 'ntz-set-row');
    var lab = el('label', '', s.label); lab.setAttribute('for', id);
    var inp = el('input'); inp.type = 'range'; inp.id = id;
    inp.min = s.min; inp.max = s.max; inp.step = s.step;
    var val = el('span', 'ntz-set-val');
    val.setAttribute('aria-hidden', 'true');
    inputs[s.key] = inp; vals[s.key] = val;
    inp.addEventListener('input', function () {
      saved[s.key] = Number(inp.value);
      val.textContent = inp.value + s.unit;
      apply(); persist();
    });
    row.appendChild(lab); row.appendChild(inp); row.appendChild(val);
    quick.appendChild(row);
  });

  if (typeof window.ntzPreviewHTML === 'function') {
    var prev = el('div', 'ntz-set-preview');
    prev.setAttribute('aria-hidden', 'true');
    prev.innerHTML = window.ntzPreviewHTML();
    quick.appendChild(prev);
  }


  function ADV() {
    adv.innerHTML = '';
    adv.appendChild(el('div', 'ntz-adv-h', 'TÙY BIẾN THẺ'));
    if (!X.pro()) {
      var lk = el('div', 'ntz-x-lock');
      lk.innerHTML = '🔒 Kiểu khung, màu từng đáp án, bố trí và tinh chỉnh từng câu dành cho gói <b>PROMAX</b>. <a href="index.html#goi">Xem gói</a>';
      adv.appendChild(lk); return;
    }
    var st = X.get();
    function sec(t) { adv.appendChild(el('div', 'ntz-adv-s', t)); }
    function chips(list, cur, cb) {
      var w = el('div', 'ntz-chips');
      list.forEach(function (it) {
        var b = el('button', it[0] === cur ? 'on' : '', it[1]); b.type = 'button';
        b.addEventListener('click', function () { cb(it[0]); ADV(); });
        w.appendChild(b);
      });
      adv.appendChild(w);
    }
    sec('Kiểu khung đáp án');
    chips([['glow', 'Glow'], ['line', 'Viền mảnh'], ['solid', 'Đặc'], ['bar', 'Thanh màu'], ['luxe', 'Luxe']], st.style, function (v) { X.set({ style: v }); });

    sec('Màu từng đáp án');
    var cg = el('div', 'ntz-colors'), DEF = { a: '#ef4444', b: '#facc15', c: '#3b82f6', d: '#22c55e', t: '#22c55e', f: '#ef4444' };
    [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D'], ['t', 'Đúng'], ['f', 'Sai']].forEach(function (k) {
      var l = el('label', '', ''), i = el('input'); i.type = 'color'; i.value = st.c[k[0]] || DEF[k[0]];
      l.appendChild(i); l.appendChild(el('span', '', k[1]));
      i.addEventListener('input', function () { var c = Object.assign({}, X.get().c); c[k[0]] = i.value; X.set({ c: c }); });
      cg.appendChild(l);
    });
    var rc = el('button', 'ntz-ghost', 'Màu gốc'); rc.type = 'button';
    rc.addEventListener('click', function () { X.set({ c: {} }); ADV(); });
    cg.appendChild(rc); adv.appendChild(cg);

    sec('Bố trí Phần I');
    var pr = el('div', 'ntz-set-row'), pl = el('label', '', 'Số câu / hàng'), pi = el('input'), pval = el('span', 'ntz-set-val');
    pi.type = 'range'; pi.min = 4; pi.max = 12; pi.step = 1; pi.value = st.per || (CONFIG.output && CONFIG.output.part1PerLine) || 8;
    pval.textContent = pi.value;
    pi.addEventListener('input', function () { pval.textContent = pi.value; X.set({ per: Number(pi.value) }); });
    pr.appendChild(pl); pr.appendChild(pi); pr.appendChild(pval); adv.appendChild(pr);
    chips([['num', 'Theo số câu'], ['ans', 'Gom theo đáp án'], ['low', 'Chưa chắc lên đầu'], ['custom', 'Tự sắp xếp']], st.order, function (v) {
      var p = { order: v };
      if (v === 'custom' && !st.custom.length && X.last) p.custom = X.last[0].map(function (r) { return r.num; });
      X.set(p);
    });

    sec('Bố trí Phần II (Đúng / Sai)');
    chips([['row', 'Một hàng'], ['grid', '2 × 2'], ['stack', 'Nhãn trên'], ['mini', 'Gọn']], st.p2, function (v) { X.set({ p2: v }); });

    sec('Tinh chỉnh từng câu');
    adv.appendChild(ql);
    QL();
  }
  var ql = el('div', 'ntz-ql');
  function QL() {
    ql.innerHTML = '';
    var r1 = X.last && X.last[0];
    if (!r1 || !r1.length) { ql.appendChild(el('div', 'ntz-set-hint', 'Chấm một đề để chỉnh màu, cỡ và vị trí từng câu.')); return; }
    var st = X.get(), list = X.order(r1, st), nums = list.map(function (r) { return r.num; });
    list.forEach(function (r, ix) {
      var o = st.q[r.num] || {}, row = el('div', 'ntz-qr');
      row.appendChild(el('b', '', 'Câu ' + r.num)); row.appendChild(el('span', 'q-a', r.ans || '?'));
      var ci = el('input'); ci.type = 'color'; ci.value = o.c || '#888888'; ci.title = 'Màu riêng';
      ci.addEventListener('change', function () { setQ(r.num, { c: ci.value }); });
      var cx = el('button', 'ntz-ghost', '×'); cx.type = 'button'; cx.title = 'Bỏ màu riêng'; cx.disabled = !o.c;
      cx.addEventListener('click', function () { setQ(r.num, { c: '' }); });
      var sz = el('select'); [[85, 'Nhỏ'], [100, 'Chuẩn'], [120, 'Lớn'], [140, 'Rất lớn']].forEach(function (z) {
        var op = el('option', '', z[1]); op.value = z[0]; if ((o.k || 100) === z[0]) op.selected = true; sz.appendChild(op);
      });
      sz.addEventListener('change', function () { setQ(r.num, { k: Number(sz.value) }); });
      function mv(d) { var a = nums.slice(), j = ix + d; if (j < 0 || j >= a.length) return; var t = a[ix]; a[ix] = a[j]; a[j] = t; X.set({ order: 'custom', custom: a }); ADV(); }
      var up = el('button', 'ntz-ghost', '↑'), dn = el('button', 'ntz-ghost', '↓'); up.type = dn.type = 'button';
      up.addEventListener('click', function () { mv(-1); }); dn.addEventListener('click', function () { mv(1); });
      [ci, cx, sz, up, dn].forEach(function (n) { row.appendChild(n); });
      ql.appendChild(row);
    });
  }
  function setQ(n, p) {
    var q = Object.assign({}, X.get().q), o = Object.assign({}, q[n] || {}, p);
    if (!o.c) delete o.c; if (!o.k || o.k === 100) delete o.k;
    if (Object.keys(o).length) q[n] = o; else delete q[n];
    X.set({ q: q });
  }

  /* ---------- QUICK nâng cao (PROMAX) ---------- */
  var X = window.ntzX, pv = typeof window.ntzPreviewHTML === 'function' ? prev : null;
  function repaint() { if (pv) pv.innerHTML = window.ntzPreviewHTML(); }
  X.hooks.push(repaint);
  X.hooks.push(function () { if (adv.contains(ql)) QL(); });
  var adv = el('div', 'ntz-adv');
  quick.appendChild(adv);
  ADV();

  var actions = el('div', 'ntz-set-actions');
  var reset = el('button', 'ntz-ghost', 'Đặt lại mặc định');
  reset.type = 'button';
  reset.addEventListener('click', function () { saved = {}; apply(); persist(); sync(); if (X.pro()) { X.reset(); ADV(); } });
  actions.appendChild(reset);
  actions.appendChild(el('span', 'ntz-set-hint', 'Tự lưu trên thiết bị này.'));
  body.appendChild(actions);

  // đưa thanh trượt về giá trị đang dùng (đã lưu hoặc mặc định)
  function sync() {
    SPEC.forEach(function (s) {
      var v = saved[s.key] != null ? saved[s.key] : s.def();
      inputs[s.key].value = v;
      vals[s.key].textContent = v + s.unit;
    });
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', sync);  // đổi cỡ màn hình → cập nhật mặc định hiển thị

  (document.querySelector('.ntz-mount') || document.body).appendChild(box);
  X.vars();
  apply();
  sync();
})();
