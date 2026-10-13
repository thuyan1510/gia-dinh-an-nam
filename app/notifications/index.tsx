import { useCallback, useState } from "react";
import { useFocusEffect, router, Stack } from "expo-router";
import { Linking, Share, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import {
  Card,
  LinkButton,
  PrimaryButton,
  Screen,
} from "../../src/components/ui";
import { formStyles as s } from "../../src/components/forms";
import { notificationPermissionLabel } from "../../src/services/notifications";
import { webPushAction, type WebPushStatus } from "../../src/services/webPush";
export default function NotificationsSettings() {
  const [status, setStatus] = useState<WebPushStatus | null>(null),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [local, setLocal] = useState("Chưa kiểm tra");
  const [pair, setPair] = useState<{
    code: string;
    expiresAt: string;
    pwaUrl: string;
  } | null>(null);
  const load = useCallback(async () => {
    setLocal(
      notificationPermissionLabel(await Notifications.getPermissionsAsync()),
    );
    setStatus(await webPushAction<WebPushStatus>("status"));
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load().catch((e) => setMessage(e.message));
    }, [load]),
  );
  const perform = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Thử lại sau.");
    } finally {
      setBusy(false);
    }
  };
  const openPWA = async () => {
    const url = status?.pwaUrl;
    if (!url || !/^https:\/\//.test(url))
      throw new Error("Chưa cấu hình địa chỉ HTTPS của PWA.");
    await Linking.openURL(url);
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: "Thông báo" }} />
      <Text style={s.title}>Thông báo gia đình</Text>
      <Card style={s.gap}>
        <Text style={s.label}>PWA Web Push</Text>
        <Text style={s.body}>
          Nhận hoạt động mới qua biểu tượng An Nam trên Màn hình chính. Khi chạm
          thông báo, PWA thử mở đúng nội dung trong IPA; nếu iOS chặn sẽ có nút
          mở thủ công.
        </Text>
        <Text style={s.hint}>
          {status?.configured
            ? "Máy chủ đã cấu hình. Từng điện thoại vẫn cần cài PWA và cấp quyền."
            : "Chưa đọc được cấu hình hoặc máy chủ chưa triển khai Web Push."}
        </Text>
        <PrimaryButton
          title="Mở trang cài PWA"
          disabled={busy || !status?.pwaUrl}
          onPress={() => perform(openPWA)}
        />
        <Text style={s.body}>
          1. Safari → Chia sẻ → Thêm vào Màn hình chính.{"\n"}2. Mở PWA vừa cài.
          {"\n"}3. Ghép bằng mã bên dưới, rồi chạm bật Web Push.{"\n"}4. Gửi thử
          và xác nhận bạn đã nhận.
        </Text>
        <PrimaryButton
          title="Tạo mã ghép PWA (5 phút)"
          disabled={busy || !status?.configured}
          onPress={() =>
            perform(async () => setPair(await webPushAction("pair")))
          }
        />
        {pair && (
          <View style={s.gap}>
            <Text selectable style={s.label}>
              {pair.code}
            </Text>
            <Text style={s.hint}>
              Hết hạn: {new Date(pair.expiresAt).toLocaleTimeString("vi-VN")}.
              Mã dùng một lần, chỉ nhập vào PWA của bạn.
            </Text>
            <LinkButton
              title="Sao chép / chia sẻ mã"
              onPress={() => {
                void Share.share({ message: pair.code });
              }}
            />
          </View>
        )}
      </Card>
      <Card style={s.gap}>
        <Text style={s.label}>Thiết bị trong gia đình</Text>
        <Text style={s.hint}>
          Đây là trạng thái được thiết bị báo lần gần nhất, không chứng minh
          quyền hiện tại trên iPhone.
        </Text>
        {(status?.devices ?? []).map((device) => (
          <View key={device.id} style={s.gap}>
            <Text style={s.label}>
              {device.label}
              {device.user_id === status?.userId
                ? " · của bạn"
                : " · người nhà"}
            </Text>
            <Text style={s.body}>
              {device.enabled ? "Đang bật" : "Đã tắt"} · Quyền báo về:{" "}
              {device.permission}
              {"\n"}Kiểm tra gần nhất:{" "}
              {device.last_seen_at
                ? new Date(device.last_seen_at).toLocaleString("vi-VN")
                : "chưa có"}
              {"\n"}
              {device.confirmed_at
                ? "Người dùng đã xác nhận nhận tin thử"
                : "Chưa xác nhận nhận tin thử"}
            </Text>
            <LinkButton
              title="Gửi thử đến máy này"
              disabled={busy || !device.enabled}
              onPress={() =>
                perform(async () => {
                  const r = await webPushAction<{ queued: number }>("test", {
                    deviceIds: [device.id],
                  });
                  setMessage(
                    r.queued
                      ? "Đã xếp hàng gửi thử; chưa xác nhận iPhone nhận được."
                      : "Vừa gửi thử. Chờ 30 giây trước khi thử lại.",
                  );
                })
              }
            />
            {device.user_id === status?.userId && (
              <LinkButton
                title="Thu hồi liên kết thiết bị này"
                disabled={busy}
                onPress={() =>
                  perform(async () => {
                    await webPushAction("revoke", { deviceId: device.id });
                  })
                }
              />
            )}
          </View>
        ))}
        <PrimaryButton
          title="Gửi thử đến các máy đang bật"
          disabled={busy || !status?.devices.some((d) => d.enabled)}
          onPress={() =>
            perform(async () => {
              const r = await webPushAction<{ queued: number }>("test", {
                deviceIds: status?.devices
                  .filter((d) => d.enabled)
                  .map((d) => d.id),
              });
              setMessage(`Đã xếp hàng ${r.queued} thông báo thử.`);
            })
          }
        />
      </Card>
      <Card style={s.gap}>
        <Text style={s.label}>
          Telegram ·{" "}
          {status?.telegramEnabled === false ? "Đã tạm tắt" : "Dự phòng"}
        </Text>
        {status?.telegramEnabled === false ? (
          <Text style={s.body}>
            Đã tắt gửi Telegram trên máy chủ. Cấu hình bot, liên kết và lịch sử
            vẫn được giữ. Thông báo từ xa dùng PWA; nhắc cục bộ không thay đổi.
          </Text>
        ) : (
          <>
            <Text style={s.body}>
              {status?.telegram?.enabled && status.telegram.confirmed_at
                ? "Telegram đang liên kết và bật."
                : "Telegram chưa bật."}{" "}
              Lựa chọn bên dưới không tự bật/tắt liên kết Telegram.
            </Text>
            <Text style={s.hint}>
              Song song: giữ như cũ, có thể nhận cả hai kênh. Dự phòng: chờ 2
              phút; chỉ bỏ lượt Telegram khi PWA báo đã gọi hiển thị hoặc IPA đã
              mở bản ghi. Đây vẫn không phải bằng chứng bạn đã đọc.
            </Text>
            <PrimaryButton
              title={
                status?.policy === "parallel"
                  ? "✓ Telegram song song"
                  : "Dùng Telegram song song"
              }
              disabled={busy || !status}
              onPress={() =>
                perform(async () => {
                  await webPushAction("policy", { policy: "parallel" });
                })
              }
            />
            <PrimaryButton
              title={
                status?.policy === "fallback"
                  ? "✓ Telegram dự phòng"
                  : "Dùng Telegram dự phòng"
              }
              disabled={busy || !status}
              onPress={() =>
                perform(async () => {
                  await webPushAction("policy", { policy: "fallback" });
                })
              }
            />
            <LinkButton
              title="Bật / tắt / liên kết Telegram"
              onPress={() => router.push("/family/telegram")}
            />
          </>
        )}
      </Card>
      <Card style={s.gap}>
        <Text style={s.label}>Nhắc cục bộ: {local}</Text>
        <Text style={s.body}>
          Giữ nguyên nhắc giờ hẹn và thai kỳ 07:00 / 17:30 (hoặc giờ bạn đã
          chọn). Lịch từ xa nhắc trước 1–7 ngày lúc 21:00 Việt Nam; không đặt
          thêm Web Push trùng giờ hẹn cục bộ.
        </Text>
        <LinkButton
          title="Lời nhắc thai kỳ"
          onPress={() => router.push("/pregnancy/notifications")}
        />
      </Card>
      <PrimaryButton
        title="Hộp thông báo & chẩn đoán từng bước"
        onPress={() => router.push("/notifications/inbox")}
      />
      <LinkButton
        title="Kiểm tra lại"
        disabled={busy}
        onPress={() => perform(load)}
      />
      {!!message && (
        <Text accessibilityRole="alert" style={s.error}>
          {message}
        </Text>
      )}
    </Screen>
  );
}
