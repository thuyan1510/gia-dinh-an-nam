import type { Child } from "../types";
import { pregnancyArticles, weeklyArticle } from "../data/pregnancy";
import { pregnancyAge, formatPregnancyAge } from "./pregnancy";
import { careDay, shiftDay } from "./dailyCare";
export type PregnancyReminderSettings = {
  enabled: boolean;
  dailyInfo: boolean;
  diary: boolean;
  infoTime: string;
  diaryTime: string;
  diaryMorningTime: string;
};
export const defaultPregnancyReminders: PregnancyReminderSettings = {
  enabled: true,
  dailyInfo: false,
  diary: true,
  infoTime: "09:00",
  diaryTime: "17:30",
  diaryMorningTime: "07:00",
};
const validTime = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function parsePregnancyReminders(
  raw: unknown,
): PregnancyReminderSettings {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object" || Array.isArray(v))
      return { ...defaultPregnancyReminders };
    return {
      enabled: v.enabled === true,
      dailyInfo: v.dailyInfo !== false,
      diary: v.diary === true,
      infoTime: validTime(v.infoTime) ? v.infoTime : "09:00",
      diaryTime: validTime(v.diaryTime) ? v.diaryTime : "17:30",
      diaryMorningTime: validTime(v.diaryMorningTime)
        ? v.diaryMorningTime
        : "07:00",
    };
  } catch {
    return { ...defaultPregnancyReminders, enabled: false };
  }
}
export type PlannedPregnancyReminder = {
  identifier: string;
  childId: string;
  day: string;
  kind: "info" | "diary-morning" | "diary-evening";
  articleId?: string;
  repeatsDaily: boolean;
  title: string;
  body: string;
  at: Date;
  signature: string;
};
/** Dated article queue + two repeating diary slots. Repeats never claim a fixed age/day. */
export function planPregnancyReminders(
  profiles: {
    child: Child;
    settings: PregnancyReminderSettings;
    recordedDays?: Set<string>;
  }[],
  now: Date,
  capacity = 12,
): PlannedPregnancyReminder[] {
  const today = careDay(now.toISOString());
  const inside = pregnancyArticles.filter((a) => a.section === "inside");
  const requests: PlannedPregnancyReminder[] = [];
  for (const { child, settings } of profiles) {
    if (!settings.enabled || child.birthday || !child.due_date) continue;
    for (let offset = 0; offset < 14; offset++) {
      const day = shiftDay(today, offset);
      const age = pregnancyAge(child.due_date, day);
      if (!age) continue;
      for (const kind of ["info", "diary-morning", "diary-evening"] as const) {
        const repeatsDaily = kind !== "info";
        if (
          repeatsDaily &&
          (offset > 1 ||
            !pregnancyAge(child.due_date, today) ||
            requests.some((r) => r.childId === child.id && r.kind === kind))
        )
          continue;
        if (
          (kind === "info" && !settings.dailyInfo) ||
          (kind !== "info" && !settings.diary)
        )
          continue;
        const time =
          kind === "info"
            ? settings.infoTime
            : kind === "diary-morning"
              ? settings.diaryMorningTime
              : settings.diaryTime;
        const at = new Date(`${day}T${time}:00`);
        if (!Number.isFinite(at.getTime()) || at.getTime() <= now.getTime())
          continue;
        const growth = weeklyArticle("growth", age.weeks);
        const body = weeklyArticle("body", age.weeks);
        const article =
          age.days % 3 === 1
            ? (body ?? growth)
            : age.days % 3 === 2
              ? (inside[age.weeks % inside.length] ?? growth)
              : growth;
        const name = child.nickname || child.name;
        const title =
          kind === "info"
            ? `${formatPregnancyAge(age)} · ${name}`
            : `Trạng thái hôm nay · ${name}`;
        const text =
          kind === "info"
            ? `${article?.title ?? "Hành trình thai kỳ"}. Chạm để đọc bài đã lưu trong app.`
            : kind === "diary-morning"
              ? "Chào buổi sáng! Mẹ hôm nay thế nào? Dành một chút thời gian ghi lại trạng thái của mẹ."
              : "Chiều nay mẹ thế nào? Cập nhật triệu chứng và cân nặng nếu có thay đổi để người nhà cùng nắm được.";
        const articleId = kind === "info" ? article?.id : undefined;
        requests.push({
          identifier: `pregnancy:${child.id}:${repeatsDaily ? "daily" : day}:${kind}`,
          childId: child.id,
          day,
          kind,
          articleId,
          repeatsDaily,
          title,
          body: text,
          at,
          signature: JSON.stringify([
            child.due_date,
            title,
            text,
            repeatsDaily ? time : at.toISOString(),
            articleId ?? null,
          ]),
        });
      }
    }
  }
  return requests
    .sort(
      (a, b) =>
        a.at.getTime() - b.at.getTime() ||
        a.identifier.localeCompare(b.identifier),
    )
    .slice(0, Math.max(0, Math.min(12, capacity)));
}
