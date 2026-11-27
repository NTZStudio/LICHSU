/* GIAO DIỆN ĐÁP ÁN (PROMAX): khung chọn bố cục kết quả, độc lập với thẻ cũ (ntz-cards.js).
   Phần I có 4 kiểu (sheet, chips, blocks, ledger), Phần II có 4 kiểu (table, lines, cards, codes).
   Trạng thái lưu ở localStorage.sq_layout {ui:'old'|'new', p1, p2}. Giao diện CŨ = thẻ cũ, vẫn là mặc định.
   Nạp SAU ntz-settings.js và TRƯỚC grade-extra.js: bọc window.ntzRenderResults, khung chọn đặt dưới khung SETTING. */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  if (!F.ntzCards || !window.ntzX) return;
  var X = window.ntzX, KEY = 'sq_layout', S = { ui: 'old', p1: 'sheet', p2: 'table' };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  var pro = function () { return !!(window.SQ && window.SQ.rank() >= 2); };
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chunk(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
  function cls(r) { return /^[ABCD]$/.test(r.ans) ? 'l' + r.ans.toLowerCase() : 'lq'; }
  function ans(r) { return r.ans || '?'; }
  function shown(r) { return r.low ? ans(r).toLowerCase() : ans(r); }

  /* ---------- Phần I ---------- */
  var R1 = {
    sheet: function (res) {
      return '<div class="ly-sheet">' + chunk(res, 10).map(function (g) {
        return '<div class="ls-b"><div class="ls-r ls-h"><i></i><span>A</span><span>B</span><span>C</span><span>D</span></div>' + g.map(function (r) {
          return '<div class="ls-r"><i' + (ans(r) === '?' ? ' class="q"' : '') + '>' + r.num + '</i>' + ['A', 'B', 'C', 'D'].map(function (k) {
            var on = k === ans(r);
            return '<span' + (on ? ' class="on ' + cls(r) + (r.low ? ' lo' : '') + '"' : '') + '>' + (on ? shown(r) : '') + '</span>';
          }).join('') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    },
    chips: function (res) {
      return '<div class="ly-chips">' + res.map(function (r, i) {
        return '<span class="lc-i ' + cls(r) + (r.low ? ' lo' : '') + '"><i>' + r.num + '</i><b>' + shown(r) + '</b></span>' + ((i + 1) % 10 === 0 && i + 1 < res.length ? '<span class="lc-br"></span>' : '');
      }).join('') + '</div>';
    },
    blocks: function (res) {
      return '<div class="ly-blocks">' + chunk(res, 10).map(function (g) {
        return '<div class="lb-b"><div class="lb-c">Câu ' + g[0].num + (g.length > 1 ? ' – ' + g[g.length - 1].num : '') + '</div><div class="lb-g">' + g.map(function (r) {
          return '<div class="lb-i ' + cls(r) + (r.low ? ' lo' : '') + '"><i>' + r.num + '</i><b>' + shown(r) + '</b></div>';
        }).join('') + '</div></div>';
      }).join('') + '</div>';
    },
    ledger: function (res) {
      return '<div class="ly-ledger">' + chunk(res, 10).map(function (g) {
        return '<div class="ll-c">' + g.map(function (r) {
          return '<div class="ll-i"><span>Câu ' + r.num + '</span><u></u><b class="' + cls(r) + (r.low ? ' lo' : '') + '">' + shown(r) + '</b></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
  };

  /* ---------- Phần II ---------- */
  function cells(r) {
    return [0, 1, 2, 3].map(function (k) {
      var ch = (r.chuoi || '').charAt(k) || '?', up = ch.toUpperCase();
      return { k: up === 'Đ' ? 'lt' : (up === 'S' ? 'lf' : 'lq'), low: ch === 'đ' || ch === 's', up: up === 'Đ' || up === 'S' ? up : '?', w: up === 'Đ' ? 'Đúng' : (up === 'S' ? 'Sai' : '?'), l: 'abcd'.charAt(k) };
    });
  }
  var R2 = {
    table: function (res) {
      return '<div class="l2-w"><table class="l2-t"><thead><tr><th>Câu</th><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead><tbody>' + res.map(function (r) {
        return '<tr><th>' + r.num + '</th>' + cells(r).map(function (c) { return '<td class="' + c.k + (c.low ? ' lo' : '') + '">' + (c.k === 'lt' ? '✓ ' : c.k === 'lf' ? '✗ ' : '') + (c.low ? c.w.toLowerCase() : c.w) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    },
    lines: function (res) {
      return '<div class="l2-lines">' + res.map(function (r) {
        return '<div class="l2-l"><b>Câu ' + r.num + '</b><div>' + cells(r).map(function (c) { return '<span class="l2-g ' + c.k + (c.low ? ' lo' : '') + '"><i>' + c.l + '</i>' + (c.low ? c.up.toLowerCase() : c.up) + '</span>'; }).join('') + '</div></div>';
      }).join('') + '</div>';
    },
    cards: function (res) {
      return '<div class="l2-cards">' + res.map(function (r) {
        return '<div class="l2-c"><div class="l2-ch">CÂU ' + r.num + '</div><div class="l2-cg">' + cells(r).map(function (c) { return '<div class="l2-cell ' + c.k + (c.low ? ' lo' : '') + '"><i>' + c.l + '</i><b>' + (c.low ? c.up.toLowerCase() : c.up) + '</b></div>'; }).join('') + '</div></div>';
      }).join('') + '</div>';
    },
    codes: function (res) {
      return '<div class="l2-codes">' + res.map(function (r) {
        var cs = cells(r);
        return '<button type="button" class="l2-k" title="Bấm để chép" data-copy="' + esc(cs.map(function (c) { return c.up; }).join('')) + '"><i>' + r.num + '</i><code>' + cs.map(function (c) { return '<span class="' + c.k + (c.low ? ' lo' : '') + '">' + (c.low ? c.up.toLowerCase() : c.up) + '</span>'; }).join('') + '</code></button>';
      }).join('') + '</div>';
    }
  };

  function build(r1, r2, warn, cfg) {
    var h = '', low1 = r1.some(function (r) { return r.low; });
    if (r1.length) h += '<div class="result ly"><h3>PHẦN I</h3>' + R1[cfg.p1](r1) + (low1 ? '<div class="warn">Chữ vàng, thường = chưa chắc (không nhận diện được qua ngân hàng câu hỏi) — nên kiểm tra lại thủ công.</div>' : '') + '</div>';
    if (r2.length) {
      var low2 = r2.some(function (r) { return /[đs]/.test(r.chuoi || ''); });
      h += '<div class="result ly"><h3>PHẦN II</h3>' + R2[cfg.p2](r2) + (low2 ? '<div class="warn">Chữ vàng, thường = điểm giữa Đúng/Sai quá sít sao, nên kiểm tra lại thủ công.</div>' : '') + '</div>';
    }
    if (warn && warn.length) h += '<div class="result"><h3>⚠️ Cảnh báo</h3><div class="pack">' + esc(warn.join('\n')) + '</div></div>';
    return h || '<div class="result">Không tách được câu hỏi nào. Kiểm tra lại định dạng đề đã dán.</div>';
  }

  var orig = window.ntzRenderResults;
  window.ntzRenderResults = function (a, b, c) {
    if (!(pro() && S.ui === 'new')) return orig(a, b, c);
    X.last = [a, b, c]; X.vars();
    setTimeout(function () { X.hooks.forEach(function (f) { f(); }); }, 0);
    return build(a, b, c, S);
  };
  document.addEventListener('click', function (e) {
    var k = e.target.closest && e.target.closest('.l2-k');
    if (k && navigator.clipboard) { navigator.clipboard.writeText(k.getAttribute('data-copy')); k.classList.add('cp'); setTimeout(function () { k.classList.remove('cp'); }, 700); }
  });

  /* ---------- khung chọn giao diện (dưới khung SETTING) ---------- */
  var N1 = [['sheet', 'Phiếu tô', 'Ô A–D, đáp án được tô màu'], ['chips', 'Chip', 'Dải thẻ nhỏ, ngắt dòng mỗi 10 câu'], ['blocks', 'Thước', 'Số trên, đáp án dưới, nhóm 10 câu'], ['ledger', 'Danh sách', 'Mỗi câu một dòng, đáp án cuối dòng']];
  var N2 = [['table', 'Bảng', 'Cột a b c d, ô Đúng / Sai'], ['lines', 'Dòng', 'Mỗi câu một dòng, 4 nhãn'], ['cards', 'Thẻ câu', 'Mỗi câu một thẻ chia 4 phần'], ['codes', 'Chuỗi', 'Gọn như ĐSĐS, bấm để chép']];
  var s1 = 'BACDDABCADBBCACDABDC'.split('').map(function (a, i) { return { num: i + 1, ans: i === 13 ? '?' : a, low: i === 6 }; });
  var s2 = [{ num: 1, chuoi: 'ĐSĐS' }, { num: 2, chuoi: 'SĐsĐ' }, { num: 3, chuoi: 'ĐĐSS' }];

  var box = el('details', 'ntz-settings ntz-ly-box');
  box.appendChild(el('summary', '', '🎨 GIAO DIỆN ĐÁP ÁN'));
  var body = el('div', 'ntz-set-body'); box.appendChild(body);
  var pvw = el('div', 'lyp'); body.appendChild(pvw);
  var tg = el('div', 'ntz-mode'); body.appendChild(tg);
  var pick = el('div', 'lyo-wrap'); body.appendChild(pick);
  var lock = el('div', 'ntz-x-lock'); body.appendChild(lock);
  lock.innerHTML = pro() ? '' : '🔒 Áp dụng giao diện mới cho kết quả dành cho gói <b>PROMAX</b>. Bạn vẫn xem trước được ở đây. <a href="index.html#goi">Xem gói</a>';

  function set(p) {
    Object.assign(S, p);
    if (pro()) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    paint(); if (pro()) X.refresh();
  }
  function paint() {
    pvw.innerHTML = '<div class="lyp-h"><span>XEM TRƯỚC</span><em>' + (pro() && S.ui === 'old' ? 'Đang áp dụng giao diện cũ' : (pro() ? 'Đang áp dụng' : 'Chỉ xem thử')) + '</em></div>' + build(s1, s2, [], S);
    tg.innerHTML = '';
    [['old', 'CŨ'], ['new', 'MỚI']].forEach(function (m) {
      var b = el('button', S.ui === m[0] ? 'on' : '', m[1]); b.type = 'button';
      b.addEventListener('click', function () { set({ ui: m[0] }); }); tg.appendChild(b);
    });
    pick.innerHTML = '';
    [['PHẦN I', N1, 'p1'], ['PHẦN II', N2, 'p2']].forEach(function (g) {
      pick.appendChild(el('div', 'ntz-adv-s', g[0]));
      var w = el('div', 'lyo-g');
      g[1].forEach(function (o) {
        var b = el('button', 'lyo' + (S[g[2]] === o[0] ? ' on' : ''), '<b>' + o[1] + '</b><small>' + o[2] + '</small>'); b.type = 'button';
        b.addEventListener('click', function () { var p = {}; p[g[2]] = o[0]; p.ui = 'new'; set(p); }); w.appendChild(b);
      });
      pick.appendChild(w);
    });
  }
  paint();
  (document.querySelector('.ntz-mount') || document.body).appendChild(box);
})();
