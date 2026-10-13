export type Poem = {
  id: string;
  title: string;
  author: string;
  category: string;
  text: string;
  original?: string;
  source: string;
  license: string;
  translation?: string;
};
// Traditional Vietnamese verses; spelling follows the linked collection.
// No modern copyrighted poetry or third-party Vietnamese translations included.
const folk: [string, string, string][] = [
  [
    "Công cha, nghĩa mẹ",
    "Gia đình",
    `Công cha như núi Thái Sơn,
Nghĩa mẹ như nước trong nguồn chảy ra.
Một lòng thờ mẹ kính cha,
Cho tròn chữ hiếu mới là đạo con.`,
  ],
  [
    "Anh em một nhà",
    "Gia đình",
    `Anh em nào phải người xa,
Cùng chung bác mẹ, một nhà cùng thân.
Yêu nhau như thể tay chân,
Anh em hòa thuận, hai thân vui vầy.`,
  ],
  [
    "Buồng cau gửi mẹ",
    "Gia đình",
    `Ai về tôi gửi buồng cau,
Buồng trước kính mẹ, buồng sau kính thầy.`,
  ],
  [
    "Bát cơm đầy",
    "Yêu thương",
    `Ai ơi bưng bát cơm đầy,
Dẻo thơm một hạt, đắng cay muôn phần.`,
  ],
  [
    "Nhớ quê nhà",
    "Quê hương",
    `Anh đi anh nhớ quê nhà,
Nhớ canh rau muống, nhớ cà dầm tương.
Nhớ ai dãi nắng dầm sương,
Nhớ ai tát nước bên đường hôm nao.`,
  ],
  [
    "Vững như kiềng",
    "Yêu thương",
    `Dù ai nói ngả nói nghiêng,
Lòng ta vẫn vững như kiềng ba chân.`,
  ],
  [
    "Thương nhau cùng",
    "Yêu thương",
    `Nhiễu điều phủ lấy giá gương,
Người trong một nước phải thương nhau cùng.`,
  ],
  [
    "Hoa sen",
    "Thiên nhiên",
    `Trong đầm gì đẹp bằng sen,
Lá xanh bông trắng lại chen nhị vàng.
Nhị vàng bông trắng lá xanh,
Gần bùn mà chẳng hôi tanh mùi bùn.`,
  ],
  [
    "Đường vô xứ Nghệ",
    "Quê hương",
    `Đường vô xứ Nghệ quanh quanh,
Non xanh nước biếc như tranh họa đồ.
Ai vô xứ Nghệ thì vô!`,
  ],
  [
    "Mặt gương Tây Hồ",
    "Quê hương",
    `Gió đưa cành trúc la đà,
Tiếng chuông Trấn Vũ, canh gà Thọ Xương.
Mịt mù khói tỏa ngàn sương,
Nhịp chày Yên Thái mặt gương Tây Hồ.`,
  ],
];
// Original poems: Christina Rossetti, Sing-Song (1893 edition), public domain.
// Newly translated here, not borrowed from an existing Vietnamese translation.
// Titles are Vietnamese reading titles; original first lines identify each poem.
const translated: [string, string, string, string][] = [
  [
    "Mẹ yêu con",
    "Gia đình",
    "Love me,—I love you",
    `Yêu mẹ nhé — mẹ yêu con,
Yêu mẹ nhé, em bé nhỏ.
Hát cao lên, hát khẽ thôi,
Cứ hát theo điều con ngỏ.

Vòng tay mẹ nâng con,
Mắt mẹ hiền trông xuống.
Hát cao lên, hát khẽ thôi,
Yêu mẹ nhé — mẹ yêu con.`,
  ],
  [
    "Gà gọi ngày lên",
    "Thiên nhiên",
    "“Kookoorookoo! kookoorookoo!”",
    `Ò ó o! Ò ó o!
Gà gáy trước bình minh.
Í i i! Í i i!
Phía đông hồng vừa nở.

Ò ó o! Ò ó o!
Chim sớm cất lời ca.
Í i i! Í i i!
Ngày mới đang hiện ra.`,
  ],
  [
    "Bác đưa thư",
    "Vui chơi",
    "Eight o’clock",
    `Tám giờ rồi,
Tiếng gõ cửa!
Năm lá thư gửi cho cha;
Một cho Lou,
Chưa có thư của bé,
Ba lá dành mẹ yêu nhà ta.`,
  ],
  [
    "Một mẩu bánh cho chim",
    "Yêu thương",
    "Bread and milk for breakfast",
    `Bánh và sữa trong bữa sáng,
Áo len ấm để mặc vào.
Và một mẩu bánh cho chim cổ đỏ,
Trong những ngày đông lạnh biết bao.`,
  ],
  [
    "Em bé nhỏ nhất",
    "Gia đình",
    "Your brother has a falcon",
    `Anh con có chim ưng,
Chị con có bông hoa.
Còn phần nào cho bé
Vừa mới đến nhà ta?

Mẹ bế con trên gối,
Con trai nhỏ của mẹ.
Mẹ ru con trong tay,
Em bé nhỏ, bé ơi.`,
  ],
  [
    "Nàng thủy tiên",
    "Thiên nhiên",
    "Growing in the vale",
    `Trong thung lũng xanh,
Bên đồi cao đứng,
Mảnh mai, vươn thẳng,
Nàng hoa thủy tiên.

Đội vương miện vàng,
Khoác áo xanh mỏng,
Mặc gió xuân lạnh,
Nàng hoa dịu dàng,
Thủy tiên yêu mến.`,
  ],
  [
    "Chim trong hàng giậu",
    "Thiên nhiên",
    "Wrens and robins in the hedge",
    `Hồng tước, chim cổ đỏ trong hàng giậu,
Chỗ này, chỗ nọ rộn vui.
Làm tổ, đậu cành, mổ hạt, vỗ cánh,
Khắp mọi nơi!`,
  ],
  [
    "Những nụ hôn của bé",
    "Gia đình",
    "My baby has a mottled fist",
    `Bàn tay bé hồng loang xinh xắn,
Cổ bé có những nếp tròn yêu.
Bé hôn mẹ, rồi được mẹ hôn lại,
Sinh ra để nhận biết bao thương chiều.`,
  ],
  [
    "Cầu vồng cần mưa nắng",
    "Thiên nhiên",
    "If all were rain and never sun",
    `Nếu chỉ mưa mà chẳng có nắng,
Đâu cầu vồng bắc ngang đồi?
Nếu chỉ nắng mà không hề mưa xuống,
Cầu vồng cũng chẳng hiện lên thôi.`,
  ],
  [
    "Gió mang hương hoa",
    "Thiên nhiên",
    "O wind, where have you been",
    `Gió ơi, vừa đi đâu,
Mà hương thơm đến thế?
Qua những khóm violet,
Nở bên chân bạn đấy.

Kim ngân còn đợi hạ,
Đợi nắng ấm quay về.
Violet trong xuân lạnh,
Đã làm thơm cỏ quê.`,
  ],
  [
    "Đàn cừu trên cỏ",
    "Thiên nhiên",
    "On the grassy banks",
    `Trên bờ cỏ xanh rì,
Cừu non đùa tinh nghịch.
Chị em đều áo bông,
Nhảy tung đôi chân nhỏ.
Những mẹ cừu đứng ngó,
Cất tiếng gọi bên con.`,
  ],
  [
    "Hoa rồi thành quả",
    "Thiên nhiên",
    "Rushes in a watery place",
    `Cói mọc nơi bờ nước,
Lau ở chỗ đất trũng sâu.
Sơn ca bay cao tít,
Én liệng nhanh trên đầu.
Chỗ hoa nhạt màu từng nở,
Quả chín sẽ về sau.`,
  ],
  [
    "Một tháng Năm",
    "Thiên nhiên",
    "There is but one May in the year",
    `Mỗi năm chỉ một tháng Năm,
Đôi khi tháng Năm mưa lạnh.
Mỗi năm chỉ một tháng Năm,
Trước khi năm già đi nhanh.

Dẫu là tháng Năm lạnh nhất,
Ít nắng, mưa cứ rơi hoài,
Gió sương cùng đêm và ngày,
Vẫn nuôi hoa nở khắp nơi.`,
  ],
  [
    "Cây sồi và chiếc nấm",
    "Thiên nhiên",
    "A toadstool comes up in a night",
    `Một đêm là nấm nhô lên,
Bé ơi, nhớ điều giản dị:
Cây sồi lớn suốt trăm năm,
Và trở thành cây sồi vĩ đại.`,
  ],
  [
    "Từng mũi chỉ nhỏ",
    "Vui chơi",
    "A pocket handkerchief to hem",
    `Khăn tay cần khâu viền,
Ôi chao, sao nhiều thế!
Bao nhiêu mũi chỉ đây,
Mới xong khăn hở bé?

Một mũi rồi một mũi,
Lại khâu, cứ khâu thôi.
Từng mũi xong đường viền,
Làm xong, mình đi chơi!`,
  ],
  [
    "Chú heo đội tóc giả",
    "Vui chơi",
    "If a pig wore a wig",
    `Nếu heo đội tóc giả,
Mình sẽ nói gì đây?
Chào như chào quý ông:
“Chúc một ngày tốt lành!”
Nếu đuôi heo hỏng mất,
Mình giúp bằng cách nào?
Mời heo sang cô thợ,
May đuôi mới thật mau.`,
  ],
  [
    "Những sắc màu",
    "Thiên nhiên",
    "What is pink? a rose is pink",
    `Màu hồng ở đâu? Hoa hồng đó,
Ngay bên bờ vòi nước trong.
Màu đỏ ở đâu? Hoa anh túc,
Giữa ruộng đại mạch mênh mông.
Màu xanh ở đâu? Trên trời biếc,
Nơi những đám mây trôi qua.
Màu trắng ở đâu? Thiên nga trắng,
Bơi trong ánh sáng chan hòa.
Màu vàng ở đâu? Trái lê chín,
Mọng ngon, mềm dịu biết bao.
Màu xanh lá? Cỏ xanh đấy,
Hoa li ti nở xen vào.
Màu tím ở đâu? Mây tím,
Trong chiều mùa hạ dần buông.
Màu cam ở đâu? Quả cam đó,
Một quả cam thôi, thật thường!`,
  ],
  [
    "Quả anh đào cho cả nhà",
    "Gia đình",
    "Mother shake the cherry-tree",
    `Mẹ rung cây anh đào,
Susan đón quả chín.
Ôi vui biết nhường nào,
Cùng vui lên bạn nhé!
Một cho anh, một cho chị,
Hai quả nữa cho mẹ thôi.
Sáu cho cha vừa nóng vừa mệt,
Đang gõ cửa về nhà rồi.`,
  ],
  [
    "Bạn ếch, bạn cóc",
    "Yêu thương",
    "Hopping frog, hop here and be seen",
    `Ếch nhảy ơi, nhảy ra cho mình ngắm,
Mình chẳng ném que, chẳng ném đá đâu.
Mũ bạn viền xinh, áo xanh lá thắm,
Tạm biệt nhé, mình chẳng quấy nhau.

Cóc chậm ơi, đi ra cho mình ngó,
Dẫu có người chỉ trỏ chê bai.
Bạn xù xì nhưng hiền lành đó,
Bạn không hại mình, mình không hại ai.`,
  ],
  [
    "Sao trên nền cỏ",
    "Thiên nhiên",
    "Where innocent bright-eyed daisies are",
    `Nơi cúc nhỏ mắt trong sáng mọc,
Lá cỏ chen giữa những cánh xinh,
Mỗi bông cúc đứng như ngôi sao nhỏ,
Trên bầu trời cỏ xanh của mình.`,
  ],
  [
    "Ba chiếc bánh mận",
    "Yêu thương",
    "Three plum buns",
    `Ba chiếc bánh mận,
Ăn bên lối qua rào.
Trong đồng cỏ ba lá,
Sau dặm đường đã qua.

Một cho bạn, một cho mình,
Còn một chiếc bánh thơm.
Tặng cậu bé đang gọi lớn,
Xua cừu khỏi luống cỏ non.`,
  ],
  [
    "Chiếc ô của cá",
    "Vui chơi",
    "When fishes set umbrellas up",
    `Nếu cá biết giương ô,
Mỗi lần mưa rơi xuống,
Thằn lằn hẳn muốn dù,
Để che mình khỏi nắng.`,
  ],
  [
    "Mèo con, cún con",
    "Yêu thương",
    "Pussy has a whiskered face",
    `Mặt mèo con có hàng ria nhỏ,
Dáng mèo xinh, cử chỉ đáng yêu.
Cún chạy đến mỗi khi mình gọi,
Cả nhà được cún thương thật nhiều.`,
  ],
  [
    "Cả nhà bên nhau",
    "Gia đình",
    "The dog lies in his kennel",
    `Cún nằm trong nhà nhỏ,
Mèo rù rì trên thảm êm.
Bé ngồi trên đầu gối,
Cho mẹ ôm yêu thêm.

Vuốt cún, xoa mèo nhỏ,
Mỗi bạn một chút vui.
Ôm hôn em bé của mẹ,
Bé hôn mẹ lại thôi.`,
  ],
  [
    "Cừu và em bé",
    "Vui chơi",
    "A frisky lamb",
    `Một cừu non vui vẻ,
Một em bé tinh nghịch,
Cùng nhau chơi ríu rít,
Giữa đồng hoa anh thảo.
Trời xanh cao biết bao,
Không khí êm dịu quá.
Nắng ngập đầy đồng cỏ,
Lối nhỏ nửa râm mát.`,
  ],
  [
    "Làm bánh kếp",
    "Vui chơi",
    "Mix a pancake",
    `Trộn bột bánh kếp,
Khuấy bột đều tay,
Cho vào chảo nóng.
Rán bánh vàng ngay,
Tung chiếc bánh lên —
Đỡ xem tài ai!`,
  ],
  [
    "Hẹn én ngày hè",
    "Thiên nhiên",
    "Fly away, fly away over the sea",
    `Bay đi, bay qua biển đi,
Én yêu nắng, mùa hè đã hết.
Quay về, quay về với mình nhé,
Mang mùa hè, mang nắng đến đây.`,
  ],
  [
    "Dưới cánh mẹ gà",
    "Gia đình",
    "A white hen sitting",
    `Mẹ gà trắng đang ấp,
Ba quả trứng trắng ngần.
Rồi ba chú gà đốm,
Tròn trịa, xinh vô ngần.

Cú mèo, diều hâu đến,
Cả dơi cũng ghé xem.
Gà con dưới cánh mẹ,
Bình yên và ấm êm.`,
  ],
  [
    "Vườn quả của Ned",
    "Thiên nhiên",
    "Currants on a bush",
    `Lý chua mọc trên bụi,
Quả vả mọc trên cành.
Anh đào cong nhánh xuống,
Ned hái quả ngon lành.`,
  ],
  [
    "Ngày vui ở đồng quê",
    "Thiên nhiên",
    "When the cows come home the milk is coming",
    `Bò về nhà mang theo dòng sữa,
Ong vo ve làm mật thơm vàng.
Vịt trống, mái bên hồ đầy cói,
Hươu yên bình giữa bụi gió mang.
Thỏ con nhút nhát mà nhanh nhẹn,
Ngồi trong nắng, mũi khẽ rung rung.`,
  ],
  [
    "Ai đã thấy gió?",
    "Thiên nhiên",
    "Who has seen the wind?",
    `Ai đã từng nhìn thấy gió?
Chẳng phải tôi, cũng chẳng phải bạn đâu.
Nhưng khi lá trên cành rung rinh nhẹ,
Là gió đang đi qua phía trên đầu.

Ai đã từng nhìn thấy gió?
Chẳng phải bạn, cũng chẳng phải tôi đâu.
Nhưng khi cây cúi nghiêng đầu xuống,
Là gió vừa ghé ngang qua mau.`,
  ],
  [
    "Chiếc cầu vồng",
    "Thiên nhiên",
    "Boats sail on the rivers",
    `Thuyền trôi trên dòng sông,
Tàu đi trên biển rộng.
Mây trôi giữa trời trong,
Còn đẹp hơn biết mấy.

Có những cầu qua sông,
Đẹp đến ai cũng thích.
Nhưng cầu vồng ngang trời,
Vượt trên ngọn cây xanh,
Bắc đường từ đất lên mây,
Còn đẹp hơn hết thảy.`,
  ],
  [
    "Đừng làm đau bạn nhỏ",
    "Yêu thương",
    "Hurt no living thing",
    `Đừng làm đau sinh vật nào:
Bọ rùa hay bướm cánh chao,
Bướm đêm cánh phủ bụi phấn,
Dế hát vui bên bờ rào,
Châu chấu nhẹ chân bật nhảy,
Muỗi nhảy múa, bọ tròn nào,
Cả giun hiền bò dưới đất.`,
  ],
  [
    "Thăm bà trong ngõ",
    "Yêu thương",
    "The dear old woman in the lane",
    `Bà hiền trong ngõ hôm nay đau mỏi,
Ốm nên người nhức khắp nơi.
Chiều nay chúng mình sang thăm bà nhé,
Mang trà, trứng, bánh đến chơi.

Ở lại đun cho ấm nước sôi,
Pha trà rồi bày khay nhỏ.
Chần trứng, nướng bánh thơm lên,
Giúp xoay ghế bà nếu bà muốn đó.`,
  ],
  [
    "Ngôi nhà bằng lá bài",
    "Vui chơi",
    "A house of cards",
    `Ngôi nhà bằng lá bài,
Gọn gàng và bé xíu.
Lắc chiếc bàn một cái,
Nhà sẽ đổ mất thôi.

Tìm quân bài hình người,
Từng quân, từng quân một.
Dựng nhà rồi lợp mái —
Thế là xong nhà rồi.
Lắc chiếc bàn đi nhé!
Vui là ở đó thôi.`,
  ],
  [
    "Cây anh đào đẹp quá",
    "Thiên nhiên",
    "Oh, fair to see",
    `Ôi, đẹp quá làm sao,
Cây anh đào đầy hoa,
Áo trắng bừng trong nắng,
Niềm vui ngày tháng Tư,
Ôi, đẹp quá làm sao!

Ôi, đẹp quá làm sao,
Cây anh đào trĩu quả,
Những quả tròn đỏ bóng,
Cài trên đầu lá xanh,
Ôi, đẹp quá làm sao!`,
  ],
  [
    "Quả đào dành cho bà",
    "Gia đình",
    "The peach tree on the southern wall",
    `Cây đào bên bức tường hướng nam,
Đã tắm trong nắng lâu thật lâu.
Hai chục trái đào to nhỏ,
Trái nào cũng ửng hồng màu.

Cho các anh, mỗi người một trái,
Một cho bạn, một cho mình mà.
Nhưng trái lớn nhất, hồng nhất, mượt nhất,
Dành bên chén trà của bà.`,
  ],
  [
    "Trăng có mệt không?",
    "Thiên nhiên",
    "Is the moon tired? she looks so pale",
    `Trăng có mệt không, trông nhợt quá,
Trong chiếc khăn sương mỏng mơ màng?
Trăng leo từ đông sang phía tây,
Chẳng nghỉ một lần trên đường ngang.

Trước khi đêm đến ngoài kia,
Trăng trắng như tờ giấy nhỏ.
Trước lúc ngày mới bừng lên,
Trăng lại nhạt dần, khuất đó.`,
  ],
  [
    "Em bé tôi biết",
    "Gia đình",
    "I know a baby, such a baby",
    `Tôi biết một em bé, một em bé,
Mắt xanh tròn, má hồng tươi.
Khuỷu tay đầy lúm nhỏ,
Cổ tay nếp xinh vui.

“Ôm yêu con, ôm yêu con nhé”,
Miệng hồng san hô ríu rít lời.
Ôi đầu tròn và đôi môi ngọt,
Mắt buồn ngủ chớp, dễ thương ơi!`,
  ],
  [
    "Ru con trong đêm",
    "Gia đình",
    "Lullaby, oh, lullaby!",
    `À ơi, à ơi!
Hoa khép cánh, cừu non ngủ rồi.
À ơi, à ơi!
Sao đã lên, trăng đang nhìn tới.
À ơi, à ơi!
Bầy chim cũng lặng yên tiếng nói.
À ơi, à ơi!
Ngủ đi, bé yêu, giấc nồng đang đợi,
À ơi, à ơi!`,
  ],
];
export const poems: Poem[] = [
  ...folk.map(([title, category, text], i) => ({
    id: `ca-dao-${i + 1}`,
    title,
    category,
    text,
    author: "Ca dao Việt Nam · truyền miệng",
    source: "https://vi.wikiquote.org/wiki/Ca_dao_Việt_Nam",
    license: "Văn học dân gian; tên bài do An Nam đặt để tra cứu.",
  })),
  ...translated.map(([title, category, original, text], i) => ({
    id: `rossetti-${i + 1}`,
    title,
    category,
    text,
    original,
    author: "Christina Rossetti (1830–1894)",
    source: "https://www.gutenberg.org/ebooks/76703",
    license: "Nguyên tác Sing-Song (1893) thuộc phạm vi công cộng.",
    translation:
      "Bản dịch mới của Gia Đình An Nam; không phải bản dịch xuất bản.",
  })),
];
export const poemCategories = [
  "Tất cả",
  "Gia đình",
  "Thiên nhiên",
  "Yêu thương",
  "Vui chơi",
  "Quê hương",
];
