# Hướng dẫn deploy Worker mã kích hoạt (Cloudflare)

Làm một lần. Cần Node 18+ và tài khoản Cloudflare (miễn phí). Chạy mọi lệnh trong thư mục `worker/`.

## 1. Đăng nhập và tạo cơ sở dữ liệu D1
```bash
npx wrangler login
npx wrangler d1 create sq-codes
```
Lệnh tạo sẽ in ra `database_id`. Dán vào `wrangler.toml` thay cho `DAN_ID_D1_VAO_DAY`.

## 2. Tạo bảng và nạp mã cũ
```bash
npx wrangler d1 execute sq-codes --remote --file=schema.sql
npx wrangler d1 execute sq-codes --remote --file=seed.sql
```
`seed.sql` chuyển 6 mã PLUS/PROMAX cũ (chỉ có mã băm, dùng không giới hạn lượt) và mã `RELESE` (PLUS, hết hạn 00:00 ngày 26/11/2026) sang hệ thống mới.

## 3. Đặt mã admin
Sinh mã admin ngẫu nhiên và mã băm của nó (**lưu mã gốc ở nơi an toàn**, không gửi cho ai):
```bash
node -e "const c=require('crypto');const code='ADM-'+c.randomBytes(24).toString('hex').toUpperCase();console.log('MA ADMIN :',code);console.log('MA BAM   :',c.createHash('sha256').update(code).digest('hex'))"
npx wrangler secret put ADMIN_HASH
```
Khi được hỏi, dán **mã băm** (dòng "MA BAM"), không dán mã gốc.

## 4. Giới hạn tên miền (khuyến nghị)
Trong `wrangler.toml` đổi `ALLOWED_ORIGIN` thành đúng địa chỉ web, ví dụ `https://ntzstudio.github.io` (không có dấu `/` ở cuối).

## 5. Deploy
```bash
npx wrangler deploy
```
Lệnh in ra địa chỉ Worker, dạng `https://sq-codes.<tên-bạn>.workers.dev`.

## 6. Nối web với Worker
Mở `js/sq-config.js`, điền địa chỉ Worker:
```js
window.SQ_API='https://sq-codes.<tên-bạn>.workers.dev';
```
Rồi đẩy web lên GitHub. Để trống thì web quay về chế độ cũ (kiểm tra mã ngay trên trình duyệt).

## 7. Kích hoạt admin NGAY sau khi deploy
Mở `https://<web của bạn>/admin.html`, nhập mã admin gốc. **Ai nhập đúng mã trước tiên sẽ thành admin**, và sau đó mã bị khóa: người khác nhập lại đều bị từ chối. Từ trang admin bạn tạo, sửa, tắt, xóa mã và thu hồi khóa gói.

## Chuyển admin sang web hoặc thiết bị khác
Trong trang admin bấm **Chuyển admin sang nơi khác**: nhận link dùng một lần, hết hạn sau 5 phút. Mở link ở nơi mới thì phiên cũ mất quyền.

## Hủy hoặc đổi admin (khi mất thiết bị admin)
Sửa trong cấu hình rồi deploy lại, không có nút gọi API:
1. Sinh mã admin mới và mã băm mới (bước 3), chạy lại `npx wrangler secret put ADMIN_HASH`.
2. Trong `wrangler.toml` tăng `ADMIN_EPOCH` (ví dụ `"1"` → `"2"`).
3. `npx wrangler deploy`, rồi kích hoạt admin mới (bước 7).

## Kiểm thử cục bộ
`node --no-warnings test/test.mjs` chạy bộ kiểm thử (Node 22+, giả lập D1 bằng `node:sqlite`).

## Quy tắc đang áp dụng (sửa ở `src/index.js`)
- Mỗi khóa gói chỉ một trình duyệt hoạt động; nhập khóa ở nơi mới thì nơi cũ mất gói ngay.
- Tối đa 3 lần chuyển hoặc tạo khóa mới mỗi ngày (`SWITCH_MAX`).
- Nhập sai quá 10 lần trong 10 phút từ một IP thì bị chặn tạm (`FAIL_MAX`).
- Hủy kích hoạt không hoàn lại lượt của mã chung.
- Web dùng gói đã lưu tối đa 24 giờ khi mất mạng (`OFFLINE` trong `js/plans.js`).
- Mã người dùng không bao giờ lưu dạng gốc trên khóa gói; mã mở gói do admin tạo được lưu gốc trong D1 để admin xem lại.
