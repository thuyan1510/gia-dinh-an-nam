import originalCategories from "./legacy/handbook-categories.json";
import iconSources from "./handbookImageSources.json";
import legacyImages from "./legacyImageSources.json";
import { handbookArticles } from "./handbook";
import { pregnancyArticles } from "./pregnancy";
import {
  easyTemplates,
  legacyPregnancyExaminations,
  vaccineGroups,
  formatLegacyRange,
} from "./reference";
import type { ImageSourcePropType } from "react-native";
export type HandbookStage = "pre_pregnant" | "pregnant" | "mom";
export const handbookStages: { id: HandbookStage; title: string }[] = [
  { id: "pre_pregnant", title: "Chưa có thai" },
  { id: "pregnant", title: "Đang có thai" },
  { id: "mom", title: "Nuôi con nhỏ" },
];
export type HandbookCategory = {
  id: string;
  type: HandbookStage;
  label: string;
  image: ImageSourcePropType;
};
export const handbookCategories: HandbookCategory[] = [
  ...originalCategories.map((c) => ({
    id: c.id,
    type: c.type as HandbookStage,
    label: c.label,
    image: iconSources[c.id as keyof typeof iconSources],
  })),
  {
    id: "easy",
    type: "mom",
    label: "Giấc ngủ & E.A.S.Y",
    image: legacyImages.ic_easy_routine,
  },
  {
    id: "weaning",
    type: "mom",
    label: "Ăn dặm",
    image: legacyImages.ic_activity_weaning,
  },
];
export type HandbookItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  path: string;
  bookmarkKey?: string;
  pregnancyId?: string;
  legacy?: boolean;
};
export const handbookItems: HandbookItem[] = [
  ...handbookArticles.map((a) => ({
    id: `article-${a.id}`,
    category: a.id === "easy" ? "easy" : a.id === "weaning" ? "weaning" : "21",
    title: a.title,
    summary: a.summary,
    path: `/handbook/${a.id}`,
    bookmarkKey: `bookmark:${a.id}`,
  })),
  ...pregnancyArticles.map((a) => ({
    id: `pregnancy-${a.id}`,
    category: a.section === "growth" ? "9" : a.section === "body" ? "10" : "17",
    title: a.title,
    summary:
      a.week !== null
        ? `Tuần ${a.week} · Bài đọc đã lưu trong app`
        : "Bé trong bụng mẹ · Bài đọc đã lưu trong app",
    path: `/pregnancy/article/${a.id}`,
    pregnancyId: a.id,
  })),
  ...legacyPregnancyExaminations.map((a) => ({
    id: `exam-${a.id}`,
    category: "14",
    title: a.title,
    summary: formatLegacyRange(a),
    path: `/handbook/${a.id}`,
    bookmarkKey: `bookmark:${a.id}`,
    legacy: true,
  })),
  ...vaccineGroups.map((g) => ({
    id: `vaccine-${g.milestones[0]!.id}`,
    category: "22",
    title: g.name,
    summary: `${g.milestones.length} mốc tiêm · Xác nhận lịch tại cơ sở tiêm`,
    path: `/vaccine/${g.milestones[0]!.id}`,
  })),
  ...easyTemplates.map((t) => ({
    id: `easy-${t.id}`,
    category: "easy",
    title: `E.A.S.Y ${t.name}`,
    summary: `Tuần ${t.fromWeek}–${t.toWeek ?? "trở đi"} · Mẫu tham khảo`,
    path: `/easy/${t.id}`,
    legacy: true,
  })),
  {
    id: "wonder-weeks",
    category: "24",
    title: "Các mốc tuần của bé",
    summary: "Mốc tham khảo từ app gốc, mỗi bé có nhịp phát triển riêng",
    path: "/child/weeks",
    legacy: true,
  },
  {
    id: "prenatal-play",
    category: "18",
    title: "Thơ và nhạc cho mẹ & bé",
    summary: "Cùng đọc, cùng nghe, cùng thư giãn",
    path: "/pregnancy/education",
  },
];
export function searchHandbook(query: string) {
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const term = normalize(query.trim());
  return handbookItems.filter((a) =>
    normalize(
      `${a.title} ${a.summary} ${handbookCategories.find((c) => c.id === a.category)?.label ?? ""}`,
    ).includes(term),
  );
}
