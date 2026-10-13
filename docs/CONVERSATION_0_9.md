# Trao đổi · 0.9.0 (11)

## Trạng thái triển khai

Ngày 13/10/2026 đã áp dụng migration **0008** lên project `gkqlakxrjeflnfnmghma` và deploy lại `telegram-worker`, `webpush-account`, `webpush-device`. Đã xác minh Telegram tạm tắt, Cron và trigger PWA vẫn còn; dữ liệu gia đình và liên kết Telegram được giữ. Lời nhắc cũ đã được đưa vào chat mà không phát thông báo hàng loạt. **IPA/PWA đã build và xuất bản thành công qua GitHub Actions.**

Tải IPA tại [build 0.9.0 (11)](https://github.com/thuyan1510/gia-dinh-an-nam/actions/runs/38327598448) → Artifacts → `gia-dinh-an-nam-unsigned-ipa`. Các bước Build / Verify IPA package / Upload đều thành công, thời gian job 17 phút 24 giây. IPA chưa ký, cần ký/cài như các bản trước.

Đã tải và kiểm tra IPA thực tế: archive nguyên vẹn, SHA-256 khớp, app và widget đều **0.9.0 / build 11 / iOS tối thiểu 16.4**. Bundle ID app `vn.giadinhanam.family`, widget `vn.giadinhanam.family.widget`; có cả URL schemes `giadinhanam` và `giadinhannam`. SHA-256: `11b9ee321513239c2ea5543001a28b3977fdb3312090f35b3b475739ba4b23e5`. Đây chưa phải xác nhận chạy trên iPhone thật.

Hiện có **2 thành viên nhưng chỉ 1 thiết bị PWA sẵn sàng**. Điện thoại còn lại cần cài/ghép PWA và cấp quyền thông báo để nhận thông báo hai chiều. Không cần ghép lại máy đã hoạt động.

PWA đã [xuất bản thành công](https://github.com/thuyan1510/gia-dinh-an-nam/actions/runs/38327595577) từ commit `b48a22c`. Đã kiểm tra bản đang phục vụ trên Pages có loại thông báo `message` và service worker `an-nam-shell-v2-conversation`; endpoint cấu hình Web Push trả `configured=true`, các endpoint riêng tư từ chối yêu cầu không có xác thực (401).

## Việc cần làm trên hai điện thoại

1. Tải artifact `gia-dinh-an-nam-unsigned-ipa` của lượt build thành công, giải nén và ký/cài IPA như trước. Giữ Bundle ID `vn.giadinhanam.family`, không gỡ app cũ để tránh mất dữ liệu chưa đồng bộ.
2. Mở PWA **An Nam** từ Màn hình chính để cập nhật service worker. Máy đã ghép và nhận tốt không cần xóa/cài lại PWA.
3. Máy chưa ghép: IPA → **Cài đặt → Thông báo**, mở PWA qua Safari → Chia sẻ → Thêm vào Màn hình chính. Tạo mã ghép trong IPA trên chính máy đó, mở biểu tượng PWA, nhập mã và bật Web Push. Dùng tài khoản riêng của mỗi người.
4. Gửi thử chữ/ảnh/video từ tab **Trao đổi** theo cả hai chiều, khi máy nhận đã khóa màn hình. Chạm thông báo phải mở đúng tin. Không coi trạng thái “Đã gửi” trong chat là đã nhận trên điện thoại.
5. Nút `+` → **Tạo lời nhắc** → người còn lại nhấn **Xác nhận**; kiểm tra người tạo nhận được thông báo và tin xác nhận. **Báo người nhà** gửi thông báo nhưng không có nút xác nhận; cần máy kia đã ghép PWA.
6. Kiểm tra nhập đoạn dài, ghi chú và bánh xe ngày giờ trên iPhone 11/15. Đây là phần cần nghiệm thu trên máy thật; kiểm thử trình duyệt không chứng minh được hành vi bàn phím iOS.

Không cần chạy SQL hoặc thiết lập lại bot/VAPID/Cron cho bản nâng cấp này trên project hiện tại.

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

Ngày 13/10/2026, GitHub Actions chạy **68/68 tests đạt** trên đúng commit phát hành `b48a22c` (không gồm các thay đổi thử nghiệm Telegram/widget chưa commit trong workspace). Kiểm tra Cron trực tiếp: job vẫn active, lần chạy gần nhất `succeeded`.

Kết quả cục bộ ngày 12/10/2026: 72/72 Node tests đạt; TypeScript đạt; Deno check cho `telegram-worker`, `webpush-account`, `webpush-device` đạt; export JavaScript/Hermes iOS đạt. Hai bộ kiểm thử browser (conversation và notification) đạt. Đây **không phải** kết quả build IPA/Xcode hoặc nghiệm thu bàn phím/thông báo trên iPhone thật.

- `npm run typecheck`; `npm test`.
- `tests/conversation.test.cjs`: chạy toàn bộ migration bằng PostgreSQL PGlite, kiểm tra RLS, tin bất biến, gửi lại một lần, media đúng gia đình, một thông báo/mục, xác nhận nguyên tử/khác phiên bản, không xác nhận attention, tạm tắt và bật lại Telegram.
- `scripts/conversation_ui_smoke.cjs`: browser cô lập, Supabase bị tắt, chỉ dùng dữ liệu giả cục bộ và transport giả trong bộ nhớ. Kiểm tra mất phản hồi → thử lại cùng ID, xác nhận trong chat, popup, ngày giờ và màn hình nhỏ. Không thay thế test iOS.
- `scripts/notification_ui_smoke.cjs`: mở mục tiêu hợp lệ/không hợp lệ, lời nhắc cục bộ và bảo vệ dữ liệu khi chưa đăng nhập.
- Trước nghiệm thu: gửi hai chiều chữ/ảnh/video, khóa màn hình nhận PWA, chạm mở đúng tin; tạo lời nhắc → máy kia xác nhận → máy đầu nhận phản hồi; báo người nhà không có nút xác nhận; nhập đoạn dài và ghi chú khi bàn phím thật mở trên iPhone 11/15. Kiểm tra Telegram không gửi nhưng nhắc cục bộ vẫn chạy.
