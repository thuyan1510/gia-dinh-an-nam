import { useCallback, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { Text } from "react-native";
import { Card, LinkButton, Screen } from "../../src/components/ui";
import { formStyles as s } from "../../src/components/forms";
import {
  eventTarget,
  webPushAction,
  type WebPushStatus,
} from "../../src/services/webPush";
import { parseNotificationTarget } from "../../src/lib/notificationTarget";
export default function NotificationInbox() {
  const [status, setStatus] = useState<WebPushStatus | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setStatus(await webPushAction<WebPushStatus>("status"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được.");
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: "Hộp thông báo" }} />
      <Text style={s.title}>Thông báo gần đây</Text>
      <LinkButton
        title="Tải lại"
        onPress={() => {
          void load();
        }}
      />
      <LinkButton
        title="Thiết lập thông báo"
        onPress={() => router.push("/notifications")}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      {status?.events.map((event) => (
        <Card key={event.id} style={s.gap}>
          <Text style={s.label}>
            {{
              reminders: "Lời nhắc",
              family_posts: "Bài đăng",
              post_comments: "Bình luận",
              care_entries: "Nhật ký",
              test: "Kiểm tra Web Push",
            }[event.source_table] || "Cập nhật gia đình"}
          </Text>
          <Text style={s.body}>
            {new Date(event.created_at).toLocaleString("vi-VN")} ·{" "}
            {event.state === "cancelled"
              ? "Phiên bản đã thay đổi"
              : "Đã tạo sự kiện"}
          </Text>
          {event.web_push_deliveries.map((d) => (
            <Text key={d.device_id} style={s.hint}>
              {status.devices.find((x) => x.id === d.device_id)?.label ||
                "Thiết bị"}
              :{"\n"}Gửi: {d.state}
              {d.last_error ? ` · ${d.last_error}` : ""}
              {"\n"}Nhà cung cấp chấp nhận: {d.accepted_at ? "có" : "chưa"} ·
              PWA báo hiển thị: {d.displayed_at ? "có" : "chưa"}
              {"\n"}Chạm: {d.clicked_at ? "có" : "chưa"} · Mở PWA:{" "}
              {d.pwa_opened_at ? "có" : "chưa"} · Thử gọi IPA:{" "}
              {d.launch_attempted_at ? "có" : "chưa"}
            </Text>
          ))}
          <Text style={s.hint}>
            IPA đã tải đúng bản ghi:{" "}
            {event.native_opened_at ? "có" : "chưa ghi nhận"}
          </Text>
          <LinkButton
            title="Mở đúng bản ghi / thử điều hướng"
            onPress={() => {
              const target = parseNotificationTarget(eventTarget(event));
              if (target)
                router.navigate({
                  pathname: "/notification/open",
                  params: target,
                });
            }}
          />
        </Card>
      ))}
      {status && !status.events.length && (
        <Text style={s.body}>Chưa có sự kiện mới từ khi bật Web Push.</Text>
      )}
    </Screen>
  );
}
