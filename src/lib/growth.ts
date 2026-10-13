import who from "../data/current/who-growth.json";
import legacy from "../data/legacy/legacy-growth-standards.json";
import type { CareEntry, Child } from "../types";
export type GrowthMetric = "weight" | "height" | "head";
export type GrowthStage = "born" | "pregnancy";
export type GrowthSex = "male" | "female";
export const growthMetrics: GrowthMetric[] = ["weight", "height", "head"];
export function growthLabel(metric: GrowthMetric, stage: GrowthStage) {
  return metric === "weight"
    ? "Cân nặng"
    : metric === "head"
      ? "Vòng đầu"
      : stage === "pregnancy"
        ? "Chiều dài thai"
        : "Chiều dài / chiều cao";
}
export function growthUnit(metric: GrowthMetric, stage: GrowthStage) {
  return metric === "weight" ? (stage === "pregnancy" ? "g" : "kg") : "cm";
}
export function growthStage(child: Child | null): GrowthStage {
  return child?.due_date && !child.birthday ? "pregnancy" : "born";
}
function dayNumber(day: string | null | undefined): number | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const value = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(value) &&
    new Date(value).toISOString().slice(0, 10) === day
    ? value / 86400000
    : null;
}
function localDate(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function growthAge(
  child: Child | null,
  stage: GrowthStage,
  date: string | Date,
): number | null {
  const measured = dayNumber(localDate(date));
  const origin = dayNumber(
    stage === "pregnancy" ? child?.due_date : child?.birthday,
  );
  if (measured === null || origin === null) return null;
  const age =
    stage === "pregnancy"
      ? 40 + (measured - origin) / 7
      : (measured - origin) / 30.4375;
  return age < 0 ? null : age;
}
export type GrowthPoint = { age: number; value: number; entry: CareEntry };
export function growthPoints(
  child: Child | null,
  entries: CareEntry[],
  metric: GrowthMetric,
  stage: GrowthStage,
): GrowthPoint[] {
  if (!child) return [];
  const title = growthLabel(metric, "born");
  const fetalTitle =
    metric === "weight"
      ? "Cân nặng thai (g)"
      : metric === "height"
        ? "Chiều dài thai (cm)"
        : "Vòng đầu thai (cm)";
  return entries
    .flatMap((entry) => {
      if (
        entry.child_id !== child.id ||
        entry.deleted_at ||
        !Number.isFinite(entry.amount) ||
        !entry.amount ||
        entry.amount <= 0
      )
        return [];
      const isFetal = entry.details?.tool === "fetal";
      if (
        stage === "pregnancy"
          ? !isFetal || entry.details?.metric !== fetalTitle
          : isFetal ||
            entry.kind !== "growth" ||
            (entry.details?.metric ??
              (entry.unit === "kg" ? "Cân nặng" : "Chiều dài / chiều cao")) !==
              title
      )
        return [];
      const unit = growthUnit(metric, stage);
      let value = entry.amount;
      if (entry.unit !== unit) {
        if (metric === "weight" && entry.unit === (unit === "g" ? "kg" : "g"))
          value *= unit === "g" ? 1000 : 0.001;
        else return [];
      }
      const age = growthAge(child, stage, entry.occurred_at);
      return age === null ? [] : [{ age, value, entry }];
    })
    .sort(
      (a, b) =>
        a.age - b.age || a.entry.occurred_at.localeCompare(b.entry.occurred_at),
    );
}
export type ReferencePoint = {
  age: number;
  low: number | null;
  median: number;
  high: number | null;
};
export type ReferenceSeries = {
  name: string;
  source: string;
  points: ReferencePoint[];
};
export function growthReferences(
  stage: GrowthStage,
  metric: GrowthMetric,
  sex: GrowthSex,
): ReferenceSeries[] {
  if (stage === "pregnancy") {
    if (metric === "head") return [];
    const points = legacy.fetal.map((p) => ({
      age: p.gestationalWeek,
      median: metric === "weight" ? p.averageWeightG : p.averageLengthCm,
      low: null,
      high: null,
    }));
    // Source changes length convention at week 21: never draw a false growth jump.
    return (
      metric === "height"
        ? [points.filter((p) => p.age <= 20), points.filter((p) => p.age >= 21)]
        : [points]
    ).map((rows, i) => ({
      name:
        metric === "height"
          ? i === 0
            ? "Mốc chiều dài 8–20 tuần"
            : "Mốc chiều dài 21–40 tuần"
          : "Mốc cân nặng 8–40 tuần",
      source: "Bé của mẹ 1.2.21 · bảng gốc, chưa thẩm định y khoa",
      points: rows,
    }));
  }
  return who.datasets
    .filter(
      (d) =>
        d.sex === sex &&
        (metric === "height"
          ? ["length", "height"].includes(d.metric)
          : d.metric === metric),
    )
    .map((d) => ({
      name:
        d.metric === "length"
          ? "Chiều dài nằm (0–24 tháng)"
          : d.metric === "height"
            ? "Chiều cao đứng (24–60 tháng)"
            : "WHO",
      source: d.page,
      points: d.points,
    }));
}
export function growthDomain(
  stage: GrowthStage,
  age: number | null,
): [number, number] {
  if (stage === "pregnancy") return [8, Math.max(40, Math.ceil(age ?? 40))];
  return age === null || age <= 6
    ? [0, 6]
    : age <= 12
      ? [0, 12]
      : age <= 24
        ? [0, 24]
        : age <= 60
          ? [24, 60]
          : [60, Math.max(72, Math.ceil(age))];
}
