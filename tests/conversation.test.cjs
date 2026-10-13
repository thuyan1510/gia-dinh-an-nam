const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");

test("conversation migration: immutable scoped messages, one push, atomic reminder confirmation, reversible Telegram pause", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
      grant usage on schema public,auth,storage to authenticated,service_role;create publication supabase_realtime;
      alter default privileges in schema public grant all on tables to authenticated,service_role;`);
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
      c = "00000000-0000-0000-0000-000000000003";
    const f = "10000000-0000-0000-0000-000000000001",
      other = "10000000-0000-0000-0000-000000000002";
    const q = async (sql, params = []) => (await pg.query(sql, params)).rows;
    const count = async (table, where = "true") =>
      Number((await q(`select count(*) n from ${table} where ${where}`))[0].n);
    const asUser = async (id) =>
      pg.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
      );
    const admin = () =>
      pg.exec(
        `reset role; select set_config('request.jwt.claim.sub','',false);`,
      );
    await pg.exec(`insert into auth.users values('${a}'),('${b}'),('${c}');
      insert into families(id,name,invite_code,owner_id) values('${f}','Family','ABCDEFGH','${a}'),('${other}','Other','IJKLMNOP','${c}');
      insert into family_members(family_id,user_id,display_name) values('${f}','${a}','Bố'),('${f}','${b}','Mẹ'),('${other}','${c}','Other');
      insert into telegram_links(user_id,chat_id,telegram_user_id,display_name,enabled,confirmed_at) values('${a}','11','11','Bố',true,now()),('${b}','22','22','Mẹ',true,now());
      insert into web_push_devices(user_id,family_id,label,credential_hash,endpoint,p256dh,auth_key,permission) values
      ('${a}','${f}','Dad','a','https://web.push.apple.com/a','key','auth','granted'),('${b}','${f}','Mom','b','https://web.push.apple.com/b','key','auth','granted');
      insert into reminders(id,family_id,title,due_at,created_by,created_by_name) values('before','${f}','Before upgrade',now()+interval '2 days','${a}','Bố');`);
    const oldJobs = await count("telegram_jobs"),
      oldEvents = await count("notification_events");
    assert.ok(oldJobs > 0);
    await pg.exec(
      fs.readFileSync(
        "supabase/migrations/0008_family_conversation.sql",
        "utf8",
      ),
    );
    assert.equal(await count("telegram_links"), 2);
    assert.equal(await count("telegram_jobs"), oldJobs);
    assert.equal(
      await count("notification_events"),
      oldEvents,
      "backfill is silent",
    );
    assert.equal(await count("family_messages", "reminder_id='before'"), 1);
    assert.deepEqual(
      await q("select * from claim_telegram_jobs()"),
      [],
      "old jobs remain paused",
    );
    await asUser(a);
    await assert.rejects(
      q(
        "select send_family_chat_message('chat_wrongfam','Do not move this draft','[]',$1)",
        [other],
      ),
      /family changed/,
    );
    await q("select send_family_chat_message('chat_test0001','Xin chào','[]')");
    await q("select send_family_chat_message('chat_test0001','Xin chào','[]')");
    await assert.rejects(
      q("select send_family_chat_message('chat_test0001','Changed','[]')"),
    );
    await assert.rejects(
      q("select send_family_chat_message('chat_empty001','  ','[]')"),
    );
    await assert.rejects(
      q("update family_messages set body='forged' where id='chat_test0001'"),
    );
    await assert.rejects(
      q(
        `insert into family_messages(id,family_id,body,created_by,created_by_name,message_kind) values('fake','${f}','ack','${a}','Dad','acknowledged')`,
      ),
    );
    await assert.rejects(
      q("update notification_channels set telegram_enabled=true"),
    );
    await admin();
    assert.equal(await count("family_messages", "id='chat_test0001'"), 1);
    assert.equal(
      await count("notification_events", "entity_id='chat_test0001'"),
      1,
    );
    assert.equal(
      (
        await q(
          "select recipient_id from notification_events where entity_id='chat_test0001'",
        )
      )[0].recipient_id,
      b,
    );
    assert.equal(await count("web_push_deliveries"), oldEvents + 1);
    assert.equal(
      await count("telegram_jobs"),
      oldJobs,
      "paused sends add no Telegram jobs",
    );
    await asUser(c);
    assert.equal(await count("family_messages"), 0, "other family cannot read");
    await assert.rejects(
      q("select send_family_chat_message('chat_test0001','Xin chào','[]')"),
    );
    await asUser(a);
    const media = [
      {
        path: `${f}/${a}/clip.mp4`,
        type: "video",
        mimeType: "video/mp4",
        width: 720,
        height: 1280,
        size: 1024,
      },
    ];
    await q("select send_family_chat_message('chat_video001','',$1)", [
      JSON.stringify(media),
    ]);
    await assert.rejects(
      q("select send_family_chat_message('chat_badmedia','',$1)", [
        JSON.stringify([{ ...media[0], path: `${other}/${c}/clip.mp4` }]),
      ]),
    );
    await q(
      `insert into reminders(id,family_id,title,due_at,created_by,created_by_name) values('rem_chat','${f}','Đi khám',now()+interval '1 day','${a}','Bố')`,
    );
    await admin();
    assert.equal(
      await count(
        "family_messages",
        "reminder_id='rem_chat' and message_kind='reminder'",
      ),
      1,
    );
    assert.equal(
      await count("notification_events", "entity_id='rem_chat'"),
      1,
      "card does not create a duplicate push",
    );
    await assert.rejects(
      q("select acknowledge_family_reminder('rem_chat',$1,1)", [a]),
    );
    await assert.rejects(
      q("select acknowledge_family_reminder('rem_chat',$1,1)", [c]),
    );
    await q("select acknowledge_family_reminder('rem_chat',$1,1)", [b]);
    await q("select acknowledge_family_reminder('rem_chat',$1,1)", [b]);
    assert.equal(
      await count(
        "family_messages",
        "reminder_id='rem_chat' and message_kind='acknowledged'",
      ),
      1,
    );
    assert.equal(
      await count(
        "notification_events",
        "entity_id='rem_chat' and kind='acknowledged'",
      ),
      1,
    );
    assert.equal(
      (
        await q(
          "select recipient_id from notification_events where entity_id='rem_chat' and kind='acknowledged'",
        )
      )[0].recipient_id,
      a,
    );
    await asUser(a);
    await q(
      "update reminders set due_at=due_at+interval '1 day' where id='rem_chat'",
    );
    await admin();
    assert.equal(
      (await q("select acknowledged_at from reminders where id='rem_chat'"))[0]
        .acknowledged_at,
      null,
    );
    await assert.rejects(
      q("select acknowledge_family_reminder('rem_chat',$1,1)", [b]),
    );
    await q("select acknowledge_family_reminder('rem_chat',$1,2)", [b]);
    assert.equal(
      await count(
        "family_messages",
        "reminder_id='rem_chat' and message_kind='acknowledged'",
      ),
      2,
    );
    await q("update web_push_devices set enabled=false where user_id=$1", [b]);
    await assert.rejects(
      q("select create_attention_reminder($1,'attention_test0001')", [a]),
      /partner notification channel not linked/,
    );
    await q("update web_push_devices set enabled=true where user_id=$1", [b]);
    await q("select create_attention_reminder($1,'attention_test0001')", [a]);
    assert.equal(
      await count(
        "family_messages",
        "reminder_id='attention_test0001' and message_kind='attention'",
      ),
      1,
    );
    await assert.rejects(
      q("select acknowledge_family_reminder('attention_test0001',$1,1)", [b]),
    );
    assert.equal(await count("telegram_jobs"), oldJobs);
    await q("update notification_channels set telegram_enabled=true");
    assert.ok(
      (await q("select * from claim_telegram_jobs()")).length > 0,
      "can enable again without losing links",
    );
    await asUser(a);
    await q(
      "select send_family_chat_message('chat_test0002','Only PWA for chat','[]')",
    );
    await admin();
    assert.equal(
      await count("telegram_jobs", "entity_id='chat_test0002'"),
      0,
      "chat never leaks to Telegram",
    );
  } finally {
    await pg.close();
  }
});
