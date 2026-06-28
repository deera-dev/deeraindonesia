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
 * SQL tabel push_subscriptions (skema terkini — lihat juga migration
 * supabase-migration-push-subscriptions-fix-*.sql untuk riwayat perubahan):
 * ─────────────────────────────────────────────
 * CREATE TABLE push_subscriptions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   endpoint text UNIQUE,        -- kunci SATU baris per device/browser
 *   p256dh text,
 *   auth text,
 *   user_email text,             -- BUKAN unique — satu user bisa multi-device
 *   subscription jsonb,          -- kompatibilitas lama (notify-transfer dkk)
 *   updated_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Auth users full access" ON push_subscriptions
 *   FOR ALL TO authenticated USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────
 *
 * PENTING — kenapa upsert pakai onConflict: "endpoint" (bukan "user_email"):
 * satu admin bisa login & subscribe dari beberapa device/browser sekaligus.
 * Kalau kunci konflik-nya user_email, device kedua akan gagal INSERT dengan
 * error 23505 (duplicate key) begitu user_email yang sama sudah dipakai baris
 * device pertama. Endpoint selalu unik per device, jadi itu kunci yang benar.
 * `subscription` (jsonb) tetap diisi supaya edge function lama
 * (notify-transfer, notify-laporan-pasar) yang masih baca kolom itu tetap
 * jalan — lihat juga apps/pos/src/hooks/usePushSubscription.js yang sudah
 * pakai pola yang sama.
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

        // Simpan subscription ke Supabase — kunci konflik "endpoint" (1 baris
        // per device), bukan "user_email", supaya admin yang login di
        // beberapa device/browser tidak saling menimpa/duplicate-key error.
        const subJson = subscription.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh ?? "",
            auth: subJson.keys?.auth ?? "",
            user_email: user.email,
            subscription: subJson,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" },
        );
      } catch (err) {
        console.warn("[Push] Setup gagal:", err);
      }
    }

    setup();
  }, [user?.email]);
}
