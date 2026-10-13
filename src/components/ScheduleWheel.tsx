import { createElement } from "react";
import { localDay } from "./DayPicker";

// Web preview uses the browser picker. iOS resolves ScheduleWheel.native.tsx.
export function ScheduleWheel({
  value,
  onChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
  mode: "date" | "time";
}) {
  const local = `${localDay(value)}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return createElement("input", {
    type: "datetime-local",
    value: local,
    "aria-label": "Chọn ngày và giờ",
    style: {
      padding: 14,
      fontSize: 17,
      borderRadius: 12,
      border: "1px solid #DDD5E9",
      width: "100%",
      boxSizing: "border-box",
    },
    onChange: (event: { target: { value: string } }) => {
      const date = new Date(event.target.value);
      if (Number.isFinite(date.getTime())) onChange(date);
    },
  });
}
