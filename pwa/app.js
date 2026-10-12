(async function () {
  const P = AnNamProtocol,
    store = AnNamStore,
    $ = (id) => document.getElementById(id);
  const base = new URL(
    document.querySelector('link[rel="manifest"]').href,
  ).href.replace(/manifest\.webmanifest$/, "");
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    isSecureContext;
  let config,
    auth = await store.get("auth"),
    current = null,
    registration = null,
    busy = false,
    targetEpoch = 0;
  const pendingReceipts = new Map();
  const message = (text) => {
    $("message").textContent = text;
  };
  async function browserPush(promise) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  "Trình duyệt chưa phản hồi trạng thái Push. Hãy thử lại.",
                ),
              ),
            3000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function api(action, values = {}) {
    if (!config?.apiURL) throw new Error("Chưa có cấu hình máy chủ PWA.");
    const response = await fetch(config.apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth?.deviceToken ? { "x-device-token": auth.deviceToken } : {}),
      },
      body: JSON.stringify({ action, ...values }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Chưa kết nối được máy chủ.");
    return result;
  }
  function action(id, work) {
    $(id).onclick = async () => {
      if (busy) return;
      busy = true;
      $(id).disabled = true;
      try {
        await work();
      } catch (e) {
        message(e.message || "Thử lại sau.");
      } finally {
        busy = false;
        $(id).disabled = false;
        statusText();
      }
    };
  }
  const bytes = (key) =>
    Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0),
    );
  function statusText() {
    const permission = supported ? Notification.permission : "không hỗ trợ";
    $("status").textContent =
      `Môi trường: ${standalone ? "PWA trên Màn hình chính" : "trình duyệt"}. Quyền: ${permission}.` +
      (permission === "denied"
        ? " Quyền đã bị từ chối. Vào Cài đặt iPhone → Thông báo → An Nam để bật lại."
        : "");
    $("install").hidden = standalone;
    $("pair-panel").hidden = !!auth;
    $("subscribe").disabled =
      !supported ||
      !standalone ||
      !auth ||
      !registration ||
      !config?.publicKey ||
      permission === "denied";
    for (const id of ["test", "confirm", "unsubscribe", "refresh"])
      $(id).disabled = !auth;
  }
  async function reconcile() {
    statusText();
    if (!auth || !supported) return;
    registration ||= await navigator.serviceWorker.ready;
    const state = await api("status", {
      permission: Notification.permission,
      standalone,
    });
    $("device-status").textContent =
      `${state.label}. ${state.registered ? "Máy chủ đã lưu subscription (không chứng minh thông báo đã tới máy)." : "Chưa có subscription đang bật."}`;
    // Only sync an existing permission/subscription. Never prompt automatically.
    const sub = await browserPush(registration.pushManager.getSubscription());
    if (
      sub &&
      standalone &&
      Notification.permission === "granted" &&
      !(await store.get("pushDisabled"))
    )
      await api("register", {
        subscription: sub.toJSON(),
        permission: "granted",
        standalone: true,
      });
  }
  async function flushReceipts() {
    if (!config?.apiURL || !auth) return;
    for (const [key, value] of pendingReceipts) {
      try {
        await api("receipt", value);
        pendingReceipts.delete(key);
      } catch {
        /* Retry on next foreground, never poll. */
      }
    }
  }
  async function receipt(stage) {
    if (!current || !auth) return;
    pendingReceipts.set(`${current.notificationId}:${stage}`, {
      notificationId: current.notificationId,
      stage,
    });
    await flushReceipts();
  }
  async function showTarget(value) {
    const target = P.target(value);
    if (!target || current?.notificationId === target.notificationId) return;
    const epoch = ++targetEpoch;
    current = target;
    $("open-panel").hidden = false;
    $("setup").hidden = true;
    $("content").textContent = "";
    $("open-native").href = P.nativeURL(target);
    $("open-title").textContent = "Đang mở Gia Đình An Nam…";
    await store.take("pendingNavigation", target.notificationId);
    if (epoch !== targetEpoch) return;
    void receipt("pwa_opened");
    // One attempt per distinct activation, with a persistent guard against root restore loops.
    const attemptKey = `attempt:${target.notificationId}`;
    const attempted = await store.get(attemptKey);
    if (epoch !== targetEpoch) return;
    if (!attempted) {
      await store.set(attemptKey, Date.now());
      if (epoch !== targetEpoch) return;
      location.href = P.nativeURL(target);
      void receipt("launch_attempted");
    }
    $("open-title").textContent = "Mở nội dung trong ứng dụng";
    message(
      "Nếu IPA chưa mở, chạm nút bên dưới. Trang này không thể xác nhận IPA đã mở thành công.",
    );
  }
  $("open-native").addEventListener("click", () => {
    void receipt("launch_attempted");
  });
  action("show-content", async () => {
    if (!auth) {
      $("setup").hidden = false;
      throw new Error(
        "Ghép PWA với tài khoản trong IPA để xem nội dung riêng tư.",
      );
    }
    const epoch = targetEpoch,
      credential = auth.deviceToken;
    const data = await api("content", {
      notificationId: current.notificationId,
    });
    if (epoch !== targetEpoch || credential !== auth?.deviceToken) return;
    const row = data.record,
      parts = [];
    if (row.title) parts.push(row.title);
    if (row.due_at) parts.push(new Date(row.due_at).toLocaleString("vi-VN"));
    if (row.occurred_at)
      parts.push(new Date(row.occurred_at).toLocaleString("vi-VN"));
    if (row.body) parts.push(row.body);
    if (typeof row.details === "string") parts.push(row.details);
    if (row.details?.summary) parts.push(row.details.summary);
    if (row.note) parts.push(row.note);
    if (row.amount != null) parts.push(`${row.amount} ${row.unit || ""}`);
    if (row.image_paths?.length)
      parts.push(`${row.image_paths.length} ảnh riêng tư — mở IPA để xem.`);
    $("content").textContent = parts.join("\n\n") || data.body;
    message(
      "Nội dung đã được kiểm tra quyền truy cập. Không lưu vào cache PWA.",
    );
  });
  action("dismiss", async () => {
    targetEpoch++;
    current = null;
    $("content").textContent = "";
    $("open-panel").hidden = true;
    $("setup").hidden = false;
    history.replaceState(null, "", base);
    message("Quản lý thông báo");
    await reconcile();
  });
  action("pair", async () => {
    const result = await api("pair", {
      code: $("pair-code").value.trim().toLowerCase(),
      label: $("device-label").value.trim(),
    });
    auth = { deviceId: result.deviceId, deviceToken: result.deviceToken };
    await store.set("auth", auth);
    $("pair-code").value = "";
    config.publicKey = result.publicKey;
    await store.set("config", config);
    message("Đã ghép. Tiếp theo chạm Cho phép và bật Web Push.");
    await reconcile();
  });
  action("subscribe", async () => {
    if (!standalone || !supported || !auth)
      throw new Error("Mở PWA từ Màn hình chính và ghép tài khoản trước.");
    // Permission call is the FIRST asynchronous operation in this user click.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      statusText();
      throw new Error("Chưa được cấp quyền thông báo.");
    }
    registration ||= await navigator.serviceWorker.ready;
    const subscription =
      (await browserPush(registration.pushManager.getSubscription())) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes(config.publicKey),
      }));
    await api("register", {
      subscription: subscription.toJSON(),
      permission,
      standalone,
    });
    await store.set("pushDisabled", false);
    message("Đã đăng ký. Chạm Gửi thông báo thử để kiểm tra trên iPhone.");
    await reconcile();
  });
  action("test", async () => {
    const r = await api("test");
    message(
      r.queued
        ? "Đã xếp hàng gửi thử. Chờ thông báo trên iPhone; chưa xác nhận đã nhận."
        : "Vừa gửi thử. Chờ ít nhất 30 giây để thử lại.",
    );
  });
  action("confirm", async () => {
    await api("confirm");
    message(
      "Đã ghi nhận bạn xác nhận nhận tin thử. Thiết lập Telegram không bị thay đổi.",
    );
  });
  action("unsubscribe", async () => {
    await api("unsubscribe");
    await store.set("pushDisabled", true);
    let browserCleared = true;
    try {
      registration ||= await navigator.serviceWorker.ready;
      const sub = await browserPush(registration.pushManager.getSubscription());
      if (sub) await browserPush(sub.unsubscribe());
    } catch {
      browserCleared = false;
    }
    message(
      browserCleared
        ? "Đã tắt Web Push trên máy này. Các thiết bị khác không đổi."
        : "Máy chủ đã tắt gửi mới. Chưa gỡ được subscription trong trình duyệt; có thể còn tin đang chờ. Kiểm tra quyền Thông báo của An Nam.",
    );
    await reconcile();
  });
  action("unpair", async () => {
    if (
      !confirm(
        "Hủy liên kết PWA trên máy này để ghép lại? Thiết bị khác không thay đổi.",
      )
    )
      return;
    if (auth) {
      try {
        await api("unpair");
      } catch (e) {
        // A revoked/expired credential can be forgotten; network failure must not claim revocation.
        if (!/hết hạn|Ghép lại/.test(e.message)) throw e;
      }
    }
    await store.set("pushDisabled", true);
    try {
      const sub = await browserPush(
        registration?.pushManager.getSubscription(),
      );
      if (sub) await browserPush(sub.unsubscribe());
    } catch {
      /* Server credential is revoked; still clear all private local state. */
    }
    await store.take("auth");
    auth = null;
    targetEpoch++;
    current = null;
    pendingReceipts.clear();
    await store.take("pendingNavigation");
    $("content").textContent = "";
    $("inbox").replaceChildren();
    $("open-panel").hidden = true;
    history.replaceState(null, "", base);
    $("setup").hidden = false;
    message("Nhập mã mới từ IPA để ghép lại.");
  });
  action("refresh", async () => {
    const result = await api("inbox");
    $("inbox").replaceChildren();
    for (const event of result.events || []) {
      const button = document.createElement("button");
      button.className = "secondary";
      button.textContent = `${new Date(event.created_at).toLocaleString("vi-VN")} · ${event.kind}`;
      button.onclick = () => {
        void showTarget({
          notificationId: event.id,
          eventId: event.entity_id,
          type: P.typeFor(event),
        });
      };
      $("inbox").append(button);
    }
  });
  // Restore the tap target before any network request, including when offline.
  if (supported)
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "OPEN_NOTIFICATION") void showTarget(e.data.target);
    });
  const pending = await store.get("pendingNavigation");
  const initial =
    P.fromURL(location.href) ||
    (pending && Date.now() - pending.savedAt < 86400000
      ? P.target(pending)
      : null);
  if (initial) await showTarget(initial);
  if (supported) {
    try {
      await navigator.serviceWorker.register(
        new URL("service-worker.js", base),
        { scope: base },
      );
      registration = await navigator.serviceWorker.ready;
    } catch {
      message("Chưa khởi tạo được PWA. Kiểm tra HTTPS và mở lại.");
    }
  }
  try {
    config = await fetch(new URL("config.json", base), {
      cache: "no-store",
    }).then((r) => r.json());
    if (
      !/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/webpush-device$/.test(
        config.apiURL,
      )
    )
      throw new Error("Địa chỉ backend PWA chưa hợp lệ.");
    const published = await api("config");
    config.publicKey = published.publicKey;
    await store.set("config", config);
    if (!current)
      message(
        published.configured
          ? "Sẵn sàng thiết lập thông báo."
          : "Máy chủ chưa cấu hình đủ VAPID/PWA.",
      );
    if (current) void receipt("pwa_opened");
  } catch (e) {
    config ||= await store.get("config");
    message(e.message);
  }
  statusText();
  void flushReceipts();
  try {
    await reconcile();
  } catch (e) {
    message(e.message);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !busy) {
      void flushReceipts();
      void reconcile().catch((e) => message(e.message));
    }
  });
})().catch(() => {
  document.getElementById("message").textContent =
    "Không mở được bộ nhớ PWA. Hãy mở từ Màn hình chính, kiểm tra dung lượng và thử lại.";
});
