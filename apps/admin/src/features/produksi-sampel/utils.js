// utils.js — Pure helpers fitur produksi-sampel. Tidak ada I/O.

export const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

export const STATUS_META = {
  planning: {
    label: "Planning",
    cls: "bg-sky-500/10 text-sky-600 border border-sky-500/30",
  },
  draft: {
    label: "Menunggu Review",
    cls: "bg-skin-raised text-skin-text3 border border-skin-bdr",
  },
  approved: {
    label: "Approved",
    cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
  },
  ditahan: {
    label: "Ditahan",
    cls: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
  },
  rejected: {
    label: "Ditolak",
    cls: "bg-red-500/10 text-red-500 border border-red-500/30",
  },
};

export function buildNomor() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SPL-${ymd}-${rand}`;
}
