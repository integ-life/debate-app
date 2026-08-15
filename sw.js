/* Integ Chat push-only Service Worker. Keep this stable URL available if PWA
 * support is ever retired; installed clients need it in order to unregister. */
const WORKER_VERSION = "integ-chat-push-v1";

self.addEventListener("install", () => {
  // No fetch interception or precache means this worker is compatible with
  // every current page generation and can activate immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" && payload.title ? payload.title : "Integ Chat";
  const body = typeof payload.body === "string" && payload.body ? payload.body : "你有一条新消息";
  const tag = typeof payload.tag === "string" ? payload.tag : "integ-chat-message";
  const candidate = typeof payload.url === "string" ? payload.url : "/#/";
  let target = "/#/";
  try {
    const parsed = new URL(candidate, self.location.origin);
    if (parsed.origin === self.location.origin) target = parsed.href;
  } catch {
    // Keep the safe home target.
  }
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body,
      tag,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      data: { url: target, workerVersion: WORKER_VERSION },
    });
    if ("setAppBadge" in self.navigator) {
      await self.navigator.setAppBadge(1).catch(() => undefined);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    if ("clearAppBadge" in self.navigator) {
      await self.navigator.clearAppBadge().catch(() => undefined);
    }
    const target = event.notification.data?.url || self.location.origin + "/#/";
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
