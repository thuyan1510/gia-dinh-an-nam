// Creates a NEW VAPID identity only. Never use this to rotate an existing deployment.
// Private output stays outside the repository, mode 0600; values are never printed.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const value = process.argv[2];
let url;
try {
  url = new URL(value);
} catch {
  throw new Error(
    "Pass the chosen HTTPS PWA root URL, including its trailing slash.",
  );
}
if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.search ||
  url.hash ||
  !url.pathname.endsWith("/")
) {
  throw new Error(
    "PWA URL must be HTTPS, with a trailing slash and no credentials/query/fragment.",
  );
}
const pair = crypto.createECDH("prime256v1");
pair.generateKeys();
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "an-nam-web-push-secrets-"),
);
fs.chmodSync(directory, 0o700);
const file = path.join(directory, "web-push.env");
fs.writeFileSync(
  file,
  [
    `WEB_PUSH_PWA_URL=${url.href}`,
    `WEB_PUSH_VAPID_SUBJECT=${url.href}`,
    `WEB_PUSH_VAPID_PUBLIC_KEY=${pair.getPublicKey().toString("base64url")}`,
    `WEB_PUSH_VAPID_PRIVATE_KEY=${pair.getPrivateKey().toString("base64url")}`,
    "",
  ].join("\n"),
  { mode: 0o600, flag: "wx" },
);
console.log(`Created private env file: ${file}`);
console.log(
  "Upload using supabase secrets set --env-file PATH --project-ref PROJECT_REF. Do not commit or paste its contents.",
);
