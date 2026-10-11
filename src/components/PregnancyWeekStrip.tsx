import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shiftDay } from "../lib/dailyCare";
import { pregnancyWeekDays } from "../lib/pregnancy";

export function PregnancyWeekStrip({
  day,
  today,
  onChange,
}: {
  day: string;
  today: string;
  onChange: (value: string) => void;
}) {
  const days = pregnancyWeekDays(day);
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const date = new Date(`${day}T12:00:00`);
  return (
    <View style={{ gap: 12 }}>
      <View style={s.heading}>
        <Pressable
          accessibilityLabel="Tuần trước"
          onPress={() => onChange(shiftDay(day, -7))}
          style={s.arrow}
        >
          <Ionicons name="chevron-back" size={20} color="#663D31" />
        </Pressable>
        <Text style={s.month}>
          Tháng {date.getMonth() + 1}, {date.getFullYear()}
        </Text>
        <Pressable
          accessibilityLabel="Về hôm nay"
          onPress={() => onChange(today)}
          style={s.today}
        >
          <Text style={s.todayText}>Hôm nay</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Tuần sau"
          onPress={() => onChange(shiftDay(day, 7))}
          style={s.arrow}
        >
          <Ionicons name="chevron-forward" size={20} color="#663D31" />
        </Pressable>
      </View>
      <View testID="pregnancy-week-strip" style={s.row}>
        {days.map((value, i) => (
          <Pressable
            key={value}
            testID={`pregnancy-day-${value}`}
            accessibilityRole="button"
            accessibilityLabel={`${labels[i]}, ngày ${Number(value.slice(8))} tháng ${Number(value.slice(5, 7))}${value === today ? ", hôm nay" : ""}`}
            accessibilityState={{ selected: value === day }}
            aria-selected={value === day}
            onPress={() => onChange(value)}
            style={s.day}
          >
            <Text style={s.label}>{labels[i]}</Text>
            <View style={[s.number, value === day && s.selected]}>
              <Text
                style={[
                  s.text,
                  value === day && { color: "#9C483A", fontWeight: "700" },
                ]}
              >
                {Number(value.slice(8))}
              </Text>
            </View>
            <View style={[s.dot, { opacity: value === today ? 1 : 0 }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 4 },
  arrow: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  month: { flex: 1, fontSize: 14, fontWeight: "600", color: "#663D31" },
  today: { padding: 10 },
  todayText: { fontSize: 12, fontWeight: "600", color: "#7D4B3C" },
  row: { flexDirection: "row" },
  day: { flex: 1, alignItems: "center", gap: 5 },
  label: { fontSize: 11, color: "#7D5342", fontWeight: "600" },
  number: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  selected: { backgroundColor: "#FFFDF9" },
  text: { color: "#663D31", fontSize: 16 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#A9523D" },
});
