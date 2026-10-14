const fs = require("node:fs");
const crypto = require("node:crypto");

// Import only the supplied text. No fetching or inferred copyright permissions.
function parsePoemCollection(bytes) {
  const text = bytes.toString("utf8").replace(/\r\n/g, "\n");
  const blocks = [
    ...text.matchAll(
      /^BÀI (\d{2}): (.+) \((\d+) dòng\)\n([\s\S]*?)(?=^BÀI \d{2}:|$(?![\s\S]))/gm,
    ),
  ];
  const family = new Set([1, 2, 3, 4, 5, 6, 7, 8, 16, 24, 38, 40]);
  const nature = new Set([
    9, 10, 13, 14, 15, 18, 19, 22, 25, 26, 29, 31, 32, 33, 34, 35, 36, 37,
  ]);
  const poems = blocks.map((match, index) => {
    const number = Number(match[1]);
    if (number !== index + 1)
      throw new Error("Poem numbering is not consecutive");
    const lines = match[4]
      .replace(/\n=+\s*$/, "")
      .trim()
      .split("\n");
    const author = lines.shift()?.match(/^Tác giả \/ Sưu tầm: (.+)$/)?.[1];
    const sourceLine = lines.shift();
    const source = sourceLine?.match(/(https:\/\/\S+)$/)?.[1];
    const body = lines.join("\n").trim();
    if (!author || !source || !body)
      throw new Error(`Incomplete poem ${number}`);
    const declaredLines = Number(match[3]);
    const lineCount = body.split("\n").filter((line) => line.trim()).length;
    return {
      id: `family-collection-${match[1]}`,
      title: match[2],
      author,
      category: family.has(number)
        ? "Gia đình"
        : nature.has(number)
          ? "Thiên nhiên"
          : "Vui chơi",
      text: body,
      source,
      sourceLabel: sourceLine.replace(/: https:\/\/\S+$/, ""),
      license:
        "Từ tuyển tập do gia đình cung cấp. Tác giả và nguồn được giữ theo tệp gốc; chưa xác minh quyền tái phân phối.",
      declaredLines,
      lineCount,
      sha256: crypto.createHash("sha256").update(body).digest("hex"),
    };
  });
  if (poems.length !== 40)
    throw new Error(`Expected 40 poems, got ${poems.length}`);
  return {
    sourceFile: "tuyen_tap_tho_thai_giao_cho_thai_nhi.txt",
    sourceSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    poems,
  };
}
module.exports = { parsePoemCollection };
if (require.main === module) {
  process.stdout.write(
    JSON.stringify(
      parsePoemCollection(fs.readFileSync(process.argv[2])),
      null,
      2,
    ) + "\n",
  );
}
