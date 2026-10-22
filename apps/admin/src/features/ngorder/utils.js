
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

export function distinctDaerahList(tokoList) {
  const set = new Set((tokoList ?? []).map((t) => t.daerah).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

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

export function buildGeocodeQuery(toko) {
  return buildGeocodeQueries(toko)[0] ?? "Indonesia";
}

export function tokoWithLocation(tokoList) {
  return (tokoList ?? []).filter((t) => t.lat != null && t.lng != null);
}

export function tokoNeedingGeocode(tokoList) {
  return (tokoList ?? []).filter(
    (t) => (t.lat == null || t.lng == null) && (t.alamat?.trim() || t.daerah?.trim()),
  );
}

export function tokoAutoGeocodeQueue(tokoList) {
  return (tokoList ?? []).filter(
    (t) => (t.lat == null || t.lng == null) && t.geocode_source !== "gagal" && (t.alamat?.trim() || t.daerah?.trim() || t.nama?.trim()),
  );
}

export function filterToko(tokoList, { search = "", daerah = "", approach = "" } = {}) {
  const q = search.trim().toLowerCase();
  return (tokoList ?? []).filter((t) => {
    if (q && !`${t.nama ?? ""} ${t.alamat ?? ""} ${t.daerah ?? ""}`.toLowerCase().includes(q)) return false;
    if (daerah && (t.daerah ?? "") !== daerah) return false;
    if (approach && t.status_approach !== approach) return false;
    return true;
  });
}

export const KUNJUNGAN_STATUS_LABEL = {
  rencana: "Rencana",
  berlangsung: "Sedang dikunjungi",
  selesai: "Selesai",
  batal: "Batal",
};

const KUNJUNGAN_ORDER = { berlangsung: 0, rencana: 1, selesai: 2, batal: 3 };

export function sortRencana(rows, jarakByToko = null) {
  const done = (r) => (r.status === "selesai" || r.status === "batal" ? 1 : 0);
  const jarak = (r) => jarakByToko?.get(r.toko_id)?.distanceKm ?? Infinity;
  return [...(rows ?? [])].sort(
    (a, b) =>
      (jarakByToko ? done(a) - done(b) || jarak(a) - jarak(b) : 0) ||
      (KUNJUNGAN_ORDER[a.status] ?? 9) - (KUNJUNGAN_ORDER[b.status] ?? 9) ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
}

export function fmtJarak(item) {
  if (!item) return "";
  return `${item.distanceKm.toFixed(1)} km${item.durationMin != null ? ` · ${Math.round(item.durationMin)} mnt` : ""}`;
}

export function summarizeRencana(rows) {
  const counts = { total: 0, rencana: 0, berlangsung: 0, selesai: 0, batal: 0 };
  for (const r of rows ?? []) {
    counts.total++;
    if (r.status in counts) counts[r.status]++;
  }
  return counts;
}

export function buildRencanaShareText(rows, tokoById) {
  const lines = ["*Rencana Kunjungan Ngorder*"];
  sortRencana(rows).forEach((r, i) => {
    const t = tokoById.get(r.toko_id);
    if (!t) return;
    const status = r.status === "rencana" ? "" : ` [${KUNJUNGAN_STATUS_LABEL[r.status]}]`;
    lines.push(`${i + 1}. ${t.nama}${t.daerah ? ` - ${t.daerah}` : ""}${status}`);
    if (r.hasil) lines.push(`   Hasil: ${r.hasil}`);
    if (r.request) lines.push(`   Request: ${r.request}`);
  });
  return lines.join("\n");
}

export function buildGmapsDirUrl(origin, stops) {
  const list = (stops ?? []).filter((p) => p && p.lat != null && p.lng != null);
  if (!list.length) return null;
  const ll = (p) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: ll(list[list.length - 1]) });
  if (origin) params.set("origin", ll(origin));
  if (list.length > 1) params.set("waypoints", list.slice(0, -1).map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function guessDaerahFromAddress(alamat) {
  const parts = (alamat ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length && /^indonesia$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length < 3) return "";
  const cand = parts[parts.length - 2];
  if (/^(kec\.?|kecamatan|jl\.?|jalan|desa|kel\.?|kelurahan)\b/i.test(cand)) return "";
  return cand.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").trim();
}

const normNama = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

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

const SOSMED_URL = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
};

const SOSMED_SEARCH = {
  instagram: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
  tiktok: (q) => `https://www.tiktok.com/search/user?q=${encodeURIComponent(q)}`,
  facebook: (q) => `https://www.facebook.com/search/pages/?q=${encodeURIComponent(q)}`,
};

const PLATFORM_RE = {
  instagram: /\b(ig|insta|instagram)\b/i,
  tiktok: /\b(tiktok|tik tok|tt)\b/i,
  facebook: /\b(fb|facebook)\b/i,
};

const DOMAIN_PLATFORM = { "instagram.com": "instagram", "tiktok.com": "tiktok", "facebook.com": "facebook", "fb.com": "facebook" };

export function parseSosmed(text, fallbackName = "") {
  const out = [];
  const seen = new Set();
  const add = (platform, key, item) => {
    if (seen.has(`${platform}:${key}`)) return;
    seen.add(`${platform}:${key}`);
    out.push({ platform, ...item });
  };
  const pushHandle = (platform, raw) => {
    const handle = raw.replace(/\.+$/, "");
    if (handle) add(platform, handle.toLowerCase(), { handle, url: SOSMED_URL[platform](handle) });
  };
  for (const seg of String(text ?? "").split(/[,;\n|]+|\s+dan\s+/i)) {
    const link = /(?:https?:\/\/)?(?:www\.|m\.)?(instagram\.com|tiktok\.com|facebook\.com|fb\.com)\/(@?[^\s?#/]+)?[^\s]*/i.exec(seg);
    if (link) {
      const platform = DOMAIN_PLATFORM[link[1].toLowerCase()];
      const path = (link[2] ?? "").replace(/^@/, "");
      if (path && /^[A-Za-z0-9._-]{2,50}$/.test(path) && path !== "profile.php") pushHandle(platform, path);
      else add(platform, link[0].toLowerCase(), { url: `https://${link[0].replace(/^https?:\/\//i, "")}` });
      continue;
    }
    const platforms = Object.keys(PLATFORM_RE).filter((p) => PLATFORM_RE[p].test(seg));
    const at = /@([A-Za-z0-9._]{2,30})/.exec(seg);
    if (at) {
      for (const p of platforms.length ? platforms : ["instagram"]) pushHandle(p, at[1]);
      continue;
    }
    const query = (/[("“']([^)"”']{2,60})[)"”']/.exec(seg)?.[1] ?? fallbackName ?? "").trim();
    if (!query) continue;
    for (const p of platforms) add(p, `q:${query.toLowerCase()}`, { query, url: SOSMED_SEARCH[p](query) });
  }
  return out;
}

export function buildGmapsPlaceUrl(toko) {
  const query = [toko?.nama, toko?.alamat].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");
  if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (toko?.lat != null && toko?.lng != null) return `https://www.google.com/maps/search/?api=1&query=${toko.lat},${toko.lng}`;
  return null;
}

const MAP_STYLE_BASE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const MAP_STYLE_DARK = [
  { elementType: "geometry", stylers: [{ color: "#1d1e22" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9890" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17181b" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3a3b40" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d8d2c2" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1f2124" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2d32" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212226" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8880" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a4436" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#2c2a24" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#d6b263" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a22" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6470" }] },
];

export function mapStyles(isDark) {
  return isDark ? [...MAP_STYLE_DARK, ...MAP_STYLE_BASE] : MAP_STYLE_BASE;
}
