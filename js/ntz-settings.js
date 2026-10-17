/* Khung cài đặt kích thước các khung đáp án ở cuối trang (cờ features.ntzCardSettings). Nạp sau ntz-cards.js.
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

  /* ---------- dựng khung cài đặt ở cuối trang ---------- */
  var box = el('details', 'ntz-settings');
  box.appendChild(el('summary', '', '⚙️ Cài đặt kích thước đáp án'));
  var body = el('div', 'ntz-set-body');
  box.appendChild(body);

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
    body.appendChild(row);
  });

  if (typeof window.ntzPreviewHTML === 'function') {
    var prev = el('div', 'ntz-set-preview');
    prev.setAttribute('aria-hidden', 'true');
    prev.innerHTML = window.ntzPreviewHTML();
    body.appendChild(prev);
  }

  var actions = el('div', 'ntz-set-actions');
  var reset = el('button', 'ntz-ghost', 'Đặt lại mặc định');
  reset.type = 'button';
  reset.addEventListener('click', function () { saved = {}; apply(); persist(); sync(); });
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

  document.body.appendChild(box);
  apply();
  sync();
})();
