/* LOOKUP điện thoại: biến cột phải (.az-side) của MỌI mục (BASIC/ADVANCE/QUEST/SAVE/CONTRIBUTOR/MYPROJECT)
   thành khung nổi: nút nổi .dk-fab mở khung ở đáy màn hình, "THU GỌN" / chạm ngoài / Esc để cất.
   Không đổi DOM cũ ngoài việc thêm .dk-head vào đầu mỗi .az-side. CSS: css/dock.css (chỉ ≤900px). */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width:900px)'), root = document.documentElement;
  var LABEL = { BASIC: 'Tìm câu', ADVANCE: 'Tìm câu', QUEST: 'Điều khiển', SAVE: 'Bộ lọc', CONTRIBUTOR: 'Danh mục', MYPROJECT: 'Danh mục' };
  var searched = false, raf = 0;

  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  var ICON_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>';
  var ICON_D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  var fab = mk('button', 'dk-fab', ICON_S + '<span class="dk-fl">Tìm câu</span>');
  fab.type = 'button'; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-label', 'Mở khung tìm kiếm và điều hướng');
  var back = mk('div', 'dk-back'); back.setAttribute('aria-hidden', 'true');
  /* lớp mờ phải cùng ngữ cảnh xếp lớp với .az-side (nằm trong main.bank), nếu không sẽ đè lên khung */
  (document.querySelector('main.bank') || document.body).appendChild(back); document.body.appendChild(fab);

  function sides() { return [].slice.call(document.querySelectorAll('.az>.az-side')); }
  function vis(s) { var p = s.parentElement; return !!p && p.getClientRects().length > 0; }
  function cur() { return sides().filter(vis)[0] || null; }
  function modeName() {
    var on = document.querySelector('#modeChips .bank-chip.is-on'), t = on ? on.textContent.toUpperCase() : '';
    for (var k in LABEL) if (t.indexOf(k) > -1) return k;
    return '';
  }
  function setText(e, v) { if (e && e.textContent !== v) e.textContent = v; }

  function ensure(s) {
    if (s.firstElementChild && s.firstElementChild.classList.contains('dk-head')) return;
    var h = mk('div', 'dk-head', '<b class="dk-t"></b><button type="button" class="dk-x" aria-label="Thu gọn khung">THU GỌN ' + ICON_D + '</button>');
    s.insertBefore(h, s.firstChild);
  }

  function open() {
    if (!root.classList.contains('dk-on')) return;
    root.classList.add('dk-open'); fab.setAttribute('aria-expanded', 'true');
  }
  function close(toResults) {
    var was = root.classList.contains('dk-open');
    root.classList.remove('dk-open'); fab.setAttribute('aria-expanded', 'false');
    var a = document.activeElement; if (a && a.closest && a.closest('.az-side') && a.blur) a.blur();
    if (was && toResults && searched) {
      var s = cur(), r = s && s.parentElement, t = r && (r.querySelector('.az-main .az-q') || r.querySelector('.az-main'));
      if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (was) searched = false;
  }

  function sync() {
    raf = 0;
    var all = sides(); all.forEach(ensure);
    var s = mq.matches ? cur() : null;
    root.classList.toggle('dk-on', !!s);
    if (!s) {
      [].forEach.call(document.querySelectorAll('.az-side .bank-search[data-ph]'), function (i) { if (i.placeholder !== i.getAttribute('data-ph')) i.placeholder = i.getAttribute('data-ph'); });
      close(false); return;
    }
    [].forEach.call(document.querySelectorAll('.az-side .bank-search'), function (i) {   /* gợi ý ngắn cho ô hẹp */
      if (!i.hasAttribute('data-ph')) i.setAttribute('data-ph', i.placeholder);
      var want = s ? 'Tìm câu, đáp án, ID…' : i.getAttribute('data-ph'); if (i.placeholder !== want) i.placeholder = want;
    });
    var lab = LABEL[modeName()] || 'Tìm câu';
    setText(fab.querySelector('.dk-fl'), lab);
    all.forEach(function (x) { setText(x.querySelector('.dk-t'), lab.toUpperCase()); });
  }
  function later() { if (!raf) raf = requestAnimationFrame(sync); }

  fab.addEventListener('click', open);
  back.addEventListener('click', function () { close(true); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('.dk-x')) { close(true); return; }
    if (t.closest && t.closest('.az-side .az-n')) setTimeout(function () { close(false); }, 80);
  });
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('.az-side .bank-search')) searched = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close(true);
    else if (e.key === 'Enter' && e.target.closest && e.target.closest('.az-side .bank-search')) { e.preventDefault(); close(true); }
  });
  (mq.addEventListener ? mq.addEventListener('change', later) : mq.addListener(later));

  var host = document.querySelector('main.bank') || document.body;
  new MutationObserver(later).observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  sync();
})();
