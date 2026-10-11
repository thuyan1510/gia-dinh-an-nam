// Isolated local-only browser check. Never use a signed-in profile or production backend.
// Start Expo with EXPO_NO_DOTENV=1 and blank EXPO_PUBLIC_SUPABASE_* variables.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const base = process.env.UI_BASE_URL || "http://localhost:8092";
const output = process.env.UI_OUTPUT || "/tmp/an-nam-pregnancy-ui";
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: execFileSync("which", ["chromium"], {
      encoding: "utf8",
    }).trim(),
    args: ["--no-sandbox", "--enable-features=SharedArrayBuffer"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [],
    forbidden = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    /https?:\/\/[^/]*(?:owhealth\.com|flo\.health|supabase\.co|translate\.googleapis\.com)/,
    (route) => {
      forbidden.push(route.request().url().split("?")[0]);
      return route.abort();
    },
  );
  page.setDefaultTimeout(60000);
  const go = (path) => page.goto(base + path, { timeout: 120000 });
  try {
    await go("/pregnancy");
    await page.getByText("Cập nhật ngày dự sinh", { exact: true }).click();
    await page.getByTestId("child-name").waitFor();
    await page.getByLabel("Chọn ngày", { exact: true }).nth(1).click();
    const now = new Date(),
      due = new Date();
    due.setDate(due.getDate() + 140);
    const monthDelta =
      (due.getFullYear() - now.getFullYear()) * 12 +
      due.getMonth() -
      now.getMonth();
    for (let n = 0; n < monthDelta; n++)
      await page.getByLabel("Tháng sau", { exact: true }).click();
    const day = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    await page.getByLabel(day, { exact: true }).click();
    await page.getByTestId("save-child").click();
    await page.getByTestId("save-child").waitFor({ state: "hidden" });
    await go("/em-be");
    await page.getByTestId("tool-pregnancy-today").waitFor();
    const labels = await page
      .locator('[data-testid^="tool-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("aria-label")),
      );
    assert.ok(
      labels.indexOf("Trạng thái hôm nay") === labels.indexOf("Đếm cú đạp") + 1,
    );
    await page.getByTestId("tool-pregnancy-today").click();
    await page.getByText("Thông tin hằng ngày", { exact: true }).waitFor();
    const calendar = page.getByTestId("pregnancy-week-strip");
    assert.equal(await calendar.getByRole("button").count(), 7);
    await page.getByTestId("pregnancy-visual-week_21").waitFor();
    assert.equal(await page.getByText("Tình dục", { exact: true }).count(), 0);
    const bg = page.getByTestId("pregnancy-scroll-background");
    const beforeColor = await bg.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await page
      .getByText("Thông tin hằng ngày", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    assert.notEqual(
      await bg.evaluate((el) => getComputedStyle(el).backgroundColor),
      beforeColor,
      "Background responds to scroll",
    );
    await calendar.scrollIntoViewIfNeeded();
    await page.getByLabel("Về hôm nay", { exact: true }).click();
    await calendar.getByRole("button").first().click();
    assert.equal(
      await calendar.getByRole("button").first().getAttribute("aria-selected"),
      "true",
    );
    await page.getByLabel("Về hôm nay", { exact: true }).click();
    await page.getByTestId("pregnancy-profile").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/today-390.png` });
    await page.getByLabel("Chọn tuần thai", { exact: true }).click();
    await page.getByLabel("Xem đủ 22 tuần", { exact: true }).click();
    await page
      .getByText("Điều gì đang diễn ra ở tuần 22?", { exact: true })
      .waitFor();
    assert.ok(
      (await page.locator("body").innerText()).includes("Tuổi thai hôm nay"),
    );
    await page.getByText("Về tuần của ngày đã chọn", { exact: true }).click();
    await page.getByTestId("pregnancy-log").click();
    await page.getByLabel("Mệt mỏi", { exact: true }).click();
    await page
      .getByLabel("Ghi chú thai kỳ", { exact: true })
      .fill("Kiểm tra nhật ký ngoại tuyến");
    await page.getByTestId("save-pregnancy-diary").click();
    await page.waitForURL((u) => u.pathname === "/pregnancy");
    await go("/pregnancy");
    await page.getByText("Mệt mỏi", { exact: true }).waitFor();
    await page.getByTestId("pregnancy-log").click();
    assert.equal(
      await page.getByLabel("Ghi chú thai kỳ", { exact: true }).inputValue(),
      "Kiểm tra nhật ký ngoại tuyến",
    );
    assert.equal(
      await page.getByLabel("Mệt mỏi", { exact: true }).isChecked(),
      true,
    );
    await page
      .getByLabel("Ghi chú thai kỳ", { exact: true })
      .fill("Đã chỉnh sửa nhật ký");
    await page.getByTestId("save-pregnancy-diary").click();
    await page.waitForURL((u) => u.pathname === "/pregnancy");
    console.log(
      "PASS: pregnancy tool order; due date/week navigation; diary create, reload and edit",
    );
    await go("/pregnancy/library?section=body");
    await page.getByText("40 bài viết", { exact: true }).waitFor();
    await page.getByLabel("Tìm bài thai kỳ", { exact: true }).fill("23");
    await page
      .getByText("Tuần 23: Ngực tiết sữa non và táo bón", { exact: true })
      .click();
    await page.getByText("Đối chiếu bản tiếng Anh", { exact: true }).click();
    await page
      .getByText("23 weeks: Breast leaks & constipation", { exact: true })
      .waitFor();
    await page.getByText("Đọc bản tiếng Việt", { exact: true }).click();
    await page.getByLabel("Lưu bài để đọc lại", { exact: true }).click();
    await page.getByLabel("Bỏ lưu bài", { exact: true }).waitFor();
    const articlePhoto = page.getByLabel(
      "Phóng to ảnh: Tuần 23: Ngực tiết sữa non và táo bón",
      { exact: true },
    );
    const photoBox = await articlePhoto.boundingBox();
    assert.ok(
      photoBox &&
        Math.abs(photoBox.width / photoBox.height - 1242 / 699) < 0.02,
      "Article illustration preserves its aspect ratio without intrinsic-height blank space",
    );
    await page.screenshot({ path: `${output}/article-390.png` });
    await page
      .getByLabel("Phóng to ảnh: Tuần 23: Ngực tiết sữa non và táo bón", {
        exact: true,
      })
      .click();
    await page.getByLabel("Đóng ảnh", { exact: true }).click();
    await go("/pregnancy/library?section=body");
    await page.getByRole("checkbox").click();
    await page.getByText("1 bài viết", { exact: true }).waitFor();
    console.log(
      "PASS: 40 translated body articles; search; original text toggle; bookmarks; local full-screen photo",
    );
    await page.setViewportSize({ width: 414, height: 896 });
    await go("/pregnancy");
    await page.getByText("Thông tin hằng ngày", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/today-414.png` });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "No horizontal overflow",
    );
    await go("/pregnancy/notifications");
    await page.getByText("Một lời nhắc dành cho mẹ", { exact: true }).waitFor();
    await page.getByText("07:00", { exact: false }).first().waitFor();
    await page.getByText("17:30", { exact: false }).first().waitFor();
    await page.screenshot({ path: `${output}/reminders-414.png` });
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
    console.log(
      "PASS: 390/414 layouts, notification settings; zero Flo/backend/translation requests, zero JS errors",
    );
  } catch (e) {
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    console.error((await page.locator("body").innerText()).slice(0, 4000));
    throw e;
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
