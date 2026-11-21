import type {
  JarakInfo,
  Kesan,
  KunjunganStatus,
  ProductLike,
  SampelKirimanItem,
  Toko,
  TokoKunjungan,
} from "./schema";

export function latestItemByKode(
  items: SampelKirimanItem[] | null | undefined,
): Map<string, SampelKirimanItem> {
  const map = new Map<string, SampelKirimanItem>();
  for (const item of items ?? []) {
    const existing = map.get(item.kode);
    if (!existing || item.created_at > existing.created_at) {
      map.set(item.kode, item);
    }
  }
  return map;
}

export interface TokoItemsSummary {
  latestByKode: Map<string, SampelKirimanItem>;
  dipilih: SampelKirimanItem[];
  tidakDipilih: SampelKirimanItem[];
  pending: SampelKirimanItem[];
  belumDikirim: ProductLike[];
  counts: {
    dikirim: number;
    dipilih: number;
    tidakDipilih: number;
    pending: number;
    belumDikirim: number;
  };
}

export function summarizeTokoItems(
  items: SampelKirimanItem[] | null | undefined,
  allProducts: ProductLike[] = [],
): TokoItemsSummary {
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

export const STATUS_LABEL: Record<string, string> = {
  dipilih: "Dipilih",
  tidak_dipilih: "Tidak Dipilih",
  pending: "Menunggu",
};

export function distinctDaerahList(tokoList: Toko[] | null | undefined): string[] {
  const set = new Set((tokoList ?? []).map((t) => t.daerah).filter((d): d is string => !!d));
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

export interface DaerahSummary {
  daerah: string;
  total: number;
  sudahApproach: number;
  tertarik: number;
  belumTertarik: number;
  belumApproach: number;
}

export function summarizeByDaerah(tokoList: Toko[] | null | undefined): DaerahSummary[] {
  const groups = new Map<string, DaerahSummary>();
  for (const t of tokoList ?? []) {
    const key = t.daerah?.trim() || "Belum Ditentukan";
    const g: DaerahSummary = groups.get(key) ?? {
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

export const STATUS_APPROACH_LABEL: Record<string, string> = {
  belum: "Belum Di-Approach",
  sudah: "Sudah Di-Approach",
};
export const KESAN_LABEL: Record<Kesan, string> = {
  tertarik: "Tertarik",
  belum_tertarik: "Belum Tertarik",
};

export function buildGeocodeQueries(toko: Partial<Toko> | null | undefined): string[] {
  const alamat = toko?.alamat?.trim();
  const daerah = toko?.daerah?.trim();
  const nama = toko?.nama?.trim();
  const queries: string[] = [];

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

export function buildGeocodeQuery(toko: Partial<Toko> | null | undefined): string {
  return buildGeocodeQueries(toko)[0] ?? "Indonesia";
}

export function tokoWithLocation(tokoList: Toko[] | null | undefined): Toko[] {
  return (tokoList ?? []).filter((t) => t.lat != null && t.lng != null);
}

export function tokoNeedingGeocode(tokoList: Toko[] | null | undefined): Toko[] {
  return (tokoList ?? []).filter(
    (t) => (t.lat == null || t.lng == null) && (t.alamat?.trim() || t.daerah?.trim()),
  );
}

export function tokoAutoGeocodeQueue(tokoList: Toko[] | null | undefined): Toko[] {
  return (tokoList ?? []).filter(
    (t) =>
      (t.lat == null || t.lng == null) &&
      t.geocode_source !== "gagal" &&
      (t.alamat?.trim() || t.daerah?.trim() || t.nama?.trim()),
  );
}

export function filterToko(
  tokoList: Toko[] | null | undefined,
  {
    search = "",
    daerah = "",
    approach = "",
  }: { search?: string; daerah?: string; approach?: string } = {},
): Toko[] {
  const q = search.trim().toLowerCase();
  return (tokoList ?? []).filter((t) => {
    if (q && !`${t.nama ?? ""} ${t.alamat ?? ""} ${t.daerah ?? ""}`.toLowerCase().includes(q))
      return false;
    if (daerah && (t.daerah ?? "") !== daerah) return false;
    if (approach && t.status_approach !== approach) return false;
    return true;
  });
}

export const KUNJUNGAN_STATUS_LABEL: Record<KunjunganStatus, string> = {
  rencana: "Rencana",
  berlangsung: "Sedang dikunjungi",
  selesai: "Selesai",
  batal: "Batal",
};

const KUNJUNGAN_ORDER: Record<string, number> = {
  berlangsung: 0,
  rencana: 1,
  selesai: 2,
  batal: 3,
};

export function sortRencana(
  rows: TokoKunjungan[] | null | undefined,
  jarakByToko: Map<string, JarakInfo> | null = null,
): TokoKunjungan[] {
  const done = (r: TokoKunjungan) => (r.status === "selesai" || r.status === "batal" ? 1 : 0);
  const jarak = (r: TokoKunjungan) => jarakByToko?.get(r.toko_id)?.distanceKm ?? Infinity;
  return [...(rows ?? [])].sort(
    (a, b) =>
      (jarakByToko ? done(a) - done(b) || jarak(a) - jarak(b) : 0) ||
      (KUNJUNGAN_ORDER[a.status] ?? 9) - (KUNJUNGAN_ORDER[b.status] ?? 9) ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
}

export function fmtJarak(item: JarakInfo | null | undefined): string {
  if (!item) return "";
  return `${item.distanceKm.toFixed(1)} km${item.durationMin != null ? ` · ${Math.round(item.durationMin)} mnt` : ""}`;
}

export function summarizeRencana(rows: TokoKunjungan[] | null | undefined): {
  total: number;
  rencana: number;
  berlangsung: number;
  selesai: number;
  batal: number;
} {
  const counts = { total: 0, rencana: 0, berlangsung: 0, selesai: 0, batal: 0 };
  for (const r of rows ?? []) {
    counts.total++;
    if (r.status in counts) counts[r.status]++;
  }
  return counts;
}

export function buildRencanaShareText(
  rows: TokoKunjungan[] | null | undefined,
  tokoById: Map<string, Toko>,
): string {
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

export function buildGmapsDirUrl(
  origin: { lat: number; lng: number } | null | undefined,
  stops: Array<{ lat?: number | null; lng?: number | null } | null | undefined> | null | undefined,
): string | null {
  const list = (stops ?? []).filter(
    (p): p is { lat: number; lng: number } => !!p && p.lat != null && p.lng != null,
  );
  if (!list.length) return null;
  const ll = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: ll(list[list.length - 1]!),
  });
  if (origin) params.set("origin", ll(origin));
  if (list.length > 1) params.set("waypoints", list.slice(0, -1).map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function guessDaerahFromAddress(alamat: string | null | undefined): string {
  const parts = (alamat ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length && /^indonesia$/i.test(parts[parts.length - 1]!)) parts.pop();
  if (parts.length < 3) return "";
  const cand = parts[parts.length - 2]!;
  if (/^(kec\.?|kecamatan|jl\.?|jalan|desa|kel\.?|kelurahan)\b/i.test(cand)) return "";
  return cand.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").trim();
}

const normNama = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function isDuplicateToko(
  item: { nama?: string | null; lat?: number | null; lng?: number | null },
  tokoList: Toko[] | null | undefined,
): boolean {
  const n = normNama(item.nama);
  return (tokoList ?? []).some((t) => {
    if (n && normNama(t.nama) === n) return true;
    if (t.lat == null || t.lng == null || item.lat == null || item.lng == null) return false;
    const dLat = (t.lat - item.lat) * 111;
    const dLng = (t.lng - item.lng) * 111 * Math.cos((item.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) < 0.05;
  });
}

export interface PlaceDetails {
  rating?: number | null;
  ratingCount?: number | null;
  website?: string | null;
  jamBuka?: string[];
  noHp?: string | null;
}

export function buildTokoPayloadFromPlace(
  item: { nama: string; alamat: string | null },
  details: PlaceDetails | null = null,
): {
  nama: string;
  alamat: string | null;
  daerah: string;
  no_hp: string;
  catatan: string;
  status_approach: "belum";
} {
  const lines = ["Dari Google Maps."];
  if (details?.rating != null) {
    lines.push(
      `Rating Google: ${details.rating}${details.ratingCount != null ? ` (${details.ratingCount} ulasan)` : ""}`,
    );
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

export interface ClusterPoint {
  lat: number;
  lng: number;
}

export interface ClusterResult<T> {
  lat: number;
  lng: number;
  items: T[];
}

export function clusterPoints<T extends ClusterPoint>(
  points: T[] | null | undefined,
  zoom: number,
  cellPx = 56,
): Array<ClusterResult<T>> {
  const scale = 256 * 2 ** zoom;
  const buckets = new Map<string, T[]>();
  for (const p of points ?? []) {
    const x = ((p.lng + 180) / 360) * scale;
    const sin = Math.sin((p.lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }
  return [...buckets.values()].map((items) => ({
    lat: items.reduce((s, p) => s + p.lat, 0) / items.length,
    lng: items.reduce((s, p) => s + p.lng, 0) / items.length,
    items,
  }));
}

export type SosmedPlatform = "instagram" | "tiktok" | "facebook";

const SOSMED_URL: Record<SosmedPlatform, (h: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
};

const SOSMED_SEARCH: Record<SosmedPlatform, (q: string) => string> = {
  instagram: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
  tiktok: (q) => `https://www.tiktok.com/search/user?q=${encodeURIComponent(q)}`,
  facebook: (q) => `https://www.facebook.com/search/pages/?q=${encodeURIComponent(q)}`,
};

const PLATFORM_RE: Record<SosmedPlatform, RegExp> = {
  instagram: /\b(ig|insta|instagram)\b/i,
  tiktok: /\b(tiktok|tik tok|tt)\b/i,
  facebook: /\b(fb|facebook)\b/i,
};

const DOMAIN_PLATFORM: Record<string, SosmedPlatform> = {
  "instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "facebook.com": "facebook",
  "fb.com": "facebook",
};

export interface SosmedResult {
  platform: SosmedPlatform;
  handle?: string;
  url: string;
  query?: string;
}

export function parseSosmed(text: string | null | undefined, fallbackName = ""): SosmedResult[] {
  const out: SosmedResult[] = [];
  const seen = new Set<string>();
  const add = (platform: SosmedPlatform, key: string, item: Omit<SosmedResult, "platform">) => {
    if (seen.has(`${platform}:${key}`)) return;
    seen.add(`${platform}:${key}`);
    out.push({ platform, ...item });
  };
  const pushHandle = (platform: SosmedPlatform, raw: string) => {
    const handle = raw.replace(/\.+$/, "");
    if (handle) add(platform, handle.toLowerCase(), { handle, url: SOSMED_URL[platform](handle) });
  };
  for (const seg of String(text ?? "").split(/[,;\n|]+|\s+dan\s+/i)) {
    const link =
      /(?:https?:\/\/)?(?:www\.|m\.)?(instagram\.com|tiktok\.com|facebook\.com|fb\.com)\/(@?[^\s?#/]+)?[^\s]*/i.exec(
        seg,
      );
    if (link) {
      const platform = DOMAIN_PLATFORM[link[1]!.toLowerCase()]!;
      const path = (link[2] ?? "").replace(/^@/, "");
      if (path && /^[A-Za-z0-9._-]{2,50}$/.test(path) && path !== "profile.php")
        pushHandle(platform, path);
      else
        add(platform, link[0].toLowerCase(), {
          url: `https://${link[0].replace(/^https?:\/\//i, "")}`,
        });
      continue;
    }
    const platforms = (Object.keys(PLATFORM_RE) as SosmedPlatform[]).filter((p) =>
      PLATFORM_RE[p].test(seg),
    );
    const at = /@([A-Za-z0-9._]{2,30})/.exec(seg);
    if (at) {
      for (const p of platforms.length ? platforms : (["instagram"] as SosmedPlatform[]))
        pushHandle(p, at[1]!);
      continue;
    }
    const query = (/[("“']([^)"”']{2,60})[)"”']/.exec(seg)?.[1] ?? fallbackName ?? "").trim();
    if (!query) continue;
    for (const p of platforms)
      add(p, `q:${query.toLowerCase()}`, { query, url: SOSMED_SEARCH[p](query) });
  }
  return out;
}

const GOOGLE_MAPS_LINK_RE =
  /^https?:\/\/(www\.|maps\.)?(google\.[a-z.]+|goo\.gl|share\.google|maps\.app\.goo\.gl)\//i;

export function isGoogleMapsLink(text: string | null | undefined): boolean {
  return GOOGLE_MAPS_LINK_RE.test((text ?? "").trim());
}

const MAPS_NAME_RE = /\/maps\/place\/([^/@]+)/;
const MAPS_DATA_LATLNG_RE = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const MAPS_AT_LATLNG_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const MAPS_Q_LATLNG_RE = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;

export function parseGoogleMapsUrlLocal(
  url: string | null | undefined,
): { nama: string | null; lat: number | null; lng: number | null } | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  let nama: string | null = null;
  const nameMatch = u.match(MAPS_NAME_RE);
  if (nameMatch) {
    const raw = nameMatch[1]!.replace(/\+/g, " ");
    try {
      nama = decodeURIComponent(raw);
    } catch {
      nama = raw;
    }
  }
  const latlng =
    u.match(MAPS_DATA_LATLNG_RE) ?? u.match(MAPS_AT_LATLNG_RE) ?? u.match(MAPS_Q_LATLNG_RE);
  const lat = latlng ? Number(latlng[1]) : null;
  const lng = latlng ? Number(latlng[2]) : null;
  if (!nama && lat == null) return null;
  return { nama, lat, lng };
}

export function buildGmapsPlaceUrl(toko: Partial<Toko> | null | undefined): string | null {
  const query = [toko?.nama, toko?.alamat]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (toko?.lat != null && toko?.lng != null)
    return `https://www.google.com/maps/search/?api=1&query=${toko.lat},${toko.lng}`;
  return null;
}

interface MapStyleRule {
  featureType?: string;
  elementType?: string;
  stylers: Array<{ visibility?: string; color?: string }>;
}

const MAP_STYLE_BASE: MapStyleRule[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const MAP_STYLE_DARK: MapStyleRule[] = [
  { elementType: "geometry", stylers: [{ color: "#1d1e22" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9890" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17181b" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a3b40" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d8d2c2" }],
  },
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

export function mapStyles(isDark: boolean): MapStyleRule[] {
  return isDark ? [...MAP_STYLE_DARK, ...MAP_STYLE_BASE] : MAP_STYLE_BASE;
}
