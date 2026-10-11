// Pregnancy-mode categories inspected in Flo 10.8.0's bundled picker.
// Labels are recording choices, never diagnoses or recommendations.
export const pregnancyDiaryGroups = [
  {
    id: "mood",
    title: "Tâm trạng",
    icon: "happy-outline",
    options: [
      "Bình tĩnh",
      "Vui vẻ",
      "Đầy năng lượng",
      "Phấn chấn",
      "Thất thường",
      "Bực bội",
      "Buồn",
      "Lo lắng",
      "Chán nản",
      "Cảm thấy có lỗi",
      "Suy nghĩ lặp lại",
      "Ít năng lượng",
      "Lãnh đạm",
      "Bối rối",
      "Tự trách mình",
    ],
  },
  {
    id: "symptoms",
    title: "Triệu chứng",
    icon: "medical-outline",
    options: [
      "Mọi thứ đều ổn",
      "Đau kéo căng",
      "Ngực căng đau",
      "Đau đầu",
      "Mụn",
      "Đau lưng",
      "Mệt mỏi",
      "Thèm ăn",
      "Mất ngủ",
      "Đau bụng",
      "Buồn ngủ",
      "Tiết dịch ở núm vú",
      "Tiểu thường xuyên",
      "Chuột rút chân",
      "Chảy máu nướu",
    ],
  },
  {
    id: "digestion",
    title: "Tiêu hóa",
    icon: "nutrition-outline",
    options: [
      "Buồn nôn",
      "Ợ nóng",
      "Nôn",
      "Đầy hơi",
      "Táo bón",
      "Tiêu chảy",
      "Tiêu hóa bình thường",
      "Đi ngoài bình thường",
    ],
  },
  {
    id: "appetite",
    title: "Ăn uống",
    icon: "restaurant-outline",
    options: ["Chán một số món", "Thèm ăn hơn", "Ăn ít hơn"],
  },
  {
    id: "fluid",
    title: "Dịch âm đạo",
    icon: "water-outline",
    options: [
      "Không có dịch",
      "Trắng đục",
      "Dính",
      "Tăng tiết dịch",
      "Có màu nâu, đỏ",
      "Bất thường",
    ],
  },
  {
    id: "swelling",
    title: "Sưng, phù",
    icon: "body-outline",
    options: ["Sưng tay chân", "Sưng mặt", "Nghẹt mũi"],
  },
  {
    id: "sex",
    title: "Tình dục và nhu cầu",
    icon: "heart-outline",
    options: [
      "Không quan hệ",
      "Có bảo vệ",
      "Không bảo vệ",
      "Tự kích thích",
      "Nhu cầu cao",
      "Nhu cầu thấp",
    ],
  },
  {
    id: "activity",
    title: "Hoạt động thể chất",
    icon: "walk-outline",
    options: [
      "Không tập",
      "Yoga",
      "Gym",
      "Thể dục nhịp điệu",
      "Bơi lội",
      "Thể thao đồng đội",
      "Chạy",
      "Đạp xe",
      "Đi bộ",
    ],
  },
  {
    id: "other",
    title: "Yếu tố khác",
    icon: "ellipsis-horizontal",
    options: ["Đi xa", "Căng thẳng", "Ốm hoặc chấn thương", "Rượu"],
  },
] as const;
export type PregnancySelections = Record<string, string[]>;
export function parsePregnancySelections(value?: string): PregnancySelections {
  try {
    const raw: unknown = JSON.parse(value ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      pregnancyDiaryGroups.map((group) => {
        const values = (raw as Record<string, unknown>)[group.id];
        return [
          group.id,
          Array.isArray(values)
            ? [
                ...new Set(
                  values.filter(
                    (v): v is string =>
                      typeof v === "string" &&
                      (group.options as readonly string[]).includes(v),
                  ),
                ),
              ]
            : [],
        ];
      }),
    );
  } catch {
    return {};
  }
}
export function togglePregnancyChoice(
  selections: PregnancySelections,
  group: string,
  value: string,
): PregnancySelections {
  const old = selections[group] ?? [];
  let next = old.includes(value)
    ? old.filter((v) => v !== value)
    : [...old, value];
  if (group === "symptoms") {
    if (value === "Mọi thứ đều ổn" && next.includes(value)) next = [value];
    else if (value !== "Mọi thứ đều ổn")
      next = next.filter((v) => v !== "Mọi thứ đều ổn");
  }
  if (group === "activity") {
    if (value === "Không tập" && next.includes(value)) next = [value];
    else if (value !== "Không tập")
      next = next.filter((v) => v !== "Không tập");
  }
  return { ...selections, [group]: next };
}
