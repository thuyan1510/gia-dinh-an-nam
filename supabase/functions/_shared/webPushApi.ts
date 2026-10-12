import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { digest } from "./telegram.ts";
import {
  eventSource,
  privateContent,
  type FamilyEvent,
} from "./notificationContent.ts";
import { uuidPattern } from "./webPushPolicy.ts";
export const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
export function publicConfig() {
  const pwaUrl = Deno.env.get("WEB_PUSH_PWA_URL") ?? "";
  return {
    pwaUrl,
    publicKey: Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") ?? "",
    configured: !!(
      pwaUrl &&
      Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY") &&
      Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") &&
      Deno.env.get("WEB_PUSH_VAPID_SUBJECT")
    ),
  };
}
export function apiResponse(req: Request) {
  const origin = req.headers.get("Origin"),
    pwa = publicConfig().pwaUrl;
  let allowed = "";
  try {
    allowed = new URL(pwa).origin;
  } catch {
    /* not deployed */
  }
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-device-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && origin === allowed)
    headers["Access-Control-Allow-Origin"] = origin;
  return {
    allowed: !origin || origin === allowed,
    reply: (body: unknown, status = 200) =>
      Response.json(body, { status, headers }),
  };
}
export function check(error: unknown) {
  if (error) throw new Error("DatabaseUnavailable");
}
export function randomSecret(bytes = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function deviceAuth(
  req: Request,
  admin: ReturnType<typeof adminClient>,
) {
  const token = req.headers.get("x-device-token") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await admin
    .from("web_push_devices")
    .select("*")
    .eq("credential_hash", await digest(token))
    .gt("credential_expires_at", new Date().toISOString())
    .maybeSingle();
  check(error);
  if (!data) return null;
  const { data: member, error: me } = await admin
    .from("family_members")
    .select("user_id")
    .eq("user_id", data.user_id)
    .eq("family_id", data.family_id)
    .maybeSingle();
  check(me);
  return member ? data : null;
}
export async function contentForEvent(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  familyId: string,
  notificationId: unknown,
) {
  if (typeof notificationId !== "string" || !uuidPattern.test(notificationId))
    return null;
  const { data: event, error } = await admin
    .from("notification_events")
    .select("*")
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .eq("family_id", familyId)
    .maybeSingle();
  check(error);
  if (!event) return null;
  const source = await eventSource(admin, event as FamilyEvent);
  return source ? privateContent(event, source) : null;
}
export async function jsonInput(req: Request) {
  const raw = await req.text();
  if (raw.length > 20000) throw new Error("InputTooLarge");
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("InvalidInput");
  return value as Record<string, unknown>;
}
