/** Date-only arithmetic: local calendar days, independent of DST or time of day. */
export function pregnancyDayNumber(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day
  )
    return null;
  return Math.floor(date.getTime() / 86400000);
}
export function pregnancyAge(due: string | null | undefined, day: string) {
  const end = pregnancyDayNumber(due ?? "");
  const at = pregnancyDayNumber(day);
  if (end === null || at === null) return null;
  const totalDays = 280 + at - end;
  if (totalDays < 0 || totalDays > 300) return null;
  return {
    totalDays,
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    daysUntilDue: end - at,
  };
}
export function formatPregnancyAge(age: { weeks: number; days: number }) {
  return `${age.weeks} tuần, ${age.days} ngày`;
}
export function plainArticleText(text: string) {
  return text
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function articleLinkTarget(
  url: string,
): { kind: "article"; id: string } | { kind: "external"; url: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "floperiodtracker:") {
      const id = parsed.searchParams.get("ids")?.split(",")[0];
      return id && /^[a-z\d_]+$/i.test(id) ? { kind: "article", id } : null;
    }
    // Never fall back to calling Flo or opening its app, even for missing content.
    if (
      parsed.protocol !== "https:" ||
      /(^|\.)(owhealth\.com|flo\.health)$/.test(parsed.hostname)
    )
      return null;
    return { kind: "external", url: parsed.href };
  } catch {
    return null;
  }
}
