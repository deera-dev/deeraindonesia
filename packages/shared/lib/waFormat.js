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

/**
 * generateWABulkText(products)
 * Satu pesan WA gabungan utk beberapa produk sekaligus (share massal dari
 * Admin — lihat features/produk/utils.js shareProductsViaWA). Salam &
 * footer (katalog/Instagram/TikTok) HANYA sekali di awal/akhir — tidak
 * diulang per produk seperti generateWAText() single-produk, supaya pesan
 * tidak menggelembung kalau produk yang dipilih banyak.
 */
export function generateWABulkText(products) {
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
      `Foto dan video lengkap & detail: ${baseUrl}/code/${product.kode}`,
    ].join("\n");
  });

  const sep = `\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const lines = [
    `Assalamu'alaikum warahmatullahi wabarakatuh 🙏`,
    ``,
    `*DEERA Indonesia*`,
    ``,
    blocks.join(sep),
    ``,
    `Katalog Deera lain: ${baseUrl}/`,
    `Instagram: https://www.instagram.com/deeraindonesia`,
    `TikTok: https://www.tiktok.com/@deeraindonesia`,
  ];

  return lines.join("\n");
}
