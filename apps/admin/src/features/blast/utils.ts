import type { BlastTarget } from "./schema";

export function composeBlastMessage(baseText: string | null | undefined): string {
  return (baseText ?? "").trim();
}

export function applyTemplatePlaceholders(
  message: string | null | undefined,
  target: { nama?: string | null } | null | undefined,
): string {
  const nama = target?.nama?.trim();
  if (!nama) return message ?? "";
  return (message ?? "").replaceAll("{{nama}}", nama);
}

export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function buildWaLink(
  noHp: string | null | undefined,
  message: string | null | undefined,
): string {
  const phone = normalizePhone(noHp);
  const text = encodeURIComponent(message ?? "");
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function calcProgress(targets: BlastTarget[] | null | undefined) {
  const total = targets?.length ?? 0;
  const terkirim = (targets ?? []).filter((t) => t.status === "terkirim").length;
  const dilewati = (targets ?? []).filter((t) => t.status === "dilewati").length;
  const pending = total - terkirim - dilewati;
  const selesai = total > 0 && pending === 0;
  return { total, terkirim, dilewati, pending, selesai };
}
