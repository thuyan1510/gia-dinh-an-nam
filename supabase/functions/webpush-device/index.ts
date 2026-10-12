import {
  adminClient,
  apiResponse,
  check,
  contentForEvent,
  deviceAuth,
  jsonInput,
  publicConfig,
  randomSecret,
} from "../_shared/webPushApi.ts";
import { digest } from "../_shared/telegram.ts";
import { subscriptionFields, uuidPattern } from "../_shared/webPushPolicy.ts";
Deno.serve(async (req) => {
  const { allowed, reply } = apiResponse(req);
  if (!allowed) return reply({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return reply({ ok: true });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const input = await jsonInput(req),
      admin = adminClient();
    if (input.action === "config") return reply(publicConfig());
    if (input.action === "pair") {
      if (!publicConfig().configured)
        return reply({ error: "Máy chủ chưa cấu hình Web Push." }, 503);
      if (
        typeof input.code !== "string" ||
        !/^[a-f0-9]{24}$/.test(input.code) ||
        typeof input.label !== "string" ||
        !input.label.trim() ||
        input.label.length > 80
      )
        return reply({ error: "Mã ghép hoặc tên thiết bị không hợp lệ." }, 400);
      const token = randomSecret();
      const { data, error } = await admin.rpc("consume_web_push_pair", {
        code_digest: await digest(input.code),
        credential_digest: await digest(token),
        device_label: input.label.trim(),
      });
      if (error || !data)
        return reply(
          {
            error:
              "Mã đã dùng/hết hạn hoặc vượt giới hạn thiết bị. Tạo mã mới trong IPA.",
          },
          409,
        );
      return reply({ deviceId: data, deviceToken: token, ...publicConfig() });
    }
    const device = await deviceAuth(req, admin);
    if (!device)
      return reply({ error: "Liên kết đã hết hạn. Ghép lại từ IPA." }, 401);
    if (input.action === "register") {
      let fields;
      try {
        fields = subscriptionFields(input.subscription);
      } catch {
        return reply({ error: "Push subscription không hợp lệ." }, 400);
      }
      if (input.permission !== "granted" || input.standalone !== true)
        return reply(
          { error: "Mở PWA từ Màn hình chính và cho phép thông báo trước." },
          409,
        );
      const { error } = await admin
        .from("web_push_devices")
        .update({
          ...fields,
          enabled: true,
          permission: "granted",
          standalone: true,
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", device.id);
      if (error)
        return reply(
          {
            error:
              "Không thể lưu đăng ký. Nếu đã ghép trước đó, thu hồi thiết bị cũ trong IPA rồi ghép lại.",
          },
          409,
        );
      return reply({ registered: true, deviceId: device.id });
    }
    if (input.action === "status") {
      const permission = ["default", "granted", "denied"].includes(
        String(input.permission),
      )
        ? input.permission
        : device.permission;
      check(
        (
          await admin
            .from("web_push_devices")
            .update({
              permission,
              standalone: input.standalone === true,
              last_seen_at: new Date().toISOString(),
            })
            .eq("id", device.id)
        ).error,
      );
      return reply({
        deviceId: device.id,
        label: device.label,
        registered: !!device.endpoint && device.enabled,
        confirmedAt: device.confirmed_at,
        credentialExpiresAt: device.credential_expires_at,
      });
    }
    if (input.action === "unsubscribe") {
      check(
        (
          await admin
            .from("web_push_devices")
            .update({
              enabled: false,
              endpoint: null,
              p256dh: null,
              auth_key: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", device.id)
        ).error,
      );
      return reply({ ok: true });
    }
    if (input.action === "unpair") {
      check(
        (
          await admin
            .from("web_push_devices")
            .update({
              enabled: false,
              endpoint: null,
              p256dh: null,
              auth_key: null,
              credential_expires_at: new Date().toISOString(),
            })
            .eq("id", device.id)
        ).error,
      );
      return reply({ ok: true });
    }
    if (input.action === "test") {
      const { data, error } = await admin.rpc("create_web_push_test", {
        actor: device.user_id,
        target_devices: [device.id],
      });
      check(error);
      return reply({ queued: data?.length ?? 0 });
    }
    if (input.action === "confirm") {
      check(
        (
          await admin
            .from("web_push_devices")
            .update({ confirmed_at: new Date().toISOString() })
            .eq("id", device.id)
        ).error,
      );
      return reply({ ok: true });
    }
    if (input.action === "content") {
      const content = await contentForEvent(
        admin,
        device.user_id,
        device.family_id,
        input.notificationId,
      );
      return content
        ? reply(content)
        : reply(
            { error: "Nội dung đã xóa hoặc không còn quyền truy cập." },
            404,
          );
    }
    if (input.action === "receipt") {
      const columns: Record<string, string> = {
        displayed: "displayed_at",
        clicked: "clicked_at",
        pwa_opened: "pwa_opened_at",
        launch_attempted: "launch_attempted_at",
      };
      const column = columns[String(input.stage)];
      if (
        !column ||
        typeof input.notificationId !== "string" ||
        !uuidPattern.test(input.notificationId)
      )
        return reply({ error: "Biên nhận không hợp lệ." }, 400);
      // A device can acknowledge ONLY its own persisted delivery; no native-open impersonation.
      const { data, error } = await admin
        .from("web_push_deliveries")
        .update({ [column]: new Date().toISOString() })
        .eq("notification_id", input.notificationId)
        .eq("device_id", device.id)
        .is(column, null)
        .select("id");
      check(error);
      return reply({ recorded: !!data?.length });
    }
    if (input.action === "inbox") {
      const { data, error } = await admin
        .from("notification_events")
        .select("id,kind,source_table,entity_id,created_at,state")
        .eq("recipient_id", device.user_id)
        .eq("family_id", device.family_id)
        .order("created_at", { ascending: false })
        .limit(30);
      check(error);
      return reply({ events: data });
    }
    return reply({ error: "Thao tác không hợp lệ." }, 400);
  } catch {
    return reply(
      { error: "Chưa kết nối được dịch vụ thông báo. Thử lại sau." },
      503,
    );
  }
});
