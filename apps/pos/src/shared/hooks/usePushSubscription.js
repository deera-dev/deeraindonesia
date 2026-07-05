/**
 * usePushSubscription.js
 *
 * Mendaftarkan device ini ke Web Push dan menyimpan subscription ke Supabase.
 *
 * PENTING — kenapa ini perlu listener event, bukan cuma useEffect([user]):
 * Hook ini dipanggil di App.jsx SEBELUM <NotificationGate> mengizinkan user
 * klik "Aktifkan Notifikasi". Jadi saat effect ini jalan pertama kali,
 * Notification.permission masih "default" → subscribe dibatalkan (early return).
 * Begitu user klik izinkan di NotificationGate, permission berubah jadi
 * "granted", TAPI effect ini tidak otomatis jalan ulang karena dependency-nya
 * cuma [user] (user tidak berubah). Akibatnya device itu tidak akan PERNAH
 * subscribe, walau usernya sudah granted — makanya push notif hanya muncul
 * di device yang sudah granted dari sesi sebelumnya, sementara device lain
 * yang baru klik "izinkan" tidak pernah ke-daftar di tabel push_subscriptions.
 *
 * Fix: NotificationGate men-dispatch custom event "deera-notif-granted" begitu
 * permission jadi granted, dan hook ini mendengarkan event tersebut untuk
 * langsung mencoba subscribe lagi. Ditambah listener visibilitychange sebagai
 * jaring pengaman (misal user ubah izin notifikasi lewat setelan browser).
 *
 * Flow subscribe:
 * 1. Tunggu service worker siap
 * 2. Cek apakah sudah punya subscription di browser (pushManager)
 * 3. Kalau belum, subscribe dengan VAPID public key
 * 4. Upsert subscription ke tabel push_subscriptions di Supabase
 *
 * PENTING — kenapa subscribeToPush() berhenti kalau userEmail belum ada:
 * effect di bawah memanggil subscribeToPush(user?.email) langsung saat mount,
 * padahal saat itu useAuth() bisa saja masih memuat sesi (user masih
 * null/undefined sesaat). Kalau upsert tetap dipaksa jalan dengan user_email
 * kosong, Supabase menolak dengan error 23502 (kolom user_email NOT NULL).
 * Solusinya BUKAN isi user_email dengan null, tapi skip upsert dulu — effect
 * ini sudah punya `user` di dependency array, jadi begitu auth selesai
 * resolve dan `user.email` terisi, effect jalan ulang otomatis dan upsert
 * baru benar-benar dikirim dengan email yang valid.
 */
import { useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/features/auth/hooks";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Coba subscribe device ini ke Web Push dan simpan ke Supabase.
 * Aman dipanggil berulang kali — getSubscription() mengembalikan subscription
 * yang sudah ada, dan upsert di Supabase idempotent lewat onConflict: "endpoint".
 */
export async function subscribeToPush(userEmail) {
  if (!VAPID_PUBLIC_KEY) return;
  // Auth belum selesai resolve (user masih null/undefined) — jangan upsert
  // dengan user_email kosong (akan ditolak Supabase, kolom ini NOT NULL).
  // Effect pemanggil dependensinya [user], jadi otomatis dipanggil ulang
  // begitu email-nya sudah tersedia.
  if (!userEmail) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;

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
        user_email: userEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  } catch (err) {
    console.warn("[push] Subscribe failed:", err.message);
  }
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    // Percobaan awal — berhasil kalau permission sudah granted dari sesi sebelumnya
    subscribeToPush(user?.email);

    // Begitu NotificationGate berhasil minta izin & permission jadi granted,
    // event ini dipancarkan → coba subscribe lagi saat itu juga.
    function onGranted() {
      subscribeToPush(user?.email);
    }

    // Jaring pengaman: tab kembali aktif (misal user ubah izin lewat setelan
    // browser di luar alur NotificationGate, lalu balik ke tab ini).
    function onVisible() {
      if (document.visibilityState === "visible") subscribeToPush(user?.email);
    }

    window.addEventListener("deera-notif-granted", onGranted);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("deera-notif-granted", onGranted);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);
}
