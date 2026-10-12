import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import {
  eventSource,
  sourceIsCurrent,
  publicPayload,
} from "./notificationContent.ts";
import { validPushEndpoint, retryDecision } from "./webPushPolicy.ts";
export async function processWebPush(
  admin: SupabaseClient,
  send: (
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    ttl: number,
  ) => Promise<{ status: number; retryAfter: string | null }>,
) {
  const { data: jobs, error } = await admin.rpc("claim_web_push_jobs");
  if (error) throw new Error("WebPushQueueUnavailable");
  let accepted = 0;
  for (const job of jobs ?? []) {
    const finish = async (fields: Record<string, unknown>) => {
      const { error } = await admin
        .from("web_push_deliveries")
        .update(fields)
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .eq("state", "processing");
      if (error) throw new Error("WebPushCheckpointFailed");
    };
    try {
      const [e, d] = await Promise.all([
        admin
          .from("notification_events")
          .select("*")
          .eq("id", job.notification_id)
          .maybeSingle(),
        admin
          .from("web_push_devices")
          .select("*")
          .eq("id", job.device_id)
          .maybeSingle(),
      ]);
      if (e.error || d.error) throw new Error("WebPushReadFailed");
      const event = e.data,
        device = d.data;
      if (
        !event ||
        !device ||
        !device.enabled ||
        device.permission !== "granted" ||
        !validPushEndpoint(device.endpoint) ||
        device.user_id !== event.recipient_id ||
        device.family_id !== event.family_id ||
        Date.parse(device.credential_expires_at) <= Date.now()
      ) {
        await finish({ state: "cancelled", lease_id: null });
        continue;
      }
      const source = await eventSource(admin, event);
      if (!source || !sourceIsCurrent(event, source)) {
        await finish({ state: "cancelled", lease_id: null });
        continue;
      }
      const { data: active, error: ae } = await admin
        .from("web_push_deliveries")
        .select("id")
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .eq("state", "processing")
        .maybeSingle();
      if (ae) throw new Error("WebPushLeaseFailed");
      if (!active) continue;
      const result = await send(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth_key },
        },
        JSON.stringify(publicPayload(event, source)),
        Math.max(
          1,
          Math.min(
            3600,
            Math.floor((Date.parse(event.expires_at) - Date.now()) / 1000),
          ),
        ),
      );
      if (result.status >= 200 && result.status < 300) {
        await finish({
          state: "accepted",
          accepted_at: new Date().toISOString(),
          last_error: null,
          lease_id: null,
        });
        await admin
          .from("web_push_devices")
          .update({ last_accepted_at: new Date().toISOString() })
          .eq("id", device.id);
        accepted++;
      } else {
        const decision = retryDecision(
          result.status,
          job.attempts,
          result.retryAfter,
        );
        if (decision.disable)
          await admin
            .from("web_push_devices")
            .update({ enabled: false })
            .eq("id", device.id)
            .eq("endpoint", device.endpoint);
        await finish({
          state: decision.state,
          due_at: new Date(Date.now() + decision.delay * 1000).toISOString(),
          lease_id: null,
          last_error: `WebPushHTTP${result.status}`,
        });
      }
    } catch {
      const decision = retryDecision(0, job.attempts, null);
      await finish({
        state: decision.state,
        due_at: new Date(Date.now() + decision.delay * 1000).toISOString(),
        lease_id: null,
        last_error: "TemporaryDeliveryFailure",
      });
    }
  }
  return { accepted, processed: jobs?.length ?? 0 };
}
