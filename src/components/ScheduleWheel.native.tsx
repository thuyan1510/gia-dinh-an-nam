import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

export function ScheduleWheel({
  value,
  onChange,
  mode,
}: {
  value: Date;
  onChange: (value: Date) => void;
  mode: "date" | "time";
}) {
  return (
    <DateTimePicker
      value={value}
      mode={Platform.OS === "ios" ? "datetime" : mode}
      display="spinner"
      locale="vi-VN"
      is24Hour
      themeVariant="light"
      style={{ height: 170, width: "100%" }}
      onChange={(_event, date) => {
        if (date) onChange(date);
      }}
    />
  );
}
