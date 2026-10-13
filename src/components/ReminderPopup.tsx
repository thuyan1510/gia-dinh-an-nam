import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FamilyText as Text } from "./FamilyText";
import { FormInput } from "./FormInput";
import { ScheduleWheel } from "./ScheduleWheel";
import { colors } from "../theme";

export function ReminderPopup({
  title,
  setTitle,
  details,
  setDetails,
  date,
  setDate,
  saving,
  editing,
  onSave,
  onClose,
}: {
  title: string;
  setTitle: (text: string) => void;
  details: string;
  setDetails: (text: string) => void;
  date: Date;
  setDate: (date: Date) => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const scroll = useRef<ScrollView>(null);
  const revealInput = () => {
    if (Platform.OS !== "ios") return;
    requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      if (input)
        scroll.current?.scrollResponderScrollNativeHandleToKeyboard(
          input,
          16,
          true,
        );
    });
  };
  useEffect(() => {
    // KAV resizes the popup; explicitly scroll a focused lower field into that viewport.
    const subscription = Keyboard.addListener("keyboardDidShow", revealInput);
    return () => subscription.remove();
  }, []);
  return (
    <KeyboardAvoidingView
      style={s.overlay}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="Đóng lời nhắc"
        onPress={() => {
          if (!saving) onClose();
        }}
      />
      <SafeAreaView
        style={s.safe}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        <View style={s.panel}>
          <View style={s.heading}>
            <Text style={s.title}>
              {editing ? "Sửa lời nhắc" : "Tạo lời nhắc"}
            </Text>
            <Pressable
              accessibilityLabel="Đóng"
              disabled={saving}
              onPress={onClose}
              style={s.close}
            >
              <Ionicons name="close" size={23} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            ref={scroll}
            onFocus={() => {
              if (Keyboard.isVisible()) revealInput();
            }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.fields}
          >
            <View style={s.row}>
              <Text style={s.label}>Lời nhắc</Text>
              <FormInput
                accessibilityLabel="Lời nhắc"
                style={s.input}
                placeholder="Lịch tiêm, khám, mua đồ…"
                value={title}
                onChangeText={setTitle}
                maxLength={160}
                editable={!saving}
              />
            </View>
            <View style={s.row}>
              <Text style={s.label}>Ngày</Text>
              <Pressable
                style={s.input}
                accessibilityLabel="Chọn ngày"
                onPress={() => {
                  Keyboard.dismiss();
                  setPicker(picker === "date" ? null : "date");
                }}
              >
                <Text style={s.value}>
                  {date.toLocaleDateString("vi-VN")}　⌄
                </Text>
              </Pressable>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Giờ</Text>
              <Pressable
                style={s.input}
                accessibilityLabel="Chọn giờ"
                onPress={() => {
                  Keyboard.dismiss();
                  setPicker(picker === "time" ? null : "time");
                }}
              >
                <Text style={s.value}>
                  {date.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  　⌄
                </Text>
              </Pressable>
            </View>
            {picker && (
              <View style={s.wheel}>
                <ScheduleWheel value={date} onChange={setDate} mode={picker} />
                <Pressable
                  accessibilityLabel="Xong ngày giờ"
                  style={s.done}
                  onPress={() => setPicker(null)}
                >
                  <Text style={s.value}>Xong</Text>
                </Pressable>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.label}>Ghi chú riêng</Text>
              <FormInput
                accessibilityLabel="Ghi chú riêng"
                style={[s.input, s.notes]}
                placeholder="Ghi chú…"
                value={details}
                onChangeText={setDetails}
                maxLength={2000}
                multiline
                editable={!saving}
                onFocus={() => setPicker(null)}
              />
            </View>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            disabled={saving || !title.trim()}
            onPress={onSave}
            style={[s.save, (saving || !title.trim()) && { opacity: 0.45 }]}
          >
            <Text style={s.saveText}>
              {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo lời nhắc"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#15102266", justifyContent: "center" },
  safe: {
    width: "100%",
    maxHeight: "92%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "100%",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 21, fontWeight: "700", color: colors.ink },
  close: { padding: 10 },
  fields: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { width: 72, fontSize: 14, color: colors.ink },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCD5E5",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: "#FCFAFF",
  },
  value: { fontSize: 16, color: colors.primary },
  notes: { minHeight: 78, maxHeight: 115, textAlignVertical: "top" },
  wheel: { backgroundColor: "#FAF8FD", borderRadius: 14, overflow: "hidden" },
  done: { alignSelf: "flex-end", padding: 12 },
  save: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  saveText: { color: "white", fontSize: 17, fontWeight: "700" },
});
