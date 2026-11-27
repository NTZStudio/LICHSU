/* Admin · Contributor: duyệt tài khoản, duyệt/gộp bộ đề thành gói, đặt tên, xuất data/lessonN.js. Dùng call/esc/fmt/$ của admin.html. */
(function () {
  var root = document.getElementById('ctAdmin'); if (!root) return;
  var D = { accounts: [], subs: [], packs: [] }, selS = {}, selP = {};
  function h(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function btn(l, f, alt) { var b = h('button', 'btn' + (alt === false ? '' : ' alt'), l); b.type = 'button'; b.style.margin = '2px'; b.onclick = f; return b; }
  function td(tr, x) { var c = h('td'); if (x && x.nodeType) c.appendChild(x); else c.textContent = x == null ? '' : x; tr.appendChild(c); return c; }
  function table(head) { var t = h('table', 'tbl'), r = h('tr'); head.forEach(function (x) { r.appendChild(h('th', '', x)); }); t.appendChild(r); return t; }
  function dl(name, text) { var a = h('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function lessonFile(n, p) {
    var q = p.questions.map(function (r) { return '    [' + JSON.stringify(r[0]) + ',' + JSON.stringify(r[1]) + ',' + JSON.stringify(r[2]) + ',' + JSON.stringify(r[3]) + ']'; }).join(',\n');
    var p2 = (p.part2 || []).map(function (r) { return '    ' + JSON.stringify(r); }).join(',\n');
    return '(window.ADV_BANK = window.ADV_BANK || {})[' + n + '] = {\n  title: ' + JSON.stringify(p.name) + ',\n  grade: true,\n  questions: [\n' + q + '\n  ],\n  part2: [' + (p2 ? '\n' + p2 + '\n  ' : '') + ']\n};\n';
  }
  async function act(path, body, after) { var r = await call(path, body); if (!r.ok) alert(r.msg || 'Thất bại.'); else if (after) after(r); load(); }
  async function load() {
    var r = await call('/api/admin/ct-list'); if (!r.ok) return;
    var cm = await call('/api/admin/ct-community'); r.cm = cm && cm.ok ? cm.docs : []; D = r; draw();
  }
  function draw() {
    root.textContent = '';
    var T = D.stats || { subs: { n: 0, bytes: 0 }, packs: { n: 0, bytes: 0 } }, kb = function (x) { return (x / 1024).toFixed(1) + ' KB'; };
    var si = h('p', 'd-sub', 'Dữ liệu trong database: bộ đề gửi lên ' + T.subs.n + ' (' + kb(T.subs.bytes) + ') · gói ' + T.packs.n + ' (' + kb(T.packs.bytes) + ') · tài khoản ' + T.accounts + '. Hãy xóa bớt những gì không cần để database nhẹ.');
    root.appendChild(si);
    function purge(label, what, extra) { return btn(label, function () { if (confirm(label + '?\nKhông thể hoàn tác.')) act('/api/admin/ct-purge', Object.assign({ what: what }, extra || {}), function (r) { alert('Đã xóa ' + r.deleted + ' mục.'); }); }); }
    function allBox(sel, list) { var c = h('input'); c.type = 'checkbox'; c.title = 'Chọn tất cả'; c.onchange = function () { list.forEach(function (x) { sel[x.id] = c.checked; }); draw(); }; return c; }
    function picked(sel) { return Object.keys(sel).filter(function (k) { return sel[k]; }).map(Number); }
    /* tài khoản */
    var s1 = h('section', 'glass d-box'); s1.appendChild(h('h3', '', 'Tài khoản Contributor ')).appendChild(h('span', 'd-sub', '(' + D.accounts.length + ')'));
    var t1 = table(['Tên', 'Trạng thái', 'Vé', 'Đăng ký', '']);
    D.accounts.forEach(function (a) {
      var r = h('tr'); td(r, a.name); td(r, { pending: 'Chờ duyệt', approved: a.active ? 'Đã duyệt · đang dùng' : 'Đã duyệt · chưa nhận vé', rejected: 'Từ chối' }[a.status] || a.status);
      td(r, a.ticket_plain || '—'); td(r, fmt(a.created_at));
      var c = td(r, '');
      if (a.status !== 'approved') c.appendChild(btn('Duyệt', function () { act('/api/admin/ct-account', { id: a.id, action: 'approve' }); }, false));
      if (a.status === 'approved') c.appendChild(btn('Cấp lại vé', function () { act('/api/admin/ct-account', { id: a.id, action: 'reissue' }); }));
      if (a.status === 'pending') c.appendChild(btn('Từ chối', function () { act('/api/admin/ct-account', { id: a.id, action: 'reject' }); }));
      if (a.active) c.appendChild(btn('Đăng xuất', function () { act('/api/admin/ct-account', { id: a.id, action: 'logout' }); }));
      c.appendChild(btn('Xóa', function () { if (confirm('Xóa tài khoản ' + a.name + '?')) act('/api/admin/ct-account', { id: a.id, action: 'delete' }); }));
      t1.appendChild(r);
    });
    var w1 = h('div', 'tblw'); w1.appendChild(t1); s1.appendChild(purge('Dọn tài khoản bị từ chối', 'accounts')); s1.appendChild(w1); root.appendChild(s1);
    /* bộ đề gửi lên */
    var s2 = h('section', 'glass d-box'); s2.appendChild(h('h3', '', 'Bộ đề gửi lên ')).appendChild(h('span', 'd-sub', '(' + D.subs.length + ')'));
    var t2 = table(['', 'Tên bộ đề', 'Người gửi', 'Số câu', 'Trạng thái', '']);
    D.subs.forEach(function (s) {
      var r = h('tr'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!selS[s.id]; cb.onchange = function () { selS[s.id] = cb.checked; };
      td(r, cb); td(r, s.title); td(r, s.who || '?'); td(r, s.questions.length + ((s.part2 || []).length ? ' + ' + s.part2.length + ' (Phần II)' : '')); td(r, { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }[s.status] + (s.note ? ' · ' + s.note : ''));
      var c = td(r, '');
      c.appendChild(btn('Xem', function () { alert(s.questions.slice(0, 15).map(function (q) { return q[0] + ' | ' + q[1] + '\n' + q[2].map(function (o, i) { return 'ABCD'[i] + '. ' + o; }).join('\n') + '\nĐáp án: ' + q[3]; }).join('\n\n') + (s.questions.length > 15 ? '\n\n… và ' + (s.questions.length - 15) + ' câu nữa' : '') + ((s.part2 || []).length ? '\n\n— PHẦN II (' + s.part2.length + ' câu) —\n' + s.part2.slice(0, 8).map(function (q) { return q[0] + ' | ' + q[1].slice(0, 160) + '\n' + q[2].map(function (o, i) { return 'abcd'[i] + ') ' + o[0] + ' → ' + (o[1] ? 'Đúng' : 'Sai'); }).join('\n'); }).join('\n\n') : '')); }));
      if (s.status !== 'approved') c.appendChild(btn('Duyệt', function () { if (confirm('Duyệt «' + s.title + '» thành gói mới cùng tên?')) act('/api/admin/ct-pack-create', { sub_ids: [s.id], name: s.title }, function (r) { alert('Đã duyệt. Gói «' + s.title + '» có ' + r.count + ' câu.'); }); }, false));
      if (s.status !== 'approved') c.appendChild(btn('Từ chối', function () { var n = prompt('Lý do (hiện cho người gửi):', ''); if (n !== null) act('/api/admin/ct-sub', { id: s.id, action: 'reject', note: n }); }));
      c.appendChild(btn('Xóa', function () { if (confirm('Xóa bộ đề này?')) act('/api/admin/ct-sub', { id: s.id, action: 'delete' }); }));
      t2.appendChild(r);
    });
    t2.rows[0].cells[0].appendChild(allBox(selS, D.subs));
    var b2 = h('div', 'ct-row');
    b2.appendChild(btn('Xóa bộ đề đã chọn', function () { var ids = picked(selS); if (!ids.length) return alert('Chưa chọn bộ đề nào.'); if (confirm('Xóa ' + ids.length + ' bộ đề đã chọn?')) { selS = {}; act('/api/admin/ct-sub', { action: 'delete', ids: ids }); } }));
    b2.appendChild(purge('Dọn tất cả bộ đề đã duyệt', 'approved')); b2.appendChild(purge('Dọn tất cả bộ đề bị từ chối', 'rejected'));
    b2.appendChild(btn('Dọn bộ đề cũ hơn N ngày', function () { var n = prompt('Xóa bộ đề không đổi trong bao nhiêu ngày trở lên?', '30'); if (n && Number(n) > 0 && confirm('Xóa mọi bộ đề cũ hơn ' + n + ' ngày?')) act('/api/admin/ct-purge', { what: 'old', days: Number(n) }, function (r) { alert('Đã xóa ' + r.deleted + ' mục.'); }); }));
    var w2 = h('div', 'tblw'); w2.appendChild(t2); s2.appendChild(b2); s2.appendChild(w2); root.appendChild(s2);
    /* gói */
    var s3 = h('section', 'glass d-box'); s3.appendChild(h('h3', '', 'Gói đã duyệt (hiện ở chế độ CONTRIBUTOR) ')).appendChild(h('span', 'd-sub', '(' + D.packs.length + ')'));
    s3.appendChild(h('p', 'd-sub', 'Tick bộ đề ở bảng trên và/hoặc tick gói bên dưới, đặt tên, rồi bấm Gộp để duyệt thành một gói (câu trùng ID được gộp một lần).'));
    var t3 = table(['', 'Tên gói', 'Số câu', 'Hiện', '']);
    D.packs.forEach(function (p) {
      var r = h('tr'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!selP[p.id]; cb.onchange = function () { selP[p.id] = cb.checked; };
      td(r, cb); td(r, p.name); td(r, p.questions.length + ((p.part2 || []).length ? ' + ' + p.part2.length + ' (Phần II)' : '')); td(r, p.published ? 'Có' : 'Ẩn');
      var c = td(r, '');
      c.appendChild(btn('Đổi tên', function () { var n = prompt('Tên gói:', p.name); if (n) act('/api/admin/ct-pack-update', { id: p.id, name: n }); }));
      c.appendChild(btn(p.published ? 'Ẩn' : 'Hiện', function () { act('/api/admin/ct-pack-update', { id: p.id, published: !p.published }); }));
      c.appendChild(btn('Xuất lessonN.js', function () { var n = prompt('Số bài (ví dụ 7 → lesson7.js):', '7'); if (!n || !/^\d+$/.test(n)) return; dl('lesson' + n + '.js', lessonFile(n, p)); alert('Chép file vào data/, thêm số ' + n + ' vào mảng trong js/lessons.js. Sau đó có thể ẩn/xóa gói này.'); }));
      c.appendChild(btn('Xóa', function () { if (confirm('Xóa gói "' + p.name + '"?')) act('/api/admin/ct-pack-delete', { id: p.id }); }));
      t3.appendChild(r);
    });
    t3.rows[0].cells[0].appendChild(allBox(selP, D.packs));
    var b3 = h('div', 'ct-row');
    b3.appendChild(btn('Xóa gói đã chọn', function () { var ids = picked(selP); if (!ids.length) return alert('Chưa chọn gói nào.'); if (confirm('Xóa ' + ids.length + ' gói (ngân hàng đáp án) đã chọn?')) { selP = {}; act('/api/admin/ct-pack-delete', { ids: ids }); } }));
    b3.appendChild(purge('Dọn tất cả gói đang ẩn', 'hidden_packs'));
    var w3 = h('div', 'tblw'); w3.appendChild(t3); s3.appendChild(b3); s3.appendChild(w3);
    var bar = h('div', 'ct-row'), nm = h('input'), into = h('select');
    nm.placeholder = 'Tên gói (tạo mới hoặc đổi tên)'; nm.style.cssText = 'flex:1 1 220px;padding:10px;background:rgba(6,6,10,.38);border:1px solid var(--glb);color:var(--text)';
    into.style.cssText = 'padding:10px;background:#0b0b0f;color:var(--text);border:1px solid var(--glb)';
    into.appendChild(new Option('Tạo gói mới', '')); D.packs.forEach(function (p) { into.appendChild(new Option('Gộp vào: ' + p.name, p.id)); });
    var go = btn('Gộp & duyệt', function () {
      var sub = Object.keys(selS).filter(function (k) { return selS[k]; }).map(Number), pk = Object.keys(selP).filter(function (k) { return selP[k]; }).map(Number);
      if (into.value) pk = pk.filter(function (x) { return String(x) !== into.value; });
      act('/api/admin/ct-pack-create', { sub_ids: sub, pack_ids: pk, name: nm.value, into: Number(into.value) || 0 }, function (r) {
        if (pk.length) call('/api/admin/ct-pack-delete', { ids: pk }).then(load); selS = {}; selP = {}; alert('Gói có ' + r.count + ' câu.');
      });
    }, false);
    bar.appendChild(nm); bar.appendChild(into); bar.appendChild(go); s3.appendChild(bar); root.appendChild(s3);
    /* cộng đồng: tài liệu văn bản do Contributor đăng, admin chỉ cần gỡ bài vi phạm */
    var CM = D.cm || [], s4 = h('section', 'glass d-box'); s4.appendChild(h('h3', '', 'Cộng đồng · tài liệu đã đăng ')).appendChild(h('span', 'd-sub', '(' + CM.length + ')'));
    s4.appendChild(h('p', 'd-sub', 'Contributor đăng thẳng, không qua duyệt. Hãy gỡ bài vi phạm hoặc không phù hợp. Nội dung luôn được lọc HTML khi hiển thị.'));
    var t4 = table(['Tên bài', 'Tác giả', 'Dung lượng', 'Cập nhật', '']);
    CM.forEach(function (d) {
      var r = h('tr'); td(r, d.title); td(r, d.author); td(r, kb(d.size)); td(r, fmt(d.at));
      var c = td(r, ''); var a = h('a', 'btn alt', 'Xem'); a.href = 'lookup.html#community-' + d.id; a.target = '_blank'; a.style.margin = '2px'; c.appendChild(a);
      c.appendChild(btn('Gỡ bài', function () { if (confirm('Gỡ bài «' + d.title + '» của ' + d.author + '? Không thể hoàn tác.')) act('/api/admin/ct-community-delete', { id: d.id }); }));
      t4.appendChild(r);
    });
    if (!CM.length) s4.appendChild(h('div', 'd-sub', 'Chưa có bài nào.')); else { var w4 = h('div', 'tblw'); w4.appendChild(t4); s4.appendChild(w4); }
    root.appendChild(s4);
  }
  var rf = h('button', 'btn alt', 'Tải lại Contributor'); rf.type = 'button'; rf.onclick = load; root.parentNode.insertBefore(rf, root);
  if (typeof tok !== 'undefined' && tok) load();
})();
