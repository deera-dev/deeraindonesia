/**
 * features/blast/utils.js — pure helpers fitur Blast.
 */

/**
 * composeBlastMessage(baseText)
 * Dulu menempel blok info produk (kode/ukuran/harga/bahan/link) di akhir
 * pesan kalau admin melampirkan produk — DIHAPUS (permintaan Denny
 * 2026-10: "ketika produk dipilih, tidak perlu ada informasi [blok teks
 * kode/ukuran/harga/bahan/link] ... cukup insert imagenya aja dengan
 * editan kode, jadi formatnya persis seperti fitur unduh gambar produk").
 * Produk yang dilampirkan sekarang direpresentasikan sbg FOTO (PNG kode
 * besar, format identik fitur "Unduh Gambar" — lihat ProductCodeCard di
 * features/produk) yang di-attach LANGSUNG lewat Web Share API saat kirim
 * (lihat BlastCampaignDetail.jsx), bukan teks lagi — jadi fungsi ini
 * sekarang murni trim teks, parameter produk sudah tidak dipakai di sini.
 */
export function composeBlastMessage(baseText) {
  return (baseText ?? "").trim();
}

/**
 * applyTemplatePlaceholders(message, target)
 * Ganti placeholder `{{nama}}` di pesan dengan nama target (permintaan
 * Denny 2026-10: siapkan template utk menanyakan "apakah benar ini nomor
 * Toko A" di mana "Toko A" diambil dari nama kontak/calon customer itu
 * sendiri — nama kontak B2B di Deera memang nama tokonya, bukan field
 * terpisah). Dipakai saat compose pesan FINAL per target (BlastCampaignDetail),
 * BUKAN saat compose pesan campaign (yang masih berupa template mentah
 * dgn placeholder, sama buat semua target). Placeholder dibiarkan apa
 * adanya kalau target tidak punya nama (seharusnya tidak pernah terjadi,
 * nama wajib diisi di pelanggan/calon_customer).
 */
export function applyTemplatePlaceholders(message, target) {
  const nama = target?.nama?.trim();
  if (!nama) return message ?? "";
  return (message ?? "").replaceAll("{{nama}}", nama);
}

/** Normalisasi no HP Indonesia ke format internasional tanpa simbol, utk
 * dipakai di URL wa.me (wa.me/62812xxxx) — wajib tanpa "+"/spasi/strip. */
export function normalizePhone(raw) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function buildWaLink(noHp, message) {
  const phone = normalizePhone(noHp);
  const text = encodeURIComponent(message ?? "");
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Hitung ringkasan progress (dipakai BlastHistoryList + BlastCampaignDetail). */
export function calcProgress(targets) {
  const total = targets?.length ?? 0;
  const terkirim = (targets ?? []).filter((t) => t.status === "terkirim").length;
  const dilewati = (targets ?? []).filter((t) => t.status === "dilewati").length;
  const pending = total - terkirim - dilewati;
  const selesai = total > 0 && pending === 0;
  return { total, terkirim, dilewati, pending, selesai };
}
