/**
 * sw.js — Service Worker untuk Web Push Notifications
 * Deera Admin PWA
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── Terima push dari server ──────────────────────────────────────────────────
self.addEventListener("push", function (event) {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Deera Admin", body: event.data?.text() ?? "Notifikasi baru" };
  }

  const options = {
    body: data.body ?? "Ada notifikasi baru",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    vibrate: [200, 100, 200],
    tag: data.tag ?? "deera-notif",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url ?? "/transfer" },
  };

  event.waitUntil(self.registration.showNotification(data.title ?? "Deera Admin", options));
});

// ── Tap notifikasi → buka / fokus halaman ────────────────────────────────────
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  // Base route admin TIDAK pakai prefix /admin (lihat CLAUDE.md §13) — fallback
  // ini sempat salah nulis "/admin/transfer" sebelumnya (bug, sudah diperbaiki).
  const targetUrl = event.notification.data?.url ?? "/transfer";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
