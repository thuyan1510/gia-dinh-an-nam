const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const {
  growthAge,
  growthDomain,
  growthPoints,
  growthReferences,
} = require("../src/lib/growth.ts");
const child = {
  id: "baby-a",
  birthday: "2026-10-13",
  due_date: null,
  gender: "female",
};
const fetus = { ...child, birthday: null, due_date: "2027-03-02" };
const record = (extra = {}) => ({
  id: "r",
  child_id: child.id,
  kind: "growth",
  amount: 3.2,
  unit: "kg",
  occurred_at: "2026-10-13T12:00:00",
  details: { metric: "Cân nặng" },
  ...extra,
});
test("WHO curves exist with no measurements, correct sex and true birth median", () => {
  assert.deepEqual(growthPoints(child, [], "weight", "born"), []);
  assert.deepEqual(growthDomain("born", 0), [0, 6]);
  for (const sex of ["male", "female"])
    for (const metric of ["weight", "height", "head"])
      assert.ok(growthReferences("born", metric, sex)[0].points.length >= 25);
  assert.deepEqual(growthReferences("born", "weight", "female")[0].points[0], {
    age: 0,
    low: 2.4,
    median: 3.2,
    high: 4.2,
  });
  assert.equal(
    growthReferences("born", "weight", "male")[0].points[0].median,
    3.3,
  );
  assert.notEqual(
    3.2,
    (2.4 + 4.2) / 2,
    "median must not be manufactured from boundaries",
  );
});
test("WHO data has 8 complete bounded series, separate length/height and provenance", () => {
  const data = require("../src/data/current/who-growth.json");
  assert.equal(data.datasets.length, 8);
  for (const s of data.datasets) {
    assert.match(s.sha256, /^[a-f0-9]{64}$/);
    assert.match(s.url, /^https:\/\/cdn.who.int\//);
    const start = s.metric === "height" ? 24 : 0,
      end = s.metric === "length" ? 24 : 60;
    assert.equal(s.points.length, end - start + 1);
    s.points.forEach((p, i) => {
      assert.equal(p.age, start + i);
      assert.ok(p.low < p.median && p.median < p.high);
    });
  }
  const refs = growthReferences("born", "height", "female");
  assert.equal(refs.length, 2);
  assert.equal(refs[0].points.at(-1).age, 24);
  assert.equal(refs[1].points[0].age, 24);
  assert.ok(growthDomain("born", 80)[0] >= 60);
});
test("fetal curves preserve old averages, do not invent diagnostic bands or join length convention change", () => {
  const weight = growthReferences("pregnancy", "weight", "female");
  assert.equal(weight[0].points.length, 33);
  assert.ok(weight[0].points.every((p) => p.low === null && p.high === null));
  const length = growthReferences("pregnancy", "height", "male");
  assert.equal(length.length, 2);
  assert.equal(length[0].points.at(-1).age, 20);
  assert.equal(length[1].points[0].age, 21);
  assert.deepEqual(growthReferences("pregnancy", "head", "male"), []);
});
test("growth measurements keep child, stage, metric, positive numbers and units isolated", () => {
  const records = [
    record(),
    record({ id: "grams", amount: 3200, unit: "g" }),
    record({ child_id: "other" }),
    record({ deleted_at: "2026-10-13" }),
    record({ amount: -1 }),
    record({ amount: NaN }),
    record({ unit: "ml" }),
    record({
      kind: "activity",
      details: { tool: "mom", metric: "Cân nặng" },
      amount: 60,
    }),
    record({
      kind: "activity",
      details: { tool: "fetal", metric: "Cân nặng thai (g)" },
      amount: 200,
      unit: "g",
    }),
  ];
  assert.deepEqual(
    growthPoints(child, records, "weight", "born").map((p) => p.value),
    [3.2, 3.2],
  );
  assert.deepEqual(
    growthPoints(fetus, records, "weight", "pregnancy").map((p) => p.value),
    [200],
  );
  const fetalHead = record({
    kind: "activity",
    amount: 16,
    unit: "cm",
    details: { tool: "fetal", metric: "Vòng đầu thai (cm)" },
  });
  assert.equal(
    growthPoints(fetus, [fetalHead], "head", "pregnancy")[0].value,
    16,
  );
  assert.equal(
    growthPoints(fetus, [fetalHead], "height", "pregnancy").length,
    0,
  );
});
test("growth age rejects invalid dates and birth before record; respects local calendar day", () => {
  assert.equal(growthAge(child, "born", "2026-10-13T12:00:00"), 0);
  assert.equal(growthAge(child, "born", "2026-10-12T12:00:00"), null);
  assert.equal(
    growthAge({ ...child, birthday: "2026-02-30" }, "born", "2026-10-13"),
    null,
  );
  assert.equal(growthAge(fetus, "pregnancy", "2027-03-02T12:00:00"), 40);
  assert.equal(growthAge(fetus, "pregnancy", "2026-10-13T12:00:00"), 20);
  assert.equal(growthAge(null, "born", new Date()), null);
});
test("40 supplied poems replace the old collection without changing verses or credits", () => {
  const { poems } = require("../src/data/education/poems.ts");
  const collection = require("../src/data/education/poems-collection.json");
  assert.equal(
    collection.sourceSha256,
    "689df20d29cc52df46f63246afc36505c95c0e83b2cdd9a5ac11969db640aded",
  );
  assert.equal(poems.length, 40);
  assert.equal(new Set(poems.map((p) => p.id)).size, 40);
  assert.equal(new Set(poems.map((p) => p.text)).size, 40);
  assert.equal(poems[0].title, "TIẾNG MẸ THẦM THÌ");
  assert.equal(poems[39].title, "ÔNG CHÁU NHÀ VỊT");
  for (const p of poems) {
    assert.ok(p.text.trim().length > 60, p.id);
    assert.equal(p.text.split("\n").filter(Boolean).length, p.declaredLines);
    assert.ok(p.lineCount >= 10);
    assert.match(p.source, /^https:\/\//);
    assert.ok(p.license && p.sourceLabel && p.author);
    assert.equal(
      crypto.createHash("sha256").update(p.text).digest("hex"),
      p.sha256,
    );
    assert.match(p.id, /^family-collection-\d{2}$/);
    assert.ok(!p.translation && !p.original);
  }
  const {
    parsePoemCollection,
  } = require("../scripts/parse_poem_collection.cjs");
  const reconstructed = poems
    .map(
      (p, i) =>
        `BÀI ${String(i + 1).padStart(2, "0")}: ${p.title} (${p.declaredLines} dòng)\nTác giả / Sưu tầm: ${p.author}\n${p.sourceLabel}: ${p.source}\n\n${p.text}\n\n============================================================\n`,
    )
    .join("\n");
  assert.deepEqual(
    parsePoemCollection(Buffer.from(reconstructed)).poems,
    poems,
  );
  assert.throws(() =>
    parsePoemCollection(
      Buffer.from(reconstructed.replace("BÀI 02:", "BÀI 04:")),
    ),
  );
});
test("clock selection round trips all 1440 local minutes, not a UTC date", () => {
  const {
    timePickerDate,
    timePickerValue,
  } = require("../src/lib/timePicker.ts");
  const base = new Date(2026, 9, 14, 12);
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m++) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const date = timePickerDate(value, base);
      assert.equal(timePickerValue(date), value);
      assert.equal(date.getDate(), 14);
      assert.equal(date.getSeconds(), 0);
    }
  for (const bad of ["", "24:00", "09:60", "9:30", "nonsense"])
    assert.equal(timePickerValue(timePickerDate(bad, base)), "07:00");
});
test("all shared time selectors use native wheels and preserve the requested date/time mode", () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  const picker = read("src/components/TimePicker.tsx");
  assert.match(picker, /<ScheduleWheel[^>]+mode="time"/);
  assert.doesNotMatch(picker, /ScrollView|33\.333|Array\.from/);
  const native = read("src/components/ScheduleWheel.native.tsx");
  assert.match(native, /mode=\{mode\}/);
  assert.match(native, /display="spinner"/);
  assert.match(native, /minuteInterval=\{1\}/);
  for (const file of [
    "app/record/new.tsx",
    "app/pregnancy/diary.tsx",
    "app/pregnancy/notifications.tsx",
    "app/easy/[id].tsx",
  ])
    assert.match(read(file), /<TimePicker/);
  assert.match(read("src/components/ReminderPopup.tsx"), /<ScheduleWheel/);
});
test("background music is enabled in native config and owned outside navigation screens", () => {
  const app = require("../app.json").expo;
  assert.ok(app.ios.infoPlist.UIBackgroundModes.includes("audio"));
  assert.equal(
    app.plugins.find((p) => Array.isArray(p) && p[0] === "expo-video")[1]
      .supportsBackgroundPlayback,
    true,
  );
  const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  assert.match(read("app/_layout.tsx"), /<EducationAudioProvider>/);
  const audio = read("src/providers/EducationAudioProvider.tsx");
  assert.match(audio, /staysActiveInBackground = true/);
  assert.match(audio, /showNowPlayingNotification = true/);
  assert.doesNotMatch(
    read("src/components/EducationPlayer.tsx"),
    /useVideoPlayer|useFocusEffect|AppState/,
  );
  assert.doesNotMatch(
    read("app/pregnancy/education.tsx"),
    /useFocusEffect|setTrackId\(null\)/,
  );
});
test("music source handles native asset IDs and both web asset shapes with metadata", () => {
  const { educationMusicSource } = require("../src/lib/educationMusic.ts");
  const metadata = { title: "Ánh trăng", artist: "Claude Debussy" };
  assert.deepEqual(educationMusicSource(42, metadata.title, metadata.artist), {
    assetId: 42,
    metadata,
  });
  for (const value of ["/assets/test.m4a", { uri: "/assets/test.m4a" }])
    assert.deepEqual(
      educationMusicSource(value, metadata.title, metadata.artist),
      { uri: "/assets/test.m4a", metadata },
    );
  for (const value of [null, undefined, {}, "", NaN])
    assert.throws(() => educationMusicSource(value, "", ""));
});
test("ten bundled recordings have checked bytes, source and recording-specific licenses", () => {
  const music = require("../src/data/education/music.json");
  assert.equal(music.length, 10);
  assert.equal(new Set(music.map((m) => m.id)).size, 10);
  for (const m of music) {
    const file = fs.readFileSync(
      path.join(__dirname, "../assets/education", m.id + ".m4a"),
    );
    assert.equal(
      crypto.createHash("sha256").update(file).digest("hex"),
      m.sha256,
    );
    assert.equal(file.length, m.bytes);
    assert.ok(m.duration > 30);
    assert.ok(m.performer && m.source && m.licenseUrl && m.changes);
    assert.match(m.sourceSha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(
    music.find((m) => m.id === "clair-de-lune").license,
    "CC BY 3.0",
    "recording copyright differs from composition",
  );
  assert.equal(music.find((m) => m.id === "canon").license, "CC BY-SA 3.0");
});
test("original handbook has three stages, exact downloaded icon bytes and no orphaned articles", () => {
  const catalog = require("../src/data/handbookCatalog.ts");
  const original = require("../src/data/legacy/handbook-categories.json");
  const images = require("../src/data/handbookImageSources.json");
  assert.deepEqual(
    catalog.handbookStages.map((s) => s.title),
    ["Chưa có thai", "Đang có thai", "Nuôi con nhỏ"],
  );
  assert.equal(original.length, 18);
  for (const c of original) {
    const file = fs.readFileSync(
      path.join(__dirname, "../assets/handbook", `category-${c.id}.png`),
    );
    assert.deepEqual(
      file,
      Buffer.from(images[c.id].uri.split(",")[1], "base64"),
    );
    assert.equal(
      crypto.createHash("sha256").update(file).digest("hex"),
      c.sha256,
    );
  }
  const pregnancy = require("../src/data/pregnancy.ts").pregnancyArticles;
  const base = require("../src/data/handbook.ts").handbookArticles;
  assert.equal(
    catalog.handbookItems.filter((a) => a.pregnancyId).length,
    pregnancy.length,
  );
  assert.equal(
    catalog.handbookItems.filter((a) => a.id.startsWith("article-")).length,
    base.length,
  );
  assert.equal(
    new Set(catalog.handbookItems.map((a) => a.id)).size,
    catalog.handbookItems.length,
  );
  for (const a of catalog.handbookItems)
    assert.ok(
      catalog.handbookCategories.some((c) => c.id === a.category),
      a.id,
    );
  assert.ok(
    catalog
      .searchHandbook("thai giao")
      .some((a) => a.path === "/pregnancy/education"),
  );
});
