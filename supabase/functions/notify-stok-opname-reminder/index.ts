// notify-stok-opname-reminder/index.ts
// Kirim push notification pengingat "waktunya stok opname" ke semua admin,
// setiap 2 minggu sekali jam 11:00 WIB. Dipanggil via pg_cron SETIAP HARI
// jam 11:00 WIB — fungsi ini sendiri yang menentukan apakah sudah waktunya
// kirim (rolling 14 hari sejak terakhir kirim, dibaca dari
// public.push_reminder_state, key = "stok-opname-reminder"). Pendekatan ini
// dipilih (bukan cron day-of-week + hitung paritas minggu ISO) supaya kalau
// satu run gagal/ke-skip, jadwal tetap "self-heal" ke rolling 14 hari
// berikutnya — tidak permanen geser.
// Tap notifikasi -> buka /stok-opname (deep-link dari sw.js notificationclick).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const INTERVAL_DAYS = 14;
const STATE_KEY = "stok-opname-reminder";

console.info("notify-stok-opname-reminder: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse body — support { force: true } utk testing tanpa nunggu 14 hari
    let body: { force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      /* body kosong OK */
    }

    const { data: state, error: stateErr } = await supabase
      .from("push_reminder_state")
      .select("last_sent_at")
      .eq("key", STATE_KEY)
      .maybeSingle();
    if (stateErr) throw stateErr;

    const now = new Date();
    const lastSentAt = state?.last_sent_at ? new Date(state.last_sent_at) : null;
    const daysSince = lastSentAt ? (now.getTime() - lastSentAt.getTime()) / 86_400_000 : Infinity;

    if (daysSince < INTERVAL_DAYS && !body.force) {
      return Response.json({
        skipped: true,
        reason: "Belum 14 hari sejak terakhir kirim",
        daysSince: Math.floor(daysSince),
        nextInDays: Math.ceil(INTERVAL_DAYS - daysSince),
      });
    }

    const pushPayload = JSON.stringify({
      title: "📋 Waktunya Stok Opname",
      body: "Sudah 2 minggu — yuk luangkan waktu buat cek & samakan stok fisik lewat Stok Opname.",
      url: "/stok-opname",
      tag: `stok-opname-reminder-${now.toISOString().slice(0, 10)}`,
    });

    // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
    await supabase.from("app_notifications").insert({
      type: "stok-opname-reminder",
      ...(() => {
        const j = JSON.parse(pushPayload);
        return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null };
      })(),
      target_emails: null,
      exclude_email: null,
    });

    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("user_email, subscription");
    if (subsErr) throw subsErr;

    if (!subs || subs.length === 0) {
      // Tidak ada subscriber — tetap update last_sent_at supaya tidak
      // langsung retry lagi besok begitu ada subscriber baru mendadak.
      await supabase
        .from("push_reminder_state")
        .upsert({ key: STATE_KEY, last_sent_at: now.toISOString(), updated_at: now.toISOString() });
      return Response.json({
        sent: 0,
        note: "Tidak ada subscriber — buka admin di browser dulu & izinkan notifikasi",
      });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_EMAIL")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const results = await Promise.allSettled(
      (subs as { user_email: string; subscription: webpush.PushSubscription }[]).map(
        ({ subscription }) => webpush.sendNotification(subscription, pushPayload),
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

    await supabase
      .from("push_reminder_state")
      .upsert({ key: STATE_KEY, last_sent_at: now.toISOString(), updated_at: now.toISOString() });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.info(`[stok-opname-reminder] sent=${sent} total=${subs.length}`);
    return Response.json({ sent, total: subs.length, date: now.toISOString().slice(0, 10) });
  },
};
