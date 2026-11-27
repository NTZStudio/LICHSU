/* Trang Chấm: 2 mục trong khung cài đặt kích thước đáp án, chỉ PROMAX dùng được.
   1) Độ chắc chắn (thanh trượt 0-2): chỉ đổi CÁCH HIỂN THỊ (làm mờ câu chắc chắn, nổi bật câu chưa chắc). Đáp án không bị đổi.
   2) Ước tính điểm: đếm câu chắc chắn / chưa chắc của kết quả vừa chấm, quy ra khoảng điểm thang 10.
   Nạp sau ntz-settings.js. Cần SQ (plans.js). */
(function () {
  var body = document.querySelector('.ntz-set-body');
  if (!body || !window.SQ) return;
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; }
  var anchor = body.querySelector('.ntz-set-actions');
  var wrap = el('div', 'ntz-x');
  body.insertBefore(wrap, anchor);

  if (SQ.rank() < 2) {
    wrap.appendChild(el('div', 'ntz-x-lock', '🔒 <b>Độ chắc chắn</b> và <b>Ước tính điểm</b> dành cho gói <b>PROMAX</b>. <a href="index.html#goi">Xem gói</a>'));
    return;
  }

  /* ---------- 1) Độ chắc chắn ---------- */
  var KEY = 'sq_focus', root = document.documentElement;
  var DESC = ['Bình thường: hiển thị đầy đủ như mặc định.',
              'Nhấn câu chưa chắc: câu chắc chắn mờ bớt, câu chưa chắc có viền nhấp nháy.',
              'Chỉ câu chưa chắc: câu chắc chắn gần như ẩn, chỉ còn các câu cần kiểm tra lại.'];
  var lv = 0; try { lv = Math.max(0, Math.min(2, +localStorage.getItem(KEY) || 0)); } catch (e) {}
  var row = el('div', 'ntz-set-row');
  var lab = el('label', '', 'Độ chắc chắn'); lab.setAttribute('for', 'ntzFocus');
  var rg = el('input'); rg.type = 'range'; rg.id = 'ntzFocus'; rg.min = 0; rg.max = 2; rg.step = 1; rg.value = lv;
  var val = el('span', 'ntz-set-val'); row.appendChild(lab); row.appendChild(rg); row.appendChild(val);
  var hint = el('div', 'ntz-set-hint');
  function applyFocus() {
    root.classList.remove('focus-1', 'focus-2'); if (lv) root.classList.add('focus-' + lv);
    val.textContent = 'Mức ' + lv; hint.textContent = DESC[lv];
    try { localStorage.setItem(KEY, String(lv)); } catch (e) {}
  }
  rg.addEventListener('input', function () { lv = +rg.value; applyFocus(); });
  wrap.appendChild(row); wrap.appendChild(hint); applyFocus();

  /* ---------- 2) Ước tính điểm ---------- */
  var est = el('div', 'ntz-est');
  est.innerHTML = '<div class="est-h">ƯỚC TÍNH ĐIỂM</div><div class="est-big" id="estBig">–</div><div class="est-sub" id="estSub">Chấm một đề để xem ước tính.</div><div class="est-bar" aria-hidden="true"><i class="c"></i><i class="u"></i></div><div class="ntz-set-hint">Đây là mức tin cậy của đáp án dò được (câu chưa chắc có thể đúng hoặc sai), không phải điểm chính thức.</div>';
  wrap.appendChild(est);
  var big = est.querySelector('#estBig'), sub = est.querySelector('#estSub'), bc = est.querySelector('.c'), bu = est.querySelector('.u');

  function count(r1, r2) {
    var c = 0, u = 0;
    (r1 || []).forEach(function (r) { if (!r.ans || r.ans === '?' || r.low) u++; else c++; });
    (r2 || []).forEach(function (r) {
      var s = r.chuoi || '';
      for (var i = 0; i < 4; i++) { var ch = s.charAt(i); if (ch === 'Đ' || ch === 'S') c++; else u++; }
    });
    return { c: c, u: u };
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  function show(r1, r2) {
    var k = count(r1, r2), t = k.c + k.u;
    if (!t) { big.textContent = '–'; sub.textContent = 'Chấm một đề để xem ước tính.'; bc.style.width = bu.style.width = '0'; return; }
    var lo = k.c / t * 10, hi = 10;
    big.textContent = k.u ? fmt(lo) + ' – ' + fmt(hi) + ' / 10' : '10 / 10';
    sub.textContent = k.c + ' đáp án chắc chắn · ' + k.u + ' chưa chắc · tổng ' + t + ' đáp án';
    bc.style.width = (k.c / t * 100) + '%'; bu.style.width = (k.u / t * 100) + '%';
  }
  var orig = window.ntzRenderResults;
  if (typeof orig === 'function') {
    window.ntzRenderResults = function (r1, r2, w) { var h = orig(r1, r2, w); setTimeout(function () { show(r1, r2); }, 0); return h; };
  }
  var out = document.getElementById('out');
  if (out) new MutationObserver(function () { if (!out.innerHTML.trim()) show([], []); }).observe(out, { childList: true });
})();
