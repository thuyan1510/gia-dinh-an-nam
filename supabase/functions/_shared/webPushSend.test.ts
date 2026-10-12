import { createECDH, randomBytes } from "node:crypto";
import webpush from "npm:web-push@3.6.7";
import ece from "npm:http_ece@1.2.0";
import { sendWebPush } from "./webPushSend.ts";
Deno.test(
  "actual Web Push aes128gcm encryption decrypts at the intended device; no redirects",
  async () => {
    const vapid = webpush.generateVAPIDKeys(),
      receiver = createECDH("prime256v1");
    receiver.generateKeys();
    const auth = randomBytes(16),
      fetchOriginal = globalThis.fetch;
    Deno.env.set("WEB_PUSH_VAPID_PUBLIC_KEY", vapid.publicKey);
    Deno.env.set("WEB_PUSH_VAPID_PRIVATE_KEY", vapid.privateKey);
    Deno.env.set("WEB_PUSH_VAPID_SUBJECT", "https://family.example");
    const payload = JSON.stringify({
      notificationId: "test-only",
      body: "Gia đình có cập nhật mới.",
    });
    let calls = 0;
    globalThis.fetch = async (_input, options) => {
      calls++;
      if (options?.redirect !== "error")
        throw new Error("Redirect not blocked");
      const decrypted = ece
        .decrypt(options.body, {
          version: "aes128gcm",
          privateKey: receiver,
          authSecret: auth,
        })
        .toString();
      if (decrypted !== payload) throw new Error("Payload mismatch");
      const headers = new Headers(options.headers);
      if (
        headers.get("Content-Encoding") !== "aes128gcm" ||
        !headers.get("Authorization")?.startsWith("vapid ")
      )
        throw new Error("Web Push headers missing");
      return new Response(null, { status: 201 });
    };
    try {
      const result = await sendWebPush(
        {
          endpoint: "https://web.push.apple.com/test-only",
          keys: {
            p256dh: receiver.getPublicKey().toString("base64url"),
            auth: auth.toString("base64url"),
          },
        },
        payload,
        120,
      );
      if (result.status !== 201 || calls !== 1)
        throw new Error("Incorrect handoff result");
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  },
);
