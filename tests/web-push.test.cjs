const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
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
const policy = require("../supabase/functions/_shared/webPushPolicy.ts");
const native = require("../src/lib/notificationTarget.ts");
const protocol = require("../pwa/protocol.js");
const {
  publicPayload,
  sourceIsCurrent,
} = require("../supabase/functions/_shared/notificationContent.ts");
const {
  processWebPush,
} = require("../supabase/functions/_shared/webPushWorker.ts");
test("43 local transparent renders map exactly to completed weeks without a runtime Flo request", () => {
  const crypto = require("node:crypto");
  const manifest = JSON.parse(
    fs.readFileSync("assets/pregnancy-model-renders/manifest.json", "utf8"),
  );
  assert.equal(manifest.weeks.length, 43);
  for (const [week, entry] of manifest.weeks.entries()) {
    assert.equal(entry.completedWeek, week);
    assert.equal(entry.sceneId, String(week));
    const bytes = fs.readFileSync(
      `assets/pregnancy-model-renders/${entry.file}`,
    );
    assert.equal(bytes.readUInt32BE(16), 640);
    assert.equal(bytes.readUInt32BE(20), 640);
    assert.equal(bytes[25], 6, "PNG has an alpha channel");
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
  }
});
test("push endpoints are HTTPS vendor endpoints, not an arbitrary SSRF URL", () => {
  for (const value of [
    "https://web.push.apple.com/a",
    "https://fcm.googleapis.com/fcm/send/a",
    "https://updates.push.services.mozilla.com/wpush/v2/a",
  ])
    assert.equal(policy.validPushEndpoint(value), true);
  for (const value of [
    "http://web.push.apple.com/a",
    "https://web.push.apple.com.evil.test/a",
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://web.push.apple.com:444/a",
    "https://user@web.push.apple.com/a",
    "https://web.push.apple.com/a#frag",
  ])
    assert.equal(policy.validPushEndpoint(value), false);
  assert.throws(() =>
    policy.subscriptionFields({
      endpoint: "https://web.push.apple.com/a",
      keys: { p256dh: "bad", auth: "bad" },
    }),
  );
});
test("PWA and IPA agree on all real targets, both schemes; hostile and duplicate parameters fail safely", () => {
  const notificationId = "10000000-0000-4000-8000-000000000001";
  for (const type of native.notificationTypes) {
    const p = { type, eventId: "care_123", notificationId };
    const link = protocol.nativeURL(p);
    assert.equal(
      native.notificationSystemPath(link),
      `/notification/open?type=${type}&id=care_123&notificationId=${notificationId}`,
    );
    assert.deepEqual(
      protocol.fromURL(`https://example.test/open-app/?${protocol.query(p)}`),
      p,
    );
    assert.equal(
      native.notificationSystemPath(
        link.replace("giadinhanam:", "giadinhannam:"),
      ),
      native.notificationSystemPath(link),
    );
  }
  for (const link of [
    "giadinhanam://notification/open?type=delete&id=x",
    "giadinhanam://notification/open?type=care&id=..%2Faccount",
    "giadinhanam://notification/open?type=care&type=post&id=x",
    "https://notification/open?type=care&id=x",
  ])
    assert.equal(native.notificationSystemPath(link), "/notifications/inbox");
  assert.equal(
    native.notificationSystemPath("giadinhannam://family/attention"),
    "giadinhannam://family/attention",
  );
  assert.equal(
    protocol.fromURL(
      "https://example.test/open-app/?type=care&id=x&notificationId=bad",
    ),
    null,
  );
});
test("push has IDs and generic text only, and stale source revisions are rejected", () => {
  const e = {
    id: "e",
    family_id: "f",
    recipient_id: "u",
    kind: "pregnancy_status",
    source_table: "care_entries",
    entity_id: "care",
    revision: 2,
    state: "active",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60000).toISOString(),
  };
  const row = {
    telegram_revision: 2,
    details: {
      tool: "pregnancy-today",
      weight: "SECRET_WEIGHT",
      note: "SECRET_NOTE",
    },
  };
  assert.ok(!JSON.stringify(publicPayload(e, row)).includes("SECRET"));
  assert.equal(sourceIsCurrent(e, row), true);
  assert.equal(sourceIsCurrent({ ...e, revision: 1 }, row), false);
  assert.equal(sourceIsCurrent({ ...e, state: "cancelled" }, row), false);
  assert.equal(policy.retryDecision(410, 1, null).disable, true);
  assert.equal(policy.retryDecision(429, 1, "120").delay, 120);
  assert.equal(policy.retryDecision(503, 6, null).state, "failed");
  assert.equal(policy.retryDecision(403, 1, null).disable, false);
});
function fixture() {
  const rows = {
    notification_events: [
      {
        id: "e",
        family_id: "f",
        actor_id: "a",
        recipient_id: "b",
        source_table: "care_entries",
        entity_id: "care",
        kind: "pregnancy_status",
        revision: 2,
        state: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    ],
    web_push_devices: [1, 2].map((n) => ({
      id: `d${n}`,
      user_id: "b",
      family_id: "f",
      enabled: true,
      permission: "granted",
      endpoint: `https://web.push.apple.com/${n}`,
      p256dh: "key",
      auth_key: "auth",
      credential_expires_at: new Date(Date.now() + 60000).toISOString(),
    })),
    web_push_deliveries: [1, 2].map((n) => ({
      id: `j${n}`,
      notification_id: "e",
      device_id: `d${n}`,
      state: "pending",
      attempts: 0,
    })),
    family_members: [
      { family_id: "f", user_id: "a" },
      { family_id: "f", user_id: "b" },
    ],
    care_entries: [
      {
        id: "care",
        family_id: "f",
        telegram_revision: 2,
        details: { tool: "pregnancy-today", note: "SECRET" },
      },
    ],
  };
  const admin = {
    rpc: async () => ({
      data: rows.web_push_deliveries
        .filter((j) => j.state === "pending")
        .map((j) => {
          Object.assign(j, {
            state: "processing",
            lease_id: "lease",
            attempts: j.attempts + 1,
          });
          return { ...j };
        }),
      error: null,
    }),
    from: (table) => {
      const filters = [];
      let changes,
        single = false;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        update(v) {
          changes = v;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              const found = rows[table].filter((r) =>
                filters.every((f) => f(r)),
              );
              if (changes) found.forEach((r) => Object.assign(r, changes));
              return { data: single ? (found[0] ?? null) : found, error: null };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { rows, admin };
}
test("each device is delivered independently, accepted is not displayed, retry never resends accepted device", async () => {
  const { rows, admin } = fixture();
  let calls = 0;
  await processWebPush(admin, async (sub, payload) => {
    calls++;
    assert.ok(!payload.includes("SECRET"));
    return { status: sub.endpoint.endsWith("1") ? 201 : 503, retryAfter: null };
  });
  assert.equal(calls, 2);
  assert.equal(rows.web_push_deliveries[0].state, "accepted");
  assert.equal(rows.web_push_deliveries[0].displayed_at, undefined);
  assert.equal(rows.web_push_deliveries[1].state, "pending");
  await processWebPush(admin, async () => {
    calls++;
    return { status: 410, retryAfter: null };
  });
  assert.equal(calls, 3);
  assert.equal(rows.web_push_devices[1].enabled, false);
  assert.equal(rows.web_push_devices[0].enabled, true);
});
test("unlinked recipient, deleted source and stale event never invoke push transport", async () => {
  for (const mutate of [
    (r) => r.family_members.pop(),
    (r) => (r.care_entries[0].deleted_at = "today"),
    (r) => (r.notification_events[0].revision = 1),
    (r) => (r.notification_events[0].state = "cancelled"),
  ]) {
    const { rows, admin } = fixture();
    mutate(rows);
    await processWebPush(admin, async () => {
      throw new Error("Must not send");
    });
    assert.ok(rows.web_push_deliveries.every((j) => j.state === "cancelled"));
  }
});
test("real migrations enforce private pairing, per-device fanout, one-time codes and receipt-aware fallback", async () => {
  const { PGlite } = require("@electric-sql/pglite"),
    pg = new PGlite();
  try {
    await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
      grant usage on schema public,auth,storage to authenticated,service_role;create publication supabase_realtime;`);
    for (const name of fs
      .readdirSync("supabase/migrations")
      .filter((n) => /^000[1-7]_/.test(n))
      .sort())
      await pg.exec(
        fs
          .readFileSync(`supabase/migrations/${name}`, "utf8")
          .replace("create extension if not exists pgcrypto;", ""),
      );
    const a = "00000000-0000-0000-0000-000000000001",
      b = "00000000-0000-0000-0000-000000000002",
      c = "00000000-0000-0000-0000-000000000003",
      f = "10000000-0000-0000-0000-000000000001";
    await pg.exec(`insert into auth.users values('${a}'),('${b}'),('${c}');insert into families(id,name,invite_code,owner_id) values('${f}','Family','ABCDEFGH','${a}');
      insert into family_members(family_id,user_id,display_name) values('${f}','${a}','Dad'),('${f}','${b}','Mom');
      insert into telegram_links(user_id,chat_id,telegram_user_id,display_name,enabled,confirmed_at) values('${b}','22','22','Mom',true,now());`);
    const query = async (sql, p = []) => (await pg.query(sql, p)).rows;
    await query("select create_web_push_pair($1,$2)", [b, "a".repeat(64)]);
    await assert.rejects(() =>
      query("select create_web_push_pair($1,$2)", [b, "b".repeat(64)]),
    );
    const d1 = (
      await query("select consume_web_push_pair($1,$2,'iPhone 1') id", [
        "a".repeat(64),
        "c".repeat(64),
      ])
    )[0].id;
    await assert.rejects(() =>
      query("select consume_web_push_pair($1,$2,'Steal')", [
        "a".repeat(64),
        "d".repeat(64),
      ]),
    );
    await query("select create_web_push_pair($1,$2)", [b, "b".repeat(64)]);
    const d2 = (
      await query("select consume_web_push_pair($1,$2,'iPhone 2') id", [
        "b".repeat(64),
        "d".repeat(64),
      ])
    )[0].id;
    await query(
      "update web_push_devices set endpoint='https://web.push.apple.com/'||id,p256dh='key',auth_key='auth',permission='granted',standalone=true where user_id=$1",
      [b],
    );
    await query(
      "insert into notification_preferences values($1,'fallback',now())",
      [b],
    );
    await pg.exec(
      `select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;`,
    );
    await assert.rejects(() => query("select * from web_push_devices"));
    await assert.rejects(() => query("select * from notification_events"));
    await assert.rejects(() =>
      query("select consume_web_push_pair('a','b','bad')"),
    );
    await query(
      "insert into reminders(id,family_id,title,due_at,created_by,created_by_name) values('r1',$1,'PRIVATE TITLE',now()+interval '3 days',$2,'Dad')",
      [f, a],
    );
    await pg.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false);",
    );
    assert.equal(
      (await query("select count(*)::int n from notification_events"))[0].n,
      1,
    );
    assert.equal(
      (await query("select count(*)::int n from web_push_deliveries"))[0].n,
      2,
    );
    assert.equal(
      (await query("select * from claim_telegram_jobs()")).length,
      0,
    );
    const claimed = await query("select * from claim_web_push_jobs()");
    assert.equal(claimed.length, 2);
    assert.equal(
      (await query("select * from claim_web_push_jobs()")).length,
      0,
    );
    await query(
      "update web_push_deliveries set state='accepted',accepted_at=now()",
    );
    await query("update telegram_jobs set due_at=now()");
    assert.equal(
      (await query("select * from claim_telegram_jobs()")).length,
      1,
      "provider HTTP success does not suppress Telegram",
    );
    await query("update telegram_jobs set state='pending'");
    await query(
      "update web_push_deliveries set displayed_at=now() where device_id=$1",
      [d1],
    );
    assert.equal(
      (await query("select * from claim_telegram_jobs()")).length,
      0,
    );
    assert.equal(
      (await query("select state from telegram_jobs"))[0].state,
      "cancelled",
    );
    await query("update web_push_devices set enabled=false where id=$1", [d1]);
    await query(
      "select emit_family_notification($1,$2,'reminders','r1','rescheduled',1,'new',now()+interval '1 hour')",
      [f, a],
    );
    assert.equal(
      (
        await query(
          "select count(*)::int n from web_push_deliveries where state='pending'",
        )
      )[0].n,
      1,
      "disabled device does not disable sibling",
    );
    await assert.rejects(() =>
      query("select create_web_push_test($1,$2)", [c, [d2]]),
    );
    assert.equal(
      (await query("select create_web_push_test($1,$2)", [a, [d2]])).length,
      1,
    );
    assert.equal(
      (await query("select create_web_push_test($1,$2)", [a, [d2]])).length,
      0,
    );
    assert.equal(
      (
        await query(
          "select count(*)::int n from telegram_jobs where kind='test'",
        )
      )[0].n,
      0,
      "Web Push test never sends an unsolicited Telegram copy",
    );
    await pg.exec(
      fs.readFileSync("supabase/migrations/0007_web_push.sql", "utf8"),
    );
    assert.equal(
      (await query("select count(*)::int n from web_push_devices"))[0].n,
      2,
    );
  } finally {
    await pg.close();
  }
});
