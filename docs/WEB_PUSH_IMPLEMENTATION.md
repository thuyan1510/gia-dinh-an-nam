# Bản 0.8.0 (10) — thông báo và màn hình thai kỳ

Cập nhật 12/10/2026. Mã nguồn đã triển khai và kiểm thử cục bộ; **chưa nghiệm thu Web Push trên iPhone**. CLI Supabase hiện báo thiếu access token, hosting HTTPS đang chờ lựa chọn. Hướng dẫn triển khai: [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md).

## Kiến trúc đã kiểm tra

- Expo 57 / React Native 0.86, Expo Router, SQLite local-first; Supabase Auth (tài khoản ẩn danh có thể liên kết email), RLS và Realtime.
- `0005`: sự kiện lời nhắc, bài đăng, bình luận, nhật ký → Telegram outbox có lease/retry. Cron 1 phút và trigger pg_net gọi `telegram-worker`. Lịch D-7..D-1 lúc 21:00 Việt Nam; giờ hẹn và nhắc thai kỳ được iPhone đặt cục bộ.
- `0006`: lọc thay đổi cân nặng/triệu chứng, revision tránh gửi phiên bản nhật ký cũ. Không đọc ghi chú riêng lên payload push.
- iOS scheme hiện tại là `giadinhannam` (hai chữ n). Giữ scheme này, bổ sung alias `giadinhanam` theo kế hoạch. Bundle ID giữ `vn.giadinhanam.family`; không thêm APNs entitlement.
- Build GitHub Actions macOS, IPA unsigned ký ESign. Web Push thuộc PWA đã thêm vào Home Screen, không phải native push của IPA.

## Thay đổi đã viết

1. `app/pregnancy/index.tsx`, `PregnancyWeekStrip`, `PregnancyHero`: bỏ header native che nội dung, safe area riêng, tuổi thai dưới hình, nút nhanh và thẻ bài đọc gọn. 43 PNG trong suốt ứng với số tuần hoàn thành 0–42 được render từ model trung tính/texture nguồn 3D người dùng cung cấp; SHA-256 trong `assets/pregnancy-model-renders/manifest.json`. Đây là render tĩnh, không phải shader/animation nguyên bản Flo. Giữ 40 JPEG cũ làm nguồn dự phòng. Không gọi API/CDN Flo lúc dùng app.
2. `0007_web_push.sql`: sự kiện trung tâm → Telegram + delivery từng subscription. Ghép PWA bằng mã một lần; RLS; lease/retry; chính sách Telegram song song hoặc dự phòng theo xác nhận hiển thị (không theo HTTP 201).
3. Functions `webpush-account`, `webpush-device`, shared worker; giữ endpoint/Cron Telegram để chạy bộ điều phối mới.
4. `pwa/`: manifest, worker, đăng ký, ghép thiết bị, open-app, xem nội dung sau xác thực; không cache dữ liệu sức khỏe trong Service Worker.
5. Router IPA và màn hình Thông báo: giữ mục tiêu khi khởi động/đăng nhập, kiểm tra quyền, mở bản ghi thực tế; fallback an toàn.
6. Test SQL/RLS, worker/retry, URL, Service Worker/PWA, UI. Script build chép PWA phục vụ tests; Verify IPA kiểm tra cả hai schemes trong plist được đóng gói thật. Kết quả thiết bị thật phải do hai iPhone xác minh; không xem HTTP thành công là đã đọc.

## Ràng buộc triển khai

- Domain PWA cấu hình bằng biến môi trường, không hardcode. Đang chờ lựa chọn hosting của chủ ứng dụng.
- Giữ bản sửa cấu hình Telegram đang chạy trên Supabase; không ghi đè bot token, webhook hoặc Cron.
- Không tự gửi tin thử đến gia đình. Nút kiểm thử sẽ do người dùng chủ động nhấn.
- Không tự tắt Telegram; mặc định giữ song song khi liên kết sẵn, người dùng có thể chọn dự phòng. Chính sách phải hiển thị rõ khả năng trùng khi bật nhiều kênh.
- Không có thực thể “lịch trình/địa điểm” trong dự án hiện tại; không dựng màn hình giả cho ví dụ đó. Ánh xạ theo bảng reminders, family_posts, post_comments, care_entries thực tế.

## Thông báo nào gửi lúc nào

Nguồn thật → `notification_events` → delivery Web Push từng máy và Telegram theo chính sách người nhận. Không tạo bộ trigger sự kiện thứ hai.

| Sự kiện                          | Kênh từ xa                                | Cục bộ / đích khi chạm                                 |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| Lời nhắc mới/sửa, báo cần hỗ trợ | Người còn lại, sau khi đồng bộ lên server | Giữ giờ hẹn; mở đúng reminder, xác nhận bằng nút riêng |
| Xác nhận/hoàn thành lời nhắc     | Người còn lại                             | Hủy/đồng bộ lịch cũ; mở đúng reminder                  |
| Bài đăng/bình luận               | Người còn lại                             | Không đặt bản cục bộ trùng; đúng bài/bình luận         |
| Nhật ký chăm bé mới              | Người còn lại, không gửi bù bản quá cũ    | Đúng care entry                                        |
| Cân nặng/triệu chứng             | Người còn lại, revision mới nhất          | Nhắc nhập 07:00/17:30; mở đúng nhật ký và bé           |
| Lịch sắp tới                     | Mỗi ngày D−7..D−1 lúc 21:00 Việt Nam      | Đúng giờ hẹn theo cấu hình cũ; mở đúng reminder        |
| Tin kiểm tra                     | Chỉ Web Push đến máy được chọn            | Đúng sự kiện test lưu thật trên server                 |

## Độ tin cậy và bảo vệ dữ liệu

- pg_net đánh thức worker sau khi lưu sự kiện; Cron mỗi phút phục hồi nếu lần đầu lỗi. Không cam kết thời gian nhận cố định.
- Web Push tối đa 6 lần thử có backoff/Retry-After, lease 2 phút, claim 5 job; 404/410 vô hiệu đúng endpoint. ID sự kiện + thiết bị duy nhất, tag ổn định. Không thể hứa exactly-once nếu nhà cung cấp đã nhận nhưng worker chưa ghi được kết quả.
- Telegram song song được giữ mặc định. Dự phòng chờ 2 phút; bỏ lượt Telegram chỉ sau biên nhận hiển thị của Service Worker hoặc IPA mở bản ghi. HTTP accepted không tắt Telegram; biên nhận muộn vẫn có thể gây trùng hai kênh.
- Phân biệt accepted (nhà cung cấp nhận), displayed (API hiển thị chạy xong), clicked, PWA opened, launch attempted, native opened (IPA xác minh và render bản ghi). Không trường nào tự chứng minh người dùng đã đọc.
- RLS bật, dữ liệu subscription/credential chỉ service role đọc. Mã ghép 96 bit, một lần, 5 phút; credential 256 bit lưu hash server, hạn 90 ngày; tối đa 10 thiết bị đang bật/người. Test giới hạn 30 giây/thiết bị. Có thu hồi từng máy.
- Kiểm tra origin, thành viên hiện tại, người nhận và ID. Endpoint chỉ HTTPS nhà cung cấp push trong allowlist; không theo redirect. Không cache API, signed media hoặc hồ sơ sức khỏe trong Service Worker. Payload chứa ID và mô tả chung, nội dung riêng lấy sau xác thực.
- IndexedDB giữ credential PWA và mục tiêu điều hướng; coi PWA đã ghép như một thiết bị đăng nhập, thu hồi khi mất máy. Private key chỉ Supabase Secrets.
- Giữ `giadinhannam`, thêm `giadinhanam`; PWA mở trang HTTPS cùng origin trước, thử scheme một lần và luôn có nút thủ công. Không bảo đảm iOS tự mở IPA, không vòng lặp/pop-up giả lập thao tác.
- PWA cần HTTPS, cài Home Screen và quyền do người dùng chủ động cấp. WebKit hỗ trợ Home Screen Web Push từ iOS/iPadOS 16.4, không cần thành viên Apple Developer cho Web Push. [Tài liệu WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Deep link không tự xác nhận/xóa bản ghi. Cache IPA chỉ dùng khi lỗi mạng, đúng phiên người dùng/gia đình; lỗi quyền/đã xóa không dùng cache để né kiểm tra.

## Bằng chứng kiểm thử hiện có

- TypeScript typecheck; Node tests migrations/RLS/pairing/per-device/lease/retry/fallback/URL/Service Worker/43 PNG và regressions hiện hữu đều chạy thành công. Workspace có 4 tests Telegram/widget từ thay đổi có sẵn; snapshot release không gộp các sửa widget không liên quan.
- Deno check ba Functions và test mã hóa aes128gcm thật rồi giải mã bằng khóa thiết bị thử. Transport giả lập chỉ trong test, production dùng fetch thật.
- Playwright thai kỳ 390×844 / 414×896: lịch tuần, tạo/sửa nhật ký, thư viện/ảnh, không request Flo/backend/dịch và không lỗi JS.
- Playwright PWA: không tự xin quyền, pairing fixture, denied, pending target khi cold-root, receipt sau config, nội dung sau auth, offline fallback; không cache API riêng tư hay fake native-open.
- `scripts/notification_ui_smoke.cjs`: target sai, mục tiêu còn khi chuyển sang tài khoản, lời nhắc local-only mở đúng bản ghi, notification ID từ xa không được đi nhánh local-only. Không lỗi JS. Chi tiết care dùng bộ lọc JSON cũ đã có để không đưa object sai kiểu vào React Native Text.

Chưa xác minh: deploy production mới, nhà cung cấp → hai iPhone, khóa máy/Focus, Safari/PWA/IPA cold và warm start, đăng nhập lại, mất mạng rồi nối lại, IPA chưa cài. Browser smoke không thay thế kiểm tra safe area/bàn phím/native navigation. Theo dõi build 0.8.0 ở GitHub Actions; run 0.7.1 không phải bằng chứng cho bản mới.
