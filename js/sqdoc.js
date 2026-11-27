/* Sử Quán · SQDoc — tài liệu văn bản dùng cho loại "Văn bản" (MyProject, Contributor, Cộng đồng).
   - SQDoc.sanitize(html): bộ lọc danh sách cho phép. MỌI HTML của người khác đều phải qua hàm này trước khi hiển thị.
   - SQDoc.render(host, html, opt): hiển thị tài liệu (đọc), có nút sao chép mã, câu hỏi bấm để kiểm tra.
   - SQDoc.editor(opt): thanh công cụ (trái) + tờ tài liệu (phải), quét chọn chữ rồi bấm công cụ.
   - Định dạng lưu: chuỗi HTML đã lọc, bắt đầu bằng MARK. Văn bản thuần cũ (không có MARK) tự đổi thành đoạn. */
(function () {
  var MARK = '<!--sqdoc1-->', MAX = 200000, COLRE = /^(transparent|#[0-9a-fA-F]{3,8})$/;
  var TAGS = 'p div span br b strong i em u s strike sub sup h1 h2 h3 h4 ul ol li blockquote pre code a table thead tbody tr td th hr mark'.split(' ');
  var VOID = { br: 1, hr: 1 }, DATA = ['data-k', 'data-id', 'data-a', 'data-v', 'data-l', 'data-t'];
  var set = function (a) { var o = {}; a.forEach(function (x) { o[x] = 1; }); return o; }, TAGSET = set(TAGS);
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- bộ lọc ---------- */
  function okStyle(css) {
    var out = [];
    String(css || '').split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 1) return;
      var k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim().toLowerCase();
      if (!v || v.length > 80 || /url\s*\(|expression|[\\@<>{}]|javascript|\/\*/.test(v)) return;
      var col = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%]+\)|[a-z]{3,20})$/;
      if ((k === 'color' || k === 'background-color') && col.test(v)) out.push(k + ':' + v);
      else if (k === 'font-size' && /^\d{1,2}(\.\d+)?(px|pt|em|rem|%)$/.test(v) && parseFloat(v) > 0 && parseFloat(v) <= (/px|pt/.test(v) ? 96 : 6)) out.push(k + ':' + v);
      else if (k === 'font-family' && /^[a-z0-9\s,'"-]+$/.test(v)) out.push(k + ':' + v);
      else if (k === 'text-align' && /^(left|right|center|justify)$/.test(v)) out.push(k + ':' + v);
      else if (k === 'font-weight' && /^(normal|bold|[1-9]00)$/.test(v)) out.push(k + ':' + v);
      else if (k === 'font-style' && /^(normal|italic)$/.test(v)) out.push(k + ':' + v);
      else if (k === 'text-decoration' && /^(none|underline|line-through|underline line-through|line-through underline)$/.test(v)) out.push(k + ':' + v);
      else if (k === 'letter-spacing' && /^-?\d(\.\d+)?(px|em)$/.test(v)) out.push(k + ':' + v);
      else if (k === 'margin-left' && /^\d{1,3}px$/.test(v) && parseInt(v, 10) <= 240) out.push(k + ':' + v);
    });
    return out.join(';');
  }
  function okHref(u) { u = String(u || '').trim(); return /^https?:\/\/[^\s<>"']{1,1000}$/i.test(u) ? u : ''; }
  function clean(node, out) {
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out.appendChild(document.createTextNode(c.nodeValue)); continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.tagName.toLowerCase();
      if (c.classList && c.classList.contains('sqd-ctl')) continue;
      if (!TAGSET[tag]) { if (/^(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|option|button|input|link|meta|title|head)$/.test(tag)) continue; clean(c, out); continue; }
      var e = document.createElement(tag), i, a;
      for (i = 0; i < c.attributes.length; i++) {
        a = c.attributes[i]; var n = a.name.toLowerCase(), v = a.value;
        if (n === 'class') { var cl = v.split(/\s+/).filter(function (x) { return /^(sqd|fx|n)-[a-z0-9_-]{1,30}$/.test(x) && !/^sqd-(on|ok|bad|sel|ed|reader)$/.test(x); }).join(' '); if (cl) e.setAttribute('class', cl); }
        else if (n === 'style') { var st = okStyle(v); if (st) e.setAttribute('style', st); }
        else if (n === 'href' && tag === 'a') { var hf = okHref(v); if (hf) e.setAttribute('href', hf); }
        else if (DATA.indexOf(n) > -1) e.setAttribute(n, v.slice(0, 60));
        else if ((n === 'colspan' || n === 'rowspan') && /^[1-9]\d?$/.test(v) && (tag === 'td' || tag === 'th')) e.setAttribute(n, v);
      }
      if (tag === 'a') { if (!e.getAttribute('href')) { clean(c, out); continue; } e.setAttribute('target', '_blank'); e.setAttribute('rel', 'noopener noreferrer nofollow'); }
      if (!VOID[tag]) clean(c, e);
      out.appendChild(e);
    }
    return out;
  }
  function sanitize(html) {
    html = String(html == null ? '' : html);
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html'), box = document.createElement('div');
    clean(doc.body, box);
    return box.innerHTML;
  }
  /* cài đặt trang giấy lưu trong dấu đầu: <!--sqdoc1;bg=#112233;ink=#ffffff--> (mặc định: nền trong suốt, chữ theo giao diện web) */
  function isDoc(t) { return typeof t === 'string' && t.indexOf('<!--sqdoc1') === 0; }
  function pageCfg(t) { var cfg = { bg: '', ink: '' }, m = isDoc(t) && String(t).match(/^<!--sqdoc1((?:;[a-z]+=[#\w]+)*)-->/); if (m && m[1]) m[1].split(';').forEach(function (kv) { var a = kv.split('='); if ((a[0] === 'bg' || a[0] === 'ink') && COLRE.test(a[1] || '')) cfg[a[0]] = a[1]; }); return cfg; }
  function headOf(cfg) { return '<!--sqdoc1' + (cfg && cfg.bg ? ';bg=' + cfg.bg : '') + (cfg && cfg.ink ? ';ink=' + cfg.ink : '') + '-->'; }
  function applyCfg(el, cfg) { el.style.background = cfg && cfg.bg || ''; el.style.color = cfg && cfg.ink || ''; el.classList.toggle('sqd-custom', !!(cfg && (cfg.bg || cfg.ink))); }
  function fromPlain(t) { return String(t || '').split(/\r?\n/).map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join(''); }
  function body(t) { return isDoc(t) ? sanitize(t) : sanitize(fromPlain(t)); }
  function toText(t) { var b = h('div'); b.innerHTML = body(t); [].forEach.call(b.querySelectorAll('.sqd-q'), function (q) { q.insertAdjacentText('beforeend', ' '); }); return (b.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* ---------- khối câu hỏi ---------- */
  var LT = 'ABCDEFGH', LS = 'abcdefgh';
  function qNode(q) {
    var d = h('div', 'sqd-q'); d.setAttribute('data-k', q.k); d.setAttribute('data-id', String(q.id || '').slice(0, 40));
    var hd = h('div', 'sqd-qh'); hd.appendChild(h('span', 'sqd-qn', (q.k === 'tf' ? 'Đúng/Sai' : 'Trắc nghiệm') + (q.id ? ' · ID ' + q.id : ''))); d.appendChild(hd);
    d.appendChild(h('div', 'sqd-qq', q.q));
    if (q.k === 'mc') {
      d.setAttribute('data-a', q.a);
      q.o.forEach(function (t, i) { var o = h('div', 'sqd-qo'); o.setAttribute('data-l', LT[i]); o.appendChild(h('b', '', LT[i])); o.appendChild(h('span', '', t)); d.appendChild(o); });
    } else {
      q.s.forEach(function (x, i) { var o = h('div', 'sqd-qs'); o.setAttribute('data-l', LS[i]); o.setAttribute('data-v', x[1] ? '1' : '0'); o.appendChild(h('b', '', LS[i])); o.appendChild(h('span', '', x[0])); d.appendChild(o); });
    }
    if (q.exp) d.appendChild(h('div', 'sqd-qe', q.exp));
    return d;
  }
  function qRead(d) {
    var k = d.getAttribute('data-k') === 'tf' ? 'tf' : 'mc', q = { k: k, id: d.getAttribute('data-id') || '', q: '', exp: '' };
    var qq = d.querySelector('.sqd-qq'), ee = d.querySelector('.sqd-qe'); q.q = qq ? qq.textContent : ''; q.exp = ee ? ee.textContent : '';
    if (k === 'mc') { q.a = d.getAttribute('data-a') || 'A'; q.o = [].map.call(d.querySelectorAll('.sqd-qo'), function (o) { return o.querySelector('span').textContent; }); }
    else q.s = [].map.call(d.querySelectorAll('.sqd-qs'), function (o) { return [o.querySelector('span').textContent, o.getAttribute('data-v') === '1' ? 1 : 0]; });
    return q;
  }

  /* ---------- hiển thị (đọc) ---------- */
  function decorate(root, mode) {
    [].forEach.call(root.querySelectorAll('a'), function (a) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer nofollow'); });
    [].forEach.call(root.querySelectorAll('.sqd-q'), function (d) {
      var k = d.getAttribute('data-k'), a = d.getAttribute('data-a');
      if (k === 'mc') [].forEach.call(d.querySelectorAll('.sqd-qo'), function (o) { o.classList.toggle('sqd-ok', mode === 'edit' && o.getAttribute('data-l') === a); });
      else [].forEach.call(d.querySelectorAll('.sqd-qs'), function (o) { o.classList.toggle('sqd-tfy', mode === 'edit' && o.getAttribute('data-v') === '1'); o.classList.toggle('sqd-tfn', mode === 'edit' && o.getAttribute('data-v') !== '1'); });
    });
  }
  function wireReader(root) {
    [].forEach.call(root.querySelectorAll('table'), function (t) { if (t.parentNode.classList.contains('sqd-tw')) return; var w = h('div', 'sqd-tw'); t.parentNode.insertBefore(w, t); w.appendChild(t); });
    [].forEach.call(root.querySelectorAll('pre.sqd-code'), function (p) {
      var b = h('button', 'sqd-copy', 'Sao chép'); b.type = 'button'; b.contentEditable = 'false';
      b.onclick = function () { var tx = (p.querySelector('code') || p).textContent; try { navigator.clipboard.writeText(tx).then(function () { b.textContent = 'Đã sao chép'; setTimeout(function () { b.textContent = 'Sao chép'; }, 1200); }); } catch (e) { b.textContent = 'Không sao chép được'; } };
      p.appendChild(b);
    });
    [].forEach.call(root.querySelectorAll('.sqd-q'), function (d) {
      var k = d.getAttribute('data-k'), done = false, ex = d.querySelector('.sqd-qe');
      if (ex) ex.hidden = true;
      function reveal() { if (ex) ex.hidden = false; }
      if (k === 'mc') {
        var a = d.getAttribute('data-a');
        [].forEach.call(d.querySelectorAll('.sqd-qo'), function (o) {
          o.tabIndex = 0;
          function pick() {
            if (done) return; done = true;
            var good = o.getAttribute('data-l') === a; o.classList.add(good ? 'sqd-ok' : 'sqd-bad');
            if (!good) { var c = d.querySelector('.sqd-qo[data-l="' + a + '"]'); if (c) c.classList.add('sqd-ok'); }
            reveal();
          }
          o.onclick = pick; o.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
        });
      } else {
        var rows = d.querySelectorAll('.sqd-qs'), left = rows.length;
        [].forEach.call(rows, function (o) {
          var bar = h('span', 'sqd-tfb'), y = h('button', '', 'Đúng'), n = h('button', '', 'Sai'); y.type = n.type = 'button';
          function pick(v) { if (o.getAttribute('data-done')) return; o.setAttribute('data-done', '1'); var good = (o.getAttribute('data-v') === '1') === v; o.classList.add(good ? 'sqd-ok' : 'sqd-bad'); o.classList.add(o.getAttribute('data-v') === '1' ? 'sqd-tfy' : 'sqd-tfn'); bar.hidden = true; var r = h('span', 'sqd-tfr', o.getAttribute('data-v') === '1' ? 'Đúng' : 'Sai'); o.appendChild(r); if (--left === 0) reveal(); }
          y.onclick = function () { pick(true); }; n.onclick = function () { pick(false); }; bar.appendChild(y); bar.appendChild(n); o.appendChild(bar);
        });
      }
      var sb = h('button', 'sqd-show', 'Hiện đáp án'); sb.type = 'button';
      sb.onclick = function () {
        done = true; reveal(); sb.remove();
        if (k === 'mc') { var c = d.querySelector('.sqd-qo[data-l="' + d.getAttribute('data-a') + '"]'); if (c) c.classList.add('sqd-ok'); }
        else [].forEach.call(d.querySelectorAll('.sqd-qs'), function (o) { o.setAttribute('data-done', '1'); o.classList.add(o.getAttribute('data-v') === '1' ? 'sqd-tfy' : 'sqd-tfn'); var b2 = o.querySelector('.sqd-tfb'); if (b2) b2.hidden = true; if (!o.querySelector('.sqd-tfr')) o.appendChild(h('span', 'sqd-tfr', o.getAttribute('data-v') === '1' ? 'Đúng' : 'Sai')); });
      };
      d.appendChild(sb);
    });
  }
  function render(host, text, opt) {
    host.textContent = ''; host.classList.add('sqd-doc'); host.classList.remove('sqd-ed');
    var page = h('div', 'sqd-page sqd-reader'); applyCfg(page, pageCfg(text)); page.innerHTML = body(text); decorate(page, 'read'); wireReader(page);
    if (!toText(text) && !page.querySelector('table,hr,.sqd-q')) page.appendChild(h('p', 'sqd-empty', 'Tài liệu trống.'));
    host.appendChild(page); return page;
  }

  /* ---------- trình soạn ---------- */
  var FONTS = [['Mặc định', ''], ['Sans', 'Arial, Helvetica, sans-serif'], ['Serif', 'Georgia, "Times New Roman", serif'], ['Mono', 'Consolas, "Courier New", monospace'], ['Chữ viết', '"Segoe Script", "Bradley Hand", cursive'], ['Chữ hẹp', '"Arial Narrow", "Roboto Condensed", sans-serif']];
  var SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];
  var TXT_COL = ['#1c1a17', '#f1ebe2', '#e5484d', '#ffa62b', '#30a46c', '#3e8bff', '#8e4ec6', '#8b8d98'], HL_COL = ['#fff1a8', '#c9f2d4', '#cfe5ff', '#ffd9d9', '#e4dcff', '#ffe2bd'];
  var FX = [['Nổi bật', 'fx-mark'], ['Bóng chữ', 'fx-shadow'], ['Phát sáng', 'fx-glow'], ['Viền chữ', 'fx-outline'], ['Gạch sóng', 'fx-wavy'], ['Gạch đôi', 'fx-double'], ['Chữ hoa nhỏ', 'fx-caps'], ['Giãn chữ', 'fx-wide'], ['Chuyển màu', 'fx-grad'], ['Nhấp nháy', 'fx-pulse'], ['Khung chữ', 'fx-box']];
  var NOTES = [['Chú thích', 'n-info'], ['Lưu ý', 'n-warn'], ['Quan trọng', 'n-bad'], ['Mẹo', 'n-ok']];

  function editor(opt) {
    opt = opt || {};
    var cfg = { bg: '', ink: '' }, tool = h('div', 'sqd-tool'), host = h('div', 'sqd-doc sqd-ed'), page = h('div', 'sqd-page'), panel = h('div', 'sqd-panel'), saved = null, onch = opt.onchange || function () {}, editQ = null, readyDone = false;
    page.contentEditable = 'true'; page.spellcheck = false; page.setAttribute('data-ph', 'Bấm vào đây và bắt đầu viết. Quét chọn chữ rồi dùng thanh công cụ bên trái để chỉnh.');
    host.appendChild(page);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

    /* chọn vùng: giữ lại khi bấm sang thanh công cụ */
    function inPage(n) { return n && (n === page || page.contains(n.nodeType === 3 ? n.parentNode : n)); }
    function track() { var s = getSelection(); if (s.rangeCount && inPage(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); ctx(); } }
    document.addEventListener('selectionchange', track);
    function restore() { page.focus(); if (saved) { var s = getSelection(); s.removeAllRanges(); s.addRange(saved); } return getSelection(); }
    function tick() { fixEmpty(); onch(); }
    function fixEmpty() { var empty = !(page.textContent || '').trim() && !page.querySelector('table,hr,.sqd-q,img'); page.classList.toggle('is-empty', empty); }
    function exec(c, v) { restore(); try { document.execCommand('styleWithCSS', false, true); } catch (e) {} document.execCommand(c, false, v == null ? null : v); fixSizes(); tick(); track(); }
    function fixSizes() {
      [].forEach.call(page.querySelectorAll('font[size="7"],span[style*="xxx-large"]'), function (f) { var px = f.getAttribute('data-px') || f.getAttribute('data-want') || window.__sqdSize; if (f.tagName === 'FONT') { var s = h('span'); s.style.fontSize = (px || 16) + 'px'; while (f.firstChild) s.appendChild(f.firstChild); f.parentNode.replaceChild(s, f); } else f.style.fontSize = (px || 16) + 'px'; });
      [].forEach.call(page.querySelectorAll('font'), function (f) { var s = h('span'); if (f.face) s.style.fontFamily = f.face; if (f.color) s.style.color = f.color; while (f.firstChild) s.appendChild(f.firstChild); f.parentNode.replaceChild(s, f); });
    }
    function setSize(px) { window.__sqdSize = px; restore(); try { document.execCommand('styleWithCSS', false, false); } catch (e) {} document.execCommand('fontSize', false, '7'); fixSizes(); tick(); track(); }
    function curPx() { var s = getSelection(), n = s.anchorNode; if (!n) return 16; if (n.nodeType === 3) n = n.parentNode; return Math.round(parseFloat(getComputedStyle(n).fontSize)) || 16; }
    function selHtml() { var s = getSelection(); if (!s.rangeCount || s.isCollapsed) return ''; var d = h('div'); d.appendChild(s.getRangeAt(0).cloneContents()); return d.innerHTML; }
    function selText() { var s = getSelection(); return s.rangeCount && !s.isCollapsed ? s.toString() : ''; }
    function insHtml(html) { restore(); document.execCommand('insertHTML', false, html); fixSizes(); tick(); track(); }
    /* chèn KHỐI (bảng, câu hỏi, chú thích, mã, đường kẻ) thẳng vào DOM, không dùng insertHTML (Chrome sẽ gộp dòng đầu của khối vào đoạn đang gõ) */
    function topBlock() { var n = saved && saved.startContainer; if (n && n.nodeType === 3) n = n.parentNode; if (!n || !inPage(n) || n === page) return null; while (n && n.parentNode !== page) n = n.parentNode; return n; }
    function insBlock(node) {
      restore(); var b = topBlock();
      var empty = b && /^(P|DIV)$/.test(b.tagName) && !b.querySelector('table,hr,.sqd-q,pre') && !(b.textContent || '').trim();
      if (b && empty) page.replaceChild(node, b); else if (b) page.insertBefore(node, b.nextSibling); else page.appendChild(node);
      var nx = node.nextElementSibling;
      if (!nx || /^(TABLE|PRE|HR)$/.test(nx.tagName) || nx.classList.contains('sqd-q') || nx.classList.contains('sqd-note')) { nx = h('p'); nx.appendChild(h('br')); page.insertBefore(nx, node.nextSibling); }
      var r = document.createRange(); r.setStart(nx, 0); r.collapse(true); var s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r);
      page.classList.remove('is-empty'); fixSizes(); tick(); track();
    }
    function cutSel() { var s2 = getSelection(); if (s2.rangeCount && !s2.isCollapsed) document.execCommand('delete'); track(); }
    function closest(sel) { var n = (saved && saved.startContainer) || null; if (n && n.nodeType === 3) n = n.parentNode; return n && n.closest && inPage(n) ? n.closest(sel) : null; }

    /* hiệu ứng chữ: bọc vùng chọn trong span có lớp fx-* (bấm lần nữa để bỏ) */
    function toggleFx(cls) {
      var s = restore(); if (!s.rangeCount) return;
      var ex = closest('span.' + cls);
      if (ex) { var p = ex.parentNode; while (ex.firstChild) p.insertBefore(ex.firstChild, ex); p.removeChild(ex); tick(); return; }
      if (s.isCollapsed) return msg('Hãy quét chọn đoạn chữ trước.');
      var r = s.getRangeAt(0), sp = h('span', 'sqd-fx ' + cls); sp.appendChild(r.extractContents()); r.insertNode(sp);
      var nr = document.createRange(); nr.selectNodeContents(sp); s.removeAllRanges(); s.addRange(nr); tick(); track();
    }
    function clearFmt() { exec('removeFormat'); [].forEach.call(page.querySelectorAll('.sqd-fx'), function (f) { if (saved && saved.intersectsNode(f)) { var p = f.parentNode; while (f.firstChild) p.insertBefore(f.firstChild, f); p.removeChild(f); } }); tick(); }
    function blockWrap(cls, tag, ph) {
      restore();
      if (tag === 'pre') {
        var raw = selText() || ph; cutSel();
        var pre = h('pre', cls), cd = h('code'); cd.textContent = raw; pre.appendChild(cd); insBlock(pre);
      } else {
        var d = h('div'); d.innerHTML = sanitize(selHtml()); cutSel();
        var note = h('div', 'sqd-note ' + cls);
        if (!d.innerHTML.trim()) note.innerHTML = '<p>' + esc(ph) + '</p>';
        else if (d.querySelector('p,div,h1,h2,h3,h4,ul,ol,table,pre,blockquote')) note.innerHTML = d.innerHTML;
        else note.innerHTML = '<p>' + d.innerHTML + '</p>';
        insBlock(note);
      }
    }
    function msg(t) { st.textContent = t; clearTimeout(msg.t); msg.t = setTimeout(function () { st.textContent = ''; }, 3500); }

    /* ---------- bảng ---------- */
    function insertTable(r, c, head) {
      var t = '<table class="sqd-tbl"><tbody>';
      for (var i = 0; i < r; i++) { t += '<tr>'; for (var j = 0; j < c; j++) t += (head && i === 0 ? '<th>' : '<td>') + '<br>' + (head && i === 0 ? '</th>' : '</td>'); t += '</tr>'; }
      var tmp = h('div'); tmp.innerHTML = t + '</tbody></table>'; insBlock(tmp.firstChild);
    }
    function tblCtx() { var td = closest('td,th'); return td ? { td: td, tr: td.parentNode, t: td.closest('table') } : null; }
    function cellIdx(td) { return [].indexOf.call(td.parentNode.children, td); }
    function tblOp(op) {
      var x = tblCtx(); if (!x) return msg('Đặt con trỏ vào một ô của bảng trước.');
      var rows = x.t.rows, ci = cellIdx(x.td), ri = x.tr.rowIndex;
      function mk(tag) { var c = h(tag); c.appendChild(h('br')); return c; }
      if (op === 'rowA') { var nr = x.t.insertRow(ri + 1); for (var i = 0; i < x.tr.cells.length; i++) nr.appendChild(mk('td')); }
      else if (op === 'rowD') { if (rows.length <= 1) x.t.remove(); else x.t.deleteRow(ri); }
      else if (op === 'colA') { [].forEach.call(rows, function (r) { var ref = r.cells[ci], c = mk(ref && ref.tagName === 'TH' ? 'th' : 'td'); r.insertBefore(c, ref ? ref.nextSibling : null); }); }
      else if (op === 'colD') { if (x.tr.cells.length <= 1) x.t.remove(); else [].forEach.call(rows, function (r) { if (r.cells[ci]) r.deleteCell(ci); }); }
      else if (op === 'del') x.t.remove();
      tick(); track();
    }

    /* ---------- câu hỏi ---------- */
    function nextId() { var m = 0; [].forEach.call(page.querySelectorAll('.sqd-q'), function (q) { var v = Number(q.getAttribute('data-id')); if (isFinite(v) && v > m) m = v; }); return String(Math.floor(m) + 1); }
    function placeQ(q) {
      var n = qNode(q);
      if (editQ) { editQ.parentNode.replaceChild(n, editQ); editQ = null; decorate(page, 'edit'); ctrls(); tick(); return; }
      insBlock(n); decorate(page, 'edit'); ctrls(); tick();
    }
    /* nút Sửa/Xóa chỉ có trong trình soạn (không lưu) */
    function ctrls() {
      [].forEach.call(page.querySelectorAll('.sqd-q'), function (d) {
        d.contentEditable = 'false';
        if (d.querySelector('.sqd-ctl')) return;
        var c = h('div', 'sqd-ctl'), e = h('button', '', 'Sửa'), x = h('button', '', 'Xóa'); e.type = x.type = 'button'; c.contentEditable = 'false';
        e.onmousedown = x.onmousedown = function (ev) { ev.preventDefault(); };
        e.onclick = function () { editQ = d; openQ(qRead(d)); };
        x.onclick = function () { if (confirm('Xóa câu hỏi này khỏi tài liệu?')) { d.remove(); tick(); } };
        c.appendChild(e); c.appendChild(x); d.insertBefore(c, d.firstChild);
      });
    }

    /* ---------- bảng điều khiển phụ (nút, bảng, câu hỏi) ---------- */
    function field(lab, el) { var w = h('label', 'sqd-f'); w.appendChild(h('span', '', lab)); w.appendChild(el); return w; }
    function inp(ph, val) { var i = h('input'); i.type = 'text'; i.placeholder = ph || ''; if (val) i.value = val; return i; }
    function area(ph, rows, val) { var a = h('textarea'); a.placeholder = ph || ''; a.rows = rows || 3; if (val) a.value = val; return a; }
    function pbtn(l, f, alt) { var b = h('button', 'sqd-pb' + (alt ? ' alt' : ''), l); b.type = 'button'; b.onclick = f; return b; }
    function closeP() { panel.hidden = true; panel.textContent = ''; editQ = null; }
    function openP(title) { panel.hidden = false; panel.textContent = ''; var hd = h('div', 'sqd-ph'); hd.appendChild(h('b', '', title)); var x = pbtn('Đóng', closeP, 1); hd.appendChild(x); panel.appendChild(hd); panel.scrollIntoView({ block: 'nearest' }); return panel; }
    function panelBtn() {
      var P = openP('Nút liên kết'), u = inp('https://…'), l = inp('Chữ trên nút', selText().slice(0, 40));
      P.appendChild(field('Dán đường dẫn', u)); P.appendChild(field('Chữ trên nút', l));
      var pb = pbtn('Dán từ bộ nhớ tạm', function () { try { navigator.clipboard.readText().then(function (t) { u.value = t.trim(); }); } catch (e) {} }, 1);
      var ok = pbtn('Chèn nút', function () {
        var href = okHref(u.value); if (!href) return pm.textContent = 'Đường dẫn phải bắt đầu bằng http:// hoặc https://';
        insHtml('<a class="sqd-btn" href="' + esc(href) + '">' + esc(l.value.trim() || href) + '</a>&nbsp;'); closeP();
      }), pm = h('div', 'sqd-pm'); P.appendChild(h('div', 'sqd-prow')).appendChild(pb); P.lastChild.appendChild(ok); P.appendChild(pm);
    }
    function panelTbl() {
      var P = openP('Chèn bảng'), r = inp('', '3'), c = inp('', '3'), hd = h('input'); hd.type = 'checkbox'; hd.checked = true; r.type = c.type = 'number'; r.min = c.min = '1'; r.max = '30'; c.max = '10';
      P.appendChild(field('Số hàng', r)); P.appendChild(field('Số cột', c)); var w = h('label', 'sqd-ck'); w.appendChild(hd); w.appendChild(h('span', '', 'Hàng đầu là tiêu đề')); P.appendChild(w);
      P.appendChild(h('div', 'sqd-prow')).appendChild(pbtn('Chèn bảng', function () { insertTable(Math.max(1, Math.min(30, +r.value || 3)), Math.max(1, Math.min(10, +c.value || 3)), hd.checked); closeP(); }));
    }
    function openQ(pre) {
      var P = openP(editQ ? 'Sửa câu hỏi' : 'Chèn câu hỏi'), kind = pre ? (pre.k === 'tf' ? 'tf' : 'mc') : 'paste', body = h('div', 'sqd-pbody');
      var seg = h('div', 'sqd-seg');
      [['paste', 'Dán đề'], ['mc', 'Phần I · Trắc nghiệm'], ['tf', 'Phần II · Đúng/Sai']].forEach(function (k) {
        var b = h('button', kind === k[0] ? 'on' : '', k[1]); b.type = 'button'; if (editQ && k[0] === 'paste') b.hidden = true;
        b.onclick = function () { kind = k[0]; [].forEach.call(seg.children, function (x) { x.className = ''; }); b.className = 'on'; draw(); }; seg.appendChild(b);
      });
      P.appendChild(seg); P.appendChild(body);
      function draw() {
        body.textContent = '';
        if (kind === 'paste') {
          var ta = area('Dán đề ở đây. Nhận cả dạng Cơ bản:\nID | Câu hỏi\nA. …  B. …  C. …  D. …\nĐáp án: B\n\nvà dạng đề Azota/Câu hỏi (Câu 1 ID:…, Đáp án đúng: …). Dán nhiều câu cùng lúc được.', 9), m = h('div', 'sqd-pm');
          body.appendChild(ta); body.appendChild(m);
          body.appendChild(h('div', 'sqd-prow')).appendChild(pbtn('Chèn các câu', function () {
            var C = window.SQC || {}, res = C.parseExam ? C.parseExam(ta.value) : { p1: [], p2: [], err: [] };
            if (!res.p1.length && !res.p2.length && C.parse) { var bs = C.parse(ta.value); res = { p1: bs.qs, p2: [], err: bs.err }; }
            if (!res.p1.length && !res.p2.length) { m.textContent = res.err && res.err.length ? res.err.slice(0, 3).join(' | ') : 'Không tìm thấy câu nào. Mỗi câu cần "ID | câu hỏi" hoặc "Câu N ID:…".'; return; }
            res.p1.forEach(function (r) { insBlock(qNode({ k: 'mc', id: r[0], q: r[1], o: r[2], a: r[3], exp: r[4] || '' })); });
            res.p2.forEach(function (r) { insBlock(qNode({ k: 'tf', id: r[0], q: r[1], s: r[2], exp: (r[3] && r[3].exp) || '' })); });
            decorate(page, 'edit'); ctrls(); tick(); closeP(); msg('Đã chèn ' + (res.p1.length + res.p2.length) + ' câu' + (res.err && res.err.length ? ', bỏ qua ' + res.err.length + ' câu lỗi.' : '.'));
          }));
        } else if (kind === 'mc') {
          var S = { id: pre && pre.id || '', q: pre && pre.q || '', n: pre && pre.o ? pre.o.length : 4, o: pre && pre.o ? pre.o.slice() : ['', '', '', ''], a: pre && pre.a ? LT.indexOf(pre.a) : -1, exp: pre && pre.exp || '' };
          function dm() {
            body.textContent = '';
            var i1 = inp('Để trống = tự đặt ' + nextId(), S.id); i1.oninput = function () { S.id = i1.value; }; body.appendChild(field('ID câu', i1));
            var q1 = area('Nội dung câu hỏi…', 3, S.q); q1.oninput = function () { S.q = q1.value; }; body.appendChild(field('Câu hỏi', q1));
            var sr = h('div', 'sqd-step'); sr.appendChild(h('span', '', 'Số đáp án')); var mi = pbtn('−', function () { if (S.n > 2) { S.n--; S.o.length = S.n; if (S.a >= S.n) S.a = -1; dm(); } }, 1), pl = pbtn('+', function () { if (S.n < 8) { S.n++; S.o.push(''); dm(); } }, 1); sr.appendChild(mi); sr.appendChild(h('b', '', String(S.n))); sr.appendChild(pl); body.appendChild(sr);
            for (var i = 0; i < S.n; i++) (function (i) { var rw = h('div', 'sqd-orow'), b = h('button', 'sqd-let' + (S.a === i ? ' on' : ''), S.a === i ? '✓' : LT[i]), t = inp('Đáp án ' + LT[i], S.o[i]); b.type = 'button'; b.title = 'Chọn ' + LT[i] + ' là đáp án đúng'; b.onclick = function () { S.a = i; dm(); }; t.oninput = function () { S.o[i] = t.value; }; rw.appendChild(b); rw.appendChild(t); body.appendChild(rw); })(i);
            body.appendChild(h('div', 'sqd-hint', 'Bấm chữ cái để chọn đáp án đúng.'));
            var e1 = area('Vì sao đáp án đúng… (không bắt buộc)', 2, S.exp); e1.oninput = function () { S.exp = e1.value; }; body.appendChild(field('Giải thích', e1));
            var m = h('div', 'sqd-pm'); body.appendChild(h('div', 'sqd-prow')).appendChild(pbtn(editQ ? 'Lưu câu' : 'Chèn câu', function () {
              if (!S.q.trim()) return m.textContent = 'Chưa nhập nội dung câu hỏi.';
              if (S.o.some(function (x) { return !x.trim(); })) return m.textContent = 'Còn đáp án để trống.';
              if (S.a < 0) return m.textContent = 'Hãy bấm chữ cái để chọn đáp án đúng.';
              placeQ({ k: 'mc', id: (S.id || '').replace(/\s+/g, '') || nextId(), q: S.q.trim(), o: S.o.map(function (x) { return x.trim(); }), a: LT[S.a], exp: S.exp.trim() }); closeP();
            })); body.appendChild(m);
          }
          dm();
        } else {
          var T = { id: pre && pre.id || '', q: pre && pre.q || '', n: pre && pre.s ? pre.s.length : 4, s: pre && pre.s ? pre.s.map(function (x) { return { t: x[0], v: x[1] }; }) : [{ t: '', v: null }, { t: '', v: null }, { t: '', v: null }, { t: '', v: null }], exp: pre && pre.exp || '' };
          function dt() {
            body.textContent = '';
            var i1 = inp('Để trống = tự đặt ' + nextId(), T.id); i1.oninput = function () { T.id = i1.value; }; body.appendChild(field('ID câu', i1));
            var q1 = area('Đoạn tư liệu của câu…', 4, T.q); q1.oninput = function () { T.q = q1.value; }; body.appendChild(field('Tư liệu / đoạn dẫn', q1));
            var sr = h('div', 'sqd-step'); sr.appendChild(h('span', '', 'Số mệnh đề')); var mi = pbtn('−', function () { if (T.n > 2) { T.n--; T.s.length = T.n; dt(); } }, 1), pl = pbtn('+', function () { if (T.n < 8) { T.n++; T.s.push({ t: '', v: null }); dt(); } }, 1); sr.appendChild(mi); sr.appendChild(h('b', '', String(T.n))); sr.appendChild(pl); body.appendChild(sr);
            for (var i = 0; i < T.n; i++) (function (i) { var x = T.s[i], rw = h('div', 'sqd-orow'), b = h('span', 'sqd-let', LS[i]), t = inp('Mệnh đề ' + LS[i], x.t), y = h('button', 'sqd-tf' + (x.v === 1 ? ' y' : ''), 'Đúng'), n = h('button', 'sqd-tf' + (x.v === 0 ? ' n' : ''), 'Sai'); y.type = n.type = 'button'; t.oninput = function () { x.t = t.value; }; y.onclick = function () { x.v = 1; dt(); }; n.onclick = function () { x.v = 0; dt(); }; rw.appendChild(b); rw.appendChild(t); rw.appendChild(y); rw.appendChild(n); body.appendChild(rw); })(i);
            var e1 = area('Vì sao… (không bắt buộc)', 2, T.exp); e1.oninput = function () { T.exp = e1.value; }; body.appendChild(field('Giải thích', e1));
            var m = h('div', 'sqd-pm'); body.appendChild(h('div', 'sqd-prow')).appendChild(pbtn(editQ ? 'Lưu câu' : 'Chèn câu', function () {
              if (!T.q.trim()) return m.textContent = 'Chưa nhập tư liệu.';
              if (T.s.some(function (x) { return !x.t.trim(); })) return m.textContent = 'Còn mệnh đề để trống.';
              if (T.s.some(function (x) { return x.v == null; })) return m.textContent = 'Hãy chọn Đúng/Sai cho mọi mệnh đề.';
              placeQ({ k: 'tf', id: (T.id || '').replace(/\s+/g, '') || nextId(), q: T.q.trim(), s: T.s.map(function (x) { return [x.t.trim(), x.v]; }), exp: T.exp.trim() }); closeP();
            })); body.appendChild(m);
          }
          dt();
        }
      }
      draw();
    }

    /* ---------- thanh công cụ ---------- */
    var st = h('div', 'sqd-st'), ctxEls = {};
    function group(title) { var g = h('div', 'sqd-g'); g.appendChild(h('div', 'sqd-gt', title)); var r = h('div', 'sqd-gr'); g.appendChild(r); tool.appendChild(g); return r; }
    function tb(row, label, fn, title, cls) { var b = h('button', 'sqd-tb' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (title) b.title = title; b.onmousedown = function (e) { e.preventDefault(); }; b.onclick = function () { fn(b); }; row.appendChild(b); return b; }
    function sel(row, opts, fn, title) { var s = h('select', 'sqd-sel'); s.title = title; opts.forEach(function (o) { var e = h('option', '', o[0]); e.value = o[1]; s.appendChild(e); }); s.onchange = function () { fn(s.value); s.selectedIndex = 0; }; s.onmousedown = function () { track(); }; row.appendChild(s); return s; }
    function sw(row, cols, fn, title) { cols.forEach(function (c) { var b = h('button', 'sqd-sw'); b.type = 'button'; b.style.background = c; b.title = title + ' ' + c; b.onmousedown = function (e) { e.preventDefault(); }; b.onclick = function () { fn(c); }; row.appendChild(b); }); }

    var g1 = group('Chữ');
    var fs = sel(g1, [['Kiểu chữ', '']].concat(FONTS.slice(1).map(function (f) { return [f[0], f[1]]; })).concat([['↺ Mặc định', 'default']]), function (v) { if (!v) return; if (v === 'default') return exec('fontName', 'inherit'); exec('fontName', v); }, 'Kiểu chữ cho vùng chọn');
    var sz = sel(g1, [['Cỡ chữ', '']].concat(SIZES.map(function (n) { return [n + ' px', n]; })), function (v) { if (v) setSize(+v); }, 'Cỡ chữ cho vùng chọn');
    tb(g1, 'A−', function () { setSize(Math.max(8, curPx() - 2)); }, 'Giảm cỡ chữ');
    tb(g1, 'A+', function () { setSize(Math.min(96, curPx() + 2)); }, 'Tăng cỡ chữ');
    var g2 = group('Kiểu');
    tb(g2, 'B', function () { exec('bold'); }, 'In đậm (Ctrl+B)', 'b'); tb(g2, 'I', function () { exec('italic'); }, 'In nghiêng (Ctrl+I)', 'i'); tb(g2, 'U', function () { exec('underline'); }, 'Gạch chân (Ctrl+U)', 'u'); tb(g2, 'S', function () { exec('strikeThrough'); }, 'Gạch ngang', 's');
    tb(g2, 'x²', function () { exec('superscript'); }, 'Chỉ số trên'); tb(g2, 'x₂', function () { exec('subscript'); }, 'Chỉ số dưới'); tb(g2, 'Xóa định dạng', clearFmt, 'Xóa định dạng của vùng chọn');
    var g3 = group('Màu chữ (vùng chọn)'); sw(g3, TXT_COL, function (c) { exec('foreColor', c); }, 'Màu chữ'); tb(g3, 'Màu mặc định', function () { exec('foreColor', 'inherit'); }, 'Trả chữ về màu của trang');
    var g4 = group('Tô nền chữ'); sw(g4, HL_COL, function (c) { exec('hiliteColor', c); }, 'Tô nền'); tb(g4, 'Bỏ tô', function () { exec('hiliteColor', 'transparent'); }, 'Bỏ màu nền');
    var g5 = group('Tiêu đề · đoạn');
    ['Tiêu đề 1', 'Tiêu đề 2', 'Tiêu đề 3', 'Tiêu đề 4'].forEach(function (l, i) { tb(g5, 'H' + (i + 1), function () { exec('formatBlock', 'h' + (i + 1)); }, l, 'hh'); });
    tb(g5, 'Đoạn', function () { exec('formatBlock', 'p'); }, 'Đoạn văn thường');
    tb(g5, '⟸', function () { exec('justifyLeft'); }, 'Căn trái'); tb(g5, '≡', function () { exec('justifyCenter'); }, 'Căn giữa'); tb(g5, '⟹', function () { exec('justifyRight'); }, 'Căn phải');
    var g6 = group('Danh sách · mục con');
    tb(g6, '• Danh sách', function () { exec('insertUnorderedList'); }, 'Danh sách chấm'); tb(g6, '1. Danh sách', function () { exec('insertOrderedList'); }, 'Danh sách số');
    tb(g6, 'Mục con →', function () { restore(); if (!closest('li')) document.execCommand('insertUnorderedList'); exec('indent'); }, 'Thụt vào thành mục con'); tb(g6, '← Ra', function () { exec('outdent'); }, 'Đưa mục ra ngoài một cấp');
    var g7 = group('Chèn khối');
    NOTES.forEach(function (n) { tb(g7, n[0], function () { blockWrap(n[1], 'div', 'Nội dung ' + n[0].toLowerCase()); }, 'Khối ' + n[0].toLowerCase() + ' (quét chọn chữ để bọc vào)'); });
    tb(g7, 'Mã sao chép', function () { blockWrap('sqd-code', 'pre', 'Dán mã hoặc lệnh ở đây'); }, 'Khối mã có nút Sao chép (quét chọn chữ để bọc vào)');
    tb(g7, 'Nút liên kết', panelBtn, 'Dán một đường dẫn thành nút'); tb(g7, 'Đường kẻ', function () { insBlock(h('hr')); }, 'Đường kẻ ngang'); tb(g7, 'Trích dẫn', function () { exec('formatBlock', 'blockquote'); }, 'Khối trích dẫn');
    var g8 = group('Bảng'); tb(g8, 'Chèn bảng', panelTbl, 'Chèn bảng mới');
    [['+ Hàng', 'rowA'], ['− Hàng', 'rowD'], ['+ Cột', 'colA'], ['− Cột', 'colD'], ['Xóa bảng', 'del']].forEach(function (o) { ctxEls[o[1]] = tb(g8, o[0], function () { tblOp(o[1]); }, 'Cần đặt con trỏ trong bảng'); });
    var g9 = group('Hiệu ứng chữ (quét chọn chữ)'); FX.forEach(function (f) { tb(g9, f[0], function () { toggleFx(f[1]); }, 'Bấm lần nữa để bỏ hiệu ứng', 'fxb ' + f[1]); });
    var g10 = group('Câu hỏi'); tb(g10, 'Chèn câu hỏi', function () { editQ = null; openQ(null); }, 'Dán đề (Cơ bản / Azota) hoặc tạo Phần I, Phần II với đáp án đúng');
    var g11 = group('Hoàn tác'); tb(g11, '↶ Hoàn tác', function () { exec('undo'); }); tb(g11, '↷ Làm lại', function () { exec('redo'); });
    /* trang giấy: mặc định trong suốt; chỉ ở đây mới đổi được màu nền và màu chữ của cả trang */
    var gp = group('Trang giấy'), bgIn = h('input'), inkIn = h('input'), pgSt = h('div', 'sqd-gnote');
    bgIn.type = inkIn.type = 'color'; bgIn.className = inkIn.className = 'sqd-clr';
    gp.parentNode.appendChild(h('div', 'sqd-gnote', 'Mặc định trang trong suốt, chữ theo giao diện web. Muốn đổi màu nền hoặc màu chữ của cả trang thì chỉnh ở đây.'));
    function setCfg(k, v) { cfg[k] = v; applyCfg(page, cfg); paintPg(); tick(); }
    function lbl(t, el) { var w = h('label', 'sqd-pgl'); w.appendChild(h('span', '', t)); w.appendChild(el); gp.appendChild(w); }
    function paintPg() { bgIn.value = /^#[0-9a-f]{6}$/i.test(cfg.bg) ? cfg.bg : '#000000'; inkIn.value = /^#[0-9a-f]{6}$/i.test(cfg.ink) ? cfg.ink : '#ffffff'; pgSt.textContent = 'Nền trang: ' + (cfg.bg || 'trong suốt') + ' · Chữ: ' + (cfg.ink || 'theo giao diện web'); }
    lbl('Màu nền trang', bgIn); sw(gp, ['#f6f3ec', '#ffffff', '#1d1b18', '#0f1d2e', '#1f2a1f', '#2b1d2e'], function (c) { setCfg('bg', c); }, 'Nền trang');
    lbl('Màu chữ cả trang', inkIn);
    bgIn.oninput = function () { setCfg('bg', bgIn.value); }; inkIn.oninput = function () { setCfg('ink', inkIn.value); };
    tb(gp, 'Nền trong suốt', function () { setCfg('bg', ''); }, 'Bỏ màu nền, trang trong suốt'); tb(gp, 'Chữ theo web', function () { setCfg('ink', ''); }, 'Bỏ màu chữ của trang'); tb(gp, 'Đặt lại trang', function () { cfg = { bg: '', ink: '' }; applyCfg(page, cfg); paintPg(); tick(); }, 'Trang trong suốt, chữ mặc định');
    gp.parentNode.appendChild(pgSt); paintPg();
    panel.hidden = true; tool.appendChild(panel); tool.appendChild(st);
    function ctx() { var x = !!tblCtx(); ['rowA', 'rowD', 'colA', 'colD', 'del'].forEach(function (k) { ctxEls[k].disabled = !x; }); }

    /* dán: lọc HTML lạ, giữ định dạng hợp lệ */
    page.addEventListener('paste', function (e) {
      var cd = e.clipboardData; if (!cd) return; e.preventDefault();
      var html = cd.getData('text/html'), txt = cd.getData('text/plain');
      if (html) { var s = sanitize(html); document.execCommand('insertHTML', false, s); } else document.execCommand('insertText', false, txt);
      fixSizes(); decorate(page, 'edit'); ctrls(); tick();
    });
    page.addEventListener('input', function () { fixSizes(); tick(); });
    page.addEventListener('keyup', track); page.addEventListener('mouseup', track);
    page.addEventListener('dblclick', function (e) { var q = e.target.closest && e.target.closest('.sqd-q'); if (q && !q.querySelector('textarea')) { editQ = q; openQ(qRead(q)); } });
    page.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a'); if (a) e.preventDefault(); });
    page.addEventListener('keydown', function (e) { if (e.key === 'Tab') { var td = closest('td,th'); if (td) { e.preventDefault(); var nx = td.nextElementSibling || (td.parentNode.nextElementSibling && td.parentNode.nextElementSibling.cells[0]); if (nx) { var r = document.createRange(); r.selectNodeContents(nx); r.collapse(true); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } } } });

    function html() {
      var c = page.cloneNode(true); [].forEach.call(c.querySelectorAll('.sqd-ctl,.sqd-copy,.sqd-show,.sqd-tfb,.sqd-tfr'), function (x) { x.remove(); });
      [].forEach.call(c.querySelectorAll('[contenteditable]'), function (x) { x.removeAttribute('contenteditable'); });
      [].forEach.call(c.querySelectorAll('.sqd-ok,.sqd-bad,.sqd-tfy,.sqd-tfn'), function (x) { x.classList.remove('sqd-ok', 'sqd-bad', 'sqd-tfy', 'sqd-tfn'); if (!x.getAttribute('class')) x.removeAttribute('class'); });
      var out = sanitize(c.innerHTML); return fromEmpty(out) ? '' : headOf(cfg) + out;
    }
    function fromEmpty(s) { var d = h('div'); d.innerHTML = s; return !(d.textContent || '').trim() && !d.querySelector('table,hr,.sqd-q'); }
    function setHtml(t) {
      closeP(); cfg = pageCfg(t); applyCfg(page, cfg); page.innerHTML = t ? body(t) : ''; if (!page.firstChild) page.innerHTML = '<p><br></p>';
      decorate(page, 'edit'); ctrls(); fixEmpty(); saved = null; ctx(); paintPg();
    }
    fixEmpty(); ctx();
    return { tool: tool, page: host, el: page, html: html, set: setHtml, hasContent: function () { return !!html(); }, text: function () { return toText(html()); }, destroy: function () { document.removeEventListener('selectionchange', track); } };
  }

  /* ---------- xuất file .html độc lập ---------- */
  async function exportHtml(title, text) {
    var css = ''; try { css = await (await fetch('css/sqdoc.css')).text(); } catch (e) {}
    var cfg = pageCfg(text), pst = (cfg.bg ? 'background:' + cfg.bg + ';' : '') + (cfg.ink ? 'color:' + cfg.ink : ''), link = css ? '<style>' + css + '</style>' : '<link rel="stylesheet" href="css/sqdoc.css">';
    return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title>' + link + '<style>body{margin:0;background:#14120f;color:#f1ebe2;padding:24px 12px}.sqd-page{max-width:820px;margin:0 auto}</style></head><body><div class="sqd-doc"><div class="sqd-page' + (pst ? ' sqd-custom" style="' + pst : '') + '">' + (isDoc(text) ? sanitize(text) : sanitize(fromPlain(text))) + '</div></div></body></html>';
  }

  window.SQDoc = { pageCfg: pageCfg, MARK: MARK, MAX: MAX, sanitize: sanitize, isDoc: isDoc, fromPlain: fromPlain, toText: toText, render: render, editor: editor, exportHtml: exportHtml };
})();
