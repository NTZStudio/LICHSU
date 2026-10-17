/* Nối các bài trong ngân hàng nâng cao (window.ADV_BANK[n]) vào BỘ CHẤM, cho mọi phiên bản.
   Chỉ nối bài nào có grade:true. Nạp SAU answers.js, statements.js và data/lessonN.js, TRƯỚC app.js (và bank.js).
   - Phần I : mỗi câu thêm vào đầu QBANK1 dạng [nội dung câu hỏi, nội dung đáp án đúng]
              (đặt ở đầu để khi hòa điểm thì câu của bài thắng).
   - Phần II: các mệnh đề thêm vào bộ B[block]; nếu có detect thì đăng ký thêm cụm nhận diện tư liệu (EXTRA_BLOCKS)
              để detectBlock() trong app.js nhận ra đoạn tư liệu. */
(function () {
  if (typeof QBANK1 === 'undefined' || typeof B === 'undefined') return;
  var adv = window.ADV_BANK || {};
  var simple = function (s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); };

  Object.keys(adv).forEach(function (n) {
    var L = adv[n];
    if (!L || !L.grade) return;

    var p1 = [];
    (L.questions || []).forEach(function (q) {
      var correct = q[2]['ABCDEFGH'.indexOf(q[3])];
      if (correct) p1.push([q[1], correct]);
    });
    Array.prototype.unshift.apply(QBANK1, p1);

    (L.part2 || []).forEach(function (p) {
      var meta = p[3] || {};
      var key = meta.block || ('B' + n + '_' + p[0]);
      if (!B[key]) B[key] = [];
      p[2].forEach(function (s) {
        var dup = B[key].some(function (x) { return simple(x[0]) === simple(s[0]); });
        if (!dup) B[key].push([s[0], s[1]]);
      });
      if (meta.detect && meta.detect.length) {
        (window.EXTRA_BLOCKS = window.EXTRA_BLOCKS || []).push({ key: key, any: meta.detect });
      }
    });
  });
})();
