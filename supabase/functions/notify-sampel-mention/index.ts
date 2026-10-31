// notify-sampel-mention/index.ts
// Supabase Edge Function — kirim Web Push "kena mention" ke email yang
// di-@mention di komentar (permintaan Denny 2026-09, hasil diskusi fitur
// planning kolaboratif). Berbeda dari notify-sampel-comment yang broadcast
// ke semua admin — ini ditarget spesifik ke `mentions` (array email, dipilih
// user dari dropdown autocomplete, lihat CommentThread.jsx).
//
// Mention "@all" (permintaan Denny 2026-09: "bisa mention @all") direpresen-
// tasikan sbg email khusus "*" di array `mentions` (lihat ALL_MENTION di
// produksi-sampel/utils.js) — kalau ditemukan, broadcast ke SEMUA admin
// (kecuali actor sendiri) alih-alih hanya ke target spesifik.
//
// Dipanggil fire-and-forget dari addComment() di
// apps/admin/src/features/produksi-sampel/api.js, hanya kalau mentions.length > 0.
//
// Deploy:
//   supabase functions deploy notify-sampel-mention
//
// Body: { sampelId, sampelNomor, sampelNama, commentText, mentions, actorEmail, actorName }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// @deno-types="npm:@types/web-push"
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.info("notify-sampel-mention: ready");

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { sampelNama, mentions, actorEmail, actorName } = (await req.json()) as {
        sampelId: string;
        sampelNomor: string;
        sampelNama: string;
        commentText: string | null;
        mentions: string[];
        actorEmail: string;
        actorName: string;
      };

      if (!mentions || mentions.length === 0) {
        return Response.json({ sent: 0, note: "tidak ada mention" }, { headers: corsHeaders });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const isAll = mentions.includes("*");

      let subs:
        | { endpoint: string; user_email: string; subscription: webpush.PushSubscription }[]
        | null;
      if (isAll) {
        // "@all" -> broadcast ke semua admin kecuali actor sendiri.
        const { data, error: subsErr } = await supabase
          .from("push_subscriptions")
          .select("endpoint, user_email, subscription")
          .neq("user_email", actorEmail);
        if (subsErr) throw subsErr;
        subs = data;
      } else {
        // Hanya email yang di-mention, KECUALI kalau kebetulan mention diri
        // sendiri (mis. salah pilih dari dropdown) — tidak perlu notif ke
        // diri sendiri untuk aksi yang baru saja dilakukan sendiri.
        const targets = mentions.filter((email) => email && email !== actorEmail);
        if (targets.length === 0) {
          return Response.json(
            { sent: 0, note: "hanya mention diri sendiri" },
            { headers: corsHeaders },
          );
        }
        const { data, error: subsErr } = await supabase
          .from("push_subscriptions")
          .select("endpoint, user_email, subscription")
          .in("user_email", targets);
        if (subsErr) throw subsErr;
        subs = data;
      }

      if (!subs || subs.length === 0) {
        return Response.json({ sent: 0 }, { headers: corsHeaders });
      }

      webpush.setVapidDetails(
        Deno.env.get("VAPID_EMAIL")!,
        Deno.env.get("VAPID_PUBLIC_KEY")!,
        Deno.env.get("VAPID_PRIVATE_KEY")!,
      );

      const payload = JSON.stringify({
        title: "📣 Kamu Disebut di Planning",
        body: isAll
          ? `${actorName} menyebut @all di "${sampelNama}"`
          : `${actorName} menyebut kamu di "${sampelNama}"`,
        url: "/produksi/sampel",
        tag: `sampel-mention-${sampelNama}`,
      });

      // Catat ke riwayat notifikasi (halaman Notifikasi admin) — gagal tidak menghalangi push.
      await supabase.from("app_notifications").insert({
        type: "sampel-mention",
        ...(() => {
          const j = JSON.parse(payload);
          return { title: j.title, body: j.body ?? null, url: j.url ?? null, tag: j.tag ?? null };
        })(),
        target_emails: isAll ? null : mentions.filter((e) => e && e !== actorEmail),
        exclude_email: isAll ? actorEmail : null,
      });

      const results = await Promise.allSettled(
        (subs as { subscription: webpush.PushSubscription }[]).map(({ subscription }) =>
          webpush.sendNotification(subscription, payload),
        ),
      );

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
      console.error("[notify-sampel-mention]", err);
      return Response.json(
        { error: (err as Error).message },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
