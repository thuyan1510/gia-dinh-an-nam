// Linguistic corrections against the supplied English, NOT clinical validation.
const titles = [
  "Thụ tinh và làm tổ",
  "Chậm kinh, ngực căng đau và những thay đổi khác",
  "Mệt mỏi và thay đổi cảm giác",
  "Thay đổi ở núm vú và mệt mỏi",
  "Thay đổi ở ngực, buồn nôn và những thay đổi khác",
  "Tiểu thường xuyên, nôn và buồn nôn",
  "Thay đổi ở tóc, đầy hơi và những thay đổi khác",
  "Tĩnh mạch rõ hơn và mụn",
  "Thay đổi ở da và táo bón",
  "Bụng bầu và tâm trạng thất thường",
  "Thay đổi ở nướu và hết buồn nôn?",
  "Tăng nhu cầu tình dục và mất ngủ",
  "Tăng tiết dịch và tăng cân",
  "Thay đổi cảm giác thèm ăn và táo bón",
  "Thay đổi dây chằng và ợ nóng",
  "Có thể cảm nhận bé cử động và mất ngủ",
  "Đau dây chằng tròn và đường sẫm màu trên bụng",
  "Thay đổi giấc ngủ và tăng tiết dịch",
  "Thay đổi khả năng giữ thăng bằng và đau lưng",
  "Thay đổi ở da và nhu cầu tình dục",
  "Ngực tiết sữa non và táo bón",
  "Đau lưng và mất ngủ",
  "Sưng phù và hội chứng chân không yên",
  "Chuột rút chân và thôi thúc chuẩn bị đón bé",
  "Đầy hơi và thay đổi ở rốn",
  "Thay đổi ở da, mệt mỏi và những thay đổi khác",
  "Cảm thấy nóng hơn và có thể giãn tĩnh mạch",
  "Tiểu nhiều hơn và sưng bàn chân",
  "Đau lưng và cơn gò sinh lý",
  "Đau vùng đai chậu và tiểu nhiều",
  "Thay đổi mức năng lượng và đau hông",
  "Thay đổi ở ngực và táo bón",
  "Tiết dịch ở núm vú và ợ nóng",
  "Thay đổi tư thế và đau lưng",
  "Thay đổi bụng bầu và có thể có cơn gò",
  "Tăng tiết dịch và nút nhầy cổ tử cung",
  "Có thể vỡ ối và xuất hiện cơn gò",
  "Có thể khó ngủ và xuất hiện cơn gò",
  "Nhận biết dấu hiệu chuyển dạ",
  "Dấu hiệu chuyển dạ và khả năng khởi phát chuyển dạ",
];
const insideTitles = {
  "15_5371": "Khi nào phôi chuyển sang giai đoạn thai nhi?",
  "15_5351": "Não bộ của thai nhi phát triển khi nào?",
  "15_5361": "Những dưỡng chất hỗ trợ sự phát triển não bộ của bé",
  "15_3061": "Vai trò của nhau thai và cách chăm sóc sức khỏe nhau thai",
  "15_4201": "Những điều cần biết về dây rốn",
  "15_4221": "Nước ối là gì và vì sao quan trọng?",
  "15_3071": "Vị trí nhau thai có ý nghĩa gì?",
  "15_3081": "Tìm hiểu các vị trí bám của nhau thai",
  "15_3401": "Khi nào có thể nghe thấy nhịp tim của bé lần đầu?",
};
const replacements = {
  "15_600_v21": [
    ["Cảnh báo về spoiler:", "Nói trước một chút:"],
    [
      "Tuổi thai và tuổi thai thực sự là những thứ khác nhau. Tuổi thai của bạn - hoặc bạn đã mang thai được bao lâu - được tính từ ngày đầu tiên của kỳ kinh cuối cùng, trong khi tuổi thai hoặc tuổi thụ thai là tuổi thực tế của con bạn.",
      "Tuổi thai tính theo kỳ kinh (gestational age) khác với tuổi tính từ lúc thụ tinh (fetal/conceptional age). Tuổi thai được tính từ ngày đầu kỳ kinh cuối; còn tuổi tính từ lúc thụ tinh phản ánh thời gian phát triển thực tế của phôi hoặc thai nhi.",
    ],
    ["Chúng tôi nghe thấy bạn.", "Điều đó có thể khiến bạn bối rối."],
    [
      "đang chuẩn bị rụng trứng và rụng trứng",
      "đang chuẩn bị và giải phóng một trứng",
    ],
    ["tự cấy vào tử cung", "làm tổ trong tử cung"],
    ["niên đại của thai kỳ", "tuổi thai"],
  ],
  "15_601_v21": [
    ["__Lỡ kinh__", "__Chậm kinh__"],
    ["Ngực mềm", "Ngực căng đau"],
    ["ngực mềm", "ngực căng đau"],
    ["thành tử cung dày lên", "niêm mạc tử cung dày lên"],
    ["tự cấy vào tử cung", "làm tổ trong tử cung"],
  ],
  "15_008_v21": [
    ["sưng tấy, mềm hoặc nhạy cảm", "căng, đau khi chạm hoặc nhạy cảm"],
    ["ngực bạn mềm mại", "ngực bạn căng đau"],
  ],
  "15_010_v21": [["cảm thấy mềm và đau", "nhạy cảm khi chạm và đau nhức"]],
  "15_016_v21": [["Gân mạch hiện rõ hơn", "Tĩnh mạch hiện rõ hơn"]],
  "15_022_v21": [
    ["kẹo cao su", "nướu"],
    ["lòng trắng như ngọc của bạn", "bề mặt răng"],
  ],
  "15_034_v21": [
    ["Đường nhăn", "Đường sẫm màu trên bụng"],
    ["đường nhăn", "đường sẫm màu trên bụng"],
    ["Chịu đựng chúng tôi ở đây.", "Hãy cùng tìm hiểu."],
    ["đang lắc lư một chút", "chỉ có bụng hơi nhô lên"],
  ],
  "15_038_v21": [
    ["Thay đổi số dư của bạn", "Thay đổi khả năng giữ thăng bằng"],
    ["Các bài tập cốt lõi", "Các bài tập nhóm cơ trung tâm"],
  ],
  "15_042_v21": [["Rò rỉ vú", "Ngực tiết sữa non"]],
  "15_048_v21": [
    ["__Làm tổ__", "__Thôi thúc chuẩn bị tổ ấm đón bé__"],
    ["thông tin về vườn ươm", "ý tưởng trang trí phòng cho bé"],
    ["bản năng làm tổ", "bản năng chuẩn bị tổ ấm đón bé"],
  ],
  "15_052_v21": [
    ["Đã đến lúc đếm số lần đá", "Tìm hiểu cử động của bé"],
    ["số cú đá", "cử động của bé"],
  ],
  "15_070_v21": [["__Thay đổi lớn__", "__Thay đổi ở bụng bầu__"]],
  "15_074_v21": [["__Nước của bạn có thể bị vỡ__", "__Bạn có thể vỡ ối__"]],
  "15_604_v21": [
    ["__Bạn có thể bị xúi giục__", "__Bạn có thể được khởi phát chuyển dạ__"],
    ["đề nghị kích thích bạn", "đề nghị khởi phát chuyển dạ cho bạn"],
    ["trước khi bạn được kích thích", "trước khi khởi phát chuyển dạ"],
    ["Gây chuyển dạ", "Khởi phát chuyển dạ"],
    ["Oxytocin tiêm tĩnh mạch (IV) nhỏ giọt", "Truyền oxytocin tĩnh mạch (IV)"],
    ["tăng sản xuất tuyến tiền liệt", "tăng sản xuất prostaglandin"],
    [
      "tiêm thuốc gọi là prostaglandin vào âm đạo hoặc miệng của bạn",
      "dùng thuốc prostaglandin qua đường âm đạo hoặc đường uống",
    ],
    ["Quét màng ối", "Tách màng ối"],
    ["quét màng ối", "tách màng ối"],
    ["việc “quét”", "việc “tách màng ối”"],
  ],
  "15_5351": [
    ["Học kỳ thứ ba", "Tam cá nguyệt thứ ba"],
    ["các khớp thần kinh", "các khớp nối thần kinh (synap)"],
  ],
  "15_3071": [
    ["Vị trí cơ bản", "Vị trí đáy tử cung"],
    ["Vị trí nằm nghiêng", "Vị trí thành bên tử cung"],
    ["phần trên (cơ bản)", "phần trên (đáy tử cung)"],
    ["Ngoài cột tế bào bên trong", "Ngoài khối tế bào bên trong"],
    ["quét giải phẫu", "siêu âm hình thái"],
    ["một lần quét khác", "một lần siêu âm khác"],
  ],
  "15_3081": [
    ["Vị trí cơ bản", "Vị trí đáy tử cung"],
    ["Vị trí nằm nghiêng", "Vị trí thành bên tử cung"],
    ["Nhau thai cơ bản", "Nhau thai bám đáy tử cung"],
    ["nhau thai cơ bản", "nhau thai bám đáy tử cung"],
    [
      "định vị cơ bản-trước hoặc cơ bản-sau",
      "bám đáy–mặt trước hoặc đáy–mặt sau",
    ],
    ["Bánh nhau thai phía trước", "Nhau thai bám đáy–mặt trước"],
    ["Bánh nhau thai sau", "Nhau thai bám đáy–mặt sau"],
    [
      "quét hoặc sàng lọc các điểm bất thường",
      "siêu âm hình thái hoặc sàng lọc bất thường",
    ],
  ],
  "15_3401": [
    [
      "sự khác biệt đáng kể giữa tuổi thai và tuổi thai.",
      "sự khác biệt giữa tuổi thai tính theo kỳ kinh và tuổi tính từ lúc thụ tinh.",
    ],
    [
      "– Tuổi thai: Ngoài ra, tuổi thai được xác định bằng ngày dự kiến ​​thụ thai và ngắn hơn tuổi thai khoảng hai tuần.",
      "– Tuổi tính từ lúc thụ tinh: Được tính từ ngày ước tính thụ thai và thường ít hơn tuổi thai tính theo kỳ kinh khoảng hai tuần.",
    ],
    ["máy soi thai nhi", "ống nghe tim thai"],
    [
      "Ống nghe thai nhi hoặc ống nghe thai nhi",
      "Ống nghe tim thai (fetoscope hoặc stethoscope)",
    ],
  ],
};
const bumpArticles = [
  "15_024_v21",
  "15_026_v21",
  "15_034_v21",
  "15_036_v21",
  "15_038_v21",
  "15_052_v21",
  "15_056_v21",
  "15_074_v21",
  "15_076_v21",
  "15_602_v21",
  "15_604_v21",
];
function correctArticle(article) {
  if (!article.original) return article;
  if (article.section === "body")
    article.title = `Tuần ${article.week}: ${titles[article.week - 3]}`;
  else if (insideTitles[article.id]) article.title = insideTitles[article.id];
  let body = article.body;
  for (const [from, to] of replacements[article.id] || [])
    body = body.split(from).join(to);
  if (bumpArticles.includes(article.id))
    body = body.replace(/vết sưng tấy|vết sưng/g, "bụng bầu");
  body = body
    .replace(/Chảy máu cấy ghép/g, "Chảy máu khi làm tổ")
    .replace(/chảy máu cấy ghép/g, "chảy máu khi làm tổ")
    .replace(/sau khi cấy ghép/g, "sau khi làm tổ");
  article.body = body;
  article.translation = "machine-vi-terminology-edited-not-medically-reviewed";
  return article;
}
module.exports = { correctArticle };
