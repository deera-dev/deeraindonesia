// Service Worker — Deera POS
// Menangani push events dari server (Web Push API) dan notificationclick.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Terima push dari server → tampilkan notifikasi
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { /* ignore */ }

  const title = data.title ?? "Deera POS";
  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/android-chrome-512x512.png",
    badge: "/favicon-32x32.png",
    tag: data.tag ?? `deera-${Date.now()}`,
    renotify: true,
    data: { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap notifikasi → fokus ke app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow("/");
      }),
  );
});
