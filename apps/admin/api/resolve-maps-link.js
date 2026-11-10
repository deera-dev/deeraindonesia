export const config = { runtime: "edge" };

const ALLOWED_HOST_RE = /^https:\/\/(www\.|maps\.)?(google\.[a-z.]+|goo\.gl|share\.google|maps\.app\.goo\.gl)\//i;
const NAME_RE = /\/maps\/place\/([^/@]+)/;
const DATA_LATLNG_RE = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const AT_LATLNG_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const Q_LATLNG_RE = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
const EMBEDDED_MAPS_URL_RE = /https:\/\/(?:www\.)?google\.[a-z.]+\/maps\/place\/[^"'\s<>]+/i;

function parseGoogleMapsUrl(url) {
  if (!url) return null;
  let nama = null;
  const nameMatch = url.match(NAME_RE);
  if (nameMatch) {
    const raw = nameMatch[1].replace(/\+/g, " ");
    try {
      nama = decodeURIComponent(raw);
    } catch {
      nama = raw;
    }
  }
  const latlng = url.match(DATA_LATLNG_RE) ?? url.match(AT_LATLNG_RE) ?? url.match(Q_LATLNG_RE);
  const lat = latlng ? Number(latlng[1]) : null;
  const lng = latlng ? Number(latlng[2]) : null;
  if (!nama && lat == null) return null;
  return { nama, lat, lng };
}

function parseFromHtmlFallback(html) {
  const candidates = [
    html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1],
    html.match(/<meta property="og:url" content="([^"]+)"/i)?.[1],
    html.match(EMBEDDED_MAPS_URL_RE)?.[0],
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = parseGoogleMapsUrl(candidate.replace(/&amp;/g, "&"));
    if (parsed) return parsed;
  }
  return null;
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Permintaan tidak valid." }, 400);
  }
  const link = (body?.url ?? "").trim();
  if (!ALLOWED_HOST_RE.test(link)) {
    return json({ error: "Bukan link Google Maps yang valid." }, 400);
  }

  let res;
  try {
    res = await fetch(link, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36" },
    });
  } catch {
    return json({ error: "Gagal membuka link Google Maps." }, 502);
  }

  const finalUrl = res.url || link;
  let parsed = parseGoogleMapsUrl(finalUrl);
  if (!parsed) {
    const html = await res.text().catch(() => "");
    parsed = parseFromHtmlFallback(html);
  }

  if (!parsed) {
    return json({ error: "Tidak bisa baca nama/lokasi dari link ini. Coba cari manual.", mapsUrl: finalUrl }, 422);
  }

  return json({ ...parsed, mapsUrl: finalUrl }, 200);
}
