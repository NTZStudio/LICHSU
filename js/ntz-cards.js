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
  function frame(cls, top, text, low, n, label) {
    var ans = n > 1
      ? '<div class="nc-ans nc-ans-multi" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' +
        new Array(n + 1).join('<span>' + esc(text) + '</span>') + '</div>'
      : '<div class="nc-ans">' + esc(text) + '</div>';
    return '<div class="nc ' + cls + (low ? ' nc-low' : '') + (n > 1 ? ' nc-merge' : '') + '"' +
      (n > 1 ? ' style="grid-column:span ' + n + '"' : '') +
      ' role="group" aria-label="' + esc(label) + '">' + top + ans + '</div>';
  }

  // Các hàng lưới của Phần I (mỗi hàng PER_ROW câu); trả về { html, anyLow }
  function grid(res) {
    var html = '', anyLow = false;
    for (var i = 0; i < res.length; i += PER_ROW) {
      var row = res.slice(i, i + PER_ROW), groups = [];
      row.forEach(function (r) {
        var L = r.ans || '?', low = !!r.low;
        if (low) anyLow = true;
        var g = groups[groups.length - 1];
        // nối các câu liền nhau cùng đáp án, cùng độ chắc chắn (không nối câu '?')
        if (g && L !== '?' && g.L === L && g.low === low) g.items.push(r);
        else groups.push({ L: L, low: low, items: [r] });
      });
      html += '<div class="ntz-grid" style="--cols:' + PER_ROW + '">';
      groups.forEach(function (g) {
        var n = g.items.length;
        var cls = /^[ABCD]$/.test(g.L) ? 'nc-' + g.L.toLowerCase() : 'nc-q';
        var nums = '<div class="nc-nums"' + (n > 1 ? ' style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))"' : '') + '>' +
          g.items.map(function (r) { return '<span>' + r.num + '</span>'; }).join('') + '</div>';
        var label = n > 1
          ? 'Câu ' + g.items[0].num + ' đến ' + g.items[n - 1].num + ': ' + g.L
          : 'Câu ' + g.items[0].num + ': ' + g.L;
        html += frame(cls, nums, g.low ? g.L.toLowerCase() : g.L, g.low, n, label);
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
    return '<div class="result ntz-cards"><h3>PHẦN I</h3>' + g.html + note + '</div>';
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
    return '<div class="result ntz-cards"><h3>PHẦN II</h3>' + html + note + '</div>';
  }

  // Hàng mẫu cho khung cài đặt kích thước (js/ntz-settings.js): có khung đơn, khung nối và câu chưa chắc
  window.ntzPreviewHTML = function () {
    var sample = 'ACBBBADD'.split('').map(function (a, i) { return { num: i + 1, ans: a, low: i === 5 }; });
    return '<div class="ntz-cards">' + grid(sample.slice(0, PER_ROW)).html + '</div>';
  };

  window.ntzRenderResults = function (res1, res2, warn) {
    var h = '';
    if (res1.length) h += part1(res1);
    if (res2.length) h += part2(res2);
    if (warn.length) h += '<div class="result"><h3>⚠️ Cảnh báo</h3><div class="pack">' + esc(warn.join('\n')) + '</div></div>';
    if (!h) h = '<div class="result">Không tách được câu hỏi nào. Kiểm tra lại định dạng đề đã dán.</div>';
    return h;
  };
})();
