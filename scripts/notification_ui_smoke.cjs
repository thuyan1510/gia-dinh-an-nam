// Use Expo web with blank Supabase env in a new, local-only browser context.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const base = process.env.UI_BASE_URL || "http://localhost:8093";
(async () => {
  const browser = await chromium.launch({
    executablePath: execFileSync("which", ["chromium"], {
      encoding: "utf8",
    }).trim(),
    args: ["--no-sandbox", "--enable-features=SharedArrayBuffer"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(45000);
    await page.route(/https?:\/\/[^/]*supabase\.co/, (route) => route.abort());
    const go = (route) => page.goto(base + route, { timeout: 120000 });
    const login =
      "Hãy đăng nhập và đồng bộ gia đình, sau đó quay lại thông báo này.";
    await go("/notification/open?type=delete&id=bad");
    await page
      .getByText("Liên kết thông báo không hợp lệ.", { exact: true })
      .waitFor();
    await go("/notification/open?type=care&id=missing");
    await page.getByText(login, { exact: true }).waitFor();
    await page
      .getByText("Tài khoản / khôi phục đăng nhập", { exact: true })
      .click();
    await page.waitForURL((url) => url.pathname === "/account");
    assert.equal(new URL(page.url()).searchParams.get("id"), "missing");
    await go("/gia-dinh");
    await page.getByText("Tạo lời nhắc", { exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/reminder/new");
    await page
      .getByPlaceholder("Lịch tiêm, khám, mua đồ…")
      .fill("LOCAL_NOTIFICATION_TEST");
    await page.getByText("Tạo lời nhắc", { exact: true }).last().click();
    await page.waitForURL((url) => url.pathname === "/gia-dinh");
    await page.getByText("LOCAL_NOTIFICATION_TEST", { exact: true }).waitFor();
    await page.getByText("Sửa lời nhắc / giờ hẹn", { exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/reminder/new");
    const id = new URL(page.url()).searchParams.get("id");
    assert.ok(id);
    await go("/notification/open?type=reminder&id=" + id);
    await page
      .getByText("Lời nhắc lưu cục bộ trên điện thoại này.", { exact: true })
      .waitFor();
    await page.getByText("LOCAL_NOTIFICATION_TEST", { exact: true }).waitFor();
    await go(
      "/notification/open?type=reminder&id=" +
        id +
        "&notificationId=10000000-0000-4000-8000-000000000001",
    );
    await page.getByText(login, { exact: true }).waitFor();
    assert.equal(
      await page.getByText("LOCAL_NOTIFICATION_TEST", { exact: true }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: invalid target, unauthenticated target preserved through account, local reminder opens exact saved record, remote ID cannot use local-only branch; no JS errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
