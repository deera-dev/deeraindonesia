/**
 * usePushNotification.js
 * Hook untuk mendaftarkan Web Push subscription ke Supabase.
 *
 * Setup yang diperlukan:
 * 1. Generate VAPID keys:
 *      npx web-push generate-vapid-keys
 * 2. Tambahkan ke .env di root monorepo:
 *      VITE_VAPID_PUBLIC_KEY=<public key>
 * 3. Buat tabel push_subscriptions di Supabase (lihat SQL di bawah)
 * 4. Deploy edge function notify-transfer (ada di supabase/functions/)
 *
 * SQL tabel push_subscriptions:
 * ─────────────────────────────────────────────
 * CREATE TABLE push_subscriptions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_email text NOT NULL UNIQUE,
 *   subscription jsonb NOT NULL,
 *   updated_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Auth users full access" ON push_subscriptions
 *   FOR ALL TO authenticated USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────
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
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function usePushNotification() {
  const { user } = useAuth();

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      console.info("[Push] VITE_VAPID_PUBLIC_KEY belum di-set, skip push setup.");
      return;
    }
    if (!user?.email) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setup() {
      try {
        // Register service worker (idempotent — aman dipanggil berulang kali)
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Cek apakah sudah subscribe
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Minta izin notifikasi
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.info("[Push] Izin notifikasi ditolak.");
            return;
          }
          // Subscribe
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Simpan subscription ke Supabase
        await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_email: user.email,
              subscription: subscription.toJSON(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" },
          );
      } catch (err) {
        console.warn("[Push] Setup gagal:", err);
      }
    }

    setup();
  }, [user?.email]);
}
