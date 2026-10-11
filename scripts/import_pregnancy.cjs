/* Build-time importer only. Never ship account/session headers or fetch Flo in the app.
 * Usage: node scripts/import_pregnancy.cjs /path/to/flo_sections_fixed_output
 * Only public article text is sent for machine translation. No user health data.
 * Outputs are checked in; CI and the installed app do not run this importer.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { correctArticle } = require("./pregnancy_translation_corrections.cjs");
const root = path.resolve(__dirname, "..");
const input = path.resolve(
  process.argv[2] || "../../../flo_sections_fixed_output",
);
const output = path.join(root, "src/data/pregnancy");
const assetDir = path.join(root, "assets/pregnancy");
const cacheFile = path.join(root, "build/pregnancy-translations.json");
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
for (const dir of [output, assetDir, path.dirname(cacheFile)])
  fs.mkdirSync(dir, { recursive: true });
const cache = fs.existsSync(cacheFile) ? read(cacheFile) : {};
const write = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function translate(text) {
  if (!text) return "";
  const key = hash(text);
  if (cache[key]) return cache[key];
  const links = [];
  const masked = text.replace(
    /(?:https?:\/\/|floperiodtracker:\/\/)[^\s)\]>]+/g,
    (url) => {
      links.push(url);
      return `https://annam.invalid/ref/${links.length - 1}`;
    },
  );
  // Preserve paragraph order; avoid oversized request URLs.
  const chunks = [];
  for (const para of masked.split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    if (para.length > 4500) throw new Error("Unexpected oversized paragraph");
    if (chunks.length && chunks.at(-1).length + para.length < 2200)
      chunks[chunks.length - 1] += "\n\n" + para;
    else chunks.push(para);
  }
  const parts = [];
  for (const chunk of chunks) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({
      client: "gtx",
      sl: "en",
      tl: "vi",
      dt: "t",
      q: chunk,
    });
    let translated;
    for (let retry = 0; retry < 3; retry++) {
      try {
        // curl respects the workspace's HTTPS proxy (Node fetch does not).
        const json = JSON.parse(
          execFileSync(
            "curl",
            [
              "--fail",
              "--silent",
              "--show-error",
              "--max-time",
              "30",
              url.href,
            ],
            { encoding: "utf8", maxBuffer: 1024 * 1024 },
          ),
        );
        translated = json[0].map((s) => s[0]).join("");
        if (!translated || translated === chunk)
          throw new Error("Empty/unchanged translation");
        break;
      } catch (e) {
        if (retry === 2) throw e;
        await pause(2000 * (retry + 1));
      }
    }
    parts.push(translated);
    await pause(650);
  }
  let result = parts.join("\n\n");
  links.forEach((url, i) => {
    const marker = `https://annam.invalid/ref/${i}`;
    if (!result.includes(marker))
      throw new Error(`Translation lost reference ${i}`);
    result = result.replace(marker, url);
  });
  cache[key] = result;
  write(cacheFile, cache);
  return result;
}
const images = {};
async function importImage(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "content.owhealth.com")
    throw new Error("Image host not allowed");
  // etag is a cache hint, not required for this static asset; no signed/auth URLs.
  if ([...url.searchParams.keys()].some((key) => key !== "etag"))
    throw new Error("Unexpected image query");
  url.search = "";
  const key = "img_" + hash(url.href).slice(0, 16);
  if (images[key]) return key;
  const ext = path.extname(url.pathname).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext))
    throw new Error("Unsupported image");
  const filename = key + ext;
  const dest = path.join(assetDir, filename);
  if (!fs.existsSync(dest)) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    )
      throw new Error(`Image download failed ${response.status}: ${key}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Oversized image");
    fs.writeFileSync(dest, bytes);
  }
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        dest,
      ],
      { encoding: "utf8" },
    ),
  );
  const { width, height } = probe.streams[0] || {};
  if (!width || !height) throw new Error(`Invalid image ${key}`);
  images[key] = {
    file: filename,
    width,
    height,
    sha256: hash(fs.readFileSync(dest)),
    source: url.href,
  };
  return key;
}
async function main() {
  const groups = [
    [
      "growth",
      read(path.join(input, "flo_43_articles_vi.json")).articles,
      "vi",
    ],
    ["body", read(path.join(input, "body_changes_articles.json")), "en"],
    ["inside", read(path.join(input, "baby_inside_you_articles.json")), "en"],
  ];
  const articles = [];
  for (const [section, rows, language] of groups) {
    for (const row of rows) {
      if (!row.body_markdown?.trim() || !row.title)
        throw new Error(`Missing body: ${row.id}`);
      const imageKeys = [];
      for (const url of [
        ...new Set([
          ...(row.image_urls || []),
          ...(row.image_url ? [row.image_url] : []),
        ]),
      ])
        imageKeys.push(await importImage(url));
      const reviewer = row.reviewed_by || {};
      const translated = language !== "vi";
      const body = translated
        ? await translate(row.body_markdown)
        : row.body_markdown;
      articles.push({
        id: row.id,
        section,
        // Do not conflate ordinal week_position with completed weeks.
        week:
          section === "growth"
            ? (row.week_completed ?? 0)
            : section === "body"
              ? Number(row.title.match(/^(\d+) weeks:/)?.[1])
              : null,
        title: translated ? await translate(row.title) : row.title,
        body,
        images: imageKeys,
        reviewer: {
          name: reviewer.name || "",
          description: translated
            ? await translate(reviewer.description || "")
            : reviewer.description || "",
        },
        sourceLanguage: language,
        translation: translated ? "machine-vi-unreviewed" : "source-vi",
        sourceHash: hash(row.body_markdown),
        original: translated
          ? {
              title: row.title,
              body: row.body_markdown,
              reviewerDescription: reviewer.description || "",
            }
          : null,
      });
      console.log(
        `${articles.length}/92 ${row.id} ${section}: offline images ${imageKeys.length}, ${translated ? "translated" : "source vi"}`,
      );
    }
  }
  if (articles.length !== 92 || new Set(articles.map((a) => a.id)).size !== 92)
    throw new Error("Article count/identity mismatch");
  write(path.join(output, "articles.json"), articles.map(correctArticle));
  write(path.join(output, "images.json"), images);
  fs.writeFileSync(
    path.join(output, "imageSources.ts"),
    '// Generated by scripts/import_pregnancy.cjs. Local bundled assets only.\nimport type { ImageSourcePropType } from "react-native";\nexport const pregnancyImageSources: Record<string, ImageSourcePropType> = {\n' +
      Object.entries(images)
        .map(
          ([key, value]) =>
            `  ${JSON.stringify(key)}: require("../../../assets/pregnancy/${value.file}"),`,
        )
        .join("\n") +
      "\n};\n",
  );
  write(path.join(output, "provenance.json"), {
    importedAt: new Date().toISOString(),
    input: "User-provided flo_sections_fixed_output",
    counts: {
      growth: 43,
      body: 40,
      inside: 9,
      images: Object.keys(images).length,
    },
    translation:
      "49 English articles machine-translated into Vietnamese using Google Translate, originals retained. Not medically reviewed.",
    images:
      "Public image URLs supplied with the article export; fetched at build preparation only. No Flo account/API credentials used.",
    license:
      "Third-party reference material supplied by the user for their private family app. Not covered by the application source license; redistribution rights are not established.",
  });
  console.log(
    "Import complete:",
    articles.length,
    "articles,",
    Object.keys(images).length,
    "local images",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
