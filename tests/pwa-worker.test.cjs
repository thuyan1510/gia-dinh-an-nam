const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const P = require("../pwa/protocol.js");
function fixture(windows = []) {
  const handlers = {},
    state = new Map(),
    shown = [],
    opened = [],
    receipts = [];
  const scope = "https://family.example/Gia-dinh-An-Nam/";
  const self = {
    registration: {
      scope,
      showNotification: async (title, options) =>
        shown.push({ title, ...options }),
    },
    addEventListener: (name, handler) => (handlers[name] = handler),
    clients: {
      matchAll: async () => windows,
      openWindow: async (url) => {
        opened.push(url);
        return { postMessage: (message) => opened.push(message) };
      },
      claim: async () => {},
    },
    skipWaiting: async () => {},
  };
  const context = {
    self,
    URL,
    Response,
    Uint8Array,
    atob,
    Date,
    AbortSignal,
    AnNamProtocol: P,
    AnNamStore: {
      get: async (key) => state.get(key),
      set: async (key, value) => state.set(key, value),
    },
    importScripts: () => {},
    caches: {
      keys: async () => [],
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
    },
    fetch: async (url, options) => {
      receipts.push({ url, ...options });
      return new Response("{}", { status: 200 });
    },
  };
  vm.runInNewContext(fs.readFileSync("pwa/service-worker.js", "utf8"), context);
  return {
    handlers,
    state,
    shown,
    opened,
    receipts,
    scope,
    async dispatch(name, fields) {
      let promise;
      handlers[name]({ ...fields, waitUntil: (p) => (promise = p) });
      await promise;
    },
  };
}
const target = {
  notificationId: "10000000-0000-4000-8000-000000000001",
  type: "reminder",
  eventId: "r_1",
};
test("subscription renewal cannot re-enable an opted-out device", async () => {
  const f = fixture();
  f.state.set("auth", { deviceToken: "TEST_DEVICE_SECRET" });
  f.state.set("config", {
    publicKey: "key",
    apiURL: "https://example.supabase.co/functions/v1/webpush-device",
  });
  f.state.set("pushDisabled", true);
  await f.dispatch("pushsubscriptionchange", {});
  assert.equal(f.receipts.length, 0);
});
test("push is visibly displayed with a stable tag before acknowledging; payload cannot override title or URLs", async () => {
  const f = fixture();
  f.state.set("auth", { deviceToken: "TEST_DEVICE_SECRET" });
  f.state.set("config", {
    apiURL: "https://example.supabase.co/functions/v1/webpush-device",
  });
  await f.dispatch("push", {
    data: {
      json: () => ({
        ...target,
        title: "Untrusted title",
        body: "Lịch gia đình",
        url: "https://evil.example",
      }),
    },
  });
  assert.equal(f.shown[0].title, "Gia Đình An Nam");
  assert.equal(f.shown[0].tag, target.notificationId);
  assert.equal(f.shown[0].data.url, undefined);
  assert.equal(JSON.parse(f.receipts[0].body).stage, "displayed");
  assert.ok(!JSON.stringify(f.shown).includes("TEST_DEVICE_SECRET"));
});
test("notificationclick persists a target before HTTPS openWindow, never opens native scheme from worker", async () => {
  const f = fixture();
  let closed = false;
  await f.dispatch("notificationclick", {
    notification: { data: target, close: () => (closed = true) },
  });
  assert.equal(closed, true);
  assert.equal(f.state.get("pendingNavigation").eventId, "r_1");
  assert.ok(f.opened[0].startsWith(f.scope + "open-app/?"));
  assert.ok(!f.opened[0].startsWith("giadinhanam:"));
});
test("warm PWA is navigated and focused; malformed click safely opens same-origin root", async () => {
  const events = [],
    client = {
      url: "https://family.example/Gia-dinh-An-Nam/",
      navigate: async (url) => {
        events.push(url);
        return client;
      },
      focus: async () => events.push("focused"),
      postMessage: (m) => events.push(m),
    };
  const f = fixture([client]);
  await f.dispatch("notificationclick", {
    notification: { data: target, close() {} },
  });
  assert.equal(events[1], "focused");
  assert.equal(f.opened.length, 0);
  const bad = fixture();
  await bad.dispatch("notificationclick", {
    notification: {
      data: {
        ...target,
        eventId: "../../account",
        url: "https://evil.example",
      },
      close() {},
    },
  });
  assert.equal(bad.opened[0], bad.scope);
});
test("worker cache handles only public shell GETs, never authenticated API/content responses", () => {
  const f = fixture();
  for (const url of [
    "https://example.supabase.co/functions/v1/webpush-device",
    f.scope + "private-record.json",
    f.scope + "icons/unknown.png",
  ]) {
    let handled = false;
    f.handlers.fetch({
      request: { url, method: "GET" },
      respondWith() {
        handled = true;
      },
    });
    assert.equal(handled, false);
  }
});
