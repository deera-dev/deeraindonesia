/**
 * features/ngorder/utils.js — pure helpers fitur Distribusi
 * Sampel + Toko Potensial.
 *
 * `summarizeTokoItems` — dari semua baris sampel_kiriman_item milik satu
 * toko, tentukan status TERKINI per kode (kalau kode yang sama pernah
 * dikirim lebih dari sekali — mis. sempat "tidak dipilih" lalu dicoba
 * kirim ulang — baris paling baru yang dianggap berlaku), lalu hitung
 * ringkasan "Dikirim/Dipilih/Tidak Dipilih/Menunggu" (gaya laporan manual
 * yang sudah ada, lihat screenshot "PESANAN ORDER UD PUTRA TOSERBA") +
 * daftar produk yang BELUM PERNAH dikirim sama sekali ke toko ini.
 *
 * `summarizeByDaerah` / `distinctDaerahList` (permintaan Denny 2026-10:
 * "daerah mana saja yang sudah kita cover") — ringkasan toko per daerah:
 * berapa yang sudah di-approach, berapa yang tertarik, dst.
 */

/** Map<kode, item> — item TERBARU (created_at terbesar) per kode. */
export function latestItemByKode(items) {
  const map = new Map();
  for (const item of items ?? []) {
    const existing = map.get(item.kode);
    if (!existing || item.created_at > existing.created_at) {
      map.set(item.kode, item);
    }
  }
  return map;
}

/**
 * summarizeTokoItems(items, allProducts)
 * @returns {{
 *   latestByKode: Map,
 *   dipilih: object[], tidakDipilih: object[], pending: object[],
 *   belumDikirim: object[],
 *   counts: { dikirim: number, dipilih: number, tidakDipilih: number, pending: number, belumDikirim: number }
 * }}
 */
export function summarizeTokoItems(items, allProducts = []) {
  const latestByKode = latestItemByKode(items);
  const entries = [...latestByKode.values()];

  const dipilih = entries.filter((i) => i.status === "dipilih");
  const tidakDipilih = entries.filter((i) => i.status === "tidak_dipilih");
  const pending = entries.filter((i) => i.status === "pending");

  const belumDikirim = (allProducts ?? []).filter((p) => !latestByKode.has(p.kode));

  return {
    latestByKode,
    dipilih,
    tidakDipilih,
    pending,
    belumDikirim,
    counts: {
      dikirim: entries.length,
      dipilih: dipilih.length,
      tidakDipilih: tidakDipilih.length,
      pending: pending.length,
      belumDikirim: belumDikirim.length,
    },
  };
}

export const STATUS_LABEL = {
  dipilih: "Dipilih",
  tidak_dipilih: "Tidak Dipilih",
  pending: "Menunggu",
};

/** Daftar daerah unik yang sudah pernah diisi di data toko, A-Z. */
export function distinctDaerahList(tokoList) {
  const set = new Set((tokoList ?? []).map((t) => t.daerah).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * summarizeByDaerah(tokoList)
 * Group toko per daerah (toko tanpa daerah diisi masuk grup "Belum
 * Ditentukan") — dipakai TokoPage utk ringkasan "daerah mana yang sudah
 * dicover": total toko, berapa sudah di-approach, berapa tertarik, berapa
 * belum tertarik, berapa masih belum di-approach sama sekali.
 * @returns {{ daerah: string, total: number, sudahApproach: number, tertarik: number, belumTertarik: number, belumApproach: number }[]}
 *   terurut A-Z, grup "Belum Ditentukan" selalu di akhir.
 */
export function summarizeByDaerah(tokoList) {
  const groups = new Map();
  for (const t of tokoList ?? []) {
    const key = t.daerah?.trim() || "Belum Ditentukan";
    const g = groups.get(key) ?? {
      daerah: key,
      total: 0,
      sudahApproach: 0,
      tertarik: 0,
      belumTertarik: 0,
      belumApproach: 0,
    };
    g.total++;
    if (t.status_approach === "sudah") {
      g.sudahApproach++;
      if (t.kesan === "tertarik") g.tertarik++;
      if (t.kesan === "belum_tertarik") g.belumTertarik++;
    } else {
      g.belumApproach++;
    }
    groups.set(key, g);
  }
  const list = [...groups.values()];
  list.sort((a, b) => {
    if (a.daerah === "Belum Ditentukan") return 1;
    if (b.daerah === "Belum Ditentukan") return -1;
    return a.daerah.localeCompare(b.daerah, "id");
  });
  return list;
}

export const STATUS_APPROACH_LABEL = { belum: "Belum Di-Approach", sudah: "Sudah Di-Approach" };
export const KESAN_LABEL = { tertarik: "Tertarik", belum_tertarik: "Belum Tertarik" };

/**
 * buildGeocodeQueries(toko) → string[]
 * Susun BEBERAPA variasi query geocoding, dari yang paling spesifik ke
 * paling umum (permintaan Denny: "alamat sudah terisi namun gagal
 * mencari" — Nominatim/OSM Indonesia sering tidak punya data sampai level
 * nomor rumah/nama toko kecil, jadi satu query presisi gampang 0 hasil
 * padahal jalan/kotanya sendiri sebenarnya ADA di peta):
 *   1. Alamat lengkap + daerah (kalau daerah belum disebut di alamat) + Indonesia
 *   2. Alamat disederhanakan — ambil 2 segmen terakhir (biasanya "nama
 *      jalan, kota/kecamatan"), buang detail RT/RW/patokan/nomor gang yang
 *      jarang tercatat di OSM
 *   3. Daerah saja + Indonesia — titik level kota/kecamatan, kasar tapi
 *      lebih baik daripada toko tidak punya titik lokasi sama sekali
 *   4. Nama toko + Indonesia (fallback terakhir kalau toko kebetulan
 *      terdaftar sbg POI/bisnis di OSM)
 * Pemanggil (geocodeAddressMulti di @deera/shared/lib/geocode) berhenti di
 * percobaan pertama yang berhasil.
 */
export function buildGeocodeQueries(toko) {
  const alamat = toko?.alamat?.trim();
  const daerah = toko?.daerah?.trim();
  const nama = toko?.nama?.trim();
  const queries = [];

  if (alamat) {
    const full = [alamat];
    if (daerah && !alamat.toLowerCase().includes(daerah.toLowerCase())) full.push(daerah);
    full.push("Indonesia");
    queries.push(full.join(", "));

    const segments = alamat
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (segments.length > 2) {
      const simplified = segments.slice(-2);
      const simplifiedKey = simplified.join(" ").toLowerCase();
      if (daerah && !simplifiedKey.includes(daerah.toLowerCase())) simplified.push(daerah);
      simplified.push("Indonesia");
      queries.push(simplified.join(", "));
    }
  } else if (nama) {
    const full = [nama];
    if (daerah) full.push(daerah);
    full.push("Indonesia");
    queries.push(full.join(", "));
  }

  if (daerah) queries.push(`${daerah}, Indonesia`);
  if (nama) queries.push(`${nama}, Indonesia`);

  return [...new Set(queries)];
}

/** Query geocoding PALING spesifik (candidate pertama dari buildGeocodeQueries) — dipertahankan utk kompatibilitas pemanggil lama/test yang cuma butuh satu query. */
export function buildGeocodeQuery(toko) {
  return buildGeocodeQueries(toko)[0] ?? "Indonesia";
}

/** Toko yang punya titik lokasi (lat/lng terisi) — siap ditampilkan di peta. */
export function tokoWithLocation(tokoList) {
  return (tokoList ?? []).filter((t) => t.lat != null && t.lng != null);
}

/** Toko yang BELUM punya titik lokasi tapi punya alamat/daerah utk digeocode. */
export function tokoNeedingGeocode(tokoList) {
  return (tokoList ?? []).filter(
    (t) => (t.lat == null || t.lng == null) && (t.alamat?.trim() || t.daerah?.trim()),
  );
}

/**
 * buildGmapsDirUrl(origin, stops) -> URL "Buka di Google Maps" (deep link
 * resmi Maps URLs, GRATIS — tanpa API/kuota). `origin` {lat,lng}|null (null =
 * Google pakai lokasi HP user). `stops` urut kunjungan; terakhir = tujuan.
 */
export function buildGmapsDirUrl(origin, stops) {
  const list = (stops ?? []).filter((p) => p && p.lat != null && p.lng != null);
  if (!list.length) return null;
  const ll = (p) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: ll(list[list.length - 1]) });
  if (origin) params.set("origin", ll(origin));
  if (list.length > 1) params.set("waypoints", list.slice(0, -1).map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * guessDaerahFromAddress("..., Kec. X, Kota Tegal, Jawa Tengah 52121, Indonesia") -> "Tegal"
 * Format alamat Google: kota/kabupaten = bagian sebelum provinsi. "" kalau tak yakin.
 */
export function guessDaerahFromAddress(alamat) {
  const parts = (alamat ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length && /^indonesia$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length < 3) return "";
  const cand = parts[parts.length - 2];
  if (/^(kec\.?|kecamatan|jl\.?|jalan|desa|kel\.?|kelurahan)\b/i.test(cand)) return "";
  return cand.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").trim();
}

const normNama = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Hasil pencarian Google sudah tercatat sbg toko? (nama sama persis ATAU < 50 m dari toko yg ada) */
export function isDuplicateToko(item, tokoList) {
  const n = normNama(item.nama);
  return (tokoList ?? []).some((t) => {
    if (n && normNama(t.nama) === n) return true;
    if (t.lat == null || t.lng == null) return false;
    const dLat = (t.lat - item.lat) * 111;
    const dLng = (t.lng - item.lng) * 111 * Math.cos((item.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) < 0.05;
  });
}

/** Payload createToko dari hasil Google (+ detail opsional: telp, rating, jam buka, website). */
export function buildTokoPayloadFromPlace(item, details = null) {
  const lines = ["Dari Google Maps."];
  if (details?.rating != null) {
    lines.push(`Rating Google: ${details.rating}${details.ratingCount != null ? ` (${details.ratingCount} ulasan)` : ""}`);
  }
  if (details?.website) lines.push(`Website: ${details.website}`);
  if (details?.jamBuka?.length) lines.push("Jam buka:", ...details.jamBuka);
  return {
    nama: item.nama,
    alamat: item.alamat,
    daerah: guessDaerahFromAddress(item.alamat),
    no_hp: details?.noHp ?? "",
    catatan: lines.join("\n"),
    status_approach: "belum",
  };
}

/**
 * clusterPoints(points, zoom, cellPx) -> [{ lat, lng, items }] — gabung titik
 * yang berdekatan di layar (grid piksel proyeksi Web Mercator) jadi 1 cluster,
 * tanpa library. Titik tunggal tetap jadi cluster berisi 1 item.
 */
export function clusterPoints(points, zoom, cellPx = 56) {
  const scale = 256 * 2 ** zoom;
  const buckets = new Map();
  for (const p of points ?? []) {
    const x = ((p.lng + 180) / 360) * scale;
    const sin = Math.sin((p.lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  return [...buckets.values()].map((items) => ({
    lat: items.reduce((s, p) => s + p.lat, 0) / items.length,
    lng: items.reduce((s, p) => s + p.lng, 0) / items.length,
    items,
  }));
}
