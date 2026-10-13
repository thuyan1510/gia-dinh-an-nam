import {
  adminClient,
  apiResponse,
  check,
  contentForEvent,
  jsonInput,
  publicConfig,
  randomSecret,
} from "../_shared/webPushApi.ts";
import { digest } from "../_shared/telegram.ts";
import { uuidPattern } from "../_shared/webPushPolicy.ts";
Deno.serve(async (req) => {
  const { allowed, reply } = apiResponse(req);
  if (!allowed) return reply({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return reply({ ok: true });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const admin = adminClient();
    const bearer = req.headers
      .get("Authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) return reply({ error: "Hãy đăng nhập trong app." }, 401);
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(bearer);
    if (error || !user)
      return reply({ error: "Phiên đăng nhập đã hết hạn." }, 401);
    const { data: member, error: me } = await admin
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .maybeSingle();
    check(me);
    if (!member) return reply({ error: "Hãy ghép gia đình trước." }, 403);
    const input = await jsonInput(req);
    if (input.action === "status") {
      const [devices, preference, telegram, deliveries] = await Promise.all([
        admin
          .from("web_push_devices")
          .select(
            "id,user_id,label,enabled,permission,standalone,last_seen_at,last_accepted_at,confirmed_at,credential_expires_at",
          )
          .eq("family_id", member.family_id)
          .order("created_at"),
        admin
          .from("notification_preferences")
          .select("telegram_policy")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin
          .from("telegram_links")
          .select("enabled,confirmed_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin
          .from("notification_events")
          .select(
            "id,kind,source_table,entity_id,created_at,state,native_opened_at,web_push_deliveries(device_id,state,attempts,last_error,accepted_at,displayed_at,clicked_at,pwa_opened_at,launch_attempted_at)",
          )
          .eq("recipient_id", user.id)
          .eq("family_id", member.family_id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      [devices, preference, telegram, deliveries].forEach((r) =>
        check(r.error),
      );
      const channels = await admin
        .from("notification_channels")
        .select("telegram_enabled")
        .eq("singleton", true)
        .single();
      check(channels.error);
      return reply({
        ...publicConfig(),
        telegramEnabled: channels.data?.telegram_enabled === true,
        userId: user.id,
        devices: devices.data,
        policy: preference.data?.telegram_policy ?? "parallel",
        telegram: telegram.data,
        events: deliveries.data,
        checkedAt: new Date().toISOString(),
      });
    }
    if (input.action === "pair") {
      if (!publicConfig().configured)
        return reply(
          { error: "PWA/VAPID chưa được cấu hình trên Supabase." },
          503,
        );
      const code = randomSecret(12);
      const { error } = await admin.rpc("create_web_push_pair", {
        actor: user.id,
        code_digest: await digest(code),
      });
      if (error)
        return reply(
          { error: "Chưa tạo được mã. Mỗi mã cách nhau ít nhất 30 giây." },
          429,
        );
      return reply({
        code,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        pwaUrl: publicConfig().pwaUrl,
      });
    }
    if (input.action === "policy") {
      if (!["parallel", "fallback"].includes(String(input.policy)))
        return reply({ error: "Chính sách không hợp lệ." }, 400);
      check(
        (
          await admin.from("notification_preferences").upsert({
            user_id: user.id,
            telegram_policy: input.policy,
            updated_at: new Date().toISOString(),
          })
        ).error,
      );
      return reply({ ok: true });
    }
    if (input.action === "revoke") {
      if (
        typeof input.deviceId !== "string" ||
        !uuidPattern.test(input.deviceId)
      )
        return reply({ error: "Thiết bị không hợp lệ." }, 400);
      // Owner only. Revocation expires the device credential as well as its endpoint.
      const { data, error } = await admin
        .from("web_push_devices")
        .update({
          enabled: false,
          endpoint: null,
          p256dh: null,
          auth_key: null,
          credential_expires_at: new Date().toISOString(),
        })
        .eq("id", input.deviceId)
        .eq("user_id", user.id)
        .eq("family_id", member.family_id)
        .select("id");
      check(error);
      return data?.length
        ? reply({ ok: true })
        : reply({ error: "Không có quyền với thiết bị này." }, 403);
    }
    if (input.action === "test") {
      if (
        !Array.isArray(input.deviceIds) ||
        !input.deviceIds.length ||
        input.deviceIds.length > 10 ||
        !input.deviceIds.every(
          (id) => typeof id === "string" && uuidPattern.test(id),
        )
      )
        return reply({ error: "Chọn thiết bị hợp lệ." }, 400);
      const { data, error } = await admin.rpc("create_web_push_test", {
        actor: user.id,
        target_devices: input.deviceIds,
      });
      if (error)
        return reply(
          { error: "Thiết bị chưa đăng ký hoặc không thuộc gia đình." },
          409,
        );
      return reply({
        queued: data?.length ?? 0,
        note: "Đã xếp hàng, chưa phải xác nhận iPhone nhận được.",
      });
    }
    if (input.action === "content" || input.action === "opened") {
      const content = await contentForEvent(
        admin,
        user.id,
        member.family_id,
        input.notificationId,
      );
      if (!content)
        return reply(
          { error: "Nội dung không còn tồn tại hoặc bạn không có quyền xem." },
          404,
        );
      if (input.action === "opened")
        check(
          (
            await admin
              .from("notification_events")
              .update({ native_opened_at: new Date().toISOString() })
              .eq("id", input.notificationId)
              .eq("recipient_id", user.id)
          ).error,
        );
      return reply(content);
    }
    if (input.action === "attention" || input.action === "acknowledge") {
      const args =
        input.action === "attention"
          ? { actor: user.id, request_id: input.request_id }
          : {
              actor: user.id,
              target_id: input.id,
              expected_revision: input.revision,
            };
      const { data, error } = await admin.rpc(
        input.action === "attention"
          ? "create_attention_reminder"
          : "acknowledge_family_reminder",
        args,
      );
      if (error)
        return reply(
          {
            error:
              "Chưa thực hiện được. Kiểm tra người nhận, phiên bản lời nhắc và thử lại sau 30 giây.",
          },
          409,
        );
      return reply({ saved: true, id: data });
    }
    return reply({ error: "Thao tác không được hỗ trợ." }, 400);
  } catch {
    return reply(
      {
        error:
          "Dịch vụ thông báo chưa sẵn sàng. Kiểm tra kết nối và migration 0007.",
      },
      503,
    );
  }
});
