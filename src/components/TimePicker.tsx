import { useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScheduleWheel } from "./ScheduleWheel";
import { timePickerDate, timePickerValue } from "../lib/timePicker";

/** Selection only: no keyboard, no locale-dependent parsing, all 60 minutes available. */
export function TimePicker({
  value,
  onChange,
  label = "Chọn giờ",
}: {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => timePickerDate("07:00"));
  const selectedTime = timePickerValue(draft);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={s.input}
        onPress={() => {
          Keyboard.dismiss();
          setDraft(timePickerDate(value));
          setOpen(true);
        }}
      >
        <Text style={s.text}>◷　{value || label}　⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.panel}>
            <Text style={s.title}>
              {label} · {selectedTime}
            </Text>
            <ScheduleWheel value={draft} onChange={setDraft} mode="time" />
            <View style={s.columns}>
              <Pressable style={s.action} onPress={() => setOpen(false)}>
                <Text style={s.text}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[s.action, s.selected]}
                onPress={() => {
                  onChange(selectedTime);
                  setOpen(false);
                }}
              >
                <Text style={s.text}>Chọn {selectedTime}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  input: {
    padding: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E9E9EF",
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  text: { color: "#7655AE", fontSize: 16, fontFamily: "QuicksandSemiBold" },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
    color: "#303B46",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#0006",
  },
  panel: {
    width: "100%",
    maxWidth: 500,
    padding: 16,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#fff",
  },
  columns: { flexDirection: "row", gap: 12 },
  selected: { backgroundColor: "#E9E2F5" },
  action: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 14,
  },
});
