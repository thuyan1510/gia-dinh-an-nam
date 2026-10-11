import { Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { Screen } from "../../src/components/ui";
import { TimePicker } from "../../src/components/TimePicker";
import { p } from "../../src/components/PregnancyContent";
import { useApp } from "../../src/providers/AppProvider";
import {
  defaultPregnancyReminders,
  type PregnancyReminderSettings,
} from "../../src/lib/pregnancyReminderPlan";
import {
  readPregnancyReminderSettings,
  savePregnancyReminderSettings,
  reconcilePregnancyNotifications,
} from "../../src/services/pregnancyNotifications";
import {
  prepareNotifications,
  requestNotificationPermission,
} from "../../src/services/notifications";

export default function PregnancyNotifications() {
  const { child } = useApp();
  return child ? (
    <Settings
      key={child.id}
      childId={child.id}
      name={child.nickname || child.name}
      eligible={!!child.due_date && !child.birthday}
    />
  ) : (
    <Screen>
      <Text>Chưa có hồ sơ bé.</Text>
    </Screen>
  );
}
function Settings({
  childId,
  name,
  eligible,
}: {
  childId: string;
  name: string;
  eligible: boolean;
}) {
  const db = useSQLiteContext();
  const [value, setValue] = useState<PregnancyReminderSettings>({
    ...defaultPregnancyReminders,
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    readPregnancyReminderSettings(db, childId)
      .then((v) => {
        if (active) {
          setValue(v);
          setReady(true);
          setLoadError("");
        }
      })
      .catch(() => {
        if (active) setLoadError("Chưa đọc được cài đặt. Vui lòng thử lại.");
      });
    return () => {
      active = false;
    };
  }, [db, childId, retry]);
  const save = async () => {
    if (!ready || busy || Platform.OS === "web") return;
    setBusy(true);
    setStatus("");
    try {
      if (value.enabled && !eligible)
        throw new Error(
          "Cần hồ sơ chưa sinh và ngày dự sinh hợp lệ để bật nhắc.",
        );
      if (value.enabled && !value.dailyInfo && !value.diary)
        throw new Error("Chọn ít nhất một loại nhắc hoặc tắt nhắc thai kỳ.");
      if (value.enabled) {
        await prepareNotifications();
        if (!(await requestNotificationPermission()))
          throw new Error(
            "Chưa có quyền thông báo. Bật trong Cài đặt iPhone rồi quay lại lưu.",
          );
      }
      await savePregnancyReminderSettings(db, childId, value);
      const result = await reconcilePregnancyNotifications(db);
      setStatus(
        !value.enabled
          ? "Đã tắt nhắc cho hồ sơ này trên máy này."
          : result.count
            ? `Đã lập ${result.count} thông báo thai kỳ cho các hồ sơ đang bật, gần nhất đến ${result.through?.split("-").reverse().join("/")}. App sẽ bổ sung lịch khi mở lại.`
            : "Đã lưu tùy chọn nhưng chưa có thông báo được đặt: có thể ngoài tuần 0–42 hoặc hàng đợi đang đầy. Hãy kiểm tra ngày dự sinh và các lời nhắc khác.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Chưa đặt được nhắc. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const toggle = (key: "enabled" | "dailyInfo" | "diary", label: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={[p.rowTitle, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        disabled={!ready || busy}
        value={value[key]}
        onValueChange={(v) => setValue((old) => ({ ...old, [key]: v }))}
        trackColor={{ true: "#DC829A" }}
      />
    </View>
  );
  return (
    <Screen safeAreaStyle={p.root} contentStyle={{ gap: 20 }}>
      <Stack.Screen options={{ title: "Nhắc thai kỳ" }} />
      <Text style={p.title}>Một lời nhắc dành cho mẹ</Text>
      <Text style={p.muted}>{name} · Cài đặt riêng trên điện thoại này</Text>
      {Platform.OS === "web" && (
        <Text style={p.muted}>
          Cần mở bản cài iPhone để đặt thông báo cục bộ.
        </Text>
      )}
      {!!loadError && (
        <Pressable style={p.pill} onPress={() => setRetry((n) => n + 1)}>
          <Text style={p.pillText}>{loadError} · Thử lại</Text>
        </Pressable>
      )}
      <View style={p.card}>
        {toggle("enabled", "Bật nhắc thai kỳ trên máy này")}
        <Text style={p.muted}>
          Không dùng APNs hoặc chứng chỉ push. Hai điện thoại cần bật và chọn
          giờ riêng.
        </Text>
      </View>
      <View style={p.card}>
        {toggle("dailyInfo", "Thông tin thai kỳ hằng ngày")}
        <Text style={p.muted}>
          Đọc một bài về bé hoặc cơ thể mẹ, dựa trên tuổi thai tại ngày thông
          báo. Mỗi ngày một lần.
        </Text>
        <TimePicker
          label="Giờ đọc thông tin thai kỳ"
          value={value.infoTime}
          onChange={(time) => setValue((v) => ({ ...v, infoTime: time }))}
        />
      </View>
      <View style={p.card}>
        {toggle("diary", "Nhắc ghi nhật ký")}
        <Text style={p.muted}>
          Mỗi tối một lần. Nếu ngày đó đã có nhật ký trên máy, app bỏ lời nhắc
          khi bổ sung lịch.
        </Text>
        <TimePicker
          label="Giờ nhắc ghi nhật ký"
          value={value.diaryTime}
          onChange={(time) => setValue((v) => ({ ...v, diaryTime: time }))}
        />
      </View>
      <View style={p.card}>
        <Text style={p.heading}>Cách lịch hoạt động</Text>
        <Text style={p.muted}>
          09:00 và 20:30 là giờ gợi ý của An Nam, không phải giờ tìm thấy trong
          IPA Flo. Giờ theo múi giờ điện thoại tại lúc đặt lịch; mở lại app sau
          khi đổi múi giờ.
        </Text>
        <Text style={p.muted}>
          App đặt tối đa 12 thông báo thai kỳ sắp tới, xét trong 14 ngày, để
          chừa chỗ cho lịch gia đình. Mở app thường xuyên để bổ sung. Đổi ngày
          dự sinh, báo bé đã sinh hoặc tắt nhắc sẽ làm app thay/hủy lịch cũ khi
          nhận được dữ liệu đó.
        </Text>
        <Text style={p.muted}>
          Nhắc đã đặt có thể hiện khi app đóng; Focus, chế độ im lặng và cài đặt
          iOS vẫn có thể làm chậm hoặc ẩn cảnh báo. App không phải công cụ theo
          dõi y tế khẩn cấp.
        </Text>
      </View>
      {!!status && (
        <Text accessibilityRole="alert" style={p.body}>
          {status}
        </Text>
      )}
      <Pressable
        style={[
          p.action,
          (!ready || busy || Platform.OS === "web") && { opacity: 0.4 },
        ]}
        disabled={!ready || busy || Platform.OS === "web"}
        onPress={() => {
          void save();
        }}
      >
        <Text style={p.actionText}>
          {busy ? "Đang đặt lịch…" : "Lưu và cập nhật thông báo"}
        </Text>
      </Pressable>
      <Pressable
        style={p.pill}
        onPress={() => {
          if (Platform.OS !== "web")
            void Linking.openSettings().catch(() =>
              Alert.alert("Hãy mở Cài đặt → Thông báo → Gia Đình An Nam."),
            );
        }}
      >
        <Text style={p.pillText}>Mở cài đặt thông báo của máy</Text>
      </Pressable>
    </Screen>
  );
}
