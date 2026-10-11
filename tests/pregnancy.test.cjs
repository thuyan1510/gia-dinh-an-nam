const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
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
const {
  pregnancyAge,
  pregnancyDayNumber,
  articleLinkTarget,
  pregnancyWeekDays,
} = require("../src/lib/pregnancy.ts");
const {
  pregnancyArticles,
  weeklyArticle,
} = require("../src/data/pregnancy.ts");
const {
  defaultPregnancyReminders,
  parsePregnancyReminders,
  planPregnancyReminders,
} = require("../src/lib/pregnancyReminderPlan.ts");
const {
  parsePregnancySelections,
  togglePregnancyChoice,
} = require("../src/data/pregnancyDiary.ts");
const child = {
  id: "c1",
  family_id: "f1",
  name: "An",
  nickname: null,
  birthday: null,
  due_date: "2027-02-26",
  gender: null,
};

test("92 complete offline articles, correct completed weeks, no fabricated fill-ins", () => {
  assert.equal(pregnancyArticles.length, 92);
  assert.equal(new Set(pregnancyArticles.map((a) => a.id)).size, 92);
  for (const [section, count] of [
    ["growth", 43],
    ["body", 40],
    ["inside", 9],
  ])
    assert.equal(
      pregnancyArticles.filter((a) => a.section === section).length,
      count,
    );
  for (let week = 0; week <= 42; week++)
    assert.equal(weeklyArticle("growth", week).week, week);
  assert.equal(weeklyArticle("growth", 9).id, "15_0151");
  assert.equal(weeklyArticle("body", 2), undefined);
  for (let week = 3; week <= 42; week++)
    assert.equal(weeklyArticle("body", week).week, week);
  for (const a of pregnancyArticles) {
    assert.ok(a.body.length > 200);
    assert.ok(/[\u00c0-\u1ef9]/.test(a.title));
    assert.ok(!/annam\.invalid/.test(a.body));
    if (a.original) {
      assert.equal(
        crypto.createHash("sha256").update(a.original.body).digest("hex"),
        a.sourceHash,
        a.id,
      );
      assert.ok(a.body.length > a.original.body.length * 0.7, a.id);
      const links = (text) =>
        text.match(/(?:https?:\/\/|floperiodtracker:\/\/)[^\s)\]>]+/g) || [];
      assert.deepEqual(links(a.body), links(a.original.body), a.id);
    }
  }
  assert.equal(pregnancyArticles.filter((a) => a.original).length, 49);
  assert.doesNotMatch(
    JSON.stringify(pregnancyArticles),
    /X-Api-Key|X-Application-Key|Authorization:|Bearer |userId|X-App-Session-ID/,
  );
  assert.match(
    weeklyArticle("body", 42).body,
    /prostaglandin qua đường âm đạo hoặc đường uống/,
  );
  assert.doesNotMatch(
    weeklyArticle("body", 42).body,
    /tuyến tiền liệt|tiêm thuốc.*miệng|xúi giục/,
  );
});
test("all article images are packaged with verified bytes, dimensions and static Metro requires", () => {
  const images = require("../src/data/pregnancy/images.json");
  const sources = fs.readFileSync(
    path.join(__dirname, "../src/data/pregnancy/imageSources.ts"),
    "utf8",
  );
  assert.equal(Object.keys(images).length, 76);
  for (const [key, image] of Object.entries(images)) {
    const bytes = fs.readFileSync(
      path.join(__dirname, "../assets/pregnancy", image.file),
    );
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      image.sha256,
    );
    assert.ok(image.width > 0 && image.height > 0);
    assert.ok(
      sources.includes(`require("../../../assets/pregnancy/${image.file}")`),
    );
    assert.ok(pregnancyArticles.some((a) => a.images.includes(key)));
  }
  for (const article of pregnancyArticles)
    for (const key of article.images) assert.ok(images[key]);
  for (const filename of [
    "PregnancyContent.tsx",
    "../data/pregnancy/imageSources.ts",
  ]) {
    const content = fs.readFileSync(
      path.join(__dirname, "../src/components", filename),
      "utf8",
    );
    assert.doesNotMatch(content, /source=\{\{\s*uri:\s*['"]https/);
  }
});
test("gestational age respects leap dates, local day and completed rather than ordinal weeks", () => {
  assert.equal(pregnancyDayNumber("2026-02-29"), null);
  assert.ok(pregnancyDayNumber("2028-02-29"));
  assert.equal(pregnancyDayNumber("2026-13-01"), null);
  const age = pregnancyAge("2027-02-26", "2026-10-10");
  assert.equal(age.weeks, 20);
  assert.equal(age.days, 1);
  assert.equal(pregnancyAge("2027-02-26", "2027-02-26").weeks, 40);
  assert.equal(pregnancyAge("2027-02-26", "2027-03-19"), null);
  assert.equal(pregnancyAge("", "2026-10-10"), null);
  assert.equal(pregnancyAge("2028-12-01", "2026-10-10"), null);
});
test("pregnancy reminders default to 07:00/17:30, respect opt-out and cancel born profiles", () => {
  const now = new Date("2026-10-10T10:00:00");
  assert.deepEqual(
    planPregnancyReminders(
      [{ child, settings: { ...defaultPregnancyReminders, enabled: false } }],
      now,
    ),
    [],
  );
  const settings = {
    ...defaultPregnancyReminders,
    enabled: true,
    diary: true,
    dailyInfo: true,
  };
  const plan = planPregnancyReminders([{ child, settings }], now);
  assert.equal(plan.length, 12);
  assert.equal(plan[0].kind, "diary-evening");
  assert.equal(plan[0].at.getHours(), 17);
  assert.equal(plan[0].at.getMinutes(), 30);
  assert.equal(new Set(plan.map((n) => n.identifier)).size, plan.length);
  assert.ok(plan.every((n) => n.at > now));
  assert.equal(plan.filter((n) => n.kind === "info")[0].at.getHours(), 9);
  assert.ok(plan.every((n) => n.title.includes("An")));
  assert.equal(
    planPregnancyReminders(
      [{ child: { ...child, birthday: "2026-10-10" }, settings }],
      now,
    ).length,
    0,
  );
  assert.equal(planPregnancyReminders([{ child, settings }], now, 3).length, 3);
  assert.equal(
    planPregnancyReminders([{ child, settings }], now, -1).length,
    0,
  );
  const shifted = planPregnancyReminders(
    [{ child: { ...child, due_date: "2027-02-25" }, settings }],
    now,
  );
  assert.notEqual(plan[1].signature, shifted[1].signature);
  const recorded = planPregnancyReminders(
    [{ child, settings, recordedDays: new Set(["2026-10-10"]) }],
    now,
  );
  assert.ok(
    recorded.some((n) => n.kind === "diary-evening" && n.day === "2026-10-10"),
  );
  const defaults = planPregnancyReminders(
    [{ child, settings: defaultPregnancyReminders }],
    new Date("2026-10-10T06:00:00"),
  );
  assert.deepEqual(
    defaults.slice(0, 2).map((n) => [n.at.getHours(), n.at.getMinutes()]),
    [
      [7, 0],
      [17, 30],
    ],
  );
  assert.ok(defaults.every((n) => n.kind !== "info"));
  assert.equal(defaults.length, 2);
  assert.ok(defaults.every((n) => n.repeatsDaily));
  const nextDay = planPregnancyReminders(
    [{ child, settings: defaultPregnancyReminders }],
    new Date("2026-10-11T13:00:00"),
  );
  assert.deepEqual(
    defaults.map((n) => n.identifier).sort(),
    nextDay.map((n) => n.identifier).sort(),
  );
  for (const n of nextDay)
    assert.equal(
      n.signature,
      defaults.find((d) => d.identifier === n.identifier).signature,
    );
  const old = parsePregnancyReminders({
    enabled: false,
    dailyInfo: true,
    diary: true,
    diaryTime: "20:15",
  });
  assert.equal(old.enabled, false);
  assert.equal(old.diaryTime, "20:15");
  assert.equal(old.diaryMorningTime, "07:00");
});
test("multi-baby notifications share a bounded budget and carry child-specific destinations", () => {
  const profiles = ["c1", "c2"].map((id) => ({
    child: { ...child, id },
    settings: {
      ...defaultPregnancyReminders,
      enabled: true,
      dailyInfo: true,
      diary: false,
    },
  }));
  const plan = planPregnancyReminders(
    profiles,
    new Date("2026-10-10T08:00:00"),
  );
  assert.equal(plan.length, 12);
  assert.equal(new Set(plan.map((x) => x.childId)).size, 2);
  assert.ok(
    plan.every((n) => pregnancyArticles.some((a) => a.id === n.articleId)),
  );
  assert.equal(parsePregnancyReminders("{broken").enabled, false);
  assert.equal(
    parsePregnancyReminders({ infoTime: "29:70", enabled: "true" }).infoTime,
    "09:00",
  );
  assert.equal(parsePregnancyReminders({ enabled: "true" }).enabled, false);
});
test("calendar strip is Monday–Sunday and the 40 hero illustrations follow verified source mappings", () => {
  assert.deepEqual(pregnancyWeekDays("2026-10-11"), [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ]);
  assert.deepEqual(pregnancyWeekDays("2027-01-01"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.deepEqual(pregnancyWeekDays("2026-02-29"), []);
  const { weeks, visuals } = require("../src/data/pregnancy/visuals.json");
  assert.equal(weeks.length, 43);
  assert.equal(Object.keys(visuals).length, 40);
  for (const w of weeks) {
    assert.equal(weeklyArticle("growth", w.completedWeek).id, w.articleId);
    assert.equal(w.sourceWeek, w.completedWeek + 1);
    assert.ok(visuals[w.visualId]);
  }
  assert.equal(weeks[20].visualId, "week_21");
  assert.equal(weeks[42].visualId, "week_40");
  const sources = fs.readFileSync(
    path.join(__dirname, "../src/data/pregnancy/visualSources.ts"),
    "utf8",
  );
  for (const v of Object.values(visuals)) {
    assert.equal(
      crypto
        .createHash("sha256")
        .update(
          fs.readFileSync(
            path.join(__dirname, "../assets/pregnancy-visuals", v.file),
          ),
        )
        .digest("hex"),
      v.sha256,
    );
    assert.ok(sources.includes(v.file));
  }
  assert.equal(
    require("../src/data/pregnancyDiary.ts").pregnancyDiaryGroups.some(
      (g) => g.id === "sex",
    ),
    false,
  );
});
test("diary selections safely parse old data, deduplicate, keep normal-state choices exclusive", () => {
  assert.deepEqual(parsePregnancySelections('"bad"'), {});
  const parsed = parsePregnancySelections(
    JSON.stringify({
      symptoms: ["Đau lưng", "Đau lưng", 2, "Unknown"],
      injected: ["anything"],
    }),
  );
  assert.deepEqual(parsed.symptoms, ["Đau lưng"]);
  assert.equal(parsed.injected, undefined);
  assert.deepEqual(
    togglePregnancyChoice(parsed, "symptoms", "Mọi thứ đều ổn").symptoms,
    ["Mọi thứ đều ổn"],
  );
  assert.deepEqual(
    togglePregnancyChoice(
      { symptoms: ["Mọi thứ đều ổn"] },
      "symptoms",
      "Mệt mỏi",
    ).symptoms,
    ["Mệt mỏi"],
  );
});
test("links resolve locally, unsupported Flo links never become remote content fetches", () => {
  assert.deepEqual(
    articleLinkTarget("floperiodtracker://feed-cards?ids=15_5351"),
    { kind: "article", id: "15_5351" },
  );
  assert.equal(articleLinkTarget("https://api.owhealth.com/cards"), null);
  assert.equal(articleLinkTarget("https://flo.health/anything"), null);
  assert.equal(articleLinkTarget("javascript:alert(1)"), null);
  assert.equal(articleLinkTarget("file:///etc/passwd"), null);
  assert.equal(
    articleLinkTarget("https://www.nhs.uk/pregnancy/").kind,
    "external",
  );
});
