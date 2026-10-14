import DateTimePicker from "@react-native-community/datetimepicker";

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
      mode={mode}
      display="spinner"
      locale="vi-VN"
      is24Hour
      minuteInterval={1}
      themeVariant="light"
      style={{ height: 216, width: "100%" }}
      onChange={(_event, date) => {
        if (date) onChange(date);
      }}
    />
  );
}
