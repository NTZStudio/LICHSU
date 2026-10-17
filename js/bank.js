/* Trang Ngân hàng đáp án.
   Cơ bản  : QBANK1, QBANK2 (Phần I) và B (Phần II).
   Nâng cao: window.ADV_BANK[bài] từ data/lessonN.js (cần cờ features.answerBankAdvanced).
   Chỉ hoạt động khi phiên bản đang chạy có cờ features.answerBank. */
(function () {
  var F = (CONFIG.features) || {};
  var ver = window.ACTIVE_VERSION;
  var $ = function (id) { return document.getElementById(id); };

  $('backLink').href = 'index.html' + (ver ? '#/' + ver.slug : '');
  $('bankVer').textContent = ver ? ver.name : '';
  document.title = 'Ngân hàng đáp án' + (ver ? ' · ' + ver.name : '');

  if (!F.answerBank) { $('bankDisabled').hidden = false; return; }
  $('bankApp').hidden = false;

  // Bỏ dấu + chữ thường để gõ "lien hop quoc" vẫn tìm được "Liên hợp quốc"
  function strip(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  // Nhóm nút chọn: defs = [{key,label}], onPick(key) được gọi khi bấm
  function setupChips(hostId, defs, current, onPick) {
    var host = $(hostId), btns = {};
    defs.forEach(function (d) {
      var on = d.key === current;
      var b = el('button', 'bank-chip' + (on ? ' is-on' : ''), d.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () {
        Object.keys(btns).forEach(function (k) {
          btns[k].className = 'bank-chip' + (k === d.key ? ' is-on' : '');
          btns[k].setAttribute('aria-pressed', k === d.key ? 'true' : 'false');
        });
        onPick(d.key);
      });
      btns[d.key] = b;
      host.appendChild(b);
    });
  }

  var input = $('q');
  var mode = 'basic', part = 'all', lesson = 'all';
  var items = [], groups = [];        // cơ bản
  var advItems = [], advGroups = [];  // nâng cao

  // ===== Cơ bản - Phần I: [cụm từ nhận diện câu hỏi, đáp án] =====
  var part1 = QBANK1.concat(QBANK2);
  part1.forEach(function (p, i) {
    var card = el('div', 'bank-item');
    card.appendChild(el('div', 'bank-no', String(i + 1)));
    var body = el('div', 'bank-body');
    var q = el('div', 'bank-q'); q.appendChild(el('small', '', 'Câu có cụm: ')); q.appendChild(document.createTextNode(p[0]));
    var a = el('div', 'bank-a'); a.appendChild(el('small', '', 'Đáp án: ')); a.appendChild(el('strong', '', p[1]));
    body.appendChild(q); body.appendChild(a); card.appendChild(body);
    $('list1').appendChild(card);
    items.push({ el: card, part: 1, key: strip(p[0] + ' ' + p[1]) });
  });

  // ===== Cơ bản - Phần II: mỗi bộ gồm [nội dung, 1=Đúng / 0=Sai] =====
  var total2 = 0;
  Object.keys(B).forEach(function (name) {
    var set = B[name];
    var box = el('div', 'bank-set');
    box.appendChild(el('h3', '', 'Bộ ' + name + ' · ' + set.length + ' mệnh đề'));
    var g = { el: box, items: [] };
    set.forEach(function (s) {
      var isTrue = s[1] === 1;
      var row = el('div', 'bank-item');
      var badge = el('span', 'bank-tf ' + (isTrue ? 'is-true' : 'is-false'), isTrue ? 'Đ' : 'S');
      badge.setAttribute('aria-label', isTrue ? 'Đúng' : 'Sai');
      row.appendChild(badge);
      row.appendChild(el('div', 'bank-body', s[0]));
      box.appendChild(row);
      var it = { el: row, part: 2, key: strip(name + ' ' + s[0] + ' ' + (isTrue ? 'dung' : 'sai')) };
      items.push(it); g.items.push(it); total2++;
    });
    groups.push(g);
    $('list2').appendChild(box);
  });

  // ===== Nâng cao: chia theo bài, mỗi câu có ID, đáp án đúng và sai =====
  var adv = window.ADV_BANK || {};
  var lessonNums = Object.keys(adv).map(Number).sort(function (a, b) { return a - b; });
  var LETTERS = 'ABCDEFGH';
  if (F.answerBankAdvanced) {
    lessonNums.forEach(function (n) {
      var data = adv[n];
      var box = el('div', 'bank-set');
      box.appendChild(el('h3', '', (data.title || 'Bài ' + n) + ' · ' + (data.questions.length + (data.part2 ? data.part2.length : 0)) + ' câu'));
      var g = { el: box, lesson: n, items: [] };
      // Xếp theo ID tăng dần. Không hiện số câu hay A/B/C/D vì đề thật hay đảo thứ tự, chỉ ID là cố định
      var rows = data.questions.map(function (q) { return { id: q[0], p1: q }; })
        .concat((data.part2 || []).map(function (q) { return { id: q[0], p2: q }; }));
      var sorted = rows.sort(function (a, b) {
        var x = a.id, y = b.id;
        return x.length - y.length || (x < y ? -1 : x > y ? 1 : 0);
      });
      sorted.forEach(function (row) {
        if (row.p2) {  // câu Đúng/Sai: đoạn tư liệu + các mệnh đề
          var p = row.p2;
          var c2 = el('div', 'bank-item bank-adv');
          var b2 = el('div', 'bank-body');
          var h2 = el('div', 'bank-adv-head');
          h2.appendChild(el('strong', 'bank-idmain', 'ID ' + p[0]));
          b2.appendChild(h2);
          b2.appendChild(el('div', 'bank-passage', p[1]));
          var l2 = el('div', 'bank-opts');
          l2.setAttribute('role', 'list');
          p[2].forEach(function (s) {
            var t = s[1] === 1;
            var r2 = el('div', 'bank-st');
            r2.setAttribute('role', 'listitem');
            var bd = el('span', 'bank-tf ' + (t ? 'is-true' : 'is-false'), t ? 'Đ' : 'S');
            bd.setAttribute('aria-label', t ? 'Đúng' : 'Sai');
            r2.appendChild(bd);
            r2.appendChild(el('span', 'bank-opt-text', s[0]));
            l2.appendChild(r2);
          });
          b2.appendChild(l2); c2.appendChild(b2); box.appendChild(c2);
          var it2 = { el: c2, lesson: n, key: strip(p[0] + ' ' + p[1] + ' ' + p[2].map(function (s) { return s[0] + (s[1] === 1 ? ' dung' : ' sai'); }).join(' ') + ' bai ' + n) };
          advItems.push(it2); g.items.push(it2);
          return;
        }
        var q = row.p1;
        var card = el('div', 'bank-item bank-adv');
        var body = el('div', 'bank-body');
        var head = el('div', 'bank-adv-head');
        head.appendChild(el('strong', 'bank-idmain', 'ID ' + q[0]));
        body.appendChild(head);
        body.appendChild(el('div', 'bank-adv-q', q[1]));
        var opts = el('div', 'bank-opts');
        opts.setAttribute('role', 'list');
        q[2].forEach(function (t, k) {
          var L = LETTERS.charAt(k), ok = (L === q[3]);
          var row = el('div', 'bank-opt ' + (ok ? 'is-correct' : 'is-wrong'));
          row.setAttribute('role', 'listitem');
          var mk = el('span', 'bank-mark', ok ? '✓' : '✗');
          mk.setAttribute('aria-label', ok ? 'Đáp án đúng' : 'Đáp án sai');
          row.appendChild(mk);
          row.appendChild(el('span', 'bank-opt-text', t));
          opts.appendChild(row);
        });
        body.appendChild(opts);
        card.appendChild(body);
        box.appendChild(card);
        var it = { el: card, lesson: n, key: strip(q[0] + ' ' + q[1] + ' ' + q[2].join(' ') + ' bai ' + n) };
        advItems.push(it); g.items.push(it);
      });
      advGroups.push(g);
      $('advList').appendChild(box);
    });
  }

  // ===== Tìm kiếm + lọc =====
  function apply() {
    var tokens = strip(input.value.trim()).split(/\s+/).filter(Boolean);
    var match = function (key) { return tokens.every(function (t) { return key.indexOf(t) > -1; }); };

    if (mode === 'basic') {
      var shown = { 1: 0, 2: 0 };
      items.forEach(function (it) {
        var ok = (part === 'all' || part === 'p' + it.part) && match(it.key);
        it.el.hidden = !ok;
        if (ok) shown[it.part]++;
      });
      groups.forEach(function (g) {
        g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; });
      });
      $('sec1').hidden = shown[1] === 0;
      $('sec2').hidden = shown[2] === 0;
      $('empty').textContent = 'Không tìm thấy kết quả phù hợp.';
      $('empty').hidden = shown[1] + shown[2] > 0;
      $('count').textContent = 'Hiện ' + (shown[1] + shown[2]) + ' / ' + items.length +
        ' mục (Phần I: ' + shown[1] + '/' + part1.length + ' · Phần II: ' + shown[2] + '/' + total2 + ')';
    } else {
      var n = 0;
      advItems.forEach(function (it) {
        var ok = (lesson === 'all' || lesson === String(it.lesson)) && match(it.key);
        it.el.hidden = !ok;
        if (ok) n++;
      });
      advGroups.forEach(function (g) {
        g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; });
      });
      $('empty').textContent = advItems.length ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có dữ liệu nâng cao.';
      $('empty').hidden = n > 0;
      $('count').textContent = 'Hiện ' + n + ' / ' + advItems.length + ' câu';
    }
  }

  input.addEventListener('input', apply);

  setupChips('partChips', [
    { key: 'all', label: 'Tất cả' }, { key: 'p1', label: 'Phần I' }, { key: 'p2', label: 'Phần II' }
  ], 'all', function (k) { part = k; apply(); });

  if (F.answerBankAdvanced) {
    var lessonDefs = [{ key: 'all', label: 'Tất cả bài' }].concat(lessonNums.map(function (n) {
      return { key: String(n), label: (adv[n].title || 'Bài ' + n) };
    }));
    setupChips('lessonChips', lessonDefs, 'all', function (k) { lesson = k; apply(); });

    setupChips('modeChips', [
      { key: 'basic', label: 'Cơ bản' }, { key: 'adv', label: 'Nâng cao' }
    ], 'basic', function (k) {
      mode = k;
      $('basicView').hidden = k !== 'basic';
      $('basicLists').hidden = k !== 'basic';
      $('advView').hidden = k !== 'adv';
      $('advList').hidden = k !== 'adv';
      apply();
    });
    $('modeChips').hidden = false;
  }
  apply();
})();
