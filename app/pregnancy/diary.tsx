import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";
import { DayPicker, localDay } from "../../src/components/DayPicker";
import { TimePicker } from "../../src/components/TimePicker";
import { FormInput } from "../../src/components/FormInput";
import { Screen } from "../../src/components/ui";
import { p } from "../../src/components/PregnancyContent";
import {
  pregnancyDiaryGroups,
  parsePregnancySelections,
  togglePregnancyChoice,
} from "../../src/data/pregnancyDiary";
import { useApp } from "../../src/providers/AppProvider";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { editCare } from "../../src/lib/childRecords";
import { insertCareEntry } from "../../src/lib/database";
import { pregnancyAge, pregnancyDayNumber } from "../../src/lib/pregnancy";
import type { CareEntry, Child } from "../../src/types";

export default function PregnancyDiary() {
  const params = useLocalSearchParams<{
    id?: string;
    day?: string;
    group?: string;
  }>();
  const { child, currentUserId } = useApp();
  const { entries, loading, error } = useCareHistory();
  const target = params.id
    ? entries.find(
        (e) => e.id === params.id && e.details?.tool === "pregnancy-today",
      )
    : undefined;
  const day = params.id
    ? (target?.details?.day ?? "")
    : (params.day ?? localDay(new Date()));
  const own =
    target ??
    entries.find(
      (e) =>
        e.details?.tool === "pregnancy-today" &&
        e.details?.day === day &&
        e.created_by === currentUserId,
    );
  if (loading)
    return (
      <Screen>
        <Text>Đang đọc nhật ký…</Text>
      </Screen>
    );
  if (error || !child || (params.id && !target))
    return (
      <Screen>
        <Text>
          {error || "Không tìm thấy bản ghi trong hồ sơ bé đang chọn."}
        </Text>
      </Screen>
    );
  if (pregnancyDayNumber(day) === null || day > localDay(new Date()))
    return (
      <Screen>
        <Text>Chỉ ghi nhật ký cho hôm nay hoặc ngày đã qua.</Text>
      </Screen>
    );
  if (!target && (child.birthday || !pregnancyAge(child.due_date, day)))
    return (
      <Screen>
        <Text>
          Ngày này không thuộc khoảng thai kỳ 0–42 tuần của hồ sơ. Kiểm tra ngày
          dự sinh hoặc chọn lại ngày.
        </Text>
      </Screen>
    );
  return (
    <DiaryForm
      key={`${child.id}:${day}:${own?.id ?? "new"}`}
      child={child}
      day={day}
      existing={own}
      initialGroup={params.group}
      readonly={!!own && own.created_by !== currentUserId}
    />
  );
}
function DiaryForm({
  child,
  day,
  existing,
  initialGroup,
  readonly,
}: {
  child: Child;
  day: string;
  existing?: CareEntry;
  initialGroup?: string;
  readonly: boolean;
}) {
  const db = useSQLiteContext();
  const { refresh, syncNow } = useApp();
  const [selections, setSelections] = useState(() =>
    parsePregnancySelections(existing?.details?.selections),
  );
  const [weight, setWeight] = useState(existing?.details?.weight ?? "");
  const [water, setWater] = useState(Number(existing?.details?.waterMl) || 0);
  const [medicine, setMedicine] = useState(existing?.details?.medicine ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const date = existing ? new Date(existing.occurred_at) : new Date();
  const [time, setTime] = useState(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const groups = [...pregnancyDiaryGroups].sort(
    (a, b) => Number(b.id === initialGroup) - Number(a.id === initialGroup),
  );
  const save = async () => {
    if (lock.current || readonly) return;
    setError("");
    const value = weight.trim() ? Number(weight.replace(",", ".")) : null;
    if (
      value !== null &&
      (!Number.isFinite(value) || value <= 0 || value > 400)
    ) {
      setError("Cân nặng cần là số lớn hơn 0 và không quá 400 kg.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Hãy chọn lại giờ.");
      return;
    }
    const occurred = new Date(`${day}T${time}:00`);
    if (occurred.getTime() > Date.now() + 60000) {
      setError("Không ghi thời điểm trong tương lai. Hãy chọn giờ đã qua.");
      return;
    }
    const clean = parsePregnancySelections(JSON.stringify(selections));
    const summary = [
      ...Object.values(clean).flat(),
      ...(value !== null ? [`${value} kg`] : []),
      ...(water ? [`${water} ml nước`] : []),
    ].join(" · ");
    if (!summary && !medicine.trim() && !note.trim()) {
      setError("Chọn ít nhất một mục hoặc thêm ghi chú trước khi lưu.");
      return;
    }
    const details = {
      tool: "pregnancy-today",
      day,
      selections: JSON.stringify(clean),
      weight: value?.toString() ?? "",
      waterMl: String(water),
      medicine: medicine.trim(),
      summary,
    };
    lock.current = true;
    setBusy(true);
    try {
      if (existing)
        await editCare(db, existing, {
          amount: null,
          unit: null,
          note: note.trim() || null,
          occurred_at: occurred.toISOString(),
          details,
        });
      else
        await insertCareEntry(db, {
          familyId: child.family_id,
          childId: child.id,
          kind: "activity",
          note: note.trim() || null,
          occurredAt: occurred.toISOString(),
          details,
        });
      Keyboard.dismiss();
      await refresh();
      void syncNow();
      router.back();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa lưu được nhật ký. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const remove = () => {
    if (!existing || readonly || lock.current) return;
    Alert.alert(
      "Xóa nhật ký ngày này?",
      "Bản ghi này sẽ được xóa khỏi nhật ký chung sau khi đồng bộ.",
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try {
              await editCare(db, existing, {
                deleted_at: new Date().toISOString(),
              });
              await refresh();
              void syncNow();
              router.back();
            } catch {
              setError("Chưa xóa được nhật ký.");
            } finally {
              lock.current = false;
              setBusy(false);
            }
          },
        },
      ],
    );
  };
  const measurements = (
    <View style={p.card}>
      <Text style={p.heading}>Nước và cân nặng của mẹ</Text>
      <Text style={p.muted}>
        Ghi lượng thực tế; đây không phải mục tiêu được khuyến nghị.
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable
          accessibilityLabel="Bớt 250 ml nước"
          disabled={readonly || busy || water === 0}
          style={p.pill}
          onPress={() => setWater(Math.max(0, water - 250))}
        >
          <Text style={p.pillText}>−</Text>
        </Pressable>
        <Text style={[p.rowTitle, { flex: 1, textAlign: "center" }]}>
          {water} ml nước
        </Text>
        <Pressable
          accessibilityLabel="Thêm 250 ml nước"
          disabled={readonly || busy || water >= 10000}
          style={p.pill}
          onPress={() => setWater(Math.min(10000, water + 250))}
        >
          <Text style={p.pillText}>+</Text>
        </Pressable>
      </View>
      <Text style={p.rowTitle}>Cân nặng (kg)</Text>
      <FormInput
        accessibilityLabel="Cân nặng mẹ (kg)"
        editable={!readonly && !busy}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="Chưa ghi"
        maxLength={6}
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor: "#FFF5F3",
          fontSize: 18,
          color: "#49343D",
        }}
      />
    </View>
  );
  return (
    <Screen safeAreaStyle={p.root} contentStyle={{ gap: 18 }}>
      <Stack.Screen
        options={{
          title: readonly ? "Nhật ký đã chia sẻ" : "Mẹ hôm nay thế nào?",
        }}
      />
      <Text style={p.heading}>
        {child.nickname || child.name} · Nhật ký thai kỳ
      </Text>
      <Text style={p.muted}>
        Các thông tin này được chia sẻ với người còn lại trong gia đình. Chỉ ghi
        những gì bạn muốn chia sẻ.
      </Text>
      {readonly ? (
        <View style={p.card}>
          <Text style={p.rowTitle}>
            Bản ghi của {existing?.created_by_name} ·{" "}
            {day.split("-").reverse().join("/")}
          </Text>
          <Text style={p.muted}>
            Bạn có thể xem; người đã ghi sẽ chỉnh sửa bản ghi này.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <DayPicker
            value={day}
            onChange={(value) =>
              router.replace({
                pathname: "/pregnancy/diary",
                params: { day: value },
              })
            }
          />
          <TimePicker value={time} onChange={setTime} label="Giờ ghi nhật ký" />
        </View>
      )}
      {initialGroup === "weight" && measurements}
      {groups.map((group) => (
        <View key={group.id} style={p.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={group.icon} size={23} color="#C56E86" />
            <Text style={p.heading}>{group.title}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {group.options.map((value) => {
              const selected = selections[group.id]?.includes(value) ?? false;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={value}
                  aria-checked={selected}
                  accessibilityState={{
                    checked: selected,
                    disabled: readonly || busy,
                  }}
                  disabled={readonly || busy}
                  style={[p.pill, selected && p.pillSelected]}
                  onPress={() =>
                    setSelections((old) =>
                      togglePregnancyChoice(old, group.id, value),
                    )
                  }
                >
                  <Text style={[p.pillText, selected && { color: "white" }]}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      {initialGroup !== "weight" && measurements}
      <View style={p.card}>
        <Text style={p.heading}>Thuốc / vitamin đã dùng</Text>
        <Text style={p.muted}>
          Chỉ ghi theo hướng dẫn của bác sĩ; app không đề xuất thuốc hoặc liều
          dùng.
        </Text>
        <FormInput
          accessibilityLabel="Thuốc hoặc vitamin đã dùng"
          editable={!readonly && !busy}
          value={medicine}
          onChangeText={setMedicine}
          multiline
          maxLength={1000}
          placeholder="Tên thuốc, liều đã dùng (nếu muốn ghi)…"
          style={{
            backgroundColor: "#FFF6F5",
            padding: 14,
            minHeight: 90,
            borderRadius: 12,
            fontSize: 16,
            color: "#49343D",
            textAlignVertical: "top",
          }}
        />
        <Text style={p.heading}>Ghi chú cho hôm nay</Text>
        <FormInput
          testID="pregnancy-note"
          accessibilityLabel="Ghi chú thai kỳ"
          editable={!readonly && !busy}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2000}
          placeholder="Một điều mẹ muốn ghi nhớ hoặc chia sẻ…"
          style={{
            backgroundColor: "#FFF6F5",
            padding: 14,
            minHeight: 130,
            borderRadius: 12,
            fontSize: 16,
            color: "#49343D",
            textAlignVertical: "top",
          }}
        />
      </View>
      <Text style={p.muted}>
        Nhật ký không đánh giá mức độ an toàn của triệu chứng. Nếu thấy không
        khỏe hoặc lo lắng về mẹ hay bé, hãy liên hệ người theo dõi thai kỳ;
        không chờ lời nhắc của app.
      </Text>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#B63755", lineHeight: 22 }}
        >
          {error}
        </Text>
      )}
      {!readonly && (
        <Pressable
          testID="save-pregnancy-diary"
          disabled={busy}
          style={[p.action, busy && { opacity: 0.5 }]}
          onPress={() => {
            void save();
          }}
        >
          <Text style={p.actionText}>
            {busy
              ? "Đang lưu…"
              : existing
                ? "Lưu thay đổi"
                : "Lưu nhật ký chung"}
          </Text>
        </Pressable>
      )}
      {existing && !readonly && (
        <Pressable disabled={busy} onPress={remove} style={p.pill}>
          <Text style={[p.pillText, { color: "#B63755" }]}>
            Xóa bản ghi của tôi
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}
