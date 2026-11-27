/* Nút chọn phiên bản + khung nhật ký cập nhật. Nạp sau versions.js và app.js. */
(function () {
  var F = (window.CONFIG && CONFIG.features) || {};
  var wrap = document.getElementById('versionWrap');
  var reg = window.VERSION_REGISTRY, active = window.ACTIVE_VERSION;
  if (!wrap || !F.versionSwitch || !reg || !active) return;

  var btn = document.getElementById('versionBtn');
  var panel = document.getElementById('versionPanel');
  var list = document.getElementById('versionList');
  var log = document.getElementById('versionLog');
  document.getElementById('versionName').textContent = active.name;
  wrap.hidden = false;

  // Đường dẫn sang trang Ngân hàng đáp án (chỉ khi phiên bản có tính năng này)
  if (F.answerBank) {
    var a = el('a', 'bank-link', '📚 Ngân hàng đáp án');
    a.href = 'bank.html#/' + active.slug;
    wrap.insertBefore(a, btn);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // Danh sách phiên bản chia theo nhóm (nhóm đang dùng mở sẵn, nhóm khác thu gọn); trong nhóm, mới nhất ở trên
  var groups = window.VERSION_GROUPS || [{ id: 'all', label: 'Phiên bản' }];
  groups.forEach(function (g) {
    var vs = reg.filter(function (v) { return (v.group || groups[0].id) === g.id; });
    if (!vs.length) return;
    var d = el('details', 'vp-group');
    if (active.group === g.id || groups.length === 1) d.open = true;
    d.appendChild(el('summary', '', g.label));
    vs.slice().reverse().forEach(function (v) {
      var b = el('button', 'vp-item' + (v.slug === active.slug ? ' is-active' : ''));
      b.type = 'button';
      b.appendChild(el('span', '', v.name));
      b.appendChild(el('span', 'vp-code', v.code));
      if (v.slug === active.slug) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () { window.switchVersion(v.slug); });
      d.appendChild(b);
    });
    list.appendChild(d);
  });

  // Nhật ký cập nhật của phiên bản đang chạy
  var c = active.changelog;
  if (c) {
    log.appendChild(el('strong', '', 'Cập nhật ' + active.name));
    if (c.releasedAt) {
      var d = new Date(c.releasedAt);
      if (!isNaN(d)) log.appendChild(el('small', '', 'Phát hành: ' + d.toLocaleDateString('vi-VN')));
    }
    if (c.devNote) log.appendChild(el('p', '', c.devNote));
    if (c.items && c.items.length) {
      var ul = el('ul');
      c.items.forEach(function (t) { ul.appendChild(el('li', '', t)); });
      log.appendChild(ul);
    }
  }

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
})();
