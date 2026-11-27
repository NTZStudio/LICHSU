(function () {
  if (typeof window.run !== 'function' || !window.SQ) return;
  var K = { on: 'sq_fit', mode: 'sq_fit_mode', shift: 'sq_fit_shift' };
  var MODES = [['top', 'Đầu khung kết quả'], ['center', 'Giữa màn hình'], ['bottom', 'Cuối khung kết quả']];
  var pro = function () { return window.SQ.rank() >= 2; };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function on() { return get(K.on) !== '0'; }
  function mode() { var m = get(K.mode); return MODES.some(function (x) { return x[0] === m; }) ? m : 'top'; }
  function shift() { var n = parseInt(get(K.shift), 10); return isNaN(n) ? 0 : Math.max(-300, Math.min(300, n)); }
  function headH() {
    var h = document.querySelector('header.top');
    return h && /fixed|sticky/.test(getComputedStyle(h).position) ? h.getBoundingClientRect().height : 0;
  }
  var pad = null, ro = null, stopT = 0, userOff = null;
  function padEl() {
    if (!pad) { pad = document.createElement('div'); pad.id = 'sqFitPad'; pad.setAttribute('aria-hidden', 'true'); pad.style.cssText = 'height:0;pointer-events:none'; document.body.appendChild(pad); }
    return pad;
  }
  function fit(smooth) {
    var o = document.getElementById('out');
    if (!o || !o.innerHTML.trim()) return;
    var vh = window.innerHeight || document.documentElement.clientHeight, hh = headH(), r = o.getBoundingClientRect(), m = mode(), s = shift(), want;
    if (m === 'center') want = hh + (vh - hh) / 2 - r.height / 2 + s;
    else if (m === 'bottom') want = vh - 12 - r.height + s;
    else want = hh + 12 + s;
    var delta = r.top - want;
    if (Math.abs(delta) < 2) return;
    var target = Math.max(0, window.pageYOffset + delta);
    var p = padEl(), room = document.documentElement.scrollHeight - p.offsetHeight - vh;
    p.style.height = Math.max(0, Math.ceil(target - room)) + 'px';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: target, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }
  function stop() {
    if (ro) { ro.disconnect(); ro = null; }
    clearTimeout(stopT);
    if (userOff) { userOff(); userOff = null; }
  }
  function schedule() {
    stop();
    if (pad) pad.style.height = '0px';
    var t0 = Date.now(), o = document.getElementById('out');
    fit(true);
    if (window.ResizeObserver && o) {
      ro = new ResizeObserver(function () { if (Date.now() - t0 > 1600) stop(); else fit(false); });
      ro.observe(o);
    }
    var ev = ['wheel', 'touchstart', 'keydown', 'mousedown'], h = function () { stop(); };
    ev.forEach(function (e) { window.addEventListener(e, h, { passive: true }); });
    userOff = function () { ev.forEach(function (e) { window.removeEventListener(e, h); }); };
    stopT = setTimeout(stop, 1700);
  }
  var r0 = window.run;
  window.run = function () {
    var v = r0.apply(this, arguments);
    if (pro() && on()) setTimeout(function () { requestAnimationFrame(schedule); }, 40);
    return v;
  };
  var body = document.querySelector('.ntz-set-body'), anchor = body && body.querySelector('.ntz-set-actions');
  if (body && anchor && pro()) {
    var box = document.createElement('div'); box.className = 'ntz-fitbox';
    var l = document.createElement('label'); l.className = 'ntz-sw';
    var i = document.createElement('input'); i.type = 'checkbox'; i.checked = on();
    l.appendChild(i); l.appendChild(document.createElement('span')).textContent = 'Tự cuộn tới kết quả khi chấm';
    box.appendChild(l);
    var opts = document.createElement('div'); opts.className = 'ntz-fitopts';
    var r1 = document.createElement('div'); r1.className = 'ntz-set-row';
    var l1 = document.createElement('label'); l1.textContent = 'Căn theo'; l1.setAttribute('for', 'ntzFitMode');
    var sel = document.createElement('select'); sel.id = 'ntzFitMode';
    MODES.forEach(function (x) { var op = document.createElement('option'); op.value = x[0]; op.textContent = x[1]; if (x[0] === mode()) op.selected = true; sel.appendChild(op); });
    var v1 = document.createElement('span'); v1.className = 'ntz-set-val';
    r1.appendChild(l1); r1.appendChild(sel); r1.appendChild(v1);
    var r2 = document.createElement('div'); r2.className = 'ntz-set-row';
    var l2 = document.createElement('label'); l2.textContent = 'Dịch vị trí'; l2.setAttribute('for', 'ntzFitShift');
    var rng = document.createElement('input'); rng.type = 'range'; rng.id = 'ntzFitShift'; rng.min = -300; rng.max = 300; rng.step = 10; rng.value = shift();
    var v2 = document.createElement('span'); v2.className = 'ntz-set-val';
    function lab() { var n = Number(rng.value); v2.textContent = (n > 0 ? '+' : '') + n + 'px'; }
    lab();
    r2.appendChild(l2); r2.appendChild(rng); r2.appendChild(v2);
    var r3 = document.createElement('div'); r3.className = 'ntz-fitact';
    var tb = document.createElement('button'); tb.type = 'button'; tb.textContent = 'Thử vị trí';
    var rb = document.createElement('button'); rb.type = 'button'; rb.textContent = 'Mặc định';
    var hint = document.createElement('span'); hint.className = 'ntz-set-hint'; hint.textContent = 'Số dương đẩy kết quả xuống, số âm đẩy lên.';
    r3.appendChild(tb); r3.appendChild(rb); r3.appendChild(hint);
    opts.appendChild(r1); opts.appendChild(r2); opts.appendChild(r3); box.appendChild(opts);
    function vis() { opts.style.opacity = i.checked ? '1' : '.45'; opts.style.pointerEvents = i.checked ? '' : 'none'; }
    vis();
    i.addEventListener('change', function () { put(K.on, i.checked ? '1' : '0'); vis(); });
    sel.addEventListener('change', function () { put(K.mode, sel.value); });
    rng.addEventListener('input', function () { put(K.shift, rng.value); lab(); });
    tb.addEventListener('click', function () { var o = document.getElementById('out'); if (!o || !o.innerHTML.trim()) { hint.textContent = 'Hãy chấm một đề trước rồi bấm Thử vị trí.'; return; } hint.textContent = 'Số dương đẩy kết quả xuống, số âm đẩy lên.'; schedule(); });
    rb.addEventListener('click', function () { put(K.mode, 'top'); put(K.shift, '0'); sel.value = 'top'; rng.value = 0; lab(); });
    var st = document.createElement('style');
    st.textContent = '.ntz-fitbox{display:grid;gap:10px}.ntz-fitopts{display:grid;gap:10px;transition:opacity .15s}.ntz-fitopts select{width:100%;min-width:0;background:var(--panel2,#15151b);color:inherit;border:1px solid var(--line,#2a2a33);padding:6px 8px;font:inherit;font-size:13px}.ntz-fitact{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.ntz-fitact button{background:transparent;color:inherit;border:1px solid var(--line,#2a2a33);padding:6px 12px;font:inherit;font-size:12.5px;cursor:pointer}.ntz-fitact button:hover{border-color:var(--accent,#ff8a1f)}';
    document.head.appendChild(st);
    body.insertBefore(box, anchor);
  }
})();
