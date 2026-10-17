
export function fmtDate(isoDate) {
  if (!isoDate) return "-";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PAPER_WIDTHS_MM = {
  78: { label: "78mm" },
  100: { label: "100mm" },
};

const CSS_PX_PER_MM = 96 / 25.4;

export function mmToPx(mm) {
  return Math.round(Number(mm) * CSS_PX_PER_MM);
}

export function isPenerimaLengkap(pelanggan) {
  return !!(
    pelanggan?.nama?.trim() &&
    pelanggan?.no_hp?.trim() &&
    pelanggan?.alamat?.trim() &&
    pelanggan?.ekspedisi_biasa?.trim()
  );
}
