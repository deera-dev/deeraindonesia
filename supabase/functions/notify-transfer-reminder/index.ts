// notify-transfer-reminder/index.ts
// Kirim push notification pengingat "waktunya transfer stok" ke semua admin,
// setiap hari pasar (Senin, Kamis, Jumat) jam 11:00 WIB, via pg_cron.
// Tap notifikasi -> buka /transfer (deep-link dari sw.js notificationclick).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

function getMarketInfo(wibDay: number): { loc: string; label: string } | null {
  if (wibDay === 1 || wibDay === 4) return { loc: "cideng",     label: "Cideng"     };
  if (wibDay === 5)                  return { loc: "tegalgubug", label: "Tegalgubug" };
  return null;
}

console.info("notify-transfer-reminder: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse body — support { force: true, loc: "cideng"|"tegalgubug" } utk testing di luar hari pasar
    let body: { force?: boolean; loc?: string } = {};
    try { body = await req.json(); } catch { /* body kosong OK */ }

    const nowUtc  = new Date();
    const wibDate = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
    const wibDay  = wibDate.getUTCDay();

    let market = getMarketInfo(wibDay);
    if (!market) {
      if (!body.force) {
        return Response.json({ skipped: true, reason: "Bukan hari pasar", wibDay, tip: "Kirim { force: true } untuk test" });
      }
      const forceLoc = body.loc === "tegalgubug" ? "tegalgubug" : "cideng";
      market = { loc: forceLoc, label: forceLoc === "cideng" ? "Cideng" : "Tegalgubug" };
    }

    const pushPayload = JSON.stringify({
      title: "🏪 Waktunya Transfer Stok",
      body:  `Sepertinya pasar ${market.label} sudah mau tutup — yuk transfer balik stok yang dibawa pulang ke gudang.`,
      url:   "/transfer",
      tag:   `transfer-reminder-${wibDate.toISOString().slice(0, 10)}`,
    });

    // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
    await supabase.from("app_notifications").insert({
      type: "transfer-reminder",
      ...(() => { const j = JSON.parse(pushPayload); return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null }; })(),
      target_emails: null,
      exclude_email: null,
    });

    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("user_email, subscription");

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, loc: market.loc, note: "Tidak ada subscriber — buka admin di browser dulu & izinkan notifikasi" });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_EMAIL")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const results = await Promise.allSettled(
      (subs as { user_email: string; subscription: webpush.PushSubscription }[]).map(
        ({ subscription }) => webpush.sendNotification(subscription, pushPayload)
      ),
    );

    const expired = (subs as { user_email: string }[])
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
      })
      .map((s) => s.user_email);
    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("user_email", expired);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.info(`[transfer-reminder] sent=${sent} total=${subs.length} loc=${market.loc}`);
    return Response.json({ sent, total: subs.length, loc: market.loc, date: wibDate.toISOString().slice(0, 10) });
  },
};
