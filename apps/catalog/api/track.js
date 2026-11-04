// Edge Function proxy untuk trackVisit() — perlu supaya bisa baca header
// geo yang Vercel otomatis sisipkan di tiap request Edge (x-vercel-ip-*),
// yang TIDAK bisa dibaca browser kalau client langsung panggil Supabase
// (seperti sebelumnya). Lihat apps/catalog/src/features/analytics/api.js
// dan supabase/migrations/20261105_visit_geo_location.sql.
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Header geo Vercel — URL-encoded (nama kota bisa ada spasi/non-ASCII).
  const country = req.headers.get("x-vercel-ip-country");
  const region = req.headers.get("x-vercel-ip-country-region");
  const city = req.headers.get("x-vercel-ip-city");
  const decode = (v) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };

  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) {
    return new Response("Server not configured", { status: 500 });
  }

  const res = await fetch(`${base}/rest/v1/rpc/track_visit`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_visitor: body.visitor ?? null,
      p_session: body.session ?? null,
      p_path: body.path ?? null,
      p_referrer: body.referrer ?? null,
      p_utm_source: body.utmSource ?? null,
      p_utm_medium: body.utmMedium ?? null,
      p_utm_campaign: body.utmCampaign ?? null,
      p_src: body.src ?? null,
      p_is_landing: !!body.isLanding,
      p_device: body.device ?? null,
      p_trip_id: body.tripId ?? null,
      p_toko_id: body.tokoId ?? null,
      p_link: body.link ?? null,
      p_internal: !!body.internal,
      p_geo_country: decode(country),
      p_geo_region: decode(region),
      p_geo_city: decode(city),
    }),
  });

  return new Response(null, { status: res.ok ? 204 : 500 });
}
