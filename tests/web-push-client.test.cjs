const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const ts = require("typescript");
function client(status) {
  const exports = {},
    calls = [];
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/services/webPush.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) =>
        name === "../lib/supabase"
          ? {
              supabase: {
                functions: {
                  invoke: async () => ({
                    error: {
                      context: {
                        status,
                        json: async () => ({ error: "Unavailable" }),
                      },
                    },
                  }),
                },
              },
            }
          : {
              telegramAction: async (action, values) => {
                calls.push({ action, values });
                return { saved: true };
              },
            },
      Error,
    },
  );
  return { ...exports, calls };
}
test("rolling deployment preserves idempotent attention through the existing endpoint only for a missing new function", async () => {
  const service = client(404);
  assert.equal(
    (await service.webPushAction("attention", { request_id: "attention_1" }))
      .saved,
    true,
  );
  assert.equal(service.calls[0].values.request_id, "attention_1");
  await assert.rejects(
    service.webPushAction("content", { notificationId: "event" }),
  );
  assert.equal(service.calls.length, 1);
});
test("authorization, validation and transient errors never trigger an alternate attention write", async () => {
  for (const status of [401, 403, 409, 503, undefined]) {
    const service = client(status);
    await assert.rejects(
      service.webPushAction("attention", { request_id: "attention_1" }),
    );
    assert.equal(service.calls.length, 0);
  }
});
