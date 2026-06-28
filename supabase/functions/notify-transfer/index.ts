/**
 * notify-transfer/index.ts
 * Supabase Edge Function — kirim Web Push ke semua admin kecuali pembuat transfer.
 *
 * Deploy:
 *   supabase functions deploy notify-transfer
 *
 * Set secrets (jalankan sekali):
 *   supabase secrets set \
 *     VAPID_PUBLIC_KEY="<public key dari npx web-push generate-vapid-keys>" \
 *     VAPID_PRIVATE_KEY="<private key>" \
 *     VAPID_EMAIL="mailto:admin@deera.id"
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOC_LABELS: Record<string, string> = {
  gudang: "Gudang",
  cideng: "Cideng",
  tegalgubug: "Tegalgubug",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transfer, createdBy } = await req.json() as {
      transfer: {
        id: string;
        transfer_no: string;
        created_by_name: string;
        from_location: string;
        to_location: string;
        items: { qty: number }[];
      };
      createdBy: string;
    };

    // Init Supabase dengan service role (bisa baca semua subscription)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ambil semua subscriptions kecuali milik pembuat
    // (satu user bisa punya beberapa baris — satu per device/browser)
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, user_email, subscription")
      .neq("user_email", createdBy);

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Setup VAPID
    webpush.setVapidDetails(
      Deno.env.get("VAPID_EMAIL")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const totalQty = (transfer.items ?? []).reduce((s, i) => s + i.qty, 0);
    const fromLabel = LOC_LABELS[transfer.from_location] ?? transfer.from_location;
    const toLabel   = LOC_LABELS[transfer.to_location]   ?? transfer.to_location;

    const payload = JSON.stringify({
      title: "📦 Transfer Stok Baru",
      body: `${transfer.created_by_name} — ${fromLabel} → ${toLabel} · ${totalQty} pcs`,
      url: "/admin/transfer",
      tag: `transfer-${transfer.id}`,
    });

    // Kirim push ke semua subscriber
    const results = await Promise.allSettled(
      subs.map(({ subscription }) =>
        webpush.sendNotification(subscription, payload)
      ),
    );

    // Hapus subscriptions yang sudah kadaluarsa (410 Gone) — hapus per
    // endpoint (device), BUKAN per user_email, supaya device lain milik user
    // yang sama (yang subscription-nya masih valid) tidak ikut terhapus.
    const expired = subs
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
      })
      .map((s) => s.endpoint)
      .filter(Boolean);

    if (expired.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expired);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-transfer]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
