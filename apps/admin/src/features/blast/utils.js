
export function composeBlastMessage(baseText) {
  return (baseText ?? "").trim();
}

export function applyTemplatePlaceholders(message, target) {
  const nama = target?.nama?.trim();
  if (!nama) return message ?? "";
  return (message ?? "").replaceAll("{{nama}}", nama);
}

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

export function calcProgress(targets) {
  const total = targets?.length ?? 0;
  const terkirim = (targets ?? []).filter((t) => t.status === "terkirim").length;
  const dilewati = (targets ?? []).filter((t) => t.status === "dilewati").length;
  const pending = total - terkirim - dilewati;
  const selesai = total > 0 && pending === 0;
  return { total, terkirim, dilewati, pending, selesai };
}
