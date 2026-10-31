// notify-sampel-comment/index.ts
// Supabase Edge Function — kirim Web Push "ada komentar baru" ke semua admin
// KECUALI penulis komentar itu sendiri (permintaan Denny 2026-09: "ada notif
// kalau ada yang bikin komen"). Broadcast ke semua admin (bukan cuma yang
// terlibat di planning ini) — pola sama seperti notify-transfer, karena tim
// ini kecil dan semua admin perlu tahu ada diskusi baru di planning manapun.
//
// Dipanggil fire-and-forget dari addComment() di
// apps/admin/src/features/produksi-sampel/api.js — gagal kirim TIDAK BOLEH
// membuat komentar gagal tersimpan (caller sudah .catch(() => {})).
//
// Deploy:
//   supabase functions deploy notify-sampel-comment
//
// Body: { sampelId, sampelNomor, sampelNama, commentText, actorEmail, actorName }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PREVIEW = 80;

console.info("notify-sampel-comment: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { sampelNama, commentText, actorEmail, actorName } = (await req.json()) as {
        sampelId: string;
        sampelNomor: string;
        sampelNama: string;
        commentText: string | null;
        actorEmail: string;
        actorName: string;
      };

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Semua subscriber kecuali penulis komentar sendiri.
      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("endpoint, user_email, subscription")
        .neq("user_email", actorEmail);
      if (subsErr) throw subsErr;

      if (!subs || subs.length === 0) {
        return Response.json({ sent: 0 }, { headers: corsHeaders });
      }

      webpush.setVapidDetails(
        Deno.env.get("VAPID_EMAIL")!,
        Deno.env.get("VAPID_PUBLIC_KEY")!,
        Deno.env.get("VAPID_PRIVATE_KEY")!,
      );

      const preview = commentText
        ? commentText.length > MAX_PREVIEW
          ? `${commentText.slice(0, MAX_PREVIEW)}…`
          : commentText
        : "(mengirim foto)";

      const payload = JSON.stringify({
        title: "💬 Komentar Baru di Planning",
        body: `${actorName} — ${sampelNama}: "${preview}"`,
        url: "/produksi/sampel",
        tag: `sampel-comment-${sampelNama}`,
      });

      // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
      await supabase.from("app_notifications").insert({
        type: "sampel-comment",
        ...(() => {
          const j = JSON.parse(payload);
          return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null };
        })(),
        target_emails: null,
        exclude_email: actorEmail,
      });

      const results = await Promise.allSettled(
        (subs as { subscription: webpush.PushSubscription }[]).map(({ subscription }) =>
          webpush.sendNotification(subscription, payload),
        ),
      );

      // Bersihkan subscription kadaluarsa (410 Gone) per endpoint (device),
      // bukan per user_email — device lain milik user yang sama jangan ikut
      // terhapus kalau subscription-nya masih valid.
      const expired = (subs as { endpoint: string }[])
        .filter((_, i) => {
          const r = results[i];
          return (
            r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410
          );
        })
        .map((s) => s.endpoint)
        .filter(Boolean);
      if (expired.length > 0) {
        await supabase.from("push_subscriptions").delete().in("endpoint", expired);
      }

      const sent = results.filter((r) => r.status === "fulfilled").length;
      return Response.json({ sent, total: subs.length }, { headers: corsHeaders });
    } catch (err) {
      console.error("[notify-sampel-comment]", err);
      return Response.json(
        { error: (err as Error).message },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
