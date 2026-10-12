import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { sourceType, pushBody } from "./webPushPolicy.ts";
export type FamilyEvent = {
  id: string;
  family_id: string;
  actor_id: string | null;
  recipient_id: string;
  source_table: string;
  entity_id: string;
  kind: string;
  revision: number | null;
  state: string;
  created_at: string;
  expires_at: string;
};
export async function eventSource(admin: SupabaseClient, event: FamilyEvent) {
  if (
    ![
      "reminders",
      "family_posts",
      "post_comments",
      "care_entries",
      "test",
    ].includes(event.source_table)
  )
    return null;
  const { data: members, error: me } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_id", event.family_id);
  if (me) throw new Error("MembershipUnavailable");
  if (
    !members?.some((m) => m.user_id === event.recipient_id) ||
    (event.actor_id && !members.some((m) => m.user_id === event.actor_id))
  )
    return null;
  if (event.source_table === "test") return { id: event.entity_id };
  const { data, error } = await admin
    .from(event.source_table)
    .select("*")
    .eq("id", event.entity_id)
    .eq("family_id", event.family_id)
    .maybeSingle();
  if (error) throw new Error("SourceUnavailable");
  if (!data || data.deleted_at) return null;
  return data;
}
export function sourceIsCurrent(
  event: FamilyEvent,
  data: Record<string, unknown>,
) {
  if (event.state !== "active" || Date.parse(event.expires_at) <= Date.now())
    return false;
  if (event.source_table === "reminders")
    return (
      data.schedule_version === event.revision &&
      !(event.kind !== "completed" && data.completed_at) &&
      !(
        ["reminder_created", "rescheduled", "attention"].includes(event.kind) &&
        data.acknowledged_at
      ) &&
      !(
        event.kind === "calendar" &&
        Date.parse(String(data.due_at)) <= Date.now()
      )
    );
  if (event.kind === "pregnancy_status")
    return (
      data.telegram_revision === event.revision &&
      (data.details as Record<string, unknown>)?.tool === "pregnancy-today"
    );
  return true;
}
export function publicPayload(
  event: FamilyEvent,
  source: Record<string, unknown>,
) {
  return {
    version: 1,
    notificationId: event.id,
    type: sourceType(event.source_table, event.kind),
    eventId: event.entity_id,
    title: "Gia Đình An Nam",
    body: pushBody(event.kind, source.due_at as string | undefined),
    createdAt: event.created_at,
  };
}
// Returned only after credential + family membership + recipient checks. Never placed in push payload/cache.
export function privateContent(
  event: FamilyEvent,
  row: Record<string, unknown>,
) {
  const type = sourceType(event.source_table, event.kind);
  return {
    ...publicPayload(event, row),
    record:
      type === "reminder"
        ? {
            id: row.id,
            title: row.title,
            details: row.details,
            due_at: row.due_at,
            child_id: row.child_id,
            completed_at: row.completed_at,
            acknowledged_at: row.acknowledged_at,
            schedule_version: row.schedule_version,
            created_by: row.created_by,
          }
        : ["post", "comment"].includes(type)
          ? {
              id: row.id,
              body: row.body,
              post_id: row.post_id,
              image_paths: row.image_paths,
              created_at: row.created_at,
            }
          : ["care", "pregnancy"].includes(type)
            ? {
                id: row.id,
                kind: row.kind,
                child_id: row.child_id,
                note: row.note,
                details: row.details,
                amount: row.amount,
                unit: row.unit,
                occurred_at: row.occurred_at,
              }
            : { id: row.id, title: "Thông báo kiểm tra" },
  };
}
