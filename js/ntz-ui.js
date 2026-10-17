/* Giao diện trang chính của bản NTZ Release (cờ features.ntzComposer).
   - Ô nhập gọn, tự giãn chiều cao đến hơn 3 dòng, chữ cũ phía trên mờ dần khi cuộn.
   - Nút gửi bên phải: bấm = chấm. Chuột phải (hoặc nhấn giữ trên điện thoại) = bật/tắt tự chấm.
   - Tự chấm: có chữ trong ô thì chấm ngay, xóa hết chữ thì kết quả bên dưới cũng bị xóa.
   - Cờ ntzResultTop: kết quả hiện phía TRÊN ô nhập (dưới các nút phiên bản / ngân hàng đáp án).
   - Cờ ntzClearUndo: thêm nút Xóa nội dung và nút Hoàn tác ở hàng công cụ dưới ô nhập.
   Nạp sau app.js. Các bản khác (v4, v5, LSU Alpha 1) không chạy file này. */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  if (!F.ntzComposer) return;

  var inp = document.getElementById('inp');
  var out = document.getElementById('out');
  if (!inp || !out || typeof run !== 'function') return;

  var MAX_ROWS = 3.4;     // cao tối đa: hơn 3 dòng một chút
  var FADE_MAX = 28;      // độ cao (px) của vùng mờ ở mép trên
  var DEBOUNCE = 160;     // ms chờ sau lần gõ cuối rồi mới tự chấm
  var LONG_PRESS = 550;   // ms nhấn giữ trên màn hình cảm ứng
  var KEY = ((CONFIG.storageKeys || {}).ntzAutoGrade) || 'ls_ntzAutoGrade';
  var touchUI = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  var ICON_PASTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/></svg>';

  var ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  var ICON_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';

  /* ---------- đầu trang: tiêu đề bên trái, nút phiên bản bên phải ---------- */
  document.body.classList.add('ntz-home');
  var h1 = document.querySelector('h1');
  var sub = document.querySelector('.dtline');
  var vwrap = document.getElementById('versionWrap');
  if (h1 && sub && vwrap) {
    var head = el('div', 'ntz-head');
    vwrap.parentNode.insertBefore(head, vwrap);
    if (F.ntzMinimalHeader) {
      /* Đầu trang tối giản: không hiện tiêu đề và dòng hướng dẫn, chỉ còn các nút phiên bản.
         h1 vẫn nằm trong trang nhưng ẩn khỏi mắt nhìn (chỉ trình đọc màn hình thấy), dòng hướng dẫn bị bỏ. */
      h1.textContent = 'Chấm đề Lịch sử · Trật tự hai cực Ianta';
      h1.classList.add('ntz-sr-only');
      if (sub.parentNode) sub.parentNode.removeChild(sub);
      head.appendChild(vwrap);
      document.body.classList.add('ntz-min-head');
      minimizeHeadButtons(vwrap);
    } else {
      var titles = el('div', 'ntz-titles');
      titles.appendChild(h1);
      titles.appendChild(sub);
      head.appendChild(titles);
      head.appendChild(vwrap);
      h1.textContent = 'Chấm đề Lịch sử · Trật tự hai cực Ianta';
      sub.textContent = 'Dán đề vào ô bên dưới, bấm nút gửi để chấm.';
    }
  }

  /* Tách icon và tên của từng nút ở đầu trang thành 2 phần, để CSS ẩn riêng phần tên khi màn hình hẹp
     (chỉ còn icon trong ô vuông bo góc). Tên đầy đủ vẫn nằm ở aria-label và tooltip. */
  function minimizeHeadButtons(wrap) {
    var vbtn = document.getElementById('versionBtn');
    var vname = document.getElementById('versionName');
    if (vbtn && vname) {
      Array.prototype.slice.call(vbtn.childNodes).forEach(function (n) {
        if (n.nodeType === 3) vbtn.removeChild(n);       // bỏ emoji dạng chữ, thay bằng span icon
      });
      var vi = el('span', 'ntz-ico');
      vi.textContent = '🏷️';
      vi.setAttribute('aria-hidden', 'true');
      vbtn.insertBefore(vi, vname);
      vname.classList.add('ntz-lbl');
      vbtn.setAttribute('aria-label', 'Phiên bản: ' + vname.textContent);
      vbtn.title = 'Phiên bản: ' + vname.textContent;
    }
    var bl = wrap.querySelector('.bank-link');
    if (bl) {
      bl.textContent = '';
      var bi = el('span', 'ntz-ico');
      bi.textContent = '📚';
      bi.setAttribute('aria-hidden', 'true');
      var bt = el('span', 'ntz-lbl');
      bt.textContent = 'Ngân hàng đáp án';
      bl.appendChild(bi);
      bl.appendChild(bt);
      bl.setAttribute('aria-label', 'Ngân hàng đáp án');
      bl.title = 'Ngân hàng đáp án';
    }
  }

  /* ---------- ô nhập + nút gửi ---------- */
  var box = el('div', 'ntz-box');
  inp.parentNode.insertBefore(box, inp);
  box.appendChild(inp);
  if (F.ntzResultTop) {
    // kết quả nằm phía trên ô nhập; vẫn ở dưới các nút phiên bản / ngân hàng đáp án (nằm trong .ntz-head)
    box.parentNode.insertBefore(out, box);
    document.body.classList.add('ntz-top-result');
  }
  inp.rows = 1;
  inp.placeholder = 'Dán đề vào đây…';
  inp.setAttribute('spellcheck', 'false');

  var send = el('button', 'ntz-send', ICON_SEND);
  send.type = 'button';
  send.id = 'ntzSend';
  box.appendChild(send);

  /* ---------- hàng công cụ ---------- */
  var tools = el('div', 'ntz-tools');
  box.parentNode.insertBefore(tools, box.nextSibling);

  var pasteBtn = el('button', 'ntz-ghost', ICON_PASTE + '<span>Dán</span>');
  pasteBtn.type = 'button';
  pasteBtn.title = 'Dán từ clipboard';
  pasteBtn.addEventListener('click', function () { if (typeof pasteNow === 'function') pasteNow(true); });
  tools.appendChild(pasteBtn);

  var clearBtn = null, undoBtn = null;
  if (F.ntzClearUndo) {
    clearBtn = el('button', 'ntz-ghost', ICON_TRASH + '<span>Xóa</span>');
    clearBtn.type = 'button';
    clearBtn.title = 'Xóa nội dung đã nhập';
    undoBtn = el('button', 'ntz-ghost', ICON_UNDO + '<span>Hoàn tác</span>');
    undoBtn.type = 'button';
    undoBtn.disabled = true;
    undoBtn.title = 'Chưa có gì để hoàn tác';
    tools.appendChild(clearBtn);
    tools.appendChild(undoBtn);
  }

  var apInput = document.getElementById('autoPaste');
  var apLabel = apInput && apInput.closest ? apInput.closest('label') : null;
  if (apLabel) {
    for (var i = 0; i < apLabel.childNodes.length; i++) {
      if (apLabel.childNodes[i].nodeType === 3) apLabel.childNodes[i].nodeValue = 'Tự dán clipboard';
    }
    tools.appendChild(apLabel);
  }
  tools.appendChild(el('span', 'spacer'));
  var state = el('span', 'ntz-state');
  state.setAttribute('role', 'status');
  tools.appendChild(state);

  // ẩn bộ nút cũ (đã thay bằng nút gửi và hàng công cụ mới)
  ['.opts', '.row'].forEach(function (sel) {
    var n = document.querySelector(sel);
    if (n) n.style.display = 'none';
  });
  out.setAttribute('aria-live', 'polite');

  /* ---------- tự giãn chiều cao + mờ dần phía trên ---------- */
  function fade() {
    inp.style.setProperty('--fade', Math.min(inp.scrollTop, FADE_MAX) + 'px');
  }
  function fit(forceBottom) {
    var cs = window.getComputedStyle(inp);
    var lh = parseFloat(cs.lineHeight) || 22;
    var py = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var min = Math.round(lh + py), max = Math.round(lh * MAX_ROWS + py);
    var atEnd = inp.scrollTop + inp.clientHeight >= inp.scrollHeight - 4;
    inp.style.height = 'auto';
    var need = inp.scrollHeight;
    inp.style.height = Math.max(min, Math.min(need, max)) + 'px';
    inp.style.overflowY = need > max + 1 ? 'auto' : 'hidden';
    if (forceBottom || atEnd) inp.scrollTop = inp.scrollHeight;  // luôn ưu tiên chữ mới nhất
    fade();
  }

  /* ---------- tự chấm ---------- */
  var auto = false;
  try { auto = localStorage.getItem(KEY) === '1'; } catch (e) {}
  var timer = null;

  function paintState() {
    var how = touchUI ? 'nhấn giữ nút gửi' : 'chuột phải nút gửi';
    send.setAttribute('data-auto', auto ? '1' : '0');
    send.setAttribute('aria-label', auto ? 'Chấm đáp án (tự chấm đang bật)' : 'Chấm đáp án');
    send.title = auto ? 'Chấm đáp án · tự chấm đang bật (' + how + ' để tắt)' : 'Chấm đáp án (' + how + ' để bật tự chấm)';
    state.setAttribute('data-on', auto ? '1' : '0');
    state.textContent = auto ? 'Tự chấm bật · ' + how + ' để tắt' : 'Tự chấm tắt · ' + how + ' để bật';
  }
  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(function () { if (inp.value.trim()) run(); }, delay);
  }
  function setAuto(on) {
    auto = on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    paintState();
    if (on && inp.value.trim()) schedule(0);
  }

  function onInput(e) {
    fit(!!e && e.isTrusted === false);   // sự kiện do code gửi (dán clipboard) thì cuộn xuống cuối
    if (!inp.value.trim()) {             // xóa hết chữ → xóa luôn kết quả, bất kể đang tự chấm hay không
      clearTimeout(timer);
      out.innerHTML = '';
      var ps = document.getElementById('pstatus');
      if (ps) ps.textContent = '';
      return;
    }
    if (auto) schedule(DEBOUNCE);
  }
  inp.addEventListener('input', onInput);
  inp.addEventListener('scroll', fade);
  inp.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(); }
  });
  window.addEventListener('resize', function () { fit(false); });

  /* ---------- nút gửi: bấm = chấm; chuột phải / nhấn giữ = bật tắt tự chấm ---------- */
  var lastToggle = 0, suppressClickUntil = 0, pressTimer = null;
  function toggleOnce() {
    var now = Date.now();
    if (now - lastToggle < 350) return;   // trên điện thoại, contextmenu và nhấn giữ có thể cùng báo một lần
    lastToggle = now;
    setAuto(!auto);
  }
  send.addEventListener('click', function () {
    if (Date.now() < suppressClickUntil) return;
    clearTimeout(timer);
    run();
  });
  send.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (e.pointerType === 'touch') suppressClickUntil = Date.now() + 700;
    toggleOnce();
  });
  send.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') return;
    pressTimer = setTimeout(function () {
      pressTimer = null;
      suppressClickUntil = Date.now() + 700;
      toggleOnce();
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
    }, LONG_PRESS);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
    send.addEventListener(t, function () {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
  });

  /* ---------- nút Xóa + Hoàn tác ----------
     Lưu lại (nội dung ô nhập + kết quả đang hiện) trước mỗi lần Xóa hoặc dán đè; Hoàn tác trả về bản gần nhất. */
  if (clearBtn && undoBtn) {
    var HIST = [], HIST_MAX = 20;
    var syncUndo = function () {
      undoBtn.disabled = !HIST.length;
      undoBtn.title = HIST.length ? 'Hoàn tác (' + HIST.length + ')' : 'Chưa có gì để hoàn tác';
    };
    var snap = function () {
      var v = inp.value;
      if (!v.trim()) return;
      var top = HIST[HIST.length - 1];
      if (top && top.value === v) { top.html = out.innerHTML; return; }
      HIST.push({ value: v, html: out.innerHTML });
      if (HIST.length > HIST_MAX) HIST.shift();
      syncUndo();
    };

    // dán từ clipboard sẽ đè nội dung cũ → lưu bản cũ trước khi đè
    var origApply = window.applyPasted;
    if (typeof origApply === 'function') {
      window.applyPasted = function (text, note) {
        if (inp.value !== text) snap();
        return origApply(text, note);
      };
    }

    clearBtn.addEventListener('click', function () {
      if (!inp.value.length && !out.innerHTML) return;
      snap();
      clearTimeout(timer);
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));  // xóa kết quả, co ô nhập lại
      inp.focus();
    });

    undoBtn.addEventListener('click', function () {
      var s = HIST.pop();
      if (!s) return;
      clearTimeout(timer);
      inp.value = s.value;
      out.innerHTML = s.html;
      fit(true);
      syncUndo();
      inp.focus();
    });
  }

  paintState();
  fit(true);
  if (auto && inp.value.trim()) schedule(0);
})();
