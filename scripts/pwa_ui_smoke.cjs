// Isolated browser/HTTP fixtures only. Never registers a real vendor subscription or sends push.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  { chromium } = require("playwright-core");
const root = process.env.PWA_TEST_DIR || "/tmp/an-nam-pwa-preview",
  calls = [],
  errors = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  let file = path.resolve(root, u.pathname.replace(/^\/test-app\//, ""));
  if (u.pathname.endsWith("/")) file = path.join(file, "index.html");
  if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".webmanifest": "application/manifest+json",
      ".png": "image/png",
    }[path.extname(file)] || "application/octet-stream",
  );
  if (path.basename(file) === "app.js") {
    // Stub only the OS/native boundary: Chromium's external-protocol dialog
    // consumes subsequent pointer clicks and cannot validate iOS launching.
    const source = fs.readFileSync(file, "utf8");
    assert.ok(source.includes("location.href = P.nativeURL(target);"));
    res.end(
      source.replace(
        "location.href = P.nativeURL(target);",
        "(window.nativeLaunches ||= []).push(P.nativeURL(target));",
      ),
    );
    return;
  }
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/test-app/`;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], {
        encoding: "utf8",
      }).trim(),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.permissionRequests = 0;
      window.testPermission = "default";
      Object.defineProperty(navigator, "standalone", { get: () => true });
      Object.defineProperty(Notification, "permission", {
        get: () => window.testPermission,
      });
      Notification.requestPermission = async () => {
        window.permissionRequests++;
        window.testPermission = "denied";
        return "denied";
      };
    });
    await context.route(
      "https://example.supabase.co/functions/v1/webpush-device",
      async (route) => {
        const body = route.request().postDataJSON();
        calls.push(body);
        let value = {};
        switch (body.action) {
          case "config":
            value = {
              configured: true,
              publicKey: "B".repeat(87),
              pwaUrl: base,
            };
            break;
          case "pair":
            value = {
              deviceId: "d1",
              deviceToken: "a".repeat(64),
              publicKey: "B".repeat(87),
            };
            break;
          case "status":
            value = { label: "iPhone test", registered: false };
            break;
          case "content":
            value = {
              body: "Nội dung thử",
              record: {
                title: "PRIVATE_TEST_CONTENT",
                due_at: "2026-10-12T01:00:00Z",
              },
            };
            break;
          case "inbox":
            value = { events: [] };
            break;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": new URL(base).origin },
          body: JSON.stringify(value),
        });
      },
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .getByText("Sẵn sàng thiết lập thông báo.", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => window.permissionRequests),
      0,
      "No automatic permission prompt",
    );
    await page.locator("#pair-code").fill("b".repeat(24));
    await page.locator("#pair").click();
    await page
      .getByText("Đã ghép. Tiếp theo chạm Cho phép và bật Web Push.", {
        exact: true,
      })
      .waitFor();
    await page.locator("#subscribe").click();
    await page
      .getByText("Chưa được cấp quyền thông báo.", { exact: true })
      .waitFor();
    assert.equal(await page.evaluate(() => window.permissionRequests), 1);
    assert.equal(await page.locator("#subscribe").isDisabled(), true);
    const target = {
      type: "reminder",
      eventId: "r1",
      notificationId: "10000000-0000-4000-8000-000000000001",
      savedAt: Date.now(),
    };
    await page.evaluate((t) => AnNamStore.set("pendingNavigation", t), target);
    await page.goto(base);
    await page.locator("#open-panel:not([hidden])").waitFor();
    assert.equal(
      await page.locator("#open-native").getAttribute("href"),
      `giadinhanam://notification/open?type=reminder&id=r1&notificationId=${target.notificationId}`,
    );
    await page.locator("#show-content").click();
    await page.getByText("PRIVATE_TEST_CONTENT", { exact: false }).waitFor();
    assert.ok(
      calls.some(
        (c) =>
          c.action === "receipt" &&
          c.stage === "launch_attempted" &&
          c.notificationId === target.notificationId,
      ),
      "Cold-start launch receipt survives delayed config",
    );
    assert.ok(
      calls.some(
        (c) =>
          c.action === "receipt" &&
          c.stage === "pwa_opened" &&
          c.notificationId === target.notificationId,
      ),
    );
    const cached = await page.evaluate(async () => {
      const all = [];
      for (const name of await caches.keys())
        for (const r of await (await caches.open(name)).keys()) all.push(r.url);
      return all;
    });
    assert.ok(cached.length > 5);
    assert.ok(cached.every((url) => url.startsWith("http://127.0.0.1")));
    assert.ok(
      !cached.some((url) => url.includes("supabase")),
      "Private API not cached",
    );
    fs.mkdirSync("/tmp/an-nam-pwa-ui", { recursive: true });
    await page.screenshot({ path: "/tmp/an-nam-pwa-ui/open-app.png" });
    const newer = {
      ...target,
      eventId: "r2",
      notificationId: "10000000-0000-4000-8000-000000000002",
    };
    const newest = {
      ...target,
      eventId: "r3",
      notificationId: "10000000-0000-4000-8000-000000000003",
    };
    assert.equal(
      await page.evaluate(
        async ({ target, newest }) => {
          await AnNamStore.set("pendingNavigation", newest);
          const wrong = await AnNamStore.take(
            "pendingNavigation",
            target.notificationId,
          );
          return (
            wrong === undefined &&
            (await AnNamStore.get("pendingNavigation")).notificationId ===
              newest.notificationId
          );
        },
        { target, newest },
      ),
      true,
      "Old activation must not consume newer click",
    );
    await page.evaluate(
      ({ newer, newest }) => {
        const get = AnNamStore.get;
        AnNamStore.get = async (key) => {
          if (key === `attempt:${newer.notificationId}`)
            await new Promise((r) => setTimeout(r, 150));
          return get(key);
        };
        const open = (target) =>
          navigator.serviceWorker.dispatchEvent(
            new MessageEvent("message", {
              data: { type: "OPEN_NOTIFICATION", target },
            }),
          );
        open(newer);
        open(newest);
      },
      { newer, newest },
    );
    await page.waitForTimeout(300);
    assert.ok(
      (await page.locator("#open-native").getAttribute("href")).includes(
        "id=r3",
      ),
    );
    assert.ok(
      !calls.some(
        (c) =>
          c.stage === "launch_attempted" &&
          c.notificationId === newer.notificationId,
      ),
      "Stale activation cannot launch IPA",
    );
    await context.setOffline(true);
    await page.goto(
      base +
        `open-app/?type=reminder&id=r1&notificationId=${target.notificationId}`,
    );
    await page.locator("#open-panel:not([hidden])").waitFor();
    assert.equal(
      await page.locator("#open-native").getAttribute("href"),
      `giadinhanam://notification/open?type=reminder&id=r1&notificationId=${target.notificationId}`,
    );
    assert.ok(!calls.some((c) => c.stage === "native_opened"));
    await context.setOffline(false);
    await page.goto(base);
    await page
      .getByText("Sẵn sàng thiết lập thông báo.", { exact: true })
      .waitFor();
    await page.evaluate(() => {
      window.confirm = () => {
        window.confirmCalled = true;
        return true;
      };
    });
    await page
      .locator("#device-status")
      .filter({ hasText: "iPhone test" })
      .waitFor();
    await page.locator("#pair-panel").waitFor({ state: "hidden" });
    await page.locator("#unpair").click();
    await page
      .getByText("Nhập mã mới từ IPA để ghép lại.", { exact: true })
      .waitFor();
    assert.equal(await page.evaluate(() => AnNamStore.get("auth")), undefined);
    assert.equal(await page.locator("#content").textContent(), "");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: PWA manifest/shell install, no automatic permission prompt, pairing, denied permission, cold root target recovery, authenticated content, offline open-app, no private API cache or fake native-open receipt",
    );
  } finally {
    await browser?.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
