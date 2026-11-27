/* Danh sách đặc quyền PROMAX cuộn được (index.html, data.html): thêm lớp .sh-more khi còn nội dung bên dưới (CSS ở cuối su.css làm mờ đáy),
   và cho phép cuộn bằng bàn phím (tabindex). */
(function () {
  var L = [].slice.call(document.querySelectorAll('.pw.p-promax .p-list, .pc.promax ul'));
  if (!L.length) return;
  function upd(e) { e.classList.toggle('sh-more', e.scrollHeight - e.clientHeight > 2 && e.scrollTop + e.clientHeight < e.scrollHeight - 2); }
  L.forEach(function (e) {
    e.setAttribute('tabindex', '0');
    e.addEventListener('scroll', function () { upd(e); }, { passive: true });
    upd(e);
  });
  function all() { L.forEach(upd); }
  window.addEventListener('resize', all);
  window.addEventListener('load', all);
  setTimeout(all, 600);
})();
