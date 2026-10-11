const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
test("pregnancy outbox: inserts, edits, retry idempotence, latest revision, deletion, privacy and membership", async () => {
  const db = new PGlite();
  const a = "00000000-0000-0000-0000-000000000001",
    b = "00000000-0000-0000-0000-000000000002",
    f = "10000000-0000-0000-0000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
      grant usage on schema public,auth,storage to authenticated,service_role; create publication supabase_realtime;`);
    for (const name of [
      "0001_family_core.sql",
      "0002_family_social.sql",
      "0003_family_chat.sql",
      "0004_reliable_chat_push.sql",
      "0005_telegram_reminders.sql",
      "0006_pregnancy_status_telegram.sql",
    ]) {
      await db.exec(
        fs
          .readFileSync(`supabase/migrations/${name}`, "utf8")
          .replace("create extension if not exists pgcrypto;", ""),
      );
    }
    // Re-applying the additive migration does not backfill or duplicate triggers.
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/0006_pregnancy_status_telegram.sql",
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users values('${a}'),('${b}');
      insert into families(id,name,invite_code,owner_id) values('${f}','Demo','ABCDEFGH','${a}');
      insert into family_members(family_id,user_id,display_name) values('${f}','${a}','Dad'),('${f}','${b}','Mom');
      insert into children(id,family_id,name) values('baby','${f}','Demo baby');
      insert into telegram_links(user_id,chat_id,telegram_user_id,display_name,confirmed_at,enabled) values('${b}','22','22','Mom',now(),true);
      select set_config('request.jwt.claim.sub','${a}',false);`);
    const details = {
      tool: "pregnancy-today",
      day: "2026-10-11",
      weight: "62.5",
      selections: JSON.stringify({ symptoms: ["Mệt mỏi"], mood: ["SECRET"] }),
      medicine: "PRIVATE",
    };
    await db.query(
      `insert into care_entries(id,family_id,child_id,kind,occurred_at,created_by,created_by_name,details) values('entry',$1,'baby','activity',now()-interval '1 day',$2,'Dad',$3)`,
      [f, a, JSON.stringify(details)],
    );
    const jobs = async () =>
      (
        await db.query(
          "select * from telegram_jobs where entity_id='entry' order by revision",
        )
      ).rows;
    assert.equal((await jobs()).length, 1);
    assert.equal((await jobs())[0].kind, "pregnancy_status");
    assert.equal((await jobs())[0].recipient_id, b);
    const update = async (d) =>
      db.query("update care_entries set details=$1 where id='entry'", [
        JSON.stringify(d),
      ]);
    await update(details);
    await db.exec(
      "update care_entries set note='private edit',telegram_revision=999 where id='entry'",
    );
    assert.equal((await jobs()).length, 1);
    assert.equal(
      (
        await db.query(
          "select telegram_revision from care_entries where id='entry'",
        )
      ).rows[0].telegram_revision,
      1,
    );
    details.weight = "63";
    await update(details);
    assert.deepEqual(
      (await jobs()).map((j) => [j.revision, j.state]),
      [
        [1, "cancelled"],
        [2, "pending"],
      ],
    );
    details.selections = JSON.stringify({ symptoms: ["Đau lưng", "Mệt mỏi"] });
    await update(details);
    assert.equal((await jobs()).length, 3);
    details.selections = JSON.stringify({
      symptoms: ["Mệt mỏi", "Đau lưng", "Đau lưng"],
      sex: ["PRIVATE"],
    });
    await update(details);
    assert.equal(
      (await jobs()).length,
      3,
      "reordering/dedup and private fields are not new events",
    );
    await db.exec("update care_entries set deleted_at=now() where id='entry'");
    assert.ok((await jobs()).every((j) => j.state === "cancelled"));
    await db.exec("update care_entries set deleted_at=null where id='entry'");
    await db.query("update telegram_links set enabled=false where user_id=$1", [
      b,
    ]);
    details.weight = "64";
    await update(details);
    assert.equal((await jobs()).length, 3);
    await db.query("update telegram_links set enabled=true where user_id=$1", [
      b,
    ]);
    await db.query("delete from family_members where user_id=$1", [b]);
    details.weight = "65";
    await update(details);
    assert.equal((await jobs()).length, 3);
    details.selections = "{malformed";
    details.weight = "invalid";
    await update(details);
    assert.equal(
      (await jobs()).length,
      3,
      "invalid imported data must not fail the family write",
    );
    await db.exec(`set role authenticated;`);
    await assert.rejects(() => db.exec("select * from telegram_jobs"));
    await assert.rejects(() =>
      db.exec("select pregnancy_telegram_fields('{}')"),
    );
  } finally {
    await db.close();
  }
});
