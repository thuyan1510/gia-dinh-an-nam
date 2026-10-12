# Thiết lập Web Push cho hai iPhone

## Trạng thái

Mã nằm trong bản 0.8.0. **Cài IPA mới chưa tự bật Web Push**: còn cần PWA HTTPS, migration/Functions/Secrets, rồi ghép riêng mỗi máy. Nhắc cục bộ và Telegram cũ tiếp tục dùng được. Không cần VPS chạy thường trực; dùng Supabase và hosting tĩnh.

Ngày 12/10/2026 đã đăng nhập và nâng đúng project `gkqlakxrjeflnfnmghma`: áp dụng 0006 + 0007, deploy `webpush-account`, `webpush-device`, `telegram-worker`, chạy `web_push_dispatch.sql`. Cả 5 bảng mới có RLS; giữ duy nhất Cron `an-nam-telegram-minute`. Không cần chạy lại bước 3–4 cho project này. Chưa nghiệm thu nhận thông báo trên iPhone.

Repository mới: [HasiramaTuna/gia-dinh-an-nam](https://github.com/HasiramaTuna/gia-dinh-an-nam). Đã cấu hình hai Actions secrets `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Không đổi project Supabase, tài khoản gia đình hoặc bundle ID khi chuyển GitHub.

Hosting PWA và bộ VAPID đang chờ xác nhận địa chỉ xuất bản; cài IPA chưa tự hoàn tất hai mục này. Chỉ shell công khai được upload, không phải dữ liệu gia đình.

## 1. Đăng nhập Supabase

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx supabase login
npx supabase projects list
```

Project đích: `Gia đình An Nam`, ref `gkqlakxrjeflnfnmghma`. Không gửi access token vào chat hoặc ghi trong repo. Phiên CLI hiện đã đăng nhập; các lệnh trên dành cho môi trường mới.

## 2. Publish PWA HTTPS

Nếu chọn GitHub Pages:

1. Repository → Settings → Pages → Source: **GitHub Actions**.
2. Giữ secret Actions `EXPO_PUBLIC_SUPABASE_URL` đúng project (đã dùng build IPA).
3. Actions → **Deploy notification PWA** → Run workflow trên `main` chứa bản mới.
4. Lấy URL Pages từ kết quả workflow; mở thử cả URL gốc và `open-app/` bên trong. Dùng URL gốc kết thúc `/` cho bước 5.

Hosting khác: đặt `EXPO_PUBLIC_SUPABASE_URL`, chạy `node scripts/build_notification_pwa.cjs` (cần Node và ffmpeg), upload **chỉ** `build/notification-pwa`. Phục vụ manifest/JS đúng MIME và `open-app/index.html`; HTTPS, không yêu cầu đăng nhập để tải shell. Không đổi domain/path/manifest ID sau khi đăng ký trừ khi chấp nhận cài và ghép lại.

## 3. Database

Mở **SQL Editor đúng project**, lần lượt chạy đầy đủ:

1. `supabase/migrations/0006_pregnancy_status_telegram.sql` nếu chưa chạy.
2. `supabase/migrations/0007_web_push.sql`.

Không chạy lại toàn bộ lịch sử, không `db reset` hay xóa bảng. 0007 có transaction, chạy lại được. Nên có backup project trước khi cập nhật production. Nếu lỗi, dừng và gửi thông báo lỗi, không gửi secrets/hồ sơ bé.

## 4. Functions và đánh thức worker

```bash
npx supabase functions deploy webpush-account webpush-device telegram-worker --project-ref gkqlakxrjeflnfnmghma --no-verify-jwt --use-api
```

`--no-verify-jwt` tắt kiểm tra gateway; Functions vẫn tự kiểm tra JWT tài khoản, credential PWA hoặc worker secret tương ứng. Không thay Telegram bot token/webhook.

Sau deploy, chạy đầy đủ `supabase/setup/web_push_dispatch.sql` trong SQL Editor. File tận dụng `wake_an_nam_telegram`, Vault secrets và Cron `an-nam-telegram-minute` hiện có. Không tạo Cron thứ hai.

## 5. Tạo VAPID một lần, lưu Secrets

Xem tên secrets đã có:

```bash
npx supabase secrets list --project-ref gkqlakxrjeflnfnmghma
```

Nếu đã có bộ VAPID, **không tạo khóa mới đè lên** vì subscription cũ gắn với khóa cũ. Nếu chưa có, thay URL mẫu bằng root HTTPS thật đã publish:

```bash
node scripts/create_web_push_secrets.cjs 'https://TEN-MIEN/DUONG-DAN-PWA/'
```

Script chỉ in đường dẫn file tạm, quyền 0600, không in giá trị khóa. Dùng đường dẫn vừa nhận:

```bash
npx supabase secrets set --env-file /DUONG-DAN-TAM/web-push.env --project-ref gkqlakxrjeflnfnmghma
```

Bốn tên ở **Edge Functions Secrets**, không phải Vault:

| Tên                          | Giá trị                                 |
| ---------------------------- | --------------------------------------- |
| `WEB_PUSH_PWA_URL`           | Root PWA HTTPS có `/` cuối              |
| `WEB_PUSH_VAPID_SUBJECT`     | URL liên hệ HTTPS; script dùng root PWA |
| `WEB_PUSH_VAPID_PUBLIC_KEY`  | Public key được API cấp cho PWA         |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Private key chỉ server                  |

Lưu bản khóa trong nơi quản lý bí mật; xóa riêng file tạm sau upload/backup. Không commit, đưa vào artifacts, IPA hoặc PWA. Cấu hình public của PWA chỉ chứa địa chỉ Functions.

## 6. Ghép riêng từng điện thoại

1. Mở [Build IPA for ESign ở repository mới](https://github.com/HasiramaTuna/gia-dinh-an-nam/actions/workflows/build-unsigned-ios.yml), chọn lượt thành công → Artifacts → `gia-dinh-an-nam-unsigned-ipa`. Giải nén, ký tệp `Gia-Dinh-An-Nam-unsigned.ipa` bằng ESign/cài như trước. Giữ bundle ID `vn.giadinhanam.family`; không gỡ app khi chưa chắc dữ liệu đồng bộ và tài khoản có thể khôi phục. Chứng chỉ và mật khẩu ký không cần đưa lên GitHub.
2. IPA → **Cài đặt → Thông báo** → mở PWA bằng Safari → Chia sẻ → Thêm vào Màn hình chính.
3. Mở biểu tượng **An Nam** vừa cài. Tạo mã 5 phút trong IPA, sao chép vào PWA. Đặt tên “iPhone 15” / “iPhone 11”. Không chia sẻ mã với người khác.
4. Nhấn **Cho phép và bật Web Push**, đồng ý hộp thoại hệ thống.
5. Gửi thử. Chỉ nhấn xác nhận đã nhận sau khi **thực sự thấy thông báo**. Đây là xác nhận của người dùng, không phải phép đo tự động.
6. Lặp lại trên máy kia bằng tài khoản IPA người kia và mã mới; không ghi đè máy thứ nhất.
7. Ban đầu giữ Telegram song song. Khi cả hai máy nhận ổn, có thể chọn Telegram dự phòng. Không tắt Telegram chỉ vì thấy HTTP accepted.

Quyền denied: kiểm tra Cài đặt iPhone → Thông báo → An Nam. Thiếu hỗ trợ: kiểm tra iOS và mở PWA **từ Home Screen**, không chỉ tab Safari. Credential hạn 90 ngày; có thể thu hồi/ghép lại. Mất máy thì thu hồi đúng thiết bị.

## 7. Kiểm thử thực tế trước khi nghiệm thu

IPA → Thông báo có gửi test đến từng máy/cả hai. Hộp thông báo có chẩn đoán và mở deep link không gửi lại push. Tạo sự kiện thật có chủ ý cho từng nhóm: reminder, bài đăng, bình luận, nhật ký chăm bé, cân nặng/triệu chứng.

| Tình huống mỗi iPhone                                    | Cần quan sát                                               |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| PWA foreground/background/đã đóng, khóa máy, Safari đóng | Thông báo thực tế và thời điểm nhận, không chỉ accepted    |
| IPA foreground/background/cold start                     | Chạm → PWA → đúng bản ghi IPA                              |
| Bị chặn tự mở/chưa cài IPA                               | Nút thủ công; nội dung PWA yêu cầu ghép và quyền hợp lệ    |
| PWA bị thu hồi rồi mở về root                            | Giữ đúng mục tiêu, không vòng lặp                          |
| IPA chưa đăng nhập/đang khởi tạo                         | Mục tiêu còn đó; đăng nhập rồi quay lại tải                |
| Offline/nối lại                                          | Nút mở IPA, cache phù hợp hoặc chờ; tải lại không mở sai   |
| ID sai/đã xóa/không quyền/thông báo cũ                   | Lỗi an toàn hoặc nội dung hiện tại, không lộ gia đình khác |
| Chạm liên tiếp                                           | Đúng bản ghi cuối, không nhân màn hình trùng               |
| Thu hồi máy một                                          | Máy hai vẫn nhận; Telegram theo lựa chọn                   |
| Nhắc 07:00/17:30/giờ hẹn; nhập dữ liệu                   | Lịch cục bộ vẫn chạy; bàn phím không che ô nhập            |

`accepted`, `displayed`, `clicked`, `pwa_opened`, `launch_attempted`, `native_opened` là các bước khác nhau. Chỉ IPA được ghi bước cuối sau xác minh/render bản ghi. Focus, mạng, hệ điều hành/quyền có thể làm chậm/tắt tiếng. Không dùng thông báo thay liên hệ khẩn cấp trực tiếp.
