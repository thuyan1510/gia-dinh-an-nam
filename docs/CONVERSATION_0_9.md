# Trao đổi · 0.9.0 (11)

## Trạng thái triển khai

Ngày 13/10/2026 đã áp dụng migration **0008** lên project `gkqlakxrjeflnfnmghma` và deploy lại `telegram-worker`, `webpush-account`, `webpush-device`. Đã xác minh Telegram tạm tắt, Cron và trigger PWA vẫn còn; dữ liệu gia đình và liên kết Telegram được giữ. Lời nhắc cũ đã được đưa vào chat mà không phát thông báo hàng loạt. IPA/PWA đang chuẩn bị phát hành qua GitHub Actions.

Hiện có **2 thành viên nhưng chỉ 1 thiết bị PWA sẵn sàng**. Điện thoại còn lại cần cài/ghép PWA và cấp quyền thông báo để nhận thông báo hai chiều. Không cần ghép lại máy đã hoạt động.

## Giao diện và hành vi

- Bảng tin → Em bé → **Trao đổi** → Cẩm nang.
- Tin nhắn riêng trong gia đình, ảnh mở toàn màn hình; video chỉ khởi tạo bộ phát khi mở xem để hạn chế bộ nhớ trên iPhone 11. Tối đa 4 tệp/tin, ảnh JPEG tối đa 8 MB, video MP4/MOV tối đa 25 MB/tệp.
- Khung soạn có `KeyboardAvoidingView`, tin nhiều dòng và cuộn lịch sử; tab bar ẩn khi bàn phím mở. Cần kiểm tra bàn phím thật trên cả hai iPhone.
- Nút `+` có Tạo lời nhắc và Báo người nhà. Popup lời nhắc có đúng 4 trường: Lời nhắc, Ngày, Giờ, Ghi chú riêng. iOS dùng bộ chọn `datetime` dạng bánh xe hệ thống, ngày/giờ/phút trên cùng cụm; bản web dùng bộ chọn của trình duyệt.
- Lời nhắc đồng bộ thành thẻ trong chat. Chỉ người còn lại có nút Xác nhận. Xác nhận không phải hoàn thành; RPC tạo tin phản hồi và sự kiện thông báo trong cùng giao dịch. Sửa lịch yêu cầu xác nhận lại phiên bản mới.
- Báo người nhà tạo tin “Cần bạn hỗ trợ ngay”, không có nút xác nhận. Chống nhấn lặp và giới hạn 30 giây. Không thay thế gọi điện khẩn cấp.
- Bản nháp được lưu riêng theo gia đình/tài khoản trên thiết bị. Khi chưa rõ kết quả gửi, giữ nguyên nội dung và mã yêu cầu để thử lại không nhân đôi tin. Gửi tin và tải tệp cần Internet. Không tự gửi những tin thử cũ còn nằm trong outbox đã ngừng sử dụng.

## Thông báo

| Thao tác | PWA | Telegram khi 0008 đã áp dụng | Cục bộ |
| --- | --- | --- | --- |
| Tin nhắn chữ/ảnh/video | Báo người còn lại, chạm mở đúng tin trong Trao đổi | Tắt | Không tạo thêm |
| Tạo/sửa lời nhắc | Báo người còn lại; thẻ trạng thái trong chat | Tắt | Giữ nhắc giờ hẹn đã đồng bộ |
| Xác nhận lời nhắc | Báo lại người tạo; chat thêm tin xác nhận | Tắt | Không tạo thêm |
| Báo người nhà | Báo người còn lại; tin trong chat, không xác nhận | Tắt | Không tạo thêm |
| Bài đăng, bình luận, nhật ký, thai kỳ | Giữ như bản trước | Tắt | Không đổi |
| Lịch D−7 đến D−1, 21:00 giờ Việt Nam | Giữ như bản trước | Tắt | Giờ hẹn và nhắc thai kỳ 07:00/17:30 không đổi |

Push chỉ chứa thông báo chung và mã mục tiêu, không chứa nội dung chat, ảnh/video hay ghi chú. Cơ chế outbox + pg_net + Cron hiện có xử lý gửi/retry; không tạo Cron mới. “Đã gửi” là đã lưu tin trên Supabase, không phải bằng chứng điện thoại đối phương đã hiển thị hoặc người đó đã đọc.

## Nâng máy chủ và ứng dụng

**Bước 1–3 đã thực hiện trên project hiện tại ngày 13/10/2026. Không chạy lại migration 0008.** Các lệnh dưới đây lưu để tham khảo triển khai ở môi trường khác; không reset dữ liệu.

1. Đăng nhập CLI trong thư mục app bằng `npx supabase login`. Không gửi access token vào chat hoặc commit. Đúng project: `gkqlakxrjeflnfnmghma`.
2. Sao lưu theo chính sách của gia đình, sau đó chạy **chỉ** `supabase/migrations/0008_family_conversation.sql` trong SQL Editor của project. Các migration 0001–0007 phải đã có; không reset database. 0008 giữ tất cả bot secrets, liên kết Telegram, lịch sử và bảng cũ. Lời nhắc có sẵn được đưa vào chat nhưng không gửi thông báo hàng loạt.
3. Deploy lại các Functions dùng nội dung thông báo chung:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx supabase functions deploy telegram-worker --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt --use-api
npx supabase functions deploy webpush-account --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt --use-api
npx supabase functions deploy webpush-device --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt --use-api
```

Các Functions tự kiểm tra JWT/credential/worker secret. Không đổi VAPID, Vault, URL Pages hoặc Cron đang chạy.

4. Sau khi push bản nâng cấp lên `thuyan1510/gia-dinh-an-nam`, chạy Actions **Deploy notification PWA**, rồi **Build IPA for ESign**. PWA phải cập nhật vì có thêm loại thông báo `message`. Mở lại PWA từ Home Screen để cập nhật service worker; không xóa dữ liệu/ghép lại nếu vẫn hoạt động.
5. Cài IPA mới giữ bundle ID `vn.giadinhanam.family`. Đây là thay đổi có thêm module native DateTimePicker, không thể chỉ cập nhật JavaScript lên IPA 0.8.0. Không gỡ app khi chưa có tài khoản khôi phục và dữ liệu đã đồng bộ.

## Tạm tắt / bật lại Telegram

Migration tạo công tắc máy chủ `notification_channels.telegram_enabled=false`. Khi tắt: không tạo job Telegram mới, không lấy job cũ ra gửi; không xóa bot hoặc liên kết. Web Push dùng chung tên worker `telegram-worker` nhưng vẫn chạy riêng, **không được dừng worker/Cron**.

Chỉ khi muốn bật lại, chạy SQL:

```sql
update public.notification_channels
set telegram_enabled = true
where singleton = true;
```

Đổi `true` thành `false` để tạm tắt. Lịch sử được giữ; job hết hạn không phát lại khi bật. Tin chat mới chỉ dùng PWA ngay cả khi bật lại Telegram; các sự kiện cũ tiếp tục chính sách song song/dự phòng đã lưu. Bot vẫn được giữ để quản lý liên kết; đây là tắt gửi thông báo tự động, không xóa webhook.

## Kiểm thử

Kết quả cục bộ ngày 12/10/2026: 72/72 Node tests đạt; TypeScript đạt; Deno check cho `telegram-worker`, `webpush-account`, `webpush-device` đạt; export JavaScript/Hermes iOS đạt. Hai bộ kiểm thử browser (conversation và notification) đạt. Đây **không phải** kết quả build IPA/Xcode hoặc nghiệm thu bàn phím/thông báo trên iPhone thật.

- `npm run typecheck`; `npm test`.
- `tests/conversation.test.cjs`: chạy toàn bộ migration bằng PostgreSQL PGlite, kiểm tra RLS, tin bất biến, gửi lại một lần, media đúng gia đình, một thông báo/mục, xác nhận nguyên tử/khác phiên bản, không xác nhận attention, tạm tắt và bật lại Telegram.
- `scripts/conversation_ui_smoke.cjs`: browser cô lập, Supabase bị tắt, chỉ dùng dữ liệu giả cục bộ và transport giả trong bộ nhớ. Kiểm tra mất phản hồi → thử lại cùng ID, xác nhận trong chat, popup, ngày giờ và màn hình nhỏ. Không thay thế test iOS.
- `scripts/notification_ui_smoke.cjs`: mở mục tiêu hợp lệ/không hợp lệ, lời nhắc cục bộ và bảo vệ dữ liệu khi chưa đăng nhập.
- Trước nghiệm thu: gửi hai chiều chữ/ảnh/video, khóa màn hình nhận PWA, chạm mở đúng tin; tạo lời nhắc → máy kia xác nhận → máy đầu nhận phản hồi; báo người nhà không có nút xác nhận; nhập đoạn dài và ghi chú khi bàn phím thật mở trên iPhone 11/15. Kiểm tra Telegram không gửi nhưng nhắc cục bộ vẫn chạy.
