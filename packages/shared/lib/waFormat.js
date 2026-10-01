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
/**
 * generateProductBlocksText(products)
 * HANYA blok per-produk (kode, nama, ukuran, bahan, link) digabung
 * separator — TANPA salam/footer. Diekstrak dari generateWABulkText
 * (2026-10) supaya bisa dipakai ulang di features/blast: pesan blast
 * berasal dari TEMPLATE pesan (lihat blast_message_template), lalu blok
 * produk ini ditempel di akhir HANYA kalau admin melampirkan produk —
 * produk di fitur Blast sekarang opsional (permintaan Denny: "casenya kan
 * ga mungkin dong orang belum kenal pesan pertamanya adalah ngeliatin
 * produknya").
 */
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
      `Foto dan video lengkap & detail: ${baseUrl}/code/${product.kode}`,
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
    `Katalog Deera lain: ${baseUrl}/`,
    `Instagram: https://www.instagram.com/deeraindonesia`,
    `TikTok: https://www.tiktok.com/@deeraindonesia`,
  ];

  return lines.join("\n");
}
