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

export async function subscribeToPush(userEmail) {
  if (!VAPID_PUBLIC_KEY) return;
  if (!userEmail) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = sub.toJSON();
    const row = {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh ?? "",
      auth: subJson.keys?.auth ?? "",
      user_email: userEmail,
      updated_at: new Date().toISOString(),
    };
    const res = await supabase
      .from("push_subscriptions")
      .upsert({ ...row, app: "pos" }, { onConflict: "endpoint" });
    if (res?.error) await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  } catch (err) {
    console.warn("[push] Subscribe failed:", err.message);
  }
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    subscribeToPush(user?.email);

    function onGranted() {
      subscribeToPush(user?.email);
    }

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
