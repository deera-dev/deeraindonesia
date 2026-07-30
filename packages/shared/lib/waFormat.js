import { SIZE_PRESETS, formatHarga } from "./constants";

export function generateWAText(product) {
  const variants = (product.variants ?? []).filter((v) => v.harga > 0);
  const bahan = product.bahan ?? "";
  const baseUrl = "https://deera.id";

  const ukuranLines = variants
    .map((v) => {
      const preset = SIZE_PRESETS.find((p) => p.size === v.size);
      return `- ${v.size} (LD ${preset?.ld ?? "-"} | PB ${preset?.pb ?? "-"}) — Rp ${formatHarga(v.harga)}`;
    })
    .join("\n");

  const lines = [
    `Assalamu'alaikum warahmatullahi wabarakatuh 🙏`,
    ``,
    `*DEERA Indonesia*`,
    ``,
    `*${product.kode}*`,
    `*${product.nama}*`,
    ``,
    `Ukuran & Harga:`,
    ukuranLines,
    ``,
    `Bahan: ${bahan}`,
    ``,
    `Foto dan video lengkap & detail:`,
    `${baseUrl}/code/${product.kode}`,
    ``,
    `Katalog Deera lain: ${baseUrl}/`,
    `Instagram: https://www.instagram.com/deeraindonesia`,
    `TikTok: https://www.tiktok.com/@deeraindonesia`,
  ];

  return lines.join("\n");
}
