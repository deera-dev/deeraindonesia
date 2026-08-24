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

// ── Antrean Planning (permintaan Denny 2026-08) ───────────────────────────────
// Urutan planning bisa diubah lewat drag & drop di UI — paling atas (urutan
// terkecil) = dikerjakan duluan. `urutan` disimpan per baris di kolom
// `sampel.urutan` (integer, hanya relevan utk status="planning").

// Sortir daftar planning berdasarkan urutan asc. Baris tanpa `urutan` (null/
// undefined, mis. data lama sebelum kolom ini ada) ditaruh paling akhir,
// tiebreak by created_at asc supaya urutannya tetap stabil & masuk akal.
export function sortPlanningQueue(sampels) {
  return (sampels ?? [])
    .filter((s) => s.status === "planning")
    .sort((a, b) => {
      const ua = a.urutan ?? Infinity;
      const ub = b.urutan ?? Infinity;
      if (ua !== ub) return ua - ub;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
}

// Urutan berikutnya untuk planning BARU — selalu ditaruh di PALING BAWAH
// antrean (prioritas terendah) secara default; admin bisa geser ke atas
// lewat drag & drop kalau memang mau dikerjakan lebih dulu.
export function nextPlanningUrutan(sampels) {
  const queue = sortPlanningQueue(sampels);
  if (queue.length === 0) return 0;
  const maxUrutan = Math.max(...queue.map((s) => s.urutan ?? -1));
  return maxUrutan + 1;
}

// Bangun payload untuk reorderPlanning() dari urutan array id BARU (hasil
// drag & drop) — index di array = urutan baru (0 = paling atas).
export function buildReorderUpdates(orderedIds) {
  return (orderedIds ?? []).map((id, urutan) => ({ id, urutan }));
}
