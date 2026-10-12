# Gia Đình An Nam

**0.8.0 (build 10)** làm lại Trạng thái hôm nay: ảnh thai nhi trong suốt đóng gói sẵn, bỏ header che nội dung, tuổi thai dưới ảnh, dải tuần và nút nhanh gọn hơn. Thêm PWA Web Push + mở đúng bản ghi trong IPA, quản lý từng thiết bị và Telegram dự phòng; giữ nhắc cục bộ. Backend Supabase đã nâng cấp ngày 12/10/2026; hosting/VAPID còn chờ xác nhận và **chưa kiểm chứng nhận trên iPhone**. Xem [thay đổi & kiểm thử](docs/WEB_PUSH_IMPLEMENTATION.md) và [hướng dẫn triển khai, ghép hai máy](docs/WEB_PUSH_SETUP.md). Chỉ cài IPA không tự hoàn thành PWA.

Repository/build hiện tại: [HasiramaTuna/gia-dinh-an-nam](https://github.com/HasiramaTuna/gia-dinh-an-nam), [Build IPA for ESign](https://github.com/HasiramaTuna/gia-dinh-an-nam/actions/workflows/build-unsigned-ios.yml). Các liên kết tài khoản cũ bên dưới chỉ lưu lịch sử.

Các mục dưới đây là lịch sử các bản trước.

**0.7.1 (build 9)** thay ảnh đầu trang bằng **40 ảnh thai kỳ** trong response `request(7).txt`, tải sẵn trong IPA (không lưu header/token). 43 mốc tuần được nối qua mã bài, không lấy số thứ tự làm tuổi thai; mốc đủ 40–42 tuần dùng ảnh `week_40` theo đúng dữ liệu nguồn. Nền tông ấm chuyển sáng khi cuộn, ảnh chuyển nhẹ; chọn trực tiếp ngày trong dải thứ Hai–Chủ nhật, có tuần trước/sau và về hôm nay. Bỏ mục Tình dục. 76 ảnh bài viết vẫn giữ nguyên trong thư viện.

Nhắc điền trạng thái mặc định **07:00 và 17:30**, dùng hai lịch **lặp hằng ngày của iOS**, không hết sau vài ngày đóng app; lần chiều vẫn còn nếu đã ghi sáng. Hồ sơ chưa có tùy chọn được bật mặc định khi iOS đã cho phép thông báo; mở màn hình thai kỳ để cấp quyền nếu cần. Các tùy chọn đã lưu (kể cả tắt nhắc hoặc giờ riêng) được giữ; dùng **chuông → Dùng giờ mặc định 07:00 và 17:30 → Lưu** để đổi. Chạm lời nhắc lặp mở ngày hiện tại, không mở ngày cũ khi đặt lịch. Bài đọc theo tuổi thai vẫn dùng lịch hữu hạn; tổng ngân sách là 12 mục. Máy cần mở app/đồng bộ để hủy nhắc sau khi báo đã sinh, đổi gia đình hoặc tắt nhắc từ hồ sơ đó. Thông báo cục bộ không cần máy chủ Telegram; vẫn chịu cài đặt Focus/quyền thông báo của iOS.

Cân nặng/triệu chứng khi tạo **hoặc sửa** nhật ký sẽ báo Telegram cho thành viên còn lại đã xác nhận liên kết bot, sau khi đồng bộ. Chỉ gửi hai trường này và ngày ghi, không gửi ghi chú, thuốc, tâm trạng hay dữ liệu Tình dục cũ. Các lần đồng bộ lại cùng dữ liệu không tạo sự kiện mới; bản sửa chờ gửi mới nhất thay bản cũ, xóa bản ghi sẽ hủy hàng đợi chưa gửi. Thông báo có thể chậm khi mất mạng; việc hủy một tin đã đang gửi tới Telegram chỉ là cố gắng tối đa, không bảo đảm thu hồi.

**Nâng backend cho 0.7.1:** từ bản mã đã cập nhật, deploy lại **cả ba** Functions (chúng dùng chung phần gửi tin), sau đó mở Supabase SQL Editor và chạy [`0006_pregnancy_status_telegram.sql`](supabase/migrations/0006_pregnancy_status_telegram.sql). Cần đã chạy 0005. Không đổi token, webhook hay Cron đã có; không chạy lại toàn bộ migration cũ. Chỉ cài IPA không áp dụng được phần SQL/Function.

```bash
npx supabase login
npx supabase functions deploy telegram-worker --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt
npx supabase functions deploy telegram-account --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt
npx supabase functions deploy telegram-webhook --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt
```

**0.7.0 (build 8)** thêm **Em bé → giai đoạn thai kỳ → Trạng thái hôm nay**, ngay sau Đếm cú đạp. Bố cục tham khảo video Flo do người dùng cung cấp: minh họa/chọn tuần, ghi nhanh, thẻ bài hằng ngày và thư viện ba nhóm. Có 43 bài phát triển theo tuần tiếng Việt, 40 bài thay đổi cơ thể mẹ và 9 bài về thai nhi dịch từ tiếng Anh, cùng 76 ảnh đóng gói trong IPA. Không gọi API/CDN Flo hoặc dịch trực tuyến khi dùng app. Bài không có ảnh được ghi rõ; chưa có mô hình 3D hoặc bộ 40 hình thai nhi riêng. Dữ liệu tham khảo của bên thứ ba không thuộc giấy phép mã nguồn của app, chưa xác lập quyền phân phối lại.

Nhật ký thai kỳ dùng `care_entries` và hàng đợi đồng bộ hiện có, phân biệt bé/ngày/người ghi; không cần migration hoặc Function mới. Các bản dịch có hiệu đính thuật ngữ, giữ bản tiếng Anh để đối chiếu nhưng **chưa được thẩm định y khoa**. Các mốc tuần là **số tuần đã hoàn thành**, không phải vị trí trong danh mục. Đọc nguồn và giới hạn ngay trong từng bài; không dùng nhật ký để chẩn đoán.

Trong Trạng thái hôm nay, chạm chuông để bật **nhắc cục bộ trên từng điện thoại**. Mặc định chưa bật; gợi ý đọc bài lúc 09:00, ghi nhật ký lúc 20:30 (tùy chọn). IPA Flo có nhãn mở bài triệu chứng nhưng không tìm thấy lịch giờ/mẫu nội dung tương ứng ảnh thông báo; `reminders.json` là hoạt ảnh Lottie, không phải lịch. Các giờ này là lựa chọn của An Nam. Đặt tối đa 12 thông báo thai kỳ gần nhất trong 14 ngày, chừa dung lượng cho lịch gia đình; mở app để bổ sung lịch. Tự thay/hủy khi nhận được đổi dự sinh, bé đã sinh, tắt nhắc hoặc đổi gia đình. Không cần APNs; iOS/Focus vẫn có thể hạn chế cảnh báo. Lời nhắc Telegram hiện có không bị thay đổi.

Kiểm thử riêng: `node --test tests/pregnancy*.test.cjs`. Kiểm thử giao diện local-only: chạy Expo web trên cổng 8092 với `EXPO_NO_DOTENV=1`, hai biến `EXPO_PUBLIC_SUPABASE_*` trống, rồi chạy `scripts/pregnancy_ui_smoke.cjs` (cần `playwright-core` và Chromium). Không dùng hồ sơ trình duyệt đã đăng nhập. Không thay kiểm thử iOS, bàn phím và nhận thông báo thật trên hai máy.

**0.6.0 (build 7, đang kiểm thử)** chuyển sang **Telegram + nhắc cục bộ**, thay chat bằng lời nhắc có xác nhận, chọn ngày/giờ bằng nút, thêm ba kiểu widget iPhone. Xem [hướng dẫn triển khai Telegram và widget](docs/TELEGRAM_SETUP.md). Cần migration **0005**, bot, ba Functions và Cron/webhook; chưa triển khai backend thật hoặc xác minh widget trên thiết bị. Widget dữ liệu cần quyền App Group hợp lệ khi ký, không phải chỉ cài IPA là đủ.

Các mục 0.5 trở về trước dưới đây lưu lịch sử; hướng dẫn APNs/chat không còn áp dụng cho bản 0.6.

**0.5.1 (build 6)** cải thiện hàng đợi thông báo chat và chẩn đoán lỗi JS. Xem [hướng dẫn nâng cấp](docs/UPGRADE_0_5_1.md) và [triển khai push](docs/PUSH_NOTIFICATIONS.md). Cần migration 0004, Function/webhook/Cron và profile/APNs hợp lệ; chỉ cài IPA không tự hoàn thành cấu hình push nền.

Phiên bản **0.5.0 (build 5)** bổ sung nhiều hồ sơ bé, xem ảnh toàn màn hình, chat ảnh/video và tách kiểm tra thông báo cục bộ/push. **Chat media cần migration `0003_family_chat.sql`.** Xem [hướng dẫn nâng cấp và tình trạng lỗi iPhone 11](docs/UPGRADE_0_5.md). Chưa xác định nguyên nhân crash native khi thiếu file `.ips`. Tải IPA từ artifact của lượt [Build IPA for ESign](https://github.com/lelylinhchau2027/Gia-dinh-An-Nam/actions/workflows/build-unsigned-ios.yml) thành công tương ứng với phiên bản cần cài.

IPA 0.5 từ commit `df1813b` đã [build và xác minh thành công](https://github.com/lelylinhchau2027/Gia-dinh-An-Nam/actions/runs/37873030940). **Yêu cầu iOS 16.4+** (đã đối chiếu Info.plist cả bản 0.4 và 0.5). Cài đè với Bundle ID cũ, không gỡ app khi chưa bảo đảm dữ liệu đã đồng bộ.

Bản **0.4.0 (build 4)** làm lại tab Em bé theo ảnh/video gốc, khôi phục 64 huy chương và sơ đồ răng, cải thiện trang theo ngày, lịch E.A.S.Y và nhập liệu với bàn phím iOS. Xem [thay đổi, giới hạn và kiểm thử](docs/ASSISTANT_REDESIGN.md). Chưa tuyên bố tương đương toàn bộ app gốc.

Ba tab Bảng tin / Em bé / Cẩm nang tiếp tục giữ ảnh gia đình, bình luận, like, hồ sơ ảnh bìa/đại diện và email OTP. Nếu chưa nâng Supabase từ bản đầu, làm theo [hướng dẫn 0.2](docs/UPGRADE_0_2.md); bản 0.4 không cần migration mới.

Ứng dụng riêng cho hai vợ chồng cùng theo dõi và chăm sóc bé. Bản đầu được xây bằng Expo/React Native, lưu dữ liệu cục bộ trước bằng SQLite và đã có schema Supabase dành cho đồng bộ hai thiết bị.

## Đã có trong bản đầu

- Trang tổng quan và ghi nhanh: bú/sữa, ngủ, bỉm, ăn dặm, nhiệt độ, thuốc, hoạt động, tăng trưởng.
- Dòng thời gian chăm sóc bé lưu trên máy, dùng được khi mất mạng.
- Việc chung, nhắc cục bộ và lời nhắn giữa hai người.
- Màn hình đọc lịch tiêm, E.A.S.Y và khám thai thay cho việc xem JSON.
- Toàn bộ dữ liệu tham chiếu đã trích xuất từ Bé của mẹ 1.2.21 được giữ làm nền.
- Cơ chế thay từng nhóm dữ liệu cũ bằng bản hiện hành có nguồn; nhóm Rota đã dùng lịch TCMR 2026.
- Luồng tạo/nhập mã ghép đôi, giới hạn đúng hai thành viên, đồng bộ offline-first, Realtime, RLS, kho token thiết bị và hàm gửi push cho người còn lại.

## Chạy ứng dụng

Yêu cầu Node.js 22.13+.

```bash
npm install
cp .env.example .env
npm run start
```

Kiểm tra mã nguồn:

```bash
npm run typecheck
npm test
npm run doctor
```

Nếu chưa cấu hình Supabase, ứng dụng vẫn chạy ở chế độ local-first với hồ sơ demo. Cấu hình backend nằm trong [`supabase/migrations/0001_family_core.sql`](supabase/migrations/0001_family_core.sql).

Hướng dẫn tạo backend và ghép hai máy: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). Hướng dẫn APNs/IPA: [`docs/PUSH_NOTIFICATIONS.md`](docs/PUSH_NOTIFICATIONS.md).

Build IPA chưa ký để ký lại bằng ESign: [`docs/BUILD_UNSIGNED_IPA.md`](docs/BUILD_UNSIGNED_IPA.md). Trên Mac chạy `npm run build:ios:unsigned`; nếu không có Mac, dùng workflow GitHub Actions đã chuẩn bị ở thư mục `.github/workflows` của repository.

Workflow **Check iOS UI** kiểm tra riêng bản Release trên iPhone Simulator bằng dữ liệu demo, chụp giao diện và bàn phím. Không cần Apple certificate hoặc Supabase secrets, không tạo IPA cài lên máy thật. Lượt 0.4 dừng ở selector tên bé; đã sửa selector, cần chạy lại và thử trên iPhone.

Quy trình chi tiết từ tạo Supabase, Expo project, repository và GitHub secrets đến ký/cài trên hai iPhone: [`docs/GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md`](docs/GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md).

Web chỉ dùng để xem nhanh giao diện. Do SQLite trên web dùng `SharedArrayBuffer`, máy chủ preview phải trả hai header `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp`. Mục tiêu phát hành chính của dự án là iOS.

## Cấu trúc chính

- `app/`: các màn hình và điều hướng Expo Router.
- `src/lib/database.ts`: SQLite và hàng đợi đồng bộ trên thiết bị.
- `src/data/legacy/`: dữ liệu gốc, không chỉnh sửa.
- `src/data/current/`: dữ liệu mới đã đối chiếu nguồn.
- `supabase/`: schema dùng chung và Edge Function gửi thông báo.
- `docs/`: quy tắc dữ liệu, đồng bộ và thông báo.

Đây là công cụ ghi nhận và nhắc lịch cho gia đình, không thay thế tư vấn y tế hay lịch cá nhân do cơ sở y tế xác nhận.
