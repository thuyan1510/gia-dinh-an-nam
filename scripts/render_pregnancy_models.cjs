// Offline asset build, NOT app runtime: render the supplied GLB geometry/UV textures.
// Needs extracted archive directory and transient three/playwright-core on NODE_PATH.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  crypto = require("node:crypto"),
  { execFileSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const root = path.resolve(__dirname, ".."),
  models = process.env.PREGNANCY_MODEL_DIR;
if (!models || !fs.existsSync(path.join(models, "config.json")))
  throw new Error("PREGNANCY_MODEL_DIR required");
const three = path.dirname(path.dirname(require.resolve("three")));
const out =
  process.env.PREGNANCY_RENDER_OUTPUT ||
  path.join(root, "assets/pregnancy-model-renders");
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"),
    routes = [
      ["/models/", models],
      ["/three/", three],
      ["/renderer/", path.join(__dirname, "pregnancy-render")],
    ];
  const route = routes.find(([prefix]) => url.pathname.startsWith(prefix));
  if (!route) {
    res.writeHead(404);
    res.end();
    return;
  }
  const file = path.resolve(route[1], url.pathname.slice(route[0].length));
  if (
    !file.startsWith(path.resolve(route[1]) + path.sep) ||
    !fs.existsSync(file)
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".html": "text/html",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".glb": "model/gltf-binary",
    }[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], {
        encoding: "utf8",
      }).trim(),
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error(e.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/renderer/index.html`,
    );
    await page.waitForFunction(() => window.rendererReady);
    const weeks = process.env.RENDER_WEEK
        ? [Number(process.env.RENDER_WEEK)]
        : Array.from({ length: 43 }, (_, i) => i),
      manifest = [];
    for (const week of weeks) {
      const result = await page.evaluate(
        async ({ week, azimuth }) => window.renderWeek(week, azimuth),
        { week, azimuth: Number(process.env.RENDER_AZIMUTH || -1.2) },
      );
      const bytes = Buffer.from(result.png.split(",")[1], "base64"),
        name = `week-${String(week).padStart(2, "0")}.png`;
      fs.writeFileSync(path.join(out, name), bytes);
      manifest.push({
        completedWeek: week,
        sceneId: result.sceneId,
        sourceModel: result.model,
        file: name,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      });
      console.log(`Rendered ${week}: ${bytes.length} bytes`);
    }
    fs.writeFileSync(
      path.join(out, "manifest.json"),
      JSON.stringify(
        {
          source: "3D-baby-20210922_2",
          rendering:
            "Neutral model; original geometry and UV textures; static transparent render (not Flo's native Filament shader).",
          weeks: manifest,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser?.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
