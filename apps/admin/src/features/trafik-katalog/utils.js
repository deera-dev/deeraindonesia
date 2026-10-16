/** features/trafik-katalog/utils.js — label & helper tampilan (angka sudah dihitung backend). */
export const PERIODS = [7, 30, 90];

export const CHANNEL_META = {
  google: { label: "Google (pencarian)", color: "#4285F4" },
  ai: { label: "AI (ChatGPT, Gemini, dll)", color: "#A855F7" },
  qr_produk: { label: "Scan QR produk", color: "#D6B263" },
  qr_struk: { label: "Scan QR struk", color: "#E8C97A" },
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  tiktok: { label: "TikTok", color: "#25F4EE" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  youtube: { label: "YouTube", color: "#FF0000" },
  twitter: { label: "X / Twitter", color: "#9CA3AF" },
  mesin_cari_lain: { label: "Mesin cari lain (Bing, dll)", color: "#38BDF8" },
  iklan: { label: "Iklan Google", color: "#F59E0B" },
  marketplace: { label: "Marketplace", color: "#F97316" },
  direct: { label: "Langsung / tidak diketahui", color: "#6B7280" },
  lainnya: { label: "Situs lain", color: "#94A3B8" },
};

export function channelLabel(key) {
  return CHANNEL_META[key]?.label ?? key;
}
export function channelColor(key) {
  return CHANNEL_META[key]?.color ?? "#94A3B8";
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Tinggi relatif (0-100) tiap hari terhadap hari tertinggi, untuk grafik batang. */
export function dailyBars(daily) {
  const max = Math.max(1, ...(daily ?? []).map((d) => d.sessions));
  return (daily ?? []).map((d) => ({ ...d, h: Math.max(4, Math.round((d.sessions / max) * 100)) }));
}

/** Nama sumber untuk daftar situs teratas: QR tampil sebagai "Scan QR …", bukan kata mentah "qr". */
export function sourceLabel(row) {
  if (row?.channel === "qr_produk" || row?.channel === "qr_struk") return channelLabel(row.channel);
  return row?.source ?? "";
}

/** "2026-10-16" → "16 Okt". */
export function fmtDay(iso) {
  const [, m, d] = String(iso ?? "").split("-");
  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return m && d ? `${Number(d)} ${bln[Number(m) - 1]}` : "";
}
