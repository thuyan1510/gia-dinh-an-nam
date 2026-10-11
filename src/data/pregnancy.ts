import raw from "./pregnancy/articles.json";
export type PregnancySection = "growth" | "body" | "inside";
export type PregnancyArticle = {
  id: string;
  section: PregnancySection;
  week: number | null;
  title: string;
  body: string;
  images: string[];
  reviewer: { name: string; description: string };
  sourceLanguage: string;
  translation: string;
  sourceHash: string;
  original: { title: string; body: string; reviewerDescription: string } | null;
};
export const pregnancyArticles = raw as PregnancyArticle[];
export const pregnancySections: {
  id: PregnancySection;
  title: string;
  description: string;
  icon: "baby-face-outline" | "human-pregnant" | "heart-outline";
  color: string;
}[] = [
  {
    id: "growth",
    title: "Bé phát triển",
    description: "43 bài từ bắt đầu thai kỳ đến đủ 42 tuần",
    icon: "baby-face-outline",
    color: "#BC6A43",
  },
  {
    id: "body",
    title: "Cơ thể của mẹ",
    description: "40 bài về những thay đổi từ tuần 3–42",
    icon: "human-pregnant",
    color: "#B35D7B",
  },
  {
    id: "inside",
    title: "Bé trong bụng",
    description: "9 bài về sự hình thành và môi trường của bé",
    icon: "heart-outline",
    color: "#638C83",
  },
];
export function weeklyArticle(section: "growth" | "body", week: number) {
  return pregnancyArticles.find(
    (a) => a.section === section && a.week === week,
  );
}
