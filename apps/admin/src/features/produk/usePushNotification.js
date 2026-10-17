import { useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/features/auth/hooks";

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
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.info("[Push] Izin notifikasi ditolak.");
            return;
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const subJson = subscription.toJSON();
        const row = {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
          user_email: user.email,
          subscription: subJson,
          updated_at: new Date().toISOString(),
        };
        const res = await supabase
          .from("push_subscriptions")
          .upsert({ ...row, app: "admin" }, { onConflict: "endpoint" });
        if (res?.error) await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
      } catch (err) {
        console.error("[Push] Setup gagal:", err);
      }
    }

    setup();
  }, [user?.email]);
}
