# Thơ gia đình, nhạc nền và bộ chọn giờ

## Thơ

- Thay toàn bộ 50 bài cũ bằng **40 bài** trong `tuyen_tap_tho_thai_giao_cho_thai_nhi.txt` do gia đình cung cấp.
- Giữ nguyên lời thơ, dấu câu, xuống dòng, tác giả và đường dẫn nguồn. Đủ 40/40 bài, số dòng đều khớp mô tả trong tệp.
- Không gắn nhãn “phạm vi công cộng” cho tuyển tập mới. Nguồn/tác giả là thông tin từ tệp, chưa phải kết quả xác minh quyền tái phân phối.
- Các bài có ID mới để mục yêu thích của bài cũ không trỏ nhầm sang bài khác. Không xóa dữ liệu bé, nhật ký hay bài đăng.
- `scripts/parse_poem_collection.cjs` phân tích tệp và xuất JSON ra stdout; `poems-collection.json` lưu SHA-256 tệp gốc và từng thân bài để kiểm tra toàn vẹn.

## Nhạc

- Một trình phát dùng chung nằm ở root ứng dụng, không bị hủy khi đổi tab Thơ/Nhạc hay mở màn hình khác.
- Bật `UIBackgroundModes: audio`, `staysActiveInBackground` và thông tin tên bài/tác giả trên màn hình khóa. Dùng cơ chế âm thanh nền của [Expo Video SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/video/), không thêm quyền APNs.
- Có thanh điều khiển nhỏ khi rời Thai giáo: quay lại trình phát, tạm dừng/tiếp tục, dừng hẳn. Trong Thai giáo, thẻ điều khiển vẫn hiện khi chuyển sang Thơ.
- Nhấn đóng/dừng sẽ dừng âm thanh, bỏ hẹn giờ và xóa nguồn phát. Không tự phát khi mở lại app. Vuốt tắt hẳn ứng dụng vẫn dừng nhạc.
- Hẹn dừng 15 phút dùng hạn thời gian tuyệt đối và đối chiếu qua sự kiện tiến độ native/khi quay lại app, không chỉ dùng timeout JS. Thời điểm dừng khi iOS gián đoạn/treo ứng dụng cần kiểm tra trên thiết bị; không cam kết chính xác từng giây trong mọi trạng thái hệ thống.
- Nhạc vẫn là 10 tệp cục bộ hiện có; không tải nhạc mới và không gọi Flo.

## Bộ chọn giờ

`TimePicker` cũ chia giờ/phút thành các lưới 3 cột. Nay tất cả nơi dùng thành phần này chuyển sang `ScheduleWheel` native (`display="spinner"`, `mode="time"`, đủ 60 phút), dùng [bộ chọn ngày giờ của hệ điều hành](https://github.com/react-native-datetimepicker/datetimepicker).

Đã rà soát: ghi nhanh/chỉnh thời điểm chăm bé, nhật ký thai kỳ, ba giờ nhắc thai kỳ, giờ bắt đầu E.A.S.Y, popup tạo lời nhắc trong Trao đổi. Popup lời nhắc cũng tôn trọng chế độ: chọn ngày chỉ đổi ngày, chọn giờ chỉ đổi giờ/phút. Hủy không ghi giá trị đang cuộn.

Web dùng ô chọn date/time của trình duyệt để xem trước, không giả lập bánh xe iOS. Những trường **thời lượng** (ví dụ số phút bú/ngủ) vẫn là số phút, không chuyển thành giờ đồng hồ.

## Kiểm tra và cài đặt

- TypeScript đạt; 84 kiểm thử tự động đạt, gồm kiểm tra toàn bộ 1.440 giá trị giờ/phút từ 00:00 tới 23:59.
- Browser smoke test local-only, chặn request ra ngoài: tìm/đọc thơ mới, phát nhạc thực, mở bài thơ khi nhạc đang phát, tạm dừng/phát tiếp từ thanh nhỏ, quay về và đóng trình phát; chỉ một media element. Kiểm tra khung 320 px, chọn giờ 23:59 và Hủy không làm thay đổi giờ đã chọn. Đây không phải chứng nhận phát nền trên iPhone.
- Expo introspection xác nhận Info.plist sinh ra có `audio`, không có `aps-environment`.
- Workflow IPA sẽ từ chối gói thiếu chế độ âm thanh nền.
- Thay đổi Info.plist cần **build/cài IPA mới**; tải lại JavaScript không đủ. Chưa có phép thử iPhone thật cho lần sửa này.
- Khi cài bản mới: phát nhạc rồi khóa màn hình/chuyển app, thử nút trên màn hình khóa, chuyển sang đọc thơ, dừng từ thanh nhỏ; mở từng bộ chọn giờ và thử 00:00, 07:01, 17:30, 23:59, Hủy/Xong.

Kết quả kiểm tra bài cẩm nang còn thiếu nằm trong [HANDBOOK_CONTENT_AUDIT.md](HANDBOOK_CONTENT_AUDIT.md). Không có migration Supabase hoặc thay đổi thông báo máy chủ trong lần sửa này.
