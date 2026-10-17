import { SIZE_PRESETS, formatHarga } from "./constants";

export const WA_UTM = "utm_source=whatsapp&utm_medium=share";

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
    `${baseUrl}/code/${product.kode}?${WA_UTM}`,
    ``,
    `Katalog Deera lain: ${baseUrl}/catalog?${WA_UTM}`,
    `Instagram: https://www.instagram.com/deeraindonesia`,
    `TikTok: https://www.tiktok.com/@deeraindonesia`,
  ];

  return lines.join("\n");
}

export function generateProductBlocksText(products) {
  const baseUrl = "https://deera.id";

  const blocks = (products ?? []).map((product) => {
    const variants = (product.variants ?? []).filter((v) => v.harga > 0);
    const bahan = product.bahan ?? "";

    const ukuranLines = variants
      .map((v) => {
        const preset = SIZE_PRESETS.find((p) => p.size === v.size);
        return `- ${v.size} (LD ${preset?.ld ?? "-"} | PB ${preset?.pb ?? "-"}) — Rp ${formatHarga(v.harga)}`;
      })
      .join("\n");

    return [
      `*${product.kode}*`,
      `*${product.nama}*`,
      ``,
      `Ukuran & Harga:`,
      ukuranLines,
      ``,
      `Bahan: ${bahan}`,
      `Foto dan video lengkap & detail: ${baseUrl}/code/${product.kode}?${WA_UTM}`,
    ].join("\n");
  });

  const sep = `\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  return blocks.join(sep);
}

export function generateWABulkText(products) {
  const baseUrl = "https://deera.id";

  const lines = [
    `Assalamu'alaikum warahmatullahi wabarakatuh 🙏`,
    ``,
    `*DEERA Indonesia*`,
    ``,
    generateProductBlocksText(products),
    ``,
    `Katalog Deera lain: ${baseUrl}/catalog?${WA_UTM}`,
    `Instagram: https://www.instagram.com/deeraindonesia`,
    `TikTok: https://www.tiktok.com/@deeraindonesia`,
  ];

  return lines.join("\n");
}
