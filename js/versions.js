/* Danh sách phiên bản + bộ chọn phiên bản (theo kiểu của site).
   Chọn phiên bản bằng hash trên URL: index.html#/v4, #/v5, #/lsu-alpha1 hoặc #/ntz-x0-3-000
   Thêm phiên bản mới: thêm 1 mục vào VERSIONS, đặt cờ riêng trong config.features,
   rồi trong app.js chỉ chạy tính năng mới khi cờ đó bật (bản cũ không có cờ = giữ nguyên).
   Phải nạp SAU config.js và TRƯỚC app.js. */
(function () {
  var VERSIONS = [
    {
      slug: 'v4', group: 'v', name: 'v4', code: '4.0.0', extends: null,
      changelog: {
        devNote: 'Bản chấm đề gốc, chưa có tự động dán và khung thông báo.',
        items: [
          'Dán đề vào ô nhập rồi bấm Chấm để ra đáp án Phần I và Phần II',
          'Đáp án dò theo ngân hàng câu hỏi và các bộ tư liệu có sẵn'
        ]
      },
      // versionSwitch luôn bật để có đường quay lại bản mới hơn
      config: { features: { versionSwitch: true } }
    },
    {
      slug: 'v5', group: 'v', name: 'v5', code: '5.0.0', extends: 'v4',
      changelog: {
        releasedAt: '2026-10-09',
        devNote: 'Bản test cuối cùng trước khi nâng cấp toàn diện web và các bài mới.',
        items: [
          'Thêm tự động dán từ clipboard, kèm tùy chọn tự chấm ngay sau khi dán',
          'Thêm nút "Dán từ clipboard" để dán thủ công',
          'Thêm khung thông báo ở cuối trang',
          'Tách web thành nhiều file: CSS, script, ngân hàng câu hỏi, config',
          'Thêm nút chọn phiên bản và khung nhật ký cập nhật'
        ]
      },
      config: { features: { autoPaste: true, notice: true } }
    },
    {
      // Từ bản này đặt tên phiên bản bằng chữ, không còn dạng "v + số"
      slug: 'lsu-alpha1', group: 'lsu', name: 'LSU Alpha 1', code: 'LSU-A1', extends: 'v5',
      changelog: {
        releasedAt: '2026-10-09',
        devNote: 'Phiên bản đầu tiên đặt tên bằng chữ, kèm trang Ngân hàng đáp án.',
        items: [
          'Đổi cách đặt tên phiên bản sang chữ: LSU Alpha 1',
          'Thêm trang Ngân hàng đáp án: xem và tìm kiếm toàn bộ đáp án Phần I và Phần II',
          'Thêm đường dẫn sang trang ngân hàng trên thanh phiên bản',
          'Ngân hàng đáp án có chế độ Nâng cao: câu hỏi đầy đủ, đáp án đúng và sai, ID câu, chia theo bài và xếp theo ID (đã có Bài 4)',
          'Thêm Bài 5 (ASEAN) vào ngân hàng và bộ chấm'
        ]
      },
      config: { features: { answerBank: true, answerBankAdvanced: true } }
    },
    {
      // Nhóm NTZ Release: các bản con đặt tên NTZ Xa.bb.ccc. Kế thừa toàn bộ LSU Alpha 1.
      // Giao diện mới và các cải tiến đi kèm chỉ bật khi chọn bản trong nhóm này:
      //   ntzUi       → class .is-ntz trên <html>, toàn bộ CSS mới nằm trong css/ntz.css
      //   ntzComposer → ô nhập mới, nút gửi, tự chấm bằng chuột phải (js/ntz-ui.js)
      slug: 'ntz-x0-3-000', group: 'ntz', name: 'NTZ X0.3.000', code: 'X0.3.000', extends: 'lsu-alpha1',
      changelog: {
        releasedAt: '2026-10-11',
        devNote: 'Giao diện trang chính được làm lại; chỉ bật ở nhóm NTZ Release.',
        items: [
          'Tạo nhóm phiên bản NTZ Release và chia danh sách phiên bản thành 3 nhóm',
          'Giao diện trang chính mới: ô nhập gọn, tự giãn đến hơn 3 dòng, chữ cũ phía trên mờ dần',
          'Nút gửi có icon; chuột phải vào nút để bật/tắt tự chấm (nút chuyển sang xanh lá)',
          'Tự chấm ngay khi trong ô có chữ, xóa hết chữ thì kết quả bên dưới cũng được xóa',
          'Bỏ tiêu đề và dòng hướng dẫn ở đầu trang, bỏ khung thông báo ở cuối trang',
          'Khi màn hình hẹp, các nút ở đầu trang mất tên, chỉ còn icon trong ô vuông bo góc',
          'Kết quả chấm hiện phía trên ô nhập (vẫn nằm dưới nút phiên bản và nút ngân hàng đáp án)',
          'Thêm nút Xóa nội dung và nút Hoàn tác ở dưới ô nhập',
          'Kết quả Phần I dạng thẻ: 8 câu mỗi hàng, số câu ở trên, đáp án ở dưới, glow theo đáp án (A đỏ, B vàng, C dương, D lá)',
          'Các câu liền nhau cùng đáp án được nối thành một khung ngang, glow sáng tối nhẹ nhàng',
          'Câu chưa chắc hiện chữ vàng thường, không đậm; Phần II viền và glow xanh lá cho Đúng, đỏ cho Sai',
          'Khung nối hiện đủ chữ đáp án của từng câu, nằm ngay dưới số câu',
          'Thêm cài đặt ở cuối trang: thanh trượt chiều ngang, chiều dọc và tỉ lệ scale cho các khung đáp án (có xem trước, tự lưu)',
          'Thêm Bài 5 (ASEAN) vào ngân hàng và bộ chấm'
        ]
      },
      //   ntzMinimalHeader → đầu trang chỉ còn các nút phiên bản (bỏ tiêu đề + dòng hướng dẫn),
      //                      nút co thành ô vuông bo góc khi hẹp (js/ntz-ui.js + css/ntz.css)
      //   ntzResultTop     → kết quả chấm nằm phía trên ô nhập (js/ntz-ui.js + css/ntz.css)
      //   ntzClearUndo     → nút Xóa và nút Hoàn tác ở hàng công cụ dưới ô nhập (js/ntz-ui.js)
      //   ntzCards         → kết quả dạng thẻ có glow (js/ntz-cards.js + css/ntz.css); output.part1PerLine = số câu Phần I mỗi hàng
      //   ntzCardSettings  → khung cài đặt kích thước đáp án ở cuối trang (js/ntz-settings.js)
      //   notice:false     → bỏ khung thông báo cuối trang (v5 bật, nhóm NTZ tắt)
      config: { features: { ntzUi: true, ntzComposer: true, ntzMinimalHeader: true, ntzResultTop: true, ntzClearUndo: true, ntzCards: true, ntzCardSettings: true, notice: false }, output: { part1PerLine: 8 } }
    }
  ];

  // Các nhóm phiên bản, theo thứ tự hiển thị trong khung chọn
  var GROUPS = [
    { id: 'v',   label: 'vX.XXXXX' },
    { id: 'lsu', label: 'LSU Version-Name-Number' },
    { id: 'ntz', label: 'NTZ Release' }
  ];

  // Phiên bản mở khi mở web lần đầu (chưa chọn gì). Từ lần sau, web nhớ phiên bản người dùng chọn gần nhất (xem STORE_KEY).
  var DEFAULT_SLUG = 'lsu-alpha1'; // NTZ đang phát triển nên chưa làm mặc định; muốn đổi thì sửa dòng này
  var STORE_KEY = 'ls_version';     // khóa localStorage lưu phiên bản đang dùng

  var isObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
  // Object gộp theo từng khóa; mảng và giá trị đơn thì bị thay hẳn
  var merge = function (a, b) {
    if (!isObj(a) || !isObj(b)) return b;
    var o = {};
    Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b).forEach(function (k) {
      o[k] = (isObj(a[k]) && isObj(b[k])) ? merge(a[k], b[k]) : b[k];
    });
    return o;
  };

  var bySlug = {};
  VERSIONS.forEach(function (v) { bySlug[v.slug] = v; });

  var cache = {};
  var resolve = function (slug, seen) {
    if (cache[slug]) return cache[slug];
    seen = seen || {};
    var v = bySlug[slug];
    if (!v || seen[slug]) return {};
    seen[slug] = true;
    var parent = v.extends ? resolve(v.extends, seen) : {};
    return (cache[slug] = merge(parent, v.config || {}));
  };

  var fromHash = function () {
    var m = (window.location.hash || '').match(/^#\/?([a-z0-9-]+)/i);
    return m ? m[1].toLowerCase() : null;
  };

  // Thứ tự ưu tiên: phiên bản người dùng đã chọn lần trước → hash trên URL (vd. #/v5) → mặc định.
  // Phiên bản đã nhớ thắng hash, để link/bookmark/lối tắt cũ có sẵn "#/lsu-alpha1" không kéo người dùng về bản cũ.
  // Muốn đổi phiên bản thì chọn trong khung chọn (switchVersion) hoặc sửa hash trên URL (hashchange): hai đường này cập nhật bản đã nhớ.
  var stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
  var wanted = fromHash();
  var slug = (stored && bySlug[stored]) ? stored
           : (wanted && bySlug[wanted]) ? wanted
           : DEFAULT_SLUG;
  var active = bySlug[slug];
  try { localStorage.setItem(STORE_KEY, slug); } catch (e) {}

  if (wanted && wanted !== slug) {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/' + slug); } catch (e) {}
  }

  window.CONFIG = merge(window.CONFIG || {}, resolve(slug));
  window.CONFIG.version = { name: active.name, code: active.code, slug: active.slug, group: active.group };
  window.ACTIVE_VERSION = active;
  window.VERSION_REGISTRY = VERSIONS;
  window.VERSION_GROUPS = GROUPS;
  // Mọi CSS của giao diện mới viết trong phạm vi .is-ntz nên các bản khác không bị ảnh hưởng
  if (window.CONFIG.features && window.CONFIG.features.ntzUi) {
    document.documentElement.classList.add('is-ntz');
  }
  if (!window.KEEP_TITLE) document.title = 'Chấm đề Ianta ' + active.name;

  // Đổi phiên bản = đặt hash rồi tải lại, để toàn bộ cấu hình được tính lại từ đầu
  window.switchVersion = function (s) {
    if (!bySlug[s] || s === slug) return;
    try { localStorage.setItem(STORE_KEY, s); } catch (e) {}   // nhớ lựa chọn trước khi tải lại
    window.location.hash = '/' + s;
    window.location.reload();
  };
  window.addEventListener('hashchange', function () {
    var n = fromHash();
    if (n && bySlug[n] && n !== slug) {
      try { localStorage.setItem(STORE_KEY, n); } catch (e) {}
      window.location.reload();
    }
  });
})();
