// notify-sampel-status/index.ts
// Supabase Edge Function — kirim Web Push "status berubah" (approved/ditahan/
// rejected) KHUSUS ke pembuat planning (permintaan Denny 2026-09, hasil
// diskusi fitur planning kolaboratif). Ditarget ke satu email (creatorEmail),
// beda dari notify-sampel-comment yang broadcast ke semua admin.
//
// Dipanggil fire-and-forget dari saveBatchDecisions() di
// apps/admin/src/features/produksi-sampel/api.js, sekali per sampel yang
// diputuskan dalam satu batch approval.
//
// Deploy:
//   supabase functions deploy notify-sampel-status
//
// Body: { sampelId, sampelNomor, sampelNama, newStatus, creatorEmail, actorEmail }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_META: Record<string, { emoji: string; label: string }> = {
  approved: { emoji: "✅", label: "Disetujui" },
  ditahan: { emoji: "⏸", label: "Ditahan" },
  rejected: { emoji: "❌", label: "Ditolak" },
};

console.info("notify-sampel-status: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { sampelNama, newStatus, creatorEmail, actorEmail } = await req.json() as {
        sampelId: string;
        sampelNomor: string;
        sampelNama: string;
        newStatus: string;
        creatorEmail: string | null;
        actorEmail: string;
      };

      // Tidak ada pembuat tercatat (data lama) atau pembuat = yang memutuskan
      // sendiri -> tidak perlu notif ke diri sendiri.
      if (!creatorEmail || creatorEmail === actorEmail) {
        return Response.json({ sent: 0, note: "tidak ada target / aksi ke diri sendiri" }, {
          headers: corsHeaders,
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("endpoint, user_email, subscription")
        .eq("user_email", creatorEmail);
      if (subsErr) throw subsErr;

      if (!subs || subs.length === 0) {
        return Response.json({ sent: 0 }, { headers: corsHeaders });
      }

      webpush.setVapidDetails(
        Deno.env.get("VAPID_EMAIL")!,
        Deno.env.get("VAPID_PUBLIC_KEY")!,
        Deno.env.get("VAPID_PRIVATE_KEY")!,
      );

      const meta = STATUS_META[newStatus] ?? { emoji: "ℹ️", label: newStatus };
      const payload = JSON.stringify({
        title: `${meta.emoji} Planning ${meta.label}`,
        body: sampelNama,
        url: "/produksi/sampel",
        tag: `sampel-status-${sampelNama}`,
      });

      // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
      await supabase.from("app_notifications").insert({
        type: "sampel-status",
        ...(() => { const j = JSON.parse(payload); return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null }; })(),
        target_emails: [creatorEmail],
        exclude_email: null,
      });

      const results = await Promise.allSettled(
        (subs as { subscription: webpush.PushSubscription }[]).map(({ subscription }) =>
          webpush.sendNotification(subscription, payload)
        ),
      );

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
      return Response.json({ sent, total: subs.length }, { headers: corsHeaders });
    } catch (err) {
      console.error("[notify-sampel-status]", err);
      return Response.json(
        { error: (err as Error).message },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
