// Isolated browser fixtures ONLY. Start Expo with EXPO_NO_DOTENV=1 and blank
// EXPO_PUBLIC_SUPABASE_*; never run this against a signed-in browser profile.
// Native keyboard/spinner behavior still requires testing on iPhone.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const base = process.env.UI_BASE_URL || "http://localhost:8094";
const output = process.env.UI_OUTPUT || "/tmp/an-nam-conversation-ui";
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: execFileSync("which", ["chromium"], {
      encoding: "utf8",
    }).trim(),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [],
      network = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/https?:\/\/[^/]*supabase\.co/, (route) => {
      network.push(route.request().url());
      return route.abort();
    });
    page.setDefaultTimeout(60000);
    await page.goto(base + "/trao-doi", { timeout: 120000 });
    await page
      .getByText("Ghép gia đình để nhắn tin với người nhà.", { exact: true })
      .waitFor();
    await page.evaluate(async () => {
      const module = (name) =>
        globalThis.__r(
          [...globalThis.__r.getModules()].find(
            ([, m]) => m.verboseName === name,
          )[0],
        );
      if (module("src/lib/supabase.ts").isSupabaseConfigured)
        throw new Error("REFUSE: Supabase must be disabled for fixture");
      const db = await module(
        "node_modules/expo-sqlite/build/SQLiteDatabase.js",
      ).openDatabaseAsync("gia-dinh-an-nam.db");
      // Only this new browser profile's local demo database is modified.
      await db.execAsync(`PRAGMA foreign_keys=OFF;
        update families set id='fixture-family',name='Nhà của bố mẹ';
        update family_members set family_id='fixture-family';
        update children set family_id='fixture-family';
        update family_messages set family_id='fixture-family';
        insert into reminders(id,family_id,title,details,due_at,created_by,created_by_name,updated_at,sync_state,reminder_kind,schedule_version)
        values('reminder_fixture','fixture-family','Khám thai cùng mẹ','Mang sổ khám',datetime('now','+2 days'),'other_parent','Mẹ',datetime('now'),'synced','calendar',1);
        insert into family_messages(id,family_id,body,created_at,created_by,created_by_name,sync_state,message_kind,reminder_id,reminder_revision)
        values('event_fixture','fixture-family','Khám thai cùng mẹ',datetime('now'),'other_parent','Mẹ','synced','reminder','reminder_fixture',1);
        insert into family_messages(id,family_id,body,created_at,created_by,created_by_name,sync_state,message_kind)
        values('chat_fixture01','fixture-family','Tối nay bố về sớm nhé',datetime('now','-1 minute'),'other_parent','Mẹ','synced','message');
        PRAGMA foreign_keys=ON;`);
    });
    await page.reload();
    await page.getByText("Khám thai cùng mẹ", { exact: true }).waitFor();
    await page.getByLabel("Soạn tin nhắn", { exact: true }).waitFor();
    // Replace transports in browser memory only, not in the application source.
    await page.evaluate(async () => {
      const module = (name) =>
        globalThis.__r(
          [...globalThis.__r.getModules()].find(
            ([, m]) => m.verboseName === name,
          )[0],
        );
      const db = await module(
        "node_modules/expo-sqlite/build/SQLiteDatabase.js",
      ).openDatabaseAsync("gia-dinh-an-nam.db");
      globalThis.fixtureDb = db;
      globalThis.sendCalls = [];
      globalThis.ackCalls = 0;
      module("src/services/chat.ts").sendChatMessage = async (
        id,
        body,
        attachments,
      ) => {
        globalThis.sendCalls.push({ id, body, attachments });
        await db.runAsync(
          "insert or ignore into family_messages(id,family_id,body,created_at,created_by,created_by_name,sync_state) values(?,'fixture-family',?,?,'local_parent_1','Bố','synced')",
          id,
          body,
          new Date().toISOString(),
        );
        if (globalThis.sendCalls.length === 1)
          throw new Error("Mất phản hồi mạng thử nghiệm");
      };
      module("src/services/webPush.ts").webPushAction = async (
        action,
        input,
      ) => {
        if (action !== "acknowledge") throw new Error("unexpected action");
        globalThis.ackCalls++;
        await db.runAsync(
          "update reminders set acknowledged_at=?,acknowledged_by='local_parent_1' where id=?",
          new Date().toISOString(),
          input.id,
        );
        await db.runAsync(
          "insert or ignore into family_messages(id,family_id,body,created_at,created_by,created_by_name,sync_state,message_kind,reminder_id,reminder_revision) values('event_ack_fixture','fixture-family','Đã xác nhận lời nhắc: Khám thai cùng mẹ',?,'local_parent_1','Bố','synced','acknowledged',?,1)",
          new Date().toISOString(),
          input.id,
        );
        return { ok: true };
      };
    });
    await page
      .getByLabel("Soạn tin nhắn", { exact: true })
      .fill("Bố đã đọc, tối nay bố về sớm");
    await page
      .getByRole("button", { name: "Gửi tin nhắn", exact: true })
      .click();
    await page
      .getByText("Mất phản hồi mạng thử nghiệm", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Soạn tin nhắn", { exact: true }).inputValue(),
      "Bố đã đọc, tối nay bố về sớm",
    );
    await page
      .getByRole("button", { name: "Thử gửi lại", exact: true })
      .click();
    await page
      .getByText("Bố đã đọc, tối nay bố về sớm", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Soạn tin nhắn", { exact: true }).inputValue(),
      "",
    );
    const sends = await page.evaluate(() => globalThis.sendCalls);
    assert.equal(sends.length, 2);
    assert.deepEqual(sends[0], sends[1]);
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await page
      .getByText("Đã xác nhận lời nhắc: Khám thai cùng mẹ", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Xác nhận", exact: true }).count(),
      0,
    );
    assert.equal(await page.evaluate(() => globalThis.ackCalls), 1);
    await page.screenshot({ path: output + "/conversation.png" });
    await page.getByLabel("Thêm chức năng", { exact: true }).click();
    await page.getByText("Tạo lời nhắc", { exact: true }).click();
    await page.getByLabel("Lời nhắc", { exact: true }).fill("Mua đồ cho bé");
    await page
      .getByLabel("Ghi chú riêng", { exact: true })
      .fill("Ghi chú trên điện thoại nhỏ");
    const popup = await page
      .getByLabel("Lời nhắc", { exact: true })
      .boundingBox();
    assert.ok(popup.y > 120, "form is a centered popup, not full screen");
    await page.screenshot({ path: output + "/reminder-popup.png" });
    await page.getByLabel("Chọn giờ", { exact: true }).click();
    await page.getByLabel("Chọn ngày và giờ", { exact: true }).waitFor();
    await page.getByLabel("Xong ngày giờ", { exact: true }).click();
    await page
      .getByRole("button", { name: "Tạo lời nhắc", exact: true })
      .click();
    await page.waitForURL((u) => u.pathname === "/trao-doi");
    await page
      .getByText("◷ Mua đồ cho bé · đang chờ đồng bộ", { exact: true })
      .waitFor();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByLabel("Thêm chức năng", { exact: true }).click();
    await page.getByText("Tạo lời nhắc", { exact: true }).click();
    await page
      .getByLabel("Lời nhắc", { exact: true })
      .fill("Nhắc trên iPhone nhỏ");
    await page.getByLabel("Chọn ngày", { exact: true }).click();
    const button = await page
      .getByRole("button", { name: "Tạo lời nhắc", exact: true })
      .boundingBox();
    assert.ok(
      button.y + button.height <= 667,
      "save fits small viewport with picker open",
    );
    await page.screenshot({ path: output + "/reminder-small.png" });
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log(
      "PASS: paired chat renders, uncertain send retains identical retry ID, confirmation becomes a chat entry, four-row popup, picker and small-screen bounds; no backend requests.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
