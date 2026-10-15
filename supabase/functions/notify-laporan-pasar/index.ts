// notify-laporan-pasar/index.ts
// Kirim push notification laporan harian pasar ke semua admin.
// Dipanggil jam 13.00 WIB setiap hari pasar (Senin, Kamis, Jumat) via pg_cron.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

function getMarketInfo(wibDay: number): { loc: string; label: string } | null {
  if (wibDay === 1 || wibDay === 4) return { loc: "cideng",     label: "Cideng"     };
  if (wibDay === 5)                  return { loc: "tegalgubug", label: "Tegalgubug" };
  return null;
}

function fmtRp(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

console.info("notify-laporan-pasar: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    // Buat Supabase admin client (service role — bypass RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse body — support { force: true } untuk testing di luar hari pasar
    let body: { force?: boolean; loc?: string } = {};
    try { body = await req.json(); } catch { /* body kosong OK */ }

    // Tentukan hari dalam WIB (UTC+7)
    const nowUtc   = new Date();
    const wibDate  = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
    const wibDay   = wibDate.getUTCDay();
    const todayWib = wibDate.toISOString().slice(0, 10);

    let market = getMarketInfo(wibDay);
    if (!market) {
      if (!body.force) {
        return Response.json({ skipped: true, reason: "Bukan hari pasar", wibDay, tip: "Kirim { force: true } untuk test" });
      }
      const forceLoc = body.loc === "tegalgubug" ? "tegalgubug" : "cideng";
      market = { loc: forceLoc, label: forceLoc === "cideng" ? "Cideng" : "Tegalgubug" };
    }

    // Ambil penjualan hari ini
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select("type, total, items")
      .eq("location", market.loc)
      .eq("date", todayWib);

    if (salesErr) throw salesErr;

    const rows      = (sales ?? []) as { type: string; total: number; items: { kode: string; harga: number; hpp: number; qty: number }[] }[];
    const penjualan = rows.filter((s) => s.type !== "retur");
    const retur     = rows.filter((s) => s.type === "retur");

    const omset = penjualan.reduce((s, t) => s + (t.total ?? 0), 0);
    const keuntungan = penjualan.reduce((s, t) =>
      s + (t.items ?? []).reduce((ss, item) => ss + ((item.harga ?? 0) - (item.hpp ?? 0)) * Math.max(0, item.qty ?? 1), 0), 0);
    const totalRetur = retur.reduce((s, t) => s + (t.total ?? 0), 0);
    const marginPct  = omset > 0 ? Math.round((keuntungan / omset) * 100) : 0;

    // Top 3 produk
    const prodMap: Record<string, { kode: string; qty: number }> = {};
    for (const sale of penjualan) {
      for (const item of sale.items ?? []) {
        if (!prodMap[item.kode]) prodMap[item.kode] = { kode: item.kode, qty: 0 };
        prodMap[item.kode].qty += Math.max(0, item.qty ?? 1);
      }
    }
    const topProds = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 3);

    // Isi notifikasi
    const tanggalStr = wibDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    const bodyParts  = [
      `Omset Rp ${fmtRp(omset)}`,
      `Untung Rp ${fmtRp(keuntungan)} (${marginPct}%)`,
      `${penjualan.length} transaksi`,
    ];
    if (totalRetur > 0) bodyParts.push(`Retur Rp ${fmtRp(totalRetur)}`);
    if (topProds.length > 0) bodyParts.push("Top: " + topProds.map((p) => `${p.kode}(${p.qty})`).join(", "));

    const pushPayload = JSON.stringify({
      title: `🏪 Laporan ${market.label} · ${tanggalStr}`,
      body:  bodyParts.join(" · "),
      url:   "/laporan",
      tag:   `laporan-pasar-${todayWib}-${market.loc}`,
    });

    // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
    await supabase.from("app_notifications").insert({
      type: "laporan-pasar",
      ...(() => { const j = JSON.parse(pushPayload); return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null }; })(),
      target_emails: null,
      exclude_email: null,
    });

    // Ambil semua push subscriptions
    // (satu user bisa punya beberapa baris — satu per device/browser)
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, user_email, subscription");

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, omset, note: "Tidak ada subscriber — buka admin di browser dulu & izinkan notifikasi" });
    }

    // Kirim push
    webpush.setVapidDetails(
      Deno.env.get("VAPID_EMAIL")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const results = await Promise.allSettled(
      (subs as { endpoint: string; user_email: string; subscription: webpush.PushSubscription }[]).map(
        ({ subscription }) => webpush.sendNotification(subscription, pushPayload)
      ),
    );

    // Bersihkan subscription expired — hapus per endpoint (device), BUKAN
    // per user_email, supaya device lain milik user yang sama tidak ikut
    // terhapus kalau cuma satu device-nya yang kadaluarsa.
    const expired = (subs as { endpoint: string }[])
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
      })
      .map((s) => s.endpoint)
      .filter(Boolean);
    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.info(`[laporan-pasar] sent=${sent} total=${subs.length} omset=${omset} loc=${market.loc}`);
    return Response.json({ sent, total: subs.length, omset, keuntungan, loc: market.loc, date: todayWib });
  },
};
