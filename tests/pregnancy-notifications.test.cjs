const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
const { careDay, shiftDay } = require("../src/lib/dailyCare.ts");
const scheduled = new Map();
const prefs = new Map();
let allowed = true;
let children = [];
let records = [];
let tokenCalls = 0;
let schedulingError = false;
const native = {
  setNotificationHandler() {},
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily" },
  getPermissionsAsync: async () => ({ granted: allowed }),
  getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
  cancelScheduledNotificationAsync: async (id) => {
    scheduled.delete(id);
  },
  scheduleNotificationAsync: async (request) => {
    if (schedulingError) throw new Error("OS scheduling failure");
    scheduled.set(request.identifier, request);
    return request.identifier;
  },
  getExpoPushTokenAsync: async () => {
    tokenCalls++;
    throw new Error("aps-environment missing");
  },
};
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === "expo-notifications") return native;
  if (id === "expo-device") return { isDevice: true };
  if (id === "expo-constants") return { __esModule: true, default: {} };
  if (id === "react-native") return { Platform: { OS: "ios" } };
  return load.call(this, id, ...args);
};
const {
  reconcilePregnancyNotifications,
  savePregnancyReminderSettings,
} = require("../src/services/pregnancyNotifications.ts");
const db = {
  getAllAsync: async (sql) => (/FROM children/.test(sql) ? children : records),
  getFirstAsync: async (_sql, key) =>
    prefs.has(key) ? { value: prefs.get(key) } : null,
  runAsync: async (_sql, key, value) => {
    prefs.set(key, value);
  },
};
const settings = {
  enabled: true,
  dailyInfo: true,
  diary: true,
  infoTime: "09:00",
  diaryTime: "20:30",
};
const baseChild = () => ({
  id: "c1",
  family_id: "f1",
  name: "An",
  birthday: null,
  due_date: shiftDay(careDay(new Date().toISOString()), 140),
});

test("native reconciliation is idempotent, isolated and entirely independent of APNs", async () => {
  children = [baseChild()];
  scheduled.set("family-1", {
    identifier: "family-1",
    content: { data: { route: "/gia-dinh" } },
  });
  await savePregnancyReminderSettings(db, "c1", settings);
  const first = await reconcilePregnancyNotifications(db);
  assert.equal(first.count, 12);
  assert.equal(first.dailyCount, 2);
  const repeats = [...scheduled.values()].filter(
    (r) => r.trigger?.type === "daily",
  );
  assert.equal(repeats.length, 2);
  assert.ok(
    repeats.every(
      (r) => r.content.data.day === null && r.content.data.repeatsDaily,
    ),
  );
  const signatures = [...scheduled.values()].map(
    (v) => v.content.data.signature,
  );
  await Promise.all([
    reconcilePregnancyNotifications(db),
    reconcilePregnancyNotifications(db),
  ]);
  assert.deepEqual(
    [...scheduled.values()].map((v) => v.content.data.signature),
    signatures,
  );
  assert.equal(scheduled.size, 13);
  assert.equal(tokenCalls, 0);
  children[0].due_date = shiftDay(children[0].due_date, 1);
  await reconcilePregnancyNotifications(db);
  assert.notDeepEqual(
    [...scheduled.values()].map((v) => v.content.data.signature),
    signatures,
  );
  assert.ok(scheduled.has("family-1"));
  children[0].birthday = careDay(new Date().toISOString());
  await reconcilePregnancyNotifications(db);
  assert.equal(scheduled.size, 1);
});
test("toggling off, revoking permissions and removing a family cancel only pregnancy requests", async () => {
  children = [baseChild()];
  await reconcilePregnancyNotifications(db);
  assert.equal(scheduled.size, 13);
  await savePregnancyReminderSettings(db, "c1", {
    ...settings,
    enabled: false,
  });
  await reconcilePregnancyNotifications(db);
  assert.equal(scheduled.size, 1);
  await savePregnancyReminderSettings(db, "c1", settings);
  await reconcilePregnancyNotifications(db);
  allowed = false;
  await reconcilePregnancyNotifications(db);
  assert.equal(scheduled.size, 1);
  allowed = true;
  await reconcilePregnancyNotifications(db);
  children = [];
  await reconcilePregnancyNotifications(db);
  assert.equal(scheduled.size, 1);
});
test("queue capacity protects unrelated reminders; failures are surfaced and retried", async () => {
  scheduled.clear();
  children = [baseChild()];
  for (let i = 0; i < 59; i++)
    scheduled.set(`other-${i}`, {
      identifier: `other-${i}`,
      content: { data: {} },
    });
  const result = await reconcilePregnancyNotifications(db);
  assert.equal(result.count, 1);
  assert.equal(scheduled.size, 60);
  scheduled.clear();
  schedulingError = true;
  await assert.rejects(
    reconcilePregnancyNotifications(db),
    /OS scheduling failure/,
  );
  schedulingError = false;
  assert.equal((await reconcilePregnancyNotifications(db)).count, 12);
});
