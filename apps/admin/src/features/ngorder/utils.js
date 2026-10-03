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
