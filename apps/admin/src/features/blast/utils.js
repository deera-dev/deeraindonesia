/**
 * features/blast/utils.js — pure helpers fitur Blast.
 */
import { generateProductBlocksText } from "@deera/shared/lib/waFormat";

/**
 * composeBlastMessage(baseText, products)
 * Gabungkan teks pesan (dari template ATAU ditulis bebas) dengan blok
 * produk (OPSIONAL — permintaan Denny 2026-10: "casenya kan ga mungkin
 * dong orang belum kenal pesan pertamanya adalah ngeliatin produknya").
 * Kalau tidak ada produk dipilih, pesan dikirim apa adanya tanpa blok
 * produk sama sekali.
 */
export function composeBlastMessage(baseText, products) {
  const base = (baseText ?? "").trim();
  if (!products?.length) return base;
  return `${base}\n\n${generateProductBlocksText(products)}`;
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
