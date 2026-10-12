// Static public shell only; no auth token, VAPID private key, child or family data is bundled.
const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  out = path.resolve(
    process.env.PWA_OUTPUT || path.join(root, "build/notification-pwa"),
  );
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url || ""))
  throw new Error("EXPO_PUBLIC_SUPABASE_URL required");
fs.mkdirSync(out, { recursive: true });
for (const file of fs.readdirSync(path.join(root, "pwa")))
  fs.copyFileSync(path.join(root, "pwa", file), path.join(out, file));
fs.writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify({
    apiURL: url.replace(/\/$/, "") + "/functions/v1/webpush-device",
  }),
);
fs.mkdirSync(path.join(out, "open-app"), { recursive: true });
fs.writeFileSync(
  path.join(out, "open-app/index.html"),
  fs
    .readFileSync(path.join(root, "pwa/index.html"), "utf8")
    .replace("<head>", '<head><base href="../">'),
);
fs.mkdirSync(path.join(out, "icons"), { recursive: true });
for (const size of [192, 512])
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    path.join(root, "assets/an-nam-icon-v1.png"),
    "-vf",
    `scale=${size}:${size}`,
    path.join(out, `icons/icon-${size}.png`),
  ]);
console.log(`Public PWA shell built: ${out}`);
