export const PERIODS = [
  { key: "today", label: "Hari ini" },
  { key: 7, label: "7 hari" },
  { key: 30, label: "30 hari" },
  { key: 90, label: "90 hari" },
];

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return localDateStr(new Date(y, m - 1, d + delta));
}

export function rangeForPreset(preset, today = localDateStr()) {
  if (preset === "today") return { start: today, end: today };
  const days = Number(preset) || 30;
  return { start: addDays(today, -(days - 1)), end: today };
}

export function clampRange({ start, end } = {}, today = localDateStr()) {
  const s = start || today;
  const e = end || today;
  const lo = s > e ? e : s;
  const hi = s > e ? s : e;
  return { start: lo, end: hi > today ? today : hi };
}

export const CHANNEL_META = {
  ngorder: { label: "Share Ngorder (ke toko)", color: "#D97706" },
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

export function dailyBars(daily) {
  const max = Math.max(1, ...(daily ?? []).map((d) => d.sessions));
  return (daily ?? []).map((d) => ({ ...d, h: Math.max(4, Math.round((d.sessions / max) * 100)) }));
}

export function sourceLabel(row) {
  if (row?.channel === "qr_produk" || row?.channel === "qr_struk") return channelLabel(row.channel);
  return row?.source ?? "";
}

export function fmtDay(iso) {
  const [, m, d] = String(iso ?? "").split("-");
  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return m && d ? `${Number(d)} ${bln[Number(m) - 1]}` : "";
}

export const INTERNAL_MARK_URL = "https://deera.id/catalog?tim=1";
