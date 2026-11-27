(function () {
  var KEY = 'sq_focus_sel', OLD = 'sq_focus', MKEY = 'sq_pri_mode', X = window.ntzX;
  var plus = function () { return !!(window.SQ && window.SQ.rank() >= 1); };
  var sel = [];
  try {
    var raw = localStorage.getItem(KEY);
    if (raw === null) { var old = JSON.parse(localStorage.getItem(OLD) || '[]'); raw = JSON.stringify(Array.isArray(old) ? old : []); }
    sel = JSON.parse(raw).map(String);
  } catch (e) {}
  function srcName() { return (window.SQC && SQC.src && SQC.src()) || 'main'; }
  function lessons() {
    var A = window.ADV_BANK || {}, m = srcName();
    return Object.keys(A).filter(function (n) {
      var k = +n, ok = m === 'contrib' ? (k >= 1000 && k < 2000) : m === 'myproject' ? k >= 2000 : k < 1000;
      return ok && ((A[n].questions || []).length || (A[n].part2 || []).length);
    }).sort(function (a, b) { return a - b; });
  }
  function newest() { var all = lessons(); return all.length ? all[all.length - 1] : null; }
  function mode() {
    if (srcName() !== 'main') return 'custom';
    var m = null; try { m = localStorage.getItem(MKEY); } catch (e) {}
    return m === 'custom' && plus() ? 'custom' : 'latest';
  }
  function chosen() {
    var all = lessons();
    if (mode() === 'latest') { var n = newest(); return n === null ? [] : [n]; }
    return sel.filter(function (n) { return all.indexOf(n) >= 0; });
  }
  function title(n) { return (window.ADV_BANK[n] && window.ADV_BANK[n].title) || ('Bài ' + n); }

  var api = window.sqFocus = {
    active: function () { return (mode() === 'latest' || plus()) && chosen().length > 0; },
    part1: function (qText, opts) {
      var A = window.ADV_BANK || {}, nq = norm(qText), best = null, bs = 0;
      chosen().forEach(function (n) {
        (A[n].questions || []).forEach(function (e) {
          var t, nt = norm(e[1]);
          if (nt && nq.indexOf(nt) >= 0) t = 1 + nt.length / 10000;
          else {
            var s = jac(qText, e[1]); if (s < 0.6) return;
            var ov = 0; opts.forEach(function (o) { var m = 0; e[2].forEach(function (x) { m = Math.max(m, jac(o.text, x)); }); ov += m; });
            t = 0.6 * s + 0.4 * (ov / opts.length); if (t < 0.78) return;
          }
          if (t > bs) { bs = t; best = { e: e, n: n }; }
        });
      });
      if (!best) return null;
      var txt = best.e[2]['ABCDEFGH'.indexOf(best.e[3])]; if (!txt) return null;
      var l = matchToTarget(opts, txt);
      return l ? { letter: l, lesson: title(best.n) } : null;
    },
    pool: function () {
      var A = window.ADV_BANK || {}, o = [];
      chosen().forEach(function (n) { (A[n].questions || []).forEach(function (e) { var t = e[2]['ABCDEFGH'.indexOf(e[3])]; if (t) o.push(t); }); });
      return o;
    },
    part2: function (tl, sts) {
      if (!sts || sts.length < 4) return null;
      var A = window.ADV_BANK || {}, ntl = norm(tl), best = null, bs = 0;
      chosen().forEach(function (n) {
        (A[n].part2 || []).forEach(function (p) {
          var s = jac(tl, p[1]);
          if (ntl.indexOf(norm(p[1]).slice(0, 80)) >= 0) s = Math.max(s, 0.95);
          if (s >= 0.6 && s > bs) { bs = s; best = { p: p, n: n }; }
        });
      });
      if (!best) return null;
      var chuoi = ['a', 'b', 'c', 'd'].map(function (l) {
        var st = sts.filter(function (x) { return x.letter === l; })[0]; if (!st) return '?';
        var m = matchTruth(st.text, best.p[2]), ch = m.truth === 1 ? 'Đ' : (m.truth === 0 ? 'S' : '?');
        return m.uncertain ? ch.toLowerCase() : ch;
      }).join('');
      return { chuoi: chuoi, lesson: title(best.n) };
    }
  };

  var bar, stat, fq = '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) {} }
  function setMode(v) { try { localStorage.setItem(MKEY, v); } catch (e) {} }
  function regrade() {
    var i = document.getElementById('inp'), o = document.getElementById('out');
    if (i && o && i.value.trim() && o.innerHTML.trim() && typeof window.run === 'function') window.run();
  }
  function build() {
    var ok = plus(), m = srcName(), ext = m !== 'main', md = mode(), cs = chosen(), all = lessons();
    var keep = bar.querySelector('.fc-q') && document.activeElement === bar.querySelector('.fc-q');
    bar.innerHTML = '<span class="fc-t">' + (ext ? 'BÀI TRỌNG TÂM' + (ok ? '' : ' 🔒') : 'BÀI ƯU TIÊN') + '</span>' +
      (ext && all.length ? '<input class="fc-q" type="search" placeholder="Tìm file bài..." autocomplete="off">' : '') +
      '<div class="fc-chips"></div><span class="fc-stat"></span>';
    var w = bar.querySelector('.fc-chips'), qi = bar.querySelector('.fc-q');
    function chip(txt, on, dis, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.className = on ? 'on' : ''; b.disabled = !!dis;
      b.addEventListener('click', fn); w.appendChild(b);
    }
    if (!ext) {
      var nw = newest();
      chip('Bài mới nhất' + (nw !== null ? ' (' + title(nw) + ')' : ''), md === 'latest', false, function () { setMode('latest'); build(); regrade(); });
      chip('Tự chọn' + (ok ? '' : ' 🔒'), md === 'custom', !ok, function () { setMode('custom'); build(); regrade(); });
    }
    if (ext || md === 'custom') {
      chip('Bình thường', sel.filter(function (n) { return all.indexOf(n) >= 0; }).length === 0, !ok, function () { sel = []; save(); build(); regrade(); });
      if (ext && all.length) chip('Tất cả', cs.length === all.length, !ok, function () {
        sel = cs.length === all.length ? [] : all.slice(); save(); build(); regrade();
      });
      var nq = fq.toLowerCase();
      all.forEach(function (n) {
        if (ext && nq && title(n).toLowerCase().indexOf(nq) < 0) return;
        chip(title(n), cs.indexOf(n) >= 0, !ok, function () {
          sel = cs.indexOf(n) >= 0 ? cs.filter(function (x) { return x !== n; }) : cs.concat(n); save(); build(); regrade();
        });
      });
    }
    if (qi) {
      qi.value = fq; qi.disabled = !ok;
      qi.addEventListener('input', function () { fq = qi.value; build(); var q2 = bar.querySelector('.fc-q'); q2.focus(); q2.setSelectionRange(fq.length, fq.length); });
      if (keep) qi.focus();
    }
    stat = bar.querySelector('.fc-stat');
    if (ext && !ok) stat.innerHTML = 'Dành cho gói <b>PLUS</b> trở lên. <a href="index.html#goi">Xem gói</a>';
    else if (ext && !all.length) stat.textContent = 'Chưa có file bài nào trong ' + (m === 'contrib' ? 'Contributor' : 'MyProject') + '.';
    else if (!ext && md === 'latest') {
      if (ok) upd();
      else stat.innerHTML = 'Luôn chấm ưu tiên bài mới nhất. Muốn chính xác với bài cũ, dùng gói <b>PLUS</b> để Tự chọn bài. <a href="index.html#goi">Xem gói</a>';
      if (ok && !cs.length) stat.textContent = '';
    }
    else if (!cs.length) stat.textContent = 'Đang chấm như bình thường, không ưu tiên bài nào.';
    else upd();
  }
  function upd() {
    if (!stat || !api.active()) return;
    var L = (X && X.last) || [[], []], all = (L[0] || []).concat(L[1] || []);
    var hit = all.filter(function (r) { return r.focus; }).length, nm = chosen().map(title).join(', ');
    stat.textContent = all.length ? 'Ưu tiên ' + nm + ': ' + hit + '/' + all.length + ' câu khớp bài này.' : 'Ưu tiên ' + nm + '.';
  }
  if (X) X.hooks.push(upd);
  window.sqFocusMount = function (host) {
    bar = document.createElement('div'); bar.className = 'fc-bar fc-sub'; host.appendChild(bar); build();
  };
})();
