// Minimal service worker — diperlukan agar notifikasi berfungsi di PWA standalone mode (Android Chrome).
// new Notification() tidak bekerja di PWA standalone; harus pakai registration.showNotification().

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Tap notifikasi → fokus ke tab/window app yang sudah terbuka, atau buka baru
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
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      }),
  );
});
