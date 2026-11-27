/* Chế độ SENTENCE (PROMAX): hiện từng câu một kiểu Azota. Bật trong SETTING > SENTENCE.
   Với mỗi câu đã dán: tra ID câu hỏi trong ngân hàng bài (window.ADV_BANK, mỗi câu có id riêng), lấy đáp án đúng từ ngân hàng
   rồi khớp lại với các đáp án người dùng dán (giữ nguyên A B C D theo đề). Không có trong ngân hàng thì dùng đáp án dò của bộ chấm (đánh dấu chưa chắc).
   Bên phải có danh sách câu từ đầu đến cuối; dưới mỗi câu có khung giải thích (chưa có nội dung: thêm sau bằng window.ADV_EXPLAIN = { id: 'text' }).
   Cần app.js gắn q/opts (Phần I) và tl/sts (Phần II) vào kết quả. Nạp SAU ntz-layouts.js, TRƯỚC grade-extra.js. */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  if (!F.ntzCards || !window.ntzX) return;
  var X = window.ntzX, KEY = 'sq_sent', MK = 'sq_mode', root = document.documentElement;
  var D = { reveal: 'always', size: 100, showId: true, showExp: true, opt: 'row', panel: 'right', low: true, keys: true };
  var S = Object.assign({}, D);
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var pro = function () { return !!(window.SQ && window.SQ.rank() >= 2); };
  function mode() { try { return localStorage.getItem(MK) === 'sentence' ? 'sentence' : 'quick'; } catch (e) { return 'quick'; } }
  function on() { return pro() && mode() === 'sentence'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; }

  window.ntzMode = {
    get: function () { return pro() ? mode() : 'quick'; },
    set: function (m) {
      try { localStorage.setItem(MK, m); } catch (e) {}
      root.classList.toggle('ntz-mode-sentence', on());
      if (window.ntzModeSync) window.ntzModeSync();
      X.refresh();
    }
  };
  root.classList.toggle('ntz-mode-sentence', on());

  /* ---------- tra ngân hàng ---------- */
  var IDX = null;
  function bank() {
    if (IDX) return IDX;
    IDX = { q: [], p: [] };
    var A = window.ADV_BANK || {};
    Object.keys(A).forEach(function (n) {
      var t = A[n].title || ('Bài ' + n);
      (A[n].questions || []).forEach(function (q) { IDX.q.push({ id: q[0], lesson: t, text: q[1], opts: q[2], ans: q[3] }); });
      (A[n].part2 || []).forEach(function (p) { IDX.p.push({ id: p[0], lesson: t, text: p[1], sts: p[2] }); });
    });
    return IDX;
  }
  function find1(r) {
    if (r._f !== undefined) return r._f;
    var best = null, bs = 0;
    if (r.q && r.opts) bank().q.forEach(function (e) {
      var s = jac(r.q, e.text); if (s < 0.6) return;
      var ov = 0; r.opts.forEach(function (o) { var m = 0; e.opts.forEach(function (x) { m = Math.max(m, jac(o.text, x)); }); ov += m; });
      var t = 0.6 * s + 0.4 * (ov / r.opts.length);
      if (t > bs) { bs = t; best = e; }
    });
    return (r._f = bs >= 0.8 ? best : null);
  }
  function info1(r) {
    var e = find1(r), letter = r.ans, sure = !r.low;
    if (e && r.opts) {
      var t = e.opts['ABCDEFGH'.indexOf(e.ans)];
      if (t) { var m = matchToTarget(r.opts, t); if (m) { letter = m; sure = true; } }
    }
    return { id: e && e.id, lesson: e && e.lesson, letter: letter, sure: sure };
  }
  function info2(r) {
    var e = null, bs = 0;
    if (r.tl) bank().p.forEach(function (x) { var s = jac(r.tl, x.text); if (s > bs && s >= 0.6) { bs = s; e = x; } });
    var items = ['a', 'b', 'c', 'd'].map(function (l, k) {
      var ch = (r.chuoi || '').charAt(k) || '?', up = ch.toUpperCase(), low = ch === 'đ' || ch === 's';
      var st = (r.sts || []).filter(function (x) { return x.letter === l; })[0];
      if (e && st) {
        var bb = null, sc = 0; e.sts.forEach(function (x) { var s = jac(st.text, x[0]); if (s > sc) { sc = s; bb = x; } });
        if (bb && sc >= 0.7) { up = bb[1] === 1 ? 'Đ' : 'S'; low = false; }
      }
      return { l: l, text: st ? st.text : '', v: up === 'Đ' || up === 'S' ? up : '?', low: low };
    });
    return { id: e && e.id, lesson: e && e.lesson, items: items };
  }

  /* ---------- trạng thái + dựng giao diện ---------- */
  var cur = 0, sel = {}, sig = '';
  function items() {
    var L = X.last || [[], []], a = [];
    (L[0] || []).forEach(function (r) { a.push({ k: 1, r: r }); });
    (L[1] || []).forEach(function (r) { a.push({ k: 2, r: r }); });
    return a;
  }
  function revealed(it, l) { return S.reveal === 'always' || (it.k === 1 ? sel[it.r.num] != null : (sel[it.r.num] || {})[l] != null); }

  function main(it) {
    var r = it.r, h = '', cf;
    if (it.k === 1) {
      var f = info1(r); cf = f.sure;
      h += top(r.num, 'Phần I · Trắc nghiệm', f.id, f.lesson, f.sure);
      h += r.q ? '<div class="sq-q">' + esc(r.q) + '</div>' : '<div class="sq-q sq-dim">Không có nội dung câu hỏi trong phần đã dán.</div>';
      var ops = r.opts || ['A', 'B', 'C', 'D'].map(function (l) { return { letter: l, text: '' }; });
      h += '<div class="sq-opts sq-o-' + S.opt + '">' + ops.map(function (o) {
        var rv = revealed(it), ok = rv && o.letter === f.letter, bad = rv && sel[r.num] === o.letter && o.letter !== f.letter;
        return '<button type="button" class="sq-o' + (ok ? ' ok' : '') + (bad ? ' bad' : '') + (sel[r.num] === o.letter ? ' pick' : '') + '" data-l="' + o.letter + '"><span class="sq-l">' + o.letter + '</span><span class="sq-t">' + esc(o.text) + '</span><span class="sq-m">' + (ok ? '✓' : bad ? '✗' : '') + '</span></button>';
      }).join('') + '</div>';
      if (!r.opts) h += '<div class="sq-ans">Đáp án đúng: <b>' + esc(f.letter || '?') + '</b></div>';
      h += exp(f.id);
    } else {
      var g = info2(r), cs = g.items.every(function (x) { return !x.low; });
      h += top(r.num, 'Phần II · Đúng / Sai', g.id, g.lesson, cs);
      if (r.tl) h += '<div class="sq-tl">' + esc(r.tl) + '</div>';
      h += '<div class="sq-sts">' + g.items.map(function (x) {
        var rv = revealed(it, x.l), pk = (sel[r.num] || {})[x.l];
        function bt(v, w) { var ok = rv && x.v === v, bad = rv && pk === v && x.v !== v; return '<button type="button" class="sq-b' + (ok ? ' ok' : '') + (bad ? ' bad' : '') + (pk === v ? ' pick' : '') + (ok && x.low && S.low ? ' lo' : '') + '" data-st="' + x.l + '" data-v="' + v + '">' + w + '</button>'; }
        return '<div class="sq-s"><span class="sq-l">' + x.l + '</span><span class="sq-t">' + esc(x.text) + '</span><div class="sq-tf">' + bt('Đ', 'Đúng') + bt('S', 'Sai') + '</div></div>';
      }).join('') + '</div>';
      h += exp(g.id);
    }
    return h;
  }
  function top(num, part, id, lesson, sure) {
    return '<div class="sq-top"><b>Câu ' + num + '</b><span class="sq-chip">' + part + '</span>' +
      (S.showId ? '<span class="sq-chip' + (id ? ' sq-id' : ' sq-dim') + '">' + (id ? 'ID ' + esc(id) : 'Chưa có ID') + '</span>' : '') +
      (lesson ? '<span class="sq-chip">' + esc(lesson) + '</span>' : '') +
      (!sure && S.low ? '<span class="sq-chip sq-warn">Chưa chắc</span>' : '') + '</div>';
  }
  function exp(id) {
    if (!S.showExp) return '';
    var t = window.ADV_EXPLAIN && id && window.ADV_EXPLAIN[id];
    return '<div class="sq-exp"><h4>GIẢI THÍCH</h4>' + (t ? '<div class="sq-expt">' + esc(t) + '</div>' : '<div class="sq-dim">Chưa có giải thích cho câu này.</div>') + '</div>';
  }
  function side(list) {
    var h = '<aside class="sq-side"><div class="sq-sh">DANH SÁCH CÂU</div>';
    [1, 2].forEach(function (k) {
      var g = list.map(function (it, i) { return { it: it, i: i }; }).filter(function (x) { return x.it.k === k; });
      if (!g.length) return;
      h += '<div class="sq-sg">' + (k === 1 ? 'Phần I' : 'Phần II') + ' · ' + g.length + ' câu</div><div class="sq-grid">' + g.map(function (x) {
        var r = x.it.r, st = '';
        if (S.reveal === 'pick') {
          if (x.it.k === 1 && sel[r.num] != null) st = sel[r.num] === info1(r).letter ? ' ok' : ' bad';
        }
        var lowq = x.it.k === 1 ? !info1(r).sure : info2(r).items.some(function (y) { return y.low; });
        return '<button type="button" class="sq-n' + (x.i === cur ? ' cur' : '') + st + (S.low && lowq ? ' low' : '') + '" data-i="' + x.i + '">' + r.num + '</button>';
      }).join('') + '</div>';
    });
    return h + '</aside>';
  }
  function html() {
    var list = items();
    var sg = list.map(function (i) { return i.k + '.' + i.r.num + (i.r.ans || i.r.chuoi || ''); }).join(',');
    if (sg !== sig) { sig = sg; cur = 0; sel = {}; }
    cur = Math.max(0, Math.min(list.length - 1, cur));
    var it = list[cur];
    return '<div class="result sq sq-p-' + S.panel + '" style="--sqz:' + (S.size / 100) + '"><div class="sq-wrap"><div class="sq-main">' + main(it) +
      '<div class="sq-nav"><button type="button" data-nav="-1"' + (cur === 0 ? ' disabled' : '') + '>← Câu trước</button><span>' + (cur + 1) + ' / ' + list.length + '</span><button type="button" data-nav="1"' + (cur === list.length - 1 ? ' disabled' : '') + '>Câu sau →</button></div></div>' + side(list) + '</div></div>';
  }
  function paint() { var o = document.getElementById('out'); if (o && o.querySelector('.sq')) o.innerHTML = html(); }

  var orig = window.ntzRenderResults;
  window.ntzRenderResults = function (a, b, c) {
    if (!on() || !((a && a.length) || (b && b.length))) return orig(a, b, c);
    X.last = [a, b, c]; X.vars();
    setTimeout(function () { X.hooks.forEach(function (f) { f(); }); }, 0);
    return html();
  };
  window.ntzSentRefresh = paint;

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.sq [data-i],.sq [data-nav],.sq .sq-o,.sq .sq-b') : null;
    if (!t) return;
    var list = items(), it = list[cur];
    if (t.hasAttribute('data-i')) cur = +t.getAttribute('data-i');
    else if (t.hasAttribute('data-nav')) cur += +t.getAttribute('data-nav');
    else if (t.classList.contains('sq-o')) sel[it.r.num] = t.getAttribute('data-l');
    else { var m = sel[it.r.num] || {}; m[t.getAttribute('data-st')] = t.getAttribute('data-v'); sel[it.r.num] = m; }
    paint();
  });
  document.addEventListener('keydown', function (e) {
    if (!S.keys || !on() || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || e.ctrlKey || e.metaKey || e.altKey) return;
    var o = document.getElementById('out'); if (!o || !o.querySelector('.sq')) return;
    var list = items(), it = list[cur], k = e.key;
    if (k === 'ArrowRight') cur++; else if (k === 'ArrowLeft') cur--;
    else if (it.k === 1 && /^[a-dA-D]$/.test(k)) sel[it.r.num] = k.toUpperCase();
    else if (it.k === 1 && /^[1-4]$/.test(k)) sel[it.r.num] = 'ABCD'.charAt(+k - 1);
    else return;
    e.preventDefault(); paint();
  });

  /* ---------- tùy chỉnh trong SETTING > SENTENCE ---------- */
  var host = document.querySelector('.ntz-sentpanel');
  function panel() {
    if (!host) return; host.innerHTML = '';
    function sec(t) { host.appendChild(el('div', 'ntz-adv-s', t)); }
    function chips(list, key) {
      var w = el('div', 'ntz-chips');
      list.forEach(function (o) {
        var b = el('button', S[key] === o[0] ? 'on' : '', o[1]); b.type = 'button';
        b.addEventListener('click', function () { S[key] = o[0]; save(); panel(); paint(); }); w.appendChild(b);
      }); host.appendChild(w);
    }
    function sw(key, label) {
      var l = el('label', 'ntz-sw'), i = el('input'); i.type = 'checkbox'; i.checked = !!S[key];
      i.addEventListener('change', function () { S[key] = i.checked; save(); paint(); });
      l.appendChild(i); l.appendChild(el('span', '', label)); host.appendChild(l);
    }
    host.appendChild(el('div', 'ntz-adv-h', 'TỪNG CÂU'));
    sec('Hiện đáp án'); chips([['always', 'Luôn hiện'], ['pick', 'Hiện khi chọn']], 'reveal');
    sec('Kiểu đáp án'); chips([['row', 'Một cột'], ['grid', '2 cột']], 'opt');
    sec('Vị trí danh sách câu'); chips([['right', 'Bên phải'], ['left', 'Bên trái']], 'panel');
    var r = el('div', 'ntz-set-row'), lb = el('label', '', 'Cỡ chữ'), rg = el('input'), v = el('span', 'ntz-set-val', S.size + '%');
    rg.type = 'range'; rg.min = 80; rg.max = 140; rg.step = 5; rg.value = S.size;
    rg.addEventListener('input', function () { S.size = +rg.value; v.textContent = S.size + '%'; save(); paint(); });
    r.appendChild(lb); r.appendChild(rg); r.appendChild(v); host.appendChild(r);
    sw('showId', 'Hiện ID câu hỏi'); sw('showExp', 'Hiện khung giải thích'); sw('low', 'Đánh dấu câu chưa chắc'); sw('keys', 'Phím tắt: ← → chuyển câu, A–D chọn đáp án');
  }
  panel();
  if (window.ntzModeSync) window.ntzModeSync();
})();
