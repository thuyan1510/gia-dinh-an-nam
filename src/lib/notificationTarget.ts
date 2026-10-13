export const notificationTypes = [
  "reminder",
  "post",
  "comment",
  "care",
  "pregnancy",
  "message",
  "test",
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export type NotificationTarget = {
  type: NotificationType;
  id: string;
  notificationId?: string;
};
export function parseNotificationTarget(
  value: Record<string, unknown>,
): NotificationTarget | null {
  if (
    !notificationTypes.includes(value.type as NotificationType) ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,120}$/.test(value.id)
  )
    return null;
  if (
    value.notificationId !== undefined &&
    (typeof value.notificationId !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
        value.notificationId,
      ))
  )
    return null;
  return {
    type: value.type as NotificationType,
    id: value.id,
    ...(value.notificationId
      ? { notificationId: value.notificationId as string }
      : {}),
  };
}
export function notificationPath(target: NotificationTarget) {
  const query = new URLSearchParams({ type: target.type, id: target.id });
  if (target.notificationId) query.set("notificationId", target.notificationId);
  return `/notification/open?${query}`;
}
export function notificationSystemPath(path: string): string {
  try {
    const url = new URL(path, "giadinhanam:///");
    const isNotification =
      url.hostname === "notification" || url.pathname === "/notification/open";
    if (!isNotification) return path;
    if (
      !["giadinhanam:", "giadinhannam:"].includes(url.protocol) ||
      (url.hostname === "notification" && url.pathname !== "/open")
    )
      return "/notifications/inbox";
    for (const key of ["type", "id", "notificationId"])
      if (url.searchParams.getAll(key).length > 1)
        return "/notifications/inbox";
    const target = parseNotificationTarget(
      Object.fromEntries(url.searchParams),
    );
    return target ? notificationPath(target) : "/notifications/inbox";
  } catch {
    return "/notifications/inbox";
  }
}
