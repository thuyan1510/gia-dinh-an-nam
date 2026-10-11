import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Child } from "../types";
import { notificationAllowed } from "./notifications";
import {
  parsePregnancyReminders,
  planPregnancyReminders,
  type PregnancyReminderSettings,
} from "../lib/pregnancyReminderPlan";
import { stringDetails } from "../lib/recordValidation";
const preferenceKey = (childId: string) => `pregnancy-reminders:${childId}`;
export async function readPregnancyReminderSettings(
  db: SQLiteDatabase,
  childId: string,
) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key=?",
    preferenceKey(childId),
  );
  return parsePregnancyReminders(row?.value);
}
export async function savePregnancyReminderSettings(
  db: SQLiteDatabase,
  childId: string,
  value: PregnancyReminderSettings,
) {
  await db.runAsync(
    "INSERT INTO app_preferences(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    preferenceKey(childId),
    JSON.stringify(parsePregnancyReminders(value)),
  );
}
export type PregnancyNotificationStatus = {
  count: number;
  through: string | null;
  allowed: boolean;
  supported: boolean;
};
const queue = new WeakMap<
  SQLiteDatabase,
  Promise<PregnancyNotificationStatus>
>();
export async function reconcilePregnancyNotifications(
  db: SQLiteDatabase,
): Promise<PregnancyNotificationStatus> {
  const previous = queue.get(db) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => reconcile(db));
  queue.set(db, next);
  try {
    return await next;
  } finally {
    if (queue.get(db) === next) queue.delete(db);
  }
}
async function reconcile(
  db: SQLiteDatabase,
): Promise<PregnancyNotificationStatus> {
  if (Platform.OS === "web")
    return { count: 0, through: null, allowed: false, supported: false };
  const permission = await Notifications.getPermissionsAsync();
  const allowed = notificationAllowed(permission);
  const children = await db.getAllAsync<Child>(
    "SELECT * FROM children WHERE family_id = (SELECT id FROM families LIMIT 1)",
  );
  const profiles = await Promise.all(
    children.map(async (child) => {
      const settings = await readPregnancyReminderSettings(db, child.id);
      if (!settings.enabled || child.birthday || !child.due_date)
        return { child, settings, recordedDays: new Set<string>() };
      const recorded = await db.getAllAsync<{ details: string }>(
        "SELECT details FROM care_entries WHERE child_id=? AND kind='activity' AND deleted_at IS NULL",
        child.id,
      );
      const recordedDays = new Set(
        recorded
          .map((r) => stringDetails(r.details))
          .filter((d) => d.tool === "pregnancy-today" && d.day)
          .map((d) => d.day!),
      );
      return { child, settings, recordedDays };
    }),
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (n) => n.content.data?.scope === "pregnancy-v1",
  );
  const unrelatedCount = scheduled.length - ours.length;
  // Family reminders use at most 48 slots. Reserve room for tests/other features.
  const planned = allowed
    ? planPregnancyReminders(
        profiles,
        new Date(),
        Math.max(0, 60 - unrelatedCount),
      )
    : [];
  const kept = new Set<string>();
  for (const old of ours) {
    const match = planned.find(
      (p) =>
        p.identifier === old.identifier &&
        p.signature === old.content.data?.signature,
    );
    if (!match || kept.has(old.identifier))
      await Notifications.cancelScheduledNotificationAsync(old.identifier);
    else kept.add(old.identifier);
  }
  for (const request of planned) {
    if (kept.has(request.identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: {
        title: request.title,
        body: request.body,
        sound: "default",
        data: {
          scope: "pregnancy-v1",
          route: "/pregnancy",
          childId: request.childId,
          day: request.day,
          kind: request.kind,
          articleId: request.articleId ?? null,
          signature: request.signature,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: request.at,
        channelId: Platform.OS === "android" ? "family-reminders" : undefined,
      },
    });
  }
  return {
    supported: true,
    allowed,
    count: planned.length,
    through: planned.at(-1)?.day ?? null,
  };
}
