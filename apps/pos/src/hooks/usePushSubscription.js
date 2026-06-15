/**
 * usePushSubscription.js
 *
 * Mendaftarkan device ini ke Web Push dan menyimpan subscription ke Supabase.
 * Dipanggil sekali dari App.jsx setelah user login dan permission sudah granted.
 *
 * Flow:
 * 1. Tunggu service worker siap
 * 2. Cek apakah sudah punya subscription di browser (pushManager)
 * 3. Kalau belum, subscribe dengan VAPID public key
 * 4. Upsert subscription ke tabel push_subscriptions di Supabase
 */
import { useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        // Ambil subscription yang sudah ada, atau buat baru
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const subJson = sub.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh ?? "",
            auth: subJson.keys?.auth ?? "",
            user_email: user?.email ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" },
        );
      } catch (err) {
        console.warn("[push] Subscribe failed:", err.message);
      }
    });
  }, [user]);
}
