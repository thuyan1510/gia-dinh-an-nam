/** Explicitly shared fields only. Never send notes, medication, mood or old sex entries. */
export function pregnancyTelegramText(details: unknown): string {
  const d =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : {};
  const day =
    typeof d.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.day)
      ? d.day.split("-").reverse().join("/")
      : "";
  const value =
    typeof d.weight === "string" &&
    /^\d{1,3}([.,]\d{1,2})?$/.test(d.weight.trim())
      ? Number(d.weight.replace(",", "."))
      : NaN;
  let symptoms: string[] = [];
  try {
    const selections = JSON.parse(
      typeof d.selections === "string" ? d.selections : "{}",
    );
    if (Array.isArray(selections?.symptoms))
      symptoms = [
        ...new Set<string>(
          selections.symptoms
            .filter(
              (s: unknown): s is string =>
                typeof s === "string" && s.length > 0 && s.length <= 120,
            )
            .map((s: string) => s.replace(/[\r\n\u0000-\u001f]/g, " ")),
        ),
      ].slice(0, 20);
  } catch {
    /* Older/malformed diary: omit symptoms safely. */
  }
  return [
    `Người nhà vừa cập nhật trạng thái thai kỳ${day ? ` ngày ${day}` : ""}.`,
    Number.isFinite(value) && value > 0 && value <= 400
      ? `Cân nặng mẹ: ${value.toLocaleString("vi-VN")} kg.`
      : "Cân nặng mẹ: chưa ghi.",
    symptoms.length
      ? `Triệu chứng: ${symptoms.join(", ")}.`
      : "Triệu chứng: chưa chọn.",
    "Mở Gia Đình An Nam để xem nhật ký. Đây là thông tin người nhà tự ghi, không phải đánh giá y tế.",
  ].join("\n");
}
