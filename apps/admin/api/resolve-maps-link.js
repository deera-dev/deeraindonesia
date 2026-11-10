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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
    });
  } catch (err) {
    return json({ error: `Gagal membuka link Google Maps (${err instanceof Error ? err.message : "network error"}).` }, 502);
  }

  const finalUrl = res.url || link;
  let parsed = parseGoogleMapsUrl(finalUrl);
  let htmlLength = 0;
  if (!parsed) {
    const html = await res.text().catch(() => "");
    htmlLength = html.length;
    parsed = parseFromHtmlFallback(html);
  }

  if (!parsed) {
    // Diagnostik ditaruh LANGSUNG di pesan error (bukan cuma field terpisah)
    // supaya kelihatan di layar admin tanpa perlu akses log server —
    // sandbox dev tidak bisa fetch domain Google sama sekali utk testing,
    // jadi info ini penting buat debug laporan gagal dari admin.
    const redirected = finalUrl !== link;
    const debugBits = [
      `status Google ${res.status}`,
      redirected ? `redirect ke ${finalUrl}` : "tidak ada redirect sama sekali",
      `panjang HTML ${htmlLength}`,
    ].join(", ");
    return json(
      {
        error: `Tidak bisa baca nama/lokasi dari link ini (${debugBits}). Coba cari manual.`,
        mapsUrl: finalUrl,
        status: res.status,
      },
      422,
    );
  }

  return json({ ...parsed, mapsUrl: finalUrl }, 200);
}
