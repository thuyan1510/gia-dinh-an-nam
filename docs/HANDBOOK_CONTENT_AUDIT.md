# Kiểm tra bài viết cẩm nang — 14/10/2026

## Kết luận

Các chuyên mục trống trong An Nam là **chưa có bản nội dung ngoại tuyến**, không phải bằng chứng app Bé của mẹ không có bài. Đợt trước mới lấy danh mục/icon và xếp nội dung sẵn có của An Nam vào các nhóm; chưa nhập thân bài cẩm nang từ máy chủ Bé của mẹ.

## Bằng chứng từ IPA 1.2.21

- SHA-256 IPA: `8afe889f97b5078cb85fa9744a8962c99bb2f0e55c81f6c68a6bf80fba930d06`.
- SHA-256 `Payload/becuame.app/main.jsbundle`: `c0f473f7d5bf6e1ce305024302646ae1fa7a69cf0f4b700f30ce2db55340965d`.
- Module **1859** gọi GraphQL `findHandbookCategoryListByType(type: ...)` lấy danh mục.
- Module **1860** mở nhóm bằng `category.group.id`, không mở tệp HTML/bài viết trong bundle.
- Module **1353** gọi `findPostListByGroupId(groupId, sort, lastId, lastReactionCount, lastOrderIndex)`; thân bài đến từ response.
- Module **1346**, `PostFragment`, yêu cầu `title`, `contentType`, `excerpt`, `content`, `attachments`…
- Module **2637** phân biệt đang tải, lỗi, danh sách rỗng; có câu báo “Nội dung chuyên mục này đang được xây dựng…” khi response rỗng. Sự tồn tại của câu này **không chứng minh** một chuyên mục cụ thể đang rỗng.
- Kiểm kê tệp trong archive không thấy HTML/SQLite/JSON bài cẩm nang độc lập. JSON chủ yếu là cấu hình, bản dịch và thư viện. Đường tải bài đã được đối chiếu trực tiếp trong JS, không chỉ suy luận từ tên tệp.

## Mười nhóm chưa có nội dung ngoại tuyến

| Giai đoạn | Chuyên mục | ID nhóm gốc |
| --- | --- | --- |
| Chưa có thai | Di truyền và giới tính | 1016 |
| Chưa có thai | Tâm lý & sức khoẻ | 1007 |
| Chưa có thai | Dinh dưỡng | 1010 |
| Chưa có thai | Thay đổi thói quen | 1011 |
| Đang có thai | Dinh dưỡng | 1096 |
| Đang có thai | Sinh nở | 1087 |
| Nuôi con nhỏ | Bệnh trẻ em | 1031 |
| Nuôi con nhỏ | An toàn cho bé | 1026 |
| Nuôi con nhỏ | Dấu hiệu bất thường | 1029 |
| Nuôi con nhỏ | Dùng thuốc an toàn | 1041 |

Những nhóm có nội dung cũng **chưa tương đương toàn bộ kho gốc**: Thai nhi theo tuần có 43 mục của kho thai kỳ hiện tại, Thay đổi của mẹ 40, Các vấn đề thường gặp 9; Khám thai có 14 mốc tham chiếu; Thuốc và tiêm phòng có 14 nhóm lịch tiêm; Thai giáo là tuyển tập riêng; Tuần khủng hoảng là công cụ mốc tuần, chưa có bộ bài giải thích gốc. Không đổi nhãn các nguồn này thành “bài gốc Bé của mẹ”.

## Kiểm tra nguồn máy chủ và giới hạn

Kiểm tra chỉ đọc, không đăng nhập/đổi dữ liệu, bắt đầu với nhóm công khai 1016 tại `https://api.becuame.com/graphql`. Request Node giới hạn 15 giây và cURL giới hạn 25 giây đều timeout; trình đọc web cũng không mở được endpoint. Không nhận được response danh sách bài hay lỗi quyền truy cập nên không thể phân biệt máy chủ ngừng phục vụ, lỗi đường mạng hay yêu cầu đăng nhập. Không gọi vét toàn bộ nhóm khi phép thử đầu không phản hồi.

Để xác nhận/bổ sung tiếp: khi app gốc mở được một chuyên mục, xuất response `findPostListByGroupId` của chính chuyên mục đó (kèm phân trang nếu có), bỏ token/cookie và dữ liệu người dùng. Đối chiếu ID nhóm, kiểm tra thân bài/ảnh và nguồn trước khi nhập ngoại tuyến. Không cần đưa API/token của app gốc vào An Nam. Chưa tự thay các khoảng trống bằng nội dung suy đoán hoặc lời khuyên y tế không kiểm chứng.
