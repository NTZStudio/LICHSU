/* Cấu hình chung của web. Sửa tại đây, không cần đụng vào app.js */
var CONFIG = {
  appName: "Chấm đề Lịch sử - Trật tự hai cực Ianta",

  // Khung thông báo hiện ở cuối trang (enabled:false để ẩn)
  notice: {
    enabled: true,
    title: "Thông báo",
    message: "Đây là bản test cuối cùng của web để nâng cấp toàn diện về web và các bài mới!! Cảm ơn",
    from: "Từ @TD Dũng"
  },

  // Giá trị mặc định của hai nút tích (lần đầu mở, khi chưa có lựa chọn đã lưu)
  autoPaste: {
    defaultOn: false,        // tự động dán từ clipboard
    defaultAutoRun: true     // tự chấm ngay sau khi dán
  },

  // Tên khóa lưu lựa chọn trong localStorage
  storageKeys: {
    autoPaste: "ls_autoPaste",
    autoRun: "ls_autoRun"
  },

  // Độ nhạy khi so khớp Đúng/Sai (Phần II)
  matching: {
    uncertainGap: 0.15       // chênh lệch điểm nhỏ hơn mức này thì ghi đ/s viết thường
  },

  // Cách hiển thị kết quả
  output: {
    part1PerLine: 6          // số đáp án Phần I trên mỗi dòng
  }
};
