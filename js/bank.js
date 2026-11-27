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
  var mode = 'basic', lesson = 'all';
  var part1 = QBANK1.concat(QBANK2);   // Phần I: [cụm nhận diện, đáp án]; Phần II: B[bộ] = [[mệnh đề, 1/0]]
  var total2 = 0; Object.keys(B).forEach(function (k) { total2 += B[k].length; });

  // Dựng thẻ kiểu Azota cho ngân hàng cũ (không có ID). store = {cards, secs, groups}
  function buildRest(store, mainEl, gridEl, prefix, lessonVal) {
    [['p1', 'Phần I'], ['p2', 'Phần II']].forEach(function (P) {
      var list = P[0] === 'p1' ? part1 : Object.keys(B);
      if (!list.length) return;
      var sec = el('section', 'az-sec'), grp = el('div', 'az-cg'), grid = el('div', 'az-grid');
      sec.appendChild(el('h3', 'az-sech', prefix + P[1] + ' · ' + list.length + (P[0] === 'p1' ? ' câu' : ' bộ · ' + total2 + ' mệnh đề')));
      grp.appendChild(el('div', 'az-cgh', prefix + P[1])); grp.appendChild(grid);
      var S = { el: sec, items: [] }, G = { el: grp, items: S.items };
      list.forEach(function (d, i) {
        var no = i + 1, card = el('article', 'az-q'), key, h = el('div', 'az-qh');
        h.appendChild(el('span', 'az-no', 'Câu ' + no));
        if (P[0] === 'p1') {
          h.appendChild(el('span', 'az-id', lessonVal === 'basic' ? 'Phần I · ' + no + '/' + list.length : 'Không có ID'));
          card.appendChild(h);
          var qt = el('div', 'az-qt'); qt.appendChild(el('small', 'az-dim', 'Câu có cụm: ')); qt.appendChild(document.createTextNode(d[0]));
          card.appendChild(qt);
          var o = el('div', 'az-o ok'); o.appendChild(el('span', 'az-l', '✓')); o.appendChild(el('span', 'az-ot', d[1]));
          var ol = el('div', 'az-opts'); ol.appendChild(o); card.appendChild(ol);
          key = d[0] + ' ' + d[1];
        } else {
          h.appendChild(el('span', 'az-id', 'Bộ ' + d)); card.appendChild(h);
          var sl = el('div', 'az-opts');
          B[d].forEach(function (st, k) {
            var t = st[1] === 1, r = el('div', 'az-o az-s ' + (t ? 'is-true' : 'is-false'));
            r.appendChild(el('span', 'az-l', 'abcdefgh'.charAt(k) || String(k + 1)));
            r.appendChild(el('span', 'az-ot', st[0])); r.appendChild(el('span', 'az-tf', t ? 'Đúng' : 'Sai'));
            sl.appendChild(r);
          });
          card.appendChild(sl);
          key = d + ' ' + B[d].map(function (st) { return st[0] + (st[1] === 1 ? ' dung' : ' sai'); }).join(' ');
        }
        card.appendChild(expBox(lessonVal + '-' + P[0] + '-' + no)); sec.appendChild(card);
        var cell = el('button', 'az-n', String(no)); cell.type = 'button'; cell.title = 'Câu ' + no;
        cell.addEventListener('click', function () {
          store.cards.forEach(function (x) { x.cell.classList.remove('cur'); });
          cell.classList.add('cur', 'seen');
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
        });
        grid.appendChild(cell);
        var it = { el: card, cell: cell, lesson: lessonVal, part: P[0], key: strip(key + ' cau ' + no) };
        store.cards.push(it); S.items.push(it);
      });
      mainEl.appendChild(sec); gridEl.appendChild(grp); store.secs.push(S); store.groups.push(G);
    });
  }

  // ===== BASIC (kiểu Azota): trái = câu, phải = Phần / số câu / tìm kiếm =====
  var bRoot = $('basicLists'), bMain = el('div', 'az-main'), bSide = el('aside', 'az-side'), bSbox = el('div', 'az-box az-sbox');
  var bStore = { cards: [], secs: [], groups: [] }, bTabs = {}, bpart = 'all';
  bRoot.classList.add('az'); bRoot.appendChild(bMain); bRoot.appendChild(bSide);
  bSide.innerHTML = '<div class="az-box"><div class="az-sh">PHẦN</div><div class="az-tabs az-tabs3" id="bTabs"></div></div>' +
    '<div class="az-box az-gbox"><div class="az-sh">DANH SÁCH CÂU</div><div id="bGrid"></div><div class="az-leg"><i class="cur"></i>Đang xem<i class="seen"></i>Đã xem</div></div>';
  bSide.appendChild(bSbox); bSbox.appendChild(input); bSbox.appendChild($('count'));
  buildRest(bStore, bMain, $('bGrid'), '', 'basic');
  [['all', 'Tất cả'], ['p1', 'Phần I'], ['p2', 'Phần II']].forEach(function (p) {
    var b = el('button', 'az-tab' + (p[0] === bpart ? ' is-on' : '')); b.type = 'button';
    b.innerHTML = p[1] + '<small></small>';
    b.addEventListener('click', function () {
      bpart = p[0]; Object.keys(bTabs).forEach(function (k) { bTabs[k].classList.toggle('is-on', k === bpart); }); apply();
    });
    bTabs[p[0]] = b; $('bTabs').appendChild(b);
  });

  // ===== Nâng cao (kiểu Azota): cột phải chọn bài / phần / số câu, cột trái đọc câu =====
  var adv = window.ADV_BANK || {};
  var lessonNums = Object.keys(adv).map(Number).sort(function (a, b) { return a - b; });
  var LETTERS = 'ABCDEFGH', EXP = window.ADV_EXPLAIN || {};
  var azCards = [], azSecs = [], azGroups = [], azTabs = {}, azPart = 'p1';
  var azSbox = null, azRoot = $('advList'), azMain = el('div', 'az-main'), azSide = el('aside', 'az-side');
  function lname(l) { return l === 'rest' ? 'Câu còn lại' : (adv[l].title || 'Bài ' + l); }
  function idCmp(a, b) { return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); }  // ID ngắn trước, cùng độ dài thì theo chữ số
  function expBox(id) {
    var t = (window.ADV_EXPLAIN || {})[id], b = el('div', 'az-exp' + (t ? '' : ' is-empty'));
    b.appendChild(el('h4', '', 'GIẢI THÍCH'));
    b.appendChild(el('div', 'az-expt', t || 'Chưa có giải thích cho câu này.'));
    return b;
  }
  function head(no, id) {
    var h = el('div', 'az-qh'), c = el('button', 'az-id', 'ID ' + id);
    h.appendChild(el('span', 'az-no', 'Câu ' + no));
    c.type = 'button'; c.title = 'Bấm để sao chép ID';
    c.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(id).catch(function () {});
      c.textContent = 'Đã chép'; setTimeout(function () { c.textContent = 'ID ' + id; }, 1100);
    });
    h.appendChild(c); return h;
  }
  if (F.answerBankAdvanced) {
    azRoot.classList.add('az'); azRoot.appendChild(azMain); azRoot.appendChild(azSide);
    azSbox = el('div', 'az-box az-sbox');
    azSide.innerHTML = '<div class="az-box"><div class="az-sh">CHỌN BÀI</div><div class="bank-chips" id="azLessons" role="group" aria-label="Chọn bài"></div></div>' +
      '<div class="az-box"><div class="az-sh">PHẦN</div><div class="az-tabs" id="azTabs"></div></div>' +
      '<div class="az-box az-gbox"><div class="az-sh">DANH SÁCH CÂU</div><div id="azGrid"></div><div class="az-leg"><i class="cur"></i>Đang xem<i class="seen"></i>Đã xem</div></div>';
    azSide.appendChild(azSbox);
    lessonNums.forEach(function (n) {
      var d = adv[n], t = d.title || ('Bài ' + n);
      [['p1', 'Phần I', (d.questions || []).map(function (q) { return { id: q[0], q: q }; })],
       ['p2', 'Phần II', (d.part2 || []).map(function (q) { return { id: q[0], q: q }; })]].forEach(function (P) {
        var rows = P[2].sort(function (a, b) { return idCmp(a.id, b.id); });
        if (!rows.length) return;
        var sec = el('section', 'az-sec'), sh = el('h3', 'az-sech', t + ' · ' + P[1] + ' · ' + rows.length + ' câu');
        sec.appendChild(sh);
        var grp = el('div', 'az-cg'), gh = el('div', 'az-cgh', t + ' · ' + P[1]), grid = el('div', 'az-grid');
        grp.appendChild(gh); grp.appendChild(grid);
        var S = { el: sec, grp: grp, lesson: n, part: P[0] }, G = { el: grp };
        rows.forEach(function (r, i) {
          var no = i + 1, q = r.q, card = el('article', 'az-q'), body, key;
          card.id = 'azq-' + q[0];
          card.appendChild(head(no, q[0]));
          if (P[0] === 'p1') {
            card.appendChild(el('div', 'az-qt', q[1]));
            var ol = el('div', 'az-opts');
            q[2].forEach(function (tx, k) {
              var L = LETTERS.charAt(k), ok = L === q[3], o = el('div', 'az-o' + (ok ? ' ok' : ''));
              o.appendChild(el('span', 'az-l', L)); o.appendChild(el('span', 'az-ot', tx));
              if (ok) { var m = el('span', 'az-m', '✓'); m.setAttribute('aria-label', 'Đáp án đúng'); o.appendChild(m); }
              ol.appendChild(o);
            });
            card.appendChild(ol);
            key = q[0] + ' ' + q[1] + ' ' + q[2].join(' ');
          } else {
            card.appendChild(el('div', 'az-tl', q[1]));
            var sl = el('div', 'az-opts');
            q[2].forEach(function (s, k) {
              var t = s[1] === 1, o = el('div', 'az-o az-s ' + (t ? 'is-true' : 'is-false'));
              o.appendChild(el('span', 'az-l', 'abcdefgh'.charAt(k)));
              o.appendChild(el('span', 'az-ot', s[0]));
              o.appendChild(el('span', 'az-tf', t ? 'Đúng' : 'Sai'));
              sl.appendChild(o);
            });
            card.appendChild(sl);
            key = q[0] + ' ' + q[1] + ' ' + q[2].map(function (s) { return s[0] + (s[1] === 1 ? ' dung' : ' sai'); }).join(' ');
          }
          card.appendChild(expBox(q[0]));
          sec.appendChild(card);
          var cell = el('button', 'az-n', String(no)); cell.type = 'button'; cell.title = 'Câu ' + no + ' · ID ' + q[0];
          cell.addEventListener('click', function () {
            azCards.forEach(function (c) { c.cell.classList.remove('cur'); });
            cell.classList.remove('seen'); cell.classList.add('cur', 'seen');
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
          });
          grid.appendChild(cell);
          var it = { el: card, cell: cell, lesson: n, part: P[0], key: strip(key + ' bai ' + n + ' cau ' + no) };
          azCards.push(it); (S.items = S.items || []).push(it); G.items = S.items;
        });
        azMain.appendChild(sec); $('azGrid').appendChild(grp);
        azSecs.push(S); azGroups.push(G);
      });
    });

    buildRest({ cards: azCards, secs: azSecs, groups: azGroups }, azMain, $('azGrid'), 'Câu còn lại · ', 'rest');
    [['p1', 'Phần I'], ['p2', 'Phần II']].forEach(function (p) {
      var b = el('button', 'az-tab' + (p[0] === azPart ? ' is-on' : '')); b.type = 'button';
      b.innerHTML = p[1] + '<small></small>';
      b.addEventListener('click', function () {
        azPart = p[0]; Object.keys(azTabs).forEach(function (k) { azTabs[k].classList.toggle('is-on', k === azPart); }); apply();
      });
      azTabs[p[0]] = b; $('azTabs').appendChild(b);
    });
  }

  // ===== Tìm kiếm + lọc =====
  function apply() {
    if (mode === 'quest' || mode === 'save') {
      $('empty').hidden = true;
      $('count').textContent = (mode === 'save' && window.SQQ) ? window.SQQ.apply('save', input.value) : '';
      return;
    }
    if (mode === 'contrib' || mode === 'myproject') { $('empty').hidden = true; $('count').textContent = window.SQC.apply(mode, input.value); return; }
    var tokens = strip(input.value.trim()).split(/\s+/).filter(Boolean);
    var match = function (key) { return tokens.every(function (t) { return key.indexOf(t) > -1; }); };

    if (mode === 'basic') {
      var nb = 0, per = { p1: 0, p2: 0 };
      bStore.cards.forEach(function (it) {
        var hit = match(it.key), ok = hit && (bpart === 'all' || bpart === it.part);
        if (hit) per[it.part]++;
        it.el.hidden = !ok; it.cell.hidden = !ok; if (ok) nb++;
      });
      bStore.secs.forEach(function (g) { g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; }); });
      bStore.groups.forEach(function (g) { g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; }); });
      bTabs.all.lastChild.textContent = per.p1 + per.p2; bTabs.p1.lastChild.textContent = per.p1; bTabs.p2.lastChild.textContent = per.p2;
      bRoot.classList.toggle('az-one', bpart !== 'all');
      $('empty').textContent = 'Không tìm thấy câu phù hợp.';
      $('empty').hidden = nb > 0;
      $('count').textContent = 'Hiện ' + nb + ' câu · ' + (bpart === 'all' ? 'Tất cả' : bpart === 'p1' ? 'Phần I' : 'Phần II') + ' (Phần I: ' + per.p1 + '/' + part1.length + ' · Phần II: ' + per.p2 + '/' + Object.keys(B).length + ' bộ)';
    } else {
      var n = 0, perPart = { p1: 0, p2: 0 }, tot = 0;
      azCards.forEach(function (it) {
        var inL = lesson === 'all' || lesson === String(it.lesson);
        if (inL) tot++;
        var hit = inL && match(it.key), ok = hit && it.part === azPart;
        if (hit) perPart[it.part]++;
        it.el.hidden = !ok; it.cell.hidden = !ok;
        if (ok) n++;
      });
      azSecs.forEach(function (g) { g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; }); });
      azGroups.forEach(function (g) { g.el.hidden = !g.items.some(function (i) { return !i.el.hidden; }); });
      Object.keys(azTabs).forEach(function (k) { azTabs[k].lastChild.textContent = perPart[k]; });
      azRoot.classList.toggle('az-one', lesson !== 'all');
      $('empty').textContent = azCards.length ? 'Không tìm thấy câu phù hợp.' : 'Chưa có dữ liệu nâng cao.';
      $('empty').hidden = n > 0;
      $('count').textContent = 'Hiện ' + n + ' câu · ' + (lesson === 'all' ? 'Tất cả' : lname(lesson)) + ' · ' + (azPart === 'p1' ? 'Phần I' : 'Phần II') + ' · tổng ' + tot + ' mục trong phạm vi này';
    }
  }

  input.addEventListener('input', apply);

  if (F.answerBankAdvanced) {
    var lessonDefs = [{ key: 'all', label: 'Xem tất cả' }].concat(lessonNums.map(function (n) {
      return { key: String(n), label: (adv[n].title || 'Bài ' + n) };
    })).concat([{ key: 'rest', label: 'Câu còn lại' }]);
    setupChips('azLessons', lessonDefs, 'all', function (k) { lesson = k; apply(); });
  }

  // ===== Chế độ: BASIC / ADVANCE (PROMAX) / QUEST / SAVE (mọi gói) =====
  var MODES = [
    ['basic', 'BASIC', 'Mọi gói · tra cứu đủ Phần I và Phần II.'],
    ['adv', 'ADVANCE', 'PROMAX · câu đầy đủ, đáp án đúng/sai, ID câu, chia theo bài.'],
    ['quest', 'QUEST', 'Mọi gói · luyện nhanh ngẫu nhiên, có combo, bảng điểm và HARDCORE. Bảng 20 hạng (icon + đặc quyền) cho mọi gói. PLUS+: chọn bài, NIGHTMARE.'],
    ['save', 'SAVE', 'Mọi gói · lưu đúng/sai và cả 4 đáp án từng câu (kèm ID), phân bố theo bài, chỉ trên thiết bị này.'],
    ['contrib', 'CONTRIBUTOR', 'Mọi gói · ALL, EXAMS (bộ đề đã duyệt), COMMUNITY (tài liệu Contributor chia sẻ), EXERCISES (làm đề, kể cả đề MyProject chưa đăng).'],
    ['myproject', 'MYPROJECT', 'Mọi gói · bộ đề bạn tự soạn, lưu trong trình duyệt này (Dữ liệu › MYPROJECT).']
  ];
  var MIDS = { basic: 'basicLists', adv: 'advList', quest: 'questRoot', save: 'saveRoot', contrib: 'contribRoot', myproject: 'myRoot' }, modeBtns = {};
  function setMode(k) {
    if (k === 'adv' && !F.answerBankAdvanced) {  // ADVANCE là đặc quyền PROMAX: nhắc nâng cấp, không chuyển
      var n = $('lockNote'); n.hidden = false; n.scrollIntoView({ behavior: 'smooth', block: 'center' });
      n.classList.remove('nudge'); void n.offsetWidth; n.classList.add('nudge');
      return;
    }
    mode = k;
    Object.keys(MIDS).forEach(function (m) { $(MIDS[m]).hidden = m !== k; modeBtns[m].className = 'bank-chip' + (m === k ? ' is-on' : '') + (m === 'adv' && !F.answerBankAdvanced ? ' is-lock' : ''); modeBtns[m].setAttribute('aria-pressed', m === k ? 'true' : 'false'); });
    if (window.SQQ && k !== 'quest' && k !== 'save') window.SQQ.hide();
    if ((k === 'quest' || k === 'save') && window.SQQ) window.SQQ.show(k);
    var sb = (k === 'contrib' || k === 'myproject') ? window.SQC.box(k) : k === 'adv' ? azSbox : (k === 'save' && window.SQQ) ? window.SQQ.box('save') : bSbox;
    if (sb) { sb.appendChild(input); sb.appendChild($('count')); }
    MODES.forEach(function (m) { if (m[0] === k) $('modeHint').textContent = m[2]; });
    document.documentElement.setAttribute('data-lmode', k);
    try { history.replaceState(null, '', '#' + k); } catch (e) {}
    apply();
  }
  window.SQ_LOOKUP = { setMode: setMode };
  MODES.forEach(function (m) {
    var b = el('button', 'bank-chip', m[1]); b.type = 'button'; b.title = m[2];
    if (m[0] === 'adv' && !F.answerBankAdvanced) b.className += ' is-lock';
    b.addEventListener('click', function () { setMode(m[0]); });
    modeBtns[m[0]] = b; $('modeChips').appendChild(b);
  });
  $('modeChips').hidden = false;
  var h0 = (location.hash || '').replace('#', ''), cmm = h0.match(/^community(?:-(\d+))?$/);
  if (cmm) { try { sessionStorage.setItem('sq_ctab', 'community'); } catch (e) {} window.SQ_CM_OPEN = cmm[1] ? Number(cmm[1]) : 0; h0 = 'contrib'; }
  setMode(MIDS[h0] && !(h0 === 'adv' && !F.answerBankAdvanced) ? h0 : 'basic');
})();
