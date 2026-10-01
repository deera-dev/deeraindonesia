/**
 * features/blast/utils.js — pure helpers fitur Blast.
 */
import { generateWABulkText } from "@deera/shared/lib/waFormat";

/** Pesan default saat admin memilih produk — reuse format share massal yang
 * sudah ada (generateWABulkText), supaya konsisten dgn fitur "Share Banyak".
 * Admin tetap bisa edit bebas sebelum campaign dibuat. */
export function buildDefaultMessage(products) {
  return generateWABulkText(products ?? []);
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

/** Hitung ringkasan progress (dipakai BlastPage + BlastCampaignDetail). */
export function calcProgress(targets) {
  const total = targets?.length ?? 0;
  const terkirim = (targets ?? []).filter((t) => t.status === "terkirim").length;
  const dilewati = (targets ?? []).filter((t) => t.status === "dilewati").length;
  const pending = total - terkirim - dilewati;
  const selesai = total > 0 && pending === 0;
  return { total, terkirim, dilewati, pending, selesai };
}
