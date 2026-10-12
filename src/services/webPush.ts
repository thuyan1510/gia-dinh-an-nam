import { supabase } from "../lib/supabase";
import { telegramAction } from "./telegram";
export type WebPushDevice = {
  id: string;
  user_id: string;
  label: string;
  enabled: boolean;
  permission: string;
  standalone: boolean;
  last_seen_at: string | null;
  last_accepted_at: string | null;
  confirmed_at: string | null;
  credential_expires_at: string;
};
export type WebPushEvent = {
  id: string;
  kind: string;
  source_table: string;
  entity_id: string;
  created_at: string;
  state: string;
  native_opened_at: string | null;
  web_push_deliveries: Array<{
    device_id: string;
    state: string;
    last_error: string | null;
    accepted_at: string | null;
    displayed_at: string | null;
    clicked_at: string | null;
    pwa_opened_at: string | null;
    launch_attempted_at: string | null;
  }>;
};
export type WebPushStatus = {
  configured: boolean;
  pwaUrl: string;
  userId: string;
  policy: "parallel" | "fallback";
  telegram: { enabled: boolean; confirmed_at: string | null } | null;
  devices: WebPushDevice[];
  events: WebPushEvent[];
  checkedAt: string;
};
export async function webPushAction<T = { ok: boolean }>(
  action: string,
  values: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await supabase.functions.invoke("webpush-account", {
    body: { action, ...values },
  });
  if (error) {
    // Rolling deployment: keep the existing idempotent attention RPC usable until
    // the new endpoint exists. Never bypass an authorization or validation error.
    if (action === "attention" && error.context?.status === 404)
      return telegramAction<T>(action, values);
    let message =
      "Chưa kết nối được dịch vụ thông báo. Kiểm tra mạng và cấu hình Web Push.";
    try {
      const body = await error.context?.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export function eventTarget(event: WebPushEvent) {
  const type = {
    reminders: "reminder",
    family_posts: "post",
    post_comments: "comment",
    care_entries: event.kind === "pregnancy_status" ? "pregnancy" : "care",
    test: "test",
  }[event.source_table];
  return { type, id: event.entity_id, notificationId: event.id };
}
