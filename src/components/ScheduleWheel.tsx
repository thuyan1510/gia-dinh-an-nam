import { createElement } from "react";
import { localDay } from "./DayPicker";

// Web preview uses the browser picker. iOS resolves ScheduleWheel.native.tsx.
export function ScheduleWheel({
  value,
  onChange,
  mode,
}: {
  value: Date;
  onChange: (value: Date) => void;
  mode: "date" | "time";
}) {
  const local =
    mode === "date"
      ? localDay(value)
      : `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return createElement("input", {
    type: mode,
    value: local,
    "aria-label": mode === "date" ? "Chọn ngày" : "Chọn giờ và phút",
    style: {
      padding: 14,
      fontSize: 17,
      borderRadius: 12,
      border: "1px solid #DDD5E9",
      width: "100%",
      boxSizing: "border-box",
    },
    onChange: (event: { target: { value: string } }) => {
      const input = event.target.value;
      if (
        !(
          mode === "date" ? /^\d{4}-\d{2}-\d{2}$/ : /^([01]\d|2[0-3]):[0-5]\d$/
        ).test(input)
      )
        return;
      const date =
        mode === "date" ? new Date(`${input}T12:00:00`) : new Date(value);
      if (mode === "date")
        date.setHours(value.getHours(), value.getMinutes(), 0, 0);
      else
        date.setHours(Number(input.slice(0, 2)), Number(input.slice(3)), 0, 0);
      if (Number.isFinite(date.getTime())) onChange(date);
    },
  });
}
