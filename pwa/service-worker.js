importScripts("./protocol.js", "./store.js");
const CACHE = "an-nam-shell-v2-conversation",
  P = AnNamProtocol,
  store = AnNamStore;
const SHELL = [
  "./",
  "./index.html",
  "./open-app/",
  "./style.css",
  "./app.js",
  "./protocol.js",
  "./store.js",
  "./config.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const shellURLs = SHELL.map((p) => new URL(p, self.registration.scope).href);
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(shellURLs))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("an-nam-shell-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  url.search = "";
  // Strict shell allowlist: never cache API calls, signed media URLs, or health records.
  if (event.request.method !== "GET" || !shellURLs.includes(url.href)) return;
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(url.href, response.clone());
        }
        return response;
      })
      .catch(async () => (await caches.match(url.href)) || Response.error()),
  );
});
async function receipt(target, stage) {
  if (!P.target(target)) return;
  try {
    const auth = await store.get("auth"),
      config = await store.get("config");
    if (!auth?.deviceToken || !config?.apiURL) return;
    await fetch(config.apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": auth.deviceToken,
      },
      body: JSON.stringify({
        action: "receipt",
        notificationId: target.notificationId,
        stage,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* Best effort only; no fictitious receipt. Fallback channel remains available. */
  }
}
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        payload = null;
      }
      const target = P.target(payload);
      await self.registration.showNotification("Gia Đình An Nam", {
        body:
          target && typeof payload.body === "string"
            ? payload.body.slice(0, 240)
            : "Gia đình có cập nhật mới. Mở ứng dụng để xem.",
        icon: new URL("icons/icon-192.png", self.registration.scope).href,
        tag: target?.notificationId || "an-nam-update",
        renotify: false,
        data: target || {},
      });
      if (target) await receipt(target, "displayed");
    })(),
  ),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = P.target(event.notification.data);
      const url = new URL(
        target ? `open-app/?${P.query(target)}` : "./",
        self.registration.scope,
      );
      if (target)
        await store.set("pendingNavigation", {
          ...target,
          savedAt: Date.now(),
        });
      // Open/focus HTTPS first. A service worker cannot reliably launch a custom native scheme.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      let client = windows.find((w) =>
        w.url.startsWith(self.registration.scope),
      );
      if (client) {
        try {
          client = (await client.navigate(url.href)) || client;
          await client.focus();
        } catch {
          client = null;
        }
      }
      if (!client) client = await self.clients.openWindow(url.href);
      if (target) {
        client?.postMessage({ type: "OPEN_NOTIFICATION", target });
        await receipt(target, "clicked");
      }
    })(),
  );
});
self.addEventListener("pushsubscriptionchange", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const config = await store.get("config"),
          auth = await store.get("auth");
        if (
          !config?.publicKey ||
          !auth?.deviceToken ||
          (await store.get("pushDisabled"))
        )
          return;
        const key = Uint8Array.from(
          atob(config.publicKey.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        );
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch(config.apiURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-token": auth.deviceToken,
          },
          body: JSON.stringify({
            action: "register",
            subscription: subscription.toJSON(),
            permission: "granted",
            standalone: true,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        /* Reconcile again on explicit PWA open. Never request permission in the background. */
      }
    })(),
  ),
);
