// Isolated local-only web smoke test. Does not certify native iOS audio/keyboard.
// NODE_PATH=/tmp/an-nam-ui-tools/node_modules node scripts/ui_growth_education.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const base = process.env.UI_BASE_URL || "http://localhost:8095";
const out = process.env.UI_OUTPUT || "/tmp/an-nam-growth-preview";
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: execFileSync("which", ["chromium"], {
      encoding: "utf8",
    }).trim(),
    args: [
      "--no-sandbox",
      "--enable-features=SharedArrayBuffer",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(60000);
  // Prevent accidental production access even if a preview is misconfigured.
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return u.hostname === "localhost" ||
      u.protocol === "data:" ||
      u.protocol === "blob:"
      ? route.continue()
      : route.abort();
  });
  const go = async (route) =>
    page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 120000 });
  const snap = async (name) => page.screenshot({ path: `${out}/${name}.png` });
  try {
    await go("/child/growth");
    await page.getByTestId("growth-born-weight").waitFor();
    await snap("growth-born");
    await go("/child/growth?stage=pregnancy");
    await page.getByTestId("growth-pregnancy-weight").waitFor();
    await snap("growth-fetal");
    await go("/child/standards");
    await page.getByText("WHO · 0–60 tháng.", { exact: false }).waitFor();
    await snap("standards");
    await go("/lich");
    await page.getByTestId("handbook-tab-pregnant").click();
    await page.getByTestId("handbook-category-18").waitFor();
    await snap("handbook-pregnant");
    await page.getByTestId("handbook-tab-mom").click();
    await snap("handbook-born");
    await page.getByTestId("handbook-tab-pre_pregnant").click();
    await snap("handbook-pre");
    await page.getByTestId("handbook-tab-pregnant").click();
    await page.getByTestId("handbook-category-18").click();
    await page.getByRole("tab", { name: "Thơ · 40" }).waitFor();
    await snap("education-poems");
    await page.getByLabel("Tìm bài thơ").fill("tieng me tham thi");
    await page.getByLabel("Đọc TIẾNG MẸ THẦM THÌ", { exact: true }).click();
    await page
      .getByText("Như đáp lại tiếng nói mẹ thầm thì", { exact: false })
      .waitFor();
    await snap("poem");
    await go("/pregnancy/education");
    await page.getByRole("tab", { name: "Nhạc · 10" }).click();
    await snap("education-music");
    await page.getByLabel("Nghe Ánh trăng", { exact: true }).click();
    await page.getByTestId("education-player").scrollIntoViewIfNeeded();
    await page.getByLabel("Tạm dừng", { exact: true }).waitFor();
    await page.waitForFunction(() => {
      const v = document.querySelector("video");
      return !!v && v.currentTime > 1;
    });
    await page.getByLabel("Tạm dừng", { exact: true }).click();
    assert.equal(await page.locator("video").evaluate((v) => v.paused), true);
    await snap("education-player");
    await page.getByLabel("Phát nhạc", { exact: true }).click();
    await page.getByRole("tab", { name: "Thơ · 40" }).click();
    await page.getByLabel("Đọc TIẾNG MẸ THẦM THÌ", { exact: true }).click();
    await page.getByTestId("education-mini-player").waitFor();
    assert.equal(
      await page.locator("video").evaluate((v) => v.paused),
      false,
      "navigation must not stop playback",
    );
    await page.getByLabel("Tạm dừng nhạc nền", { exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector("video")?.paused === true,
    );
    await page.getByLabel("Tiếp tục nhạc nền", { exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector("video")?.paused === false,
    );
    await snap("education-background-controls");
    await page.getByLabel("Mở nhạc thai giáo", { exact: true }).click();
    // Navigation keeps inactive routes mounted; target the visible controller.
    const activePlayer = page
      .locator('[data-testid="education-player"]:visible')
      .last();
    await activePlayer.waitFor();
    assert.equal(
      await page.locator("video").count(),
      1,
      "only one audio surface across routes",
    );
    await activePlayer.getByLabel("Đóng trình phát", { exact: true }).click();
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      return video && video.paused && !video.getAttribute("src");
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await go("/pregnancy/education");
    await page.getByRole("tab", { name: "Thơ · 40" }).waitFor();
    await snap("education-320");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await go("/easy/1");
    const timeButton = page.getByLabel("Giờ bắt đầu E.A.S.Y", { exact: true });
    await timeButton.click();
    await page.locator('input[type="time"]').fill("23:59");
    await page.getByText("Chọn 23:59", { exact: true }).click();
    assert.match(await timeButton.innerText(), /23:59/);
    await timeButton.click();
    await page.locator('input[type="time"]').fill("00:00");
    await page.getByText("Hủy", { exact: true }).click();
    assert.match(
      await timeButton.innerText(),
      /23:59/,
      "Cancel must not change committed time",
    );
    await timeButton.click();
    await snap("clock-selector-web");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: curves, standards, three handbook stages, 40 supplied poems, 10 tracks, local audio playback/pause across navigation, 320 px width. Images:",
      out,
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
