import webpush from "npm:web-push@3.6.7";
import { validPushEndpoint } from "./webPushPolicy.ts";
export function webPushConfigured() {
  return !!(
    Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") &&
    Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY") &&
    Deno.env.get("WEB_PUSH_VAPID_SUBJECT")
  );
}
export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  ttl: number,
) {
  if (!validPushEndpoint(subscription.endpoint))
    throw new Error("InvalidSubscription");
  const request = webpush.generateRequestDetails(subscription, payload, {
    TTL: ttl,
    urgency: "high",
    contentEncoding: "aes128gcm",
    vapidDetails: {
      subject: Deno.env.get("WEB_PUSH_VAPID_SUBJECT")!,
      publicKey: Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY")!,
      privateKey: Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY")!,
    },
  });
  // fetch rather than node HTTPS: enforce no redirects/SSRF and bounded per-device latency.
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: request.headers,
    body: request.body,
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  const status = response.status,
    retryAfter = response.headers.get("Retry-After");
  await response.body?.cancel();
  return { status, retryAfter };
}
