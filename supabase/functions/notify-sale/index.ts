/**
 * notify-sale — Supabase Edge Function
 *
 * Dipanggil oleh POS setelah transaksi berhasil disimpan.
 * Mengambil push_subscriptions milik POS dari Supabase (bukan admin), lalu
 * kirim Web Push ke tiap device tersebut.
 *
 * Env vars yang harus di-set di Supabase Dashboard → Edge Functions → Secrets:
 *   VAPID_PUBLIC_KEY   — generated VAPID public key (URL-safe base64)
 *   VAPID_PRIVATE_KEY  — generated VAPID private key (URL-safe base64)
 *   VAPID_SUBJECT      — mailto:deeraindonesia@gmail.com
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — npm: prefix untuk Deno
import webPush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sale, createdBy } = await req.json();

    // Setup VAPID
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:deeraindonesia@gmail.com";

    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Supabase client dengan service role (bisa baca semua subscriptions)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Hanya device POS (app = 'pos') + baris lama yang belum bertanda (null);
    // device admin (app = 'admin') TIDAK menerima notif penjualan.
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .or("app.is.null,app.eq.pos");
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Susun isi notifikasi
    const total = sale?.total ?? 0;
    const items = sale?.items ?? [];
    const itemCount = items.reduce((s: number, item: Record<string, unknown>) => {
      if (Array.isArray(item.warna)) {
        return s + (item.warna as Array<{ qty?: number }>).reduce((ss, w) => ss + (w.qty ?? 0), 0);
      }
      return s + ((item.qty as number) ?? 0);
    }, 0);

    const bodyParts = [
      `${itemCount} item · Rp ${total.toLocaleString("id-ID")}`,
      sale?.buyer_name ? `Pembeli: ${sale.buyer_name}` : null,
      createdBy ? `Kasir: ${createdBy}` : null,
    ].filter(Boolean);

    const payload = JSON.stringify({
      title: "💰 Transaksi Baru",
      body: bodyParts.join("\n"),
      icon: "/android-chrome-512x512.png",
      tag: `deera-sale-${Date.now()}`,
    });

    // Kirim ke semua subscriber (paralel, abaikan yang gagal)
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          .catch((err: Error) => {
            // Subscription tidak valid (device uninstall PWA) → hapus dari DB
            if (err.statusCode === 404 || err.statusCode === 410) {
              return supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
