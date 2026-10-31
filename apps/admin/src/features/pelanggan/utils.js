export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function groupSaleItems(items) {
  return (items ?? []).map((item) => {
    const harga = Number(item.harga) || 0;
    const hpp = Number(item.hpp) || 0;
    let qty = 0;
    let warnaBreakdown = [];
    if (Array.isArray(item.warna) && item.warna.length > 0) {
      warnaBreakdown = item.warna.map((w) => ({ warna: w.nama ?? "-", qty: Number(w.qty) || 0 }));
      qty = warnaBreakdown.reduce((sum, w) => sum + w.qty, 0);
    } else {
      qty = Number(item.qty) || 0;
    }
    return {
      kode: item.kode,
      size: item.size ?? null,
      harga,
      hpp,
      qty,
      subtotal: harga * qty,
      warnaBreakdown,
    };
  });
}

export function matchesSearch(pelanggan, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (pelanggan.nama ?? "").toLowerCase().includes(q) ||
    (pelanggan.no_hp ?? "").toLowerCase().includes(q)
  );
}

export function extractDaerahQuery(alamat) {
  const parts = (alamat ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return null;
  const tail = parts.slice(-Math.min(2, parts.length - 1));
  return tail.length ? `${tail.join(", ")}, Indonesia` : null;
}

export function buildPelangganGeocodeQueries(alamat) {
  const full = alamat ?? "";
  const coarse = extractDaerahQuery(full);
  const queries = [`${full}, Indonesia`, full];
  if (coarse) queries.push(coarse);
  return queries;
}

export function isApproxGeocodeMatch(alamat, matchedQuery) {
  const coarse = extractDaerahQuery(alamat);
  return !!coarse && matchedQuery === coarse;
}

const DAERAH_ALIASES = new Map(
  Object.entries({
    BATURAJA: "Baturaja, Ogan Komering Ulu, Indonesia",
    SUBANG: "Subang, Indonesia",
    JAMBI: "Jambi, Indonesia",
    BANYUWANGI: "Banyuwangi, Indonesia",
    CILEGON: "Cilegon, Indonesia",
    BOGOR: "Bogor, Indonesia",
    CIKUPA: "Cikupa, Tangerang, Indonesia",
    ACEH: "Aceh, Indonesia",
    TEBO: "Tebo, Jambi, Indonesia",
    INDRAMAYU: "Indramayu, Indonesia",
    SEMARANG: "Semarang, Indonesia",
    BREBES: "Brebes, Indonesia",
    BEKASI: "Bekasi, Indonesia",
    KARAWANG: "Karawang, Indonesia",
    KERAWANG: "Karawang, Indonesia",
    PURBALINGGA: "Purbalingga, Indonesia",
    PURBALINGA: "Purbalingga, Indonesia",
    MAJALENGKA: "Majalengka, Indonesia",
    MAJELANGKA: "Majalengka, Indonesia",
    RANGKASBITUNG: "Rangkasbitung, Lebak, Indonesia",
    TANGERANG: "Tangerang, Indonesia",
    JOGJA: "Yogyakarta, Indonesia",
    PANDEGLANG: "Pandeglang, Indonesia",
    MAKASAR: "Makassar, Indonesia",
    MAKASSAR: "Makassar, Indonesia",
    GARUT: "Garut, Indonesia",
    KUNINGAN: "Kuningan, Indonesia",
    SUKABUMI: "Sukabumi, Indonesia",
    PEKALONGAN: "Pekalongan, Indonesia",
    CIREBON: "Cirebon, Indonesia",
    PALIMANAN: "Palimanan, Cirebon, Indonesia",
    LOMBOK: "Lombok, Indonesia",
    LABUHAN: "Labuhan, Banten, Indonesia",
    AMBON: "Ambon, Indonesia",
    BENGKULU: "Bengkulu, Indonesia",
    MAGELANG: "Magelang, Indonesia",
    LAMPUNG: "Lampung, Indonesia",
    CIASEM: "Ciasem, Subang, Indonesia",
    TASIK: "Tasikmalaya, Indonesia",
    KLATEN: "Klaten, Indonesia",
    PEKANBARU: "Pekanbaru, Indonesia",
    KEBUMEN: "Kebumen, Indonesia",
    MALIMPING: "Malimping, Lebak, Indonesia",
    SERANG: "Serang, Indonesia",
    BANTEN: "Banten, Indonesia",
    GORONTALO: "Gorontalo, Indonesia",
    CIKARANG: "Cikarang, Bekasi, Indonesia",
    CIKIJING: "Cikijing, Majalengka, Indonesia",
    PEMALANG: "Pemalang, Indonesia",
    PLUMBON: "Plumbon, Cirebon, Indonesia",
    LOSARI: "Losari, Cirebon, Indonesia",
    SIDOARJO: "Sidoarjo, Indonesia",
    JATINEGARA: "Jatinegara, Jakarta, Indonesia",
    KALIDERES: "Kalideres, Jakarta, Indonesia",
    SUKAMANDI: "Sukamandi, Subang, Indonesia",
    TEGAL: "Tegal, Indonesia",
    CILEDUG: "Ciledug, Tangerang, Indonesia",
    BANJARNEGARA: "Banjarnegara, Indonesia",
    "BANJAR NEGARA": "Banjarnegara, Indonesia",
    TG: "Tangerang, Indonesia",
    TGR: "Tangerang, Indonesia",
    TGL: "Tegal, Indonesia",
    PWK: "Purwakarta, Indonesia",
    PKL: "Pekalongan, Indonesia",
    MKS: "Makassar, Indonesia",
    BKL: "Bengkulu, Indonesia",
  }),
);

export function extractDaerahFromNama(nama) {
  const raw = (nama ?? "").trim();
  if (!raw) return null;
  const tokens = raw
    .toUpperCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[\s\-/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.length >= 2) {
    const twoWord = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
    if (DAERAH_ALIASES.has(twoWord)) return DAERAH_ALIASES.get(twoWord);
  }
  const lastWord = tokens[tokens.length - 1];
  return DAERAH_ALIASES.get(lastWord) ?? null;
}

export const PELANGGAN_FILTERS = [
  { key: "semua", label: "Semua pelanggan" },
  { key: "ada-hp", label: "Punya no HP" },
  { key: "tanpa-hp", label: "Tanpa no HP" },
  { key: "ada-alamat", label: "Punya alamat" },
  { key: "tanpa-alamat", label: "Tanpa alamat" },
];

export function applyPelangganFilter(list, mode = "semua") {
  const has = (v) => !!String(v ?? "").trim();
  switch (mode) {
    case "ada-hp":
      return list.filter((p) => has(p.no_hp));
    case "tanpa-hp":
      return list.filter((p) => !has(p.no_hp));
    case "ada-alamat":
      return list.filter((p) => has(p.alamat));
    case "tanpa-alamat":
      return list.filter((p) => !has(p.alamat));
    default:
      return list;
  }
}
