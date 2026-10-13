# 0.10.0 · Chỉ số của bé, Thai giáo và Cẩm nang

Build iOS: **12**. Không thêm migration, không cần thay đổi Supabase, PWA hay cấu hình thông báo. Cài đè bằng cùng bundle ID/chứng chỉ; không gỡ app nếu còn dữ liệu chưa đồng bộ.

## Dùng các phần mới

- **Em bé → Đồ thị chỉ số của bé**: có ở cả hai nhánh Thai nhi / Đã sinh. Chạm hàng số đo dưới hồ sơ để mở lịch sử; chọn **Bảng chuẩn** để xem bảng số liệu.
- Bé đã sinh: cân nặng, chiều dài/chiều cao, vòng đầu; chọn giới tính và khoảng tháng. Đường tham chiếu xuất hiện ngay cả khi chưa nhập số đo. Đường hồng chỉ chứa số đo thật của bé đang chọn.
- Thai nhi: cân nặng theo gram, chiều dài và vòng đầu theo cm. Cân nặng của mẹ không được đưa vào biểu đồ này.
- **Em bé → Thai nhi → Thai giáo**, hoặc **Cẩm nang → Đang có thai → Thai giáo**: 50 bài thơ và 10 bản nhạc đã lưu sẵn, không cần tài khoản dịch vụ nhạc.
- Thơ: tìm không dấu, lọc chủ đề, lưu yêu thích trên máy; mở bài để đọc đầy đủ và đổi ba cỡ chữ. Gồm 10 bài ca dao và 40 bài thơ Christina Rossetti dịch mới. Tên bài Việt được đặt để dễ tra cứu; nguồn và thông tin bản dịch ở cuối bài.
- Nhạc: phát/tạm dừng, tua ±15 giây hoặc chạm thanh tiến độ, lặp một bài, hẹn dừng 15 phút. **Dừng khi rời màn hình/đưa ứng dụng vào nền**; chưa có chế độ nghe khi khóa màn hình. Mục Nguồn & bản quyền ghi riêng người trình diễn và giấy phép bản thu.
- **Cẩm nang**: ba tab Chưa có thai / Đang có thai / Nuôi con nhỏ, lưới icon ba cột. Các bài và dấu trang cũ được giữ; tìm kiếm và bộ lọc Đã lưu áp dụng trên toàn bộ thư viện.

## Nguồn biểu đồ và giới hạn

Các bảng sau sinh được tải ngày 13/10/2026 từ WHO, đóng gói ở `src/data/current/who-growth.json`, gồm tám bộ bảng trai/gái và SHA-256 của từng XLSX:

- [Cân nặng theo tuổi](https://www.who.int/tools/child-growth-standards/standards/weight-for-age).
- [Chiều dài/chiều cao theo tuổi](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age).
- [Vòng đầu theo tuổi](https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age).

Đường trung vị lấy đúng cột SD0, không lấy trung bình hai giới hạn. Vùng −2 đến +2 SD là tham chiếu thống kê, không phải chẩn đoán. Chiều dài nằm 0–24 tháng và chiều cao đứng 24–60 tháng được giữ thành hai chuỗi; không kéo dài bảng ra ngoài 60 tháng. Tuổi tháng trên đồ thị quy đổi từ số ngày/30,4375. Trẻ sinh non cần được bác sĩ hướng dẫn hiệu chỉnh tuổi.

Thai nhi giữ 33 mốc tuần 8–40 từ dữ liệu Bé của mẹ 1.2.21, ghi rõ là **dữ liệu cũ chưa thẩm định y khoa**. Không tái tạo dải “±20% bình thường” do logic app cũ tự tính. Chiều dài đổi cách biểu diễn giữa tuần 20 và 21 nên không nối liền hai chuỗi. Không được hiểu đó là chiều dài xương đùi. Chưa có bảng vòng đầu thai nhi: chỉ hiển thị số đo đã nhập, không tự dựng chuẩn.

## Đối chiếu app Bé của mẹ

Đã phân tích tĩnh IPA người dùng cung cấp với skill security-research; không chạy IPA và không thay đổi tệp gốc. Dấu vết ở `src/data/legacy/handbook-audit.json`:

- SHA-256 IPA: `8afe889f97b5078cb85fa9744a8962c99bb2f0e55c81f6c68a6bf80fba930d06`.
- Module 1856–1860: ba tab, lưới ba cột, icon cỡ 60 và nguồn icon chuyên mục từ máy chủ.
- Icon số đo lấy trực tiếp từ IPA. **18 icon Cẩm nang không nằm trong IPA**: tải một lần từ URL công khai mà app gốc dùng, lưu PNG/base64 và mã băm; app An Nam không gọi API Bé của mẹ để tải icon khi sử dụng.
- Thân bài Cẩm nang gốc do máy chủ cung cấp, không có đầy đủ trong IPA. Bản này giữ các nội dung đã có (92 bài thai kỳ, bài chăm bé, lịch khám, E.A.S.Y, tiêm phòng, mốc tuần) và xếp lại; một số chuyên mục gốc còn trống. Không tuyên bố đã có toàn bộ kho bài gốc.
- Icon/bài có nguồn Bé của mẹ/Flo vẫn thuộc chủ sở hữu tương ứng. Không coi việc trích xuất là cấp phép phát hành thương mại.

## Tuyển tập Thai giáo

Đây là lựa chọn đọc/nghe thư giãn, **không phải xếp hạng “hay nhất” có căn cứ y khoa**, không hứa hẹn tăng trí thông minh của thai nhi. Nghe vừa phải bằng loa, không đặt nguồn âm sát bụng; xem [hướng dẫn tiếng ồn khi mang thai của CDC/NIOSH](https://www.cdc.gov/niosh/reproductive-health/prevention/noise.html).

Thơ được đối chiếu từ [Ca dao Việt Nam](https://vi.wikiquote.org/wiki/Ca_dao_Việt_Nam) và nguyên tác [Sing-Song — Christina Rossetti, 1893](https://www.gutenberg.org/ebooks/76703). Bản dịch Việt mới nằm trong `src/data/education/poems.ts`; không sao chép bản dịch hiện đại có bản quyền. Các bài có nội dung mất mát, bạo lực hoặc lời khuyên chăm trẻ lỗi thời không được chọn.

Nhạc đóng gói AAC 96 kb/s (~28 MB tổng), đủ toàn bản/chương được ghi tên, không cắt. Manifest `src/data/education/music.json` lưu nguồn tải thực tế, nguồn ghi công, giấy phép, thời lượng, SHA-256 bản gốc và bản chuyển đổi. Mỗi file được kiểm tra trước khi phát hành:

| Tác phẩm                      | Bản thu                                           | Giấy phép bản thu |
| ----------------------------- | ------------------------------------------------- | ----------------- |
| Clair de lune                 | Laurens Goedhart                                  | CC BY 3.0         |
| Gymnopédie No. 1              | Kevin MacLeod                                     | CC BY 3.0         |
| Gymnopédie No. 2              | Kevin MacLeod                                     | CC BY 3.0         |
| Nocturne Op. 9 No. 2          | Bộ sưu tập Musopen; nguồn không ghi rõ người chơi | CC0 1.0           |
| Träumerei                     | Donald Betts / Musopen                            | Public domain     |
| Air, Suite No. 3              | US Air Force Band                                 | Public domain     |
| Goldberg Variations — Aria    | Kimiko Ishizaka                                   | CC0 1.0           |
| Moonlight Sonata — I          | Paul Pitman / Musopen                             | Public domain     |
| Canon in D, chuyển soạn piano | Lee Galloway                                      | CC BY-SA 3.0      |
| Prelude BWV 846               | Kimiko Ishizaka                                   | CC0 1.0           |

Riêng `assets/education/canon.m4a` và bản chuyển đổi của nó giữ [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), ghi công [Lee Galloway](https://www.leegalloway.com/), [nguồn bản thu](https://commons.wikimedia.org/wiki/File:Pachelbel%27s_Canon.ogg). Tệp âm thanh này không chịu một giấy phép phần mềm hạn chế hơn. Các tệp CC BY 3.0 được ghi công cùng liên kết giấy phép trong manifest và giao diện. Không suy ra giấy phép bản thu chỉ từ việc nhạc sĩ cổ điển đã mất.

## Kiểm tra trước phát hành

```bash
npm run typecheck
npm test
# Có playwright-core/chromium và preview local-only ở localhost:8095:
NODE_PATH=/tmp/an-nam-ui-tools/node_modules node scripts/ui_growth_education.cjs
```

Đã kiểm tra trên bản web tách biệt, chặn mạng ngoài localhost: biểu đồ không số đo, bảng chuẩn, ba tab Cẩm nang, tìm/mở thơ, nghe/tạm dừng tệp cục bộ và bố cục 320–390 px. Đã xuất thành công bundle iOS có đủ mười tệp M4A. Workflow IPA kiểm tra lại SHA-256 của cả mười bản nhạc **trong IPA thực tế**.

Cần thử trên iPhone: chất lượng âm thanh, chế độ im lặng/ngắt cuộc gọi, điều hướng khi đang phát, hẹn dừng, nhập số đo và bàn phím. Kiểm thử web không thay thế kiểm tra iOS thật.
