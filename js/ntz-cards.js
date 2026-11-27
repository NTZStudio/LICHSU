/* ---------- ntzX: tùy biến thẻ (PROMAX), dùng chung với js/ntz-settings.js ---------- */
(function () {
  var KEY = 'sq_cardx', D = { style: 'glow', c: {}, per: 0, order: 'num', custom: [], q: {}, p2: 'row' };
  var X = { s: null, last: null, hooks: [] };
  X.pro = function () { return !!(window.SQ && window.SQ.rank() >= 2); };
  X.get = function () {
    if (!X.s) { try { X.s = Object.assign({}, D, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { X.s = Object.assign({}, D); } }
    return X.pro() ? X.s : D;
  };
  X.rgb = function (h) { h = String(h || '').replace('#', ''); if (h.length !== 6) return ''; return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(','); };
  X.dark = function (h) { var v = X.rgb(h); return v ? v.split(',').map(function (n) { return Math.round(n * 0.6); }).join(',') : ''; };
  X.vars = function () {
    var r = document.documentElement, c = X.get().c;
    ['a', 'b', 'c', 'd', 't', 'f'].forEach(function (k) {
      if (c[k]) { r.style.setProperty('--x-' + k, X.rgb(c[k])); r.style.setProperty('--x-' + k + 'd', X.dark(c[k])); }
      else { r.style.removeProperty('--x-' + k); r.style.removeProperty('--x-' + k + 'd'); }
    });
  };
  X.set = function (p) {
    X.get(); Object.assign(X.s, p);
    try { localStorage.setItem(KEY, JSON.stringify(X.s)); } catch (e) {}
    X.refresh();
  };
  X.reset = function () { X.s = Object.assign({}, D, { c: {}, custom: [], q: {} }); try { localStorage.removeItem(KEY); } catch (e) {} X.refresh(); };
  // thứ tự hiển thị Phần I theo cài đặt
  X.order = function (res, s) {
    var a = res.slice(), by = function (f) { a.sort(function (x, y) { return f(x, y) || x.num - y.num; }); };
    if (s.order === 'ans') by(function (x, y) { return String(x.ans || 'Z').localeCompare(String(y.ans || 'Z')); });
    else if (s.order === 'low') by(function (x, y) { return (!!y.low) - (!!x.low); });
    else if (s.order === 'custom') { var ix = {}; s.custom.forEach(function (n, i) { ix[n] = i; }); by(function (x, y) { return (ix[x.num] == null ? 1e6 : ix[x.num]) - (ix[y.num] == null ? 1e6 : ix[y.num]); }); }
    return a;
  };
  X.refresh = function () {
    X.vars();
    var o = document.getElementById('out');
    if (X.last && o && o.querySelector('.ntz-cards, .ly, .sq') && typeof window.ntzRenderResults === 'function') o.innerHTML = window.ntzRenderResults(X.last[0], X.last[1], X.last[2]);
    X.hooks.forEach(function (f) { f(); });
  };
  window.ntzX = X;
})();

/* Hiển thị kết quả dạng thẻ cho bản NTZ Release (cờ features.ntzCards). Nạp sau app.js.
   Phần I : mỗi câu là một khung chữ nhật đứng (số câu ở trên, đáp án ở dưới), glow theo đáp án:
            A đỏ · B vàng · C dương · D lá. Chắc chắn = in HOA + đậm; chưa chắc = chữ vàng, thường, không đậm.
            Các câu liền nhau trong cùng một hàng có cùng đáp án (và cùng độ chắc chắn) được nối thành một khung ngang,
            cao bằng một khung đơn, glow nhấp nháy nhẹ (sáng ↔ tối). Khung nối vẫn hiện đủ chữ đáp án của TỪNG câu,
            nằm ngay dưới số câu tương ứng (vd. 3 4 5 / B B B).
   Phần II: mỗi mệnh đề a/b/c/d là một khung, viền + glow xanh lá nếu Đúng, đỏ nếu Sai.
   Số câu mỗi hàng của Phần I lấy từ CONFIG.output.part1PerLine (NTZ đặt là 8).
   app.js gọi window.ntzRenderResults(res1, res2, warn) khi cờ bật; các bản khác không đụng tới file này. */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  if (!F.ntzCards) return;

  var PER_ROW = (CONFIG.output && CONFIG.output.part1PerLine) || 8;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Một khung: cls = màu, top = HTML vùng trên, text = chữ đáp án, low = chưa chắc, n = số câu trong khung
  // Khung nối (n > 1): hiện n chữ đáp án, mỗi chữ nằm dưới số câu của nó.
  function frame(cls, top, text, low, n, label, sty) {
    var ans = n > 1
      ? '<div class="nc-ans nc-ans-multi" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' +
        new Array(n + 1).join('<span>' + esc(text) + '</span>') + '</div>'
      : '<div class="nc-ans">' + esc(text) + '</div>';
    return '<div class="nc ' + cls + (low ? ' nc-low' : '') + (n > 1 ? ' nc-merge' : '') + '"' +
      (n > 1 ? ' style="grid-column:span ' + n + '"' : (sty ? ' style="' + sty + '"' : '')) + (sty ? ' data-ov="1"' : '') +
      ' role="group" aria-label="' + esc(label) + '">' + top + ans + '</div>';
  }

  // Các hàng lưới của Phần I (mỗi hàng PER_ROW câu); trả về { html, anyLow }
  function ovSty(o) {
    var X = window.ntzX;
    return o ? (o.c ? '--rgb:' + X.rgb(o.c) + ';--rgbd:' + X.dark(o.c) + ';' : '') + (o.k && o.k !== 100 ? '--qk:' + (o.k / 100) + ';' : '') : '';
  }
  function grid(res, pv) {
    var X = window.ntzX, st = X.get(), html = '', anyLow = false;
    var per = (!pv && st.per) || PER_ROW, q = pv ? {} : st.q;
    res = pv ? res : X.order(res, st);
    for (var i = 0; i < res.length; i += per) {
      var row = res.slice(i, i + per), groups = [];
      row.forEach(function (r) {
        var L = r.ans || '?', low = !!r.low, sty = ovSty(q[r.num]);
        if (low) anyLow = true;
        var g = groups[groups.length - 1];
        // nối các câu liền nhau cùng đáp án, cùng độ chắc chắn (không nối câu '?', không nối câu có tùy chỉnh riêng)
        if (g && L !== '?' && !sty && !g.sty && g.L === L && g.low === low) g.items.push(r);
        else groups.push({ L: L, low: low, sty: sty, items: [r] });
      });
      html += '<div class="ntz-grid" style="--cols:' + per + '">';
      groups.forEach(function (g) {
        var n = g.items.length;
        var cls = /^[ABCD]$/.test(g.L) ? 'nc-' + g.L.toLowerCase() : 'nc-q';
        var nums = '<div class="nc-nums"' + (n > 1 ? ' style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))"' : '') + '>' +
          g.items.map(function (r) { return '<span>' + r.num + '</span>'; }).join('') + '</div>';
        var label = n > 1
          ? 'Câu ' + g.items[0].num + ' đến ' + g.items[n - 1].num + ': ' + g.L
          : 'Câu ' + g.items[0].num + ': ' + g.L;
        html += frame(cls, nums, g.low ? g.L.toLowerCase() : g.L, g.low, n, label, g.sty);
      });
      html += '</div>';
    }
    return { html: html, anyLow: anyLow };
  }

  function part1(res) {
    var g = grid(res);
    var note = g.anyLow
      ? '<div class="warn">Chữ vàng, thường, không đậm = chưa chắc (câu không nhận diện được qua ngân hàng câu hỏi, dò theo pool chung) — nên kiểm tra lại thủ công.</div>'
      : '';
    return '<div class="result ntz-cards" data-st="' + window.ntzX.get().style + '"><h3>PHẦN I</h3>' + g.html + note + '</div>';
  }

  function part2(res) {
    var html = '', anyLow = false;
    res.forEach(function (r) {
      html += '<div class="np-row"><div class="np-label">Câu ' + r.num + '</div><div class="np-cells">';
      ['a', 'b', 'c', 'd'].forEach(function (letter, k) {
        var ch = (r.chuoi || '').charAt(k) || '?';
        var up = ch.toUpperCase(), low = (ch === 'đ' || ch === 's');
        if (low) anyLow = true;
        var cls = up === 'Đ' ? 'nc-t' : (up === 'S' ? 'nc-f' : 'nc-q');
        var word = up === 'Đ' ? 'Đúng' : (up === 'S' ? 'Sai' : 'chưa rõ');
        var top = '<div class="nc-nums"><span>' + letter + ')</span></div>';
        html += frame(cls, top, ch, low, 1, 'Câu ' + r.num + ' ý ' + letter + ': ' + word);
      });
      html += '</div></div>';
    });
    var note = anyLow
      ? '<div class="warn">Chữ vàng, thường = điểm giữa Đúng/Sai quá sít sao, nên kiểm tra lại thủ công.</div>'
      : '';
    return '<div class="result ntz-cards" data-st="' + window.ntzX.get().style + '" data-p2="' + window.ntzX.get().p2 + '"><h3>PHẦN II</h3>' + html + note + '</div>';
  }

  // Hàng mẫu cho khung cài đặt kích thước (js/ntz-settings.js): có khung đơn, khung nối và câu chưa chắc
  window.ntzPreviewHTML = function () {
    var sample = 'ACBBBADD'.split('').map(function (a, i) { return { num: i + 1, ans: a, low: i === 5 }; });
    return '<div class="ntz-cards" data-st="' + window.ntzX.get().style + '">' + grid(sample.slice(0, PER_ROW), true).html + '</div>';
  };

  window.ntzRenderResults = function (res1, res2, warn) {
    var h = '';
    window.ntzX.last = [res1, res2, warn]; window.ntzX.vars();
    setTimeout(function () { window.ntzX.hooks.forEach(function (f) { f(); }); }, 0);
    if (res1.length) h += part1(res1);
    if (res2.length) h += part2(res2);
    if (warn.length) h += '<div class="result"><h3>⚠️ Cảnh báo</h3><div class="pack">' + esc(warn.join('\n')) + '</div></div>';
    if (!h) h = '<div class="result">Không tách được câu hỏi nào. Kiểm tra lại định dạng đề đã dán.</div>';
    return h;
  };
})();
