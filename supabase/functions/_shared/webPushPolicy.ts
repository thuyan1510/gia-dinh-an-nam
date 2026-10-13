export const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function validPushEndpoint(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 4096) return false;
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      (/^(?:[a-z0-9-]+\.)*push\.apple\.com$/i.test(u.hostname) ||
        u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com") &&
      u.pathname.length > 1
    );
  } catch {
    return false;
  }
}
export function subscriptionFields(value: unknown) {
  const sub = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;
  if (
    !sub ||
    !validPushEndpoint(sub.endpoint) ||
    typeof sub.keys?.p256dh !== "string" ||
    !/^[A-Za-z0-9_-]{87}={0,2}$/.test(sub.keys.p256dh) ||
    typeof sub.keys.auth !== "string" ||
    !/^[A-Za-z0-9_-]{22}={0,2}$/.test(sub.keys.auth)
  )
    throw new Error("InvalidSubscription");
  return {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth_key: sub.keys.auth,
  };
}
export function sourceType(source: string, kind: string) {
  if (source === "reminders") return "reminder";
  if (source === "family_posts") return "post";
  if (source === "family_messages") return "message";
  if (source === "post_comments") return "comment";
  if (source === "care_entries")
    return kind === "pregnancy_status" ? "pregnancy" : "care";
  return "test";
}
export function pushBody(kind: string, dueAt?: string) {
  const labels: Record<string, string> = {
    attention: "Người nhà cần bạn hỗ trợ. Chạm để mở lời nhắc.",
    reminder_created: "Có lời nhắc mới trong gia đình.",
    rescheduled: "Lịch hẹn của gia đình vừa thay đổi.",
    acknowledged: "Người nhà đã xác nhận nhận lời nhắc.",
    completed: "Lời nhắc đã được cập nhật trạng thái hoàn thành.",
    family_posts: "Gia đình có bài đăng mới.",
    family_messages: "Bạn có tin nhắn mới từ người nhà. Chạm để mở Trao đổi.",
    post_comments: "Gia đình có bình luận mới.",
    care_entries: "Có cập nhật mới trong nhật ký chăm bé.",
    pregnancy_status: "Cân nặng hoặc triệu chứng thai kỳ vừa được cập nhật.",
    test: "Thông báo kiểm tra. Chạm để thử mở Gia Đình An Nam.",
  };
  if (kind === "calendar" && dueAt && Number.isFinite(Date.parse(dueAt)))
    return (
      "Nhắc lịch: " +
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(dueAt)) +
      " (giờ Việt Nam)."
    );
  return labels[kind] ?? "Gia đình có cập nhật mới.";
}
export function retryDecision(
  status: number,
  attempt: number,
  retryAfter: string | null,
  now = Date.now(),
) {
  if ([404, 410].includes(status))
    return { state: "failed", disable: true, delay: 0 };
  const temporary =
    status === 0 || status === 408 || status === 429 || status >= 500;
  let delay = [30, 60, 120, 300, 900, 1800][
    Math.min(Math.max(0, attempt - 1), 5)
  ]!;
  if (retryAfter) {
    const seconds = /^\d+$/.test(retryAfter)
      ? Number(retryAfter)
      : (Date.parse(retryAfter) - now) / 1000;
    if (Number.isFinite(seconds))
      delay = Math.max(delay, Math.min(86400, Math.ceil(seconds)));
  }
  return {
    state: temporary && attempt < 6 ? "pending" : "failed",
    disable: false,
    delay,
  };
}
