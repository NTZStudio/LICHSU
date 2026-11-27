# Kế hoạch hệ thống mã kích hoạt (Cloudflare Worker + D1)

Trạng thái: **đã code** (thư mục `worker/`, `data.html`, `admin.html`, `js/plans.js`). Việc còn lại: deploy theo `worker/HUONG-DAN-DEPLOY.md` rồi điền địa chỉ Worker vào `js/sq-config.js`. Chưa điền thì web chạy chế độ cục bộ cũ.

Khác với bản thiết kế: không dùng "thẻ gói có chữ ký". Khóa gói chính là thông tin xác thực; trình duyệt hỏi Worker (`/api/status`) và lưu kết quả 24 giờ cho trường hợp mất mạng.

## 1. Mục tiêu
- Không cần đăng nhập, không cần email.
- Có nơi nhập mã global, mỗi mã có **số lượt** và **hạn dùng** do admin đặt.
- Kích hoạt xong thì lưu mãi, giống một tài khoản gắn với trình duyệt.
- Giảm chia sẻ bừa bãi bằng cơ chế "chuyển gói thì thiết bị cũ mất gói".

## 2. Kiến trúc
- **Cloudflare Worker** (API) + **D1** (cơ sở dữ liệu). D1 xử lý đúng khi nhiều người nhập cùng lúc; không dùng KV vì có thể để lọt một mã dùng hai lần.
- Web tĩnh (GitHub Pages) gọi Worker bằng `fetch`.
- Chữ ký thẻ gói bằng khóa bí mật của Worker (HMAC). Không để khóa trong `plans.js` hay GitHub.
- Trình trình duyệt không đọc được mã máy hay dữ liệu máy (IMEI, MAC, serial...). Chỉ nhận diện bằng mã ngẫu nhiên lưu trong trình duyệt. Không dùng browser fingerprint.

## 3. Hai loại chuỗi
| Loại | Ai tạo | Đặc điểm |
|---|---|---|
| **Mã mở gói (code)** | Admin | Dùng chung, có số lượt tối đa, có hạn. Nhập thì trừ 1 lượt và cấp khóa gói cho trình duyệt đó. |
| **Khóa gói (key)** | Worker | Của riêng người dùng, đại diện gói đã kích hoạt. **Chỉ 1 trình duyệt hoạt động tại một thời điểm.** |

Mã mở gói chỉ lưu dạng mã băm SHA-256. Khóa gói cũng chỉ lưu mã băm; khóa gốc chỉ hiện cho người dùng một lần.

## 4. Luồng người dùng
1. **Nhập mã mở gói**: Worker kiểm tra còn lượt/còn hạn → trừ 1 lượt → tạo khóa gói → trả thẻ gói đã ký (gói, hạn) → trình duyệt lưu. Cùng trình duyệt nhập lại cùng mã không bị trừ thêm.
2. **Chuyển sang trình duyệt khác**: nhập khóa ở trình duyệt mới → Worker cấp khóa mới và **vô hiệu hóa khóa cũ** → trình duyệt cũ về BASIC, hiện "Gói đã được chuyển sang thiết bị khác" và nút lấy lại bằng khóa. Không trừ lượt của mã chung.
3. **Giới hạn**: tối đa **3 lần chuyển mỗi ngày** cho mỗi khóa.
4. **Kiểm tra hiệu lực**: hỏi Worker khi mở trang và định kỳ khi đang dùng. Mất mạng thì dùng thẻ lưu sẵn tối đa **24 giờ**, sau đó phải kiểm tra lại.
5. **Mất dữ liệu trình duyệt** mà chưa lưu khóa: không khôi phục được bằng khóa; chỉ còn nhập lại mã chung nếu mã còn lượt (bị trừ thêm 1 lượt).

## 5. Link chia sẻ
- Link khóa gói: `https://<tên miền>/index.html#keycode=<khóa>`
- Link mã mở gói: `https://<tên miền>/index.html#code=<mã>`
- Dùng `#` thay cho `/keycode=...` vì GitHub Pages là host tĩnh (đường dẫn sẽ 404); phần sau `#` cũng không gửi lên máy chủ hay lưu nhật ký.
- Mở link hiện hộp xác nhận:
  - Khóa gói: nút **Kích hoạt** + cảnh báo "Thiết bị đang dùng gói sẽ mất quyền". Hoặc bỏ qua và nhập khóa sau.
  - Mã mở gói: nút **Kích hoạt** + số lượt còn lại.

## 6. Trang Dữ liệu (`data.html`)
- Hiện gói đang dùng, hạn dùng, khóa gói (che bớt) với nút **Sao chép**.
- **Tạo khóa mới**: khóa cũ và mọi link tạo từ khóa cũ mất hiệu lực ngay.
- **Tạo link kích hoạt** để mở gói trên trình duyệt mới.
- **Hủy kích hoạt**: gói và khóa ngừng ngay, trình duyệt về BASIC. Không hoàn lại lượt của mã chung (tránh hủy rồi nhập lại để lách).
- Nhắc rõ lúc kích hoạt: "Hãy lưu khóa này, đừng gửi cho người không muốn chuyển gói".

## 7. Mã admin
- Chuỗi ngẫu nhiên rất dài, chỉ lưu **mã băm trong cấu hình bí mật của Worker** (không nằm trong `plans.js`, không lên GitHub).
- Nhập lần đầu thì trình duyệt đó thành admin; sau đó mã **bị khóa chặt**: người khác nhập lại đều bị từ chối.
- Thêm thiết bị admin sang thiết bị/web khác: tạo **link/mã chuyển dùng một lần** trong phiên admin đang mở, hết hạn sau vài phút; nhận xong thì phiên cũ mất quyền.
- Quyền admin: tải toàn bộ mã đang hoạt động (gói, lượt đã dùng, hạn, trạng thái); thêm, sửa số lượt/hạn, vô hiệu hóa, xóa mã; vô hiệu hóa khóa gói của người dùng.
- Mọi hành động được Worker kiểm tra bằng thẻ ký của admin; trang quản trị chỉ là giao diện.
- **Hủy/đổi admin bằng cách sửa cấu hình Worker** (đổi mã băm admin hoặc tăng `ADMIN_EPOCH`) rồi deploy lại, không có nút gọi API. Mất trình duyệt admin thì cũng lấy lại bằng cách sửa cấu hình.
- Giới hạn số lần nhập sai theo IP (chặn tạm khi sai nhiều).
- Lưu ý: kích hoạt admin ngay sau khi deploy, vì ai nhập đúng mã trước tiên sẽ thành admin. Nghi lộ mã thì đặt mã mới.

## 8. Dữ liệu D1 (dự kiến)
- `codes`: id, hash, plan, max_uses, used, expires_at, active, note
- `keys`: id, key_hash, plan, expires_at, active, code_id, device_token_hash, switches_today, switch_day, created_at
- `redemptions`: code_id, key_id, device_token_hash, at
- `rate_limits`: ip, window, count

## 9. Mặc định đã đề xuất
- 1 thiết bị hoạt động mỗi khóa; tối đa 3 lần chuyển/ngày.
- Ngoại tuyến tối đa 24 giờ.
- Mã `RELESE` hiện tại (PLUS, hết hạn 00:00 ngày 26/11/2026) sẽ được chuyển sang hệ thống mới giữ nguyên hạn.
- Có thể đổi: cho 2 thiết bị cùng lúc nếu muốn thoáng hơn.

## 10. Việc cần làm khi triển khai
1. Thư mục `worker/`: code Worker, file tạo bảng D1, cấu hình `wrangler.toml`, trang admin.
2. `data.html` và hộp xác nhận link kích hoạt trong `index.html`.
3. Sửa `js/plans.js` để gọi Worker, giữ cache thẻ gói 24 giờ.
4. Hướng dẫn deploy từng bước (tạo tài khoản Cloudflare, tạo D1, đặt secret, deploy, kích hoạt admin).
5. Kiểm tra tích hợp trước khi giao.

## 11. Giới hạn cần biết
- Không có đăng nhập nên không chặn hoàn toàn việc đưa khóa cho người khác; thiết kế chỉ làm cho việc đó **không có lợi** (người đưa mất gói ngay khi người nhận kích hoạt).
- Người nhận được link khóa gói đều bấm kích hoạt được, nên hộp cảnh báo phải nói rõ.
- Hiện tại (chưa có Worker) việc kiểm tra mã chạy trên trình duyệt nên người rành kỹ thuật có thể vượt qua.
