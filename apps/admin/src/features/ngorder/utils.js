
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
};

export function parseSosmed(text) {
  const out = [];
  const seen = new Set();
  const push = (platform, raw) => {
    const handle = raw.replace(/\.+$/, "");
    const key = `${platform}:${handle.toLowerCase()}`;
    if (!handle || seen.has(key)) return;
    seen.add(key);
    out.push({ platform, handle, url: SOSMED_URL[platform](handle) });
  };
  for (const seg of String(text ?? "").split(/[,;\n|]+|\s+dan\s+/i)) {
    const link = /(instagram\.com|tiktok\.com)\/@?([A-Za-z0-9._]{2,30})/i.exec(seg);
    if (link) {
      push(/tiktok/i.test(link[1]) ? "tiktok" : "instagram", link[2]);
      continue;
    }
    const at = /@([A-Za-z0-9._]{2,30})/.exec(seg);
    if (!at) continue;
    const ig = /\b(ig|insta|instagram)\b/i.test(seg);
    const tt = /\b(tiktok|tik tok|tt)\b/i.test(seg);
    if (ig || !tt) push("instagram", at[1]);
    if (tt) push("tiktok", at[1]);
  }
  return out;
}
