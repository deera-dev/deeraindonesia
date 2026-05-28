/**
 * financeUtils.js — Helper & konstanta untuk apps/finance.
 */
import { supabase } from "@deera/shared/lib/supabase";

// ── Format ────────────────────────────────────────────────────────────────────

/** Format angka ke Rp xx.xxx */
export function fmtRp(value) {
  if (value == null || value === "") return "—";
  return "Rp " + Number(value).toLocaleString("id-ID");
}

/** Format tanggal ke "Senin, 26 Mei 2025" */
export function fmtTanggal(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Format tanggal pendek ke "26 Mei 2025" */
export function fmtTanggalPendek(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ambil Sabtu dari sembarang tanggal dalam minggu itu (ISO week ending Saturday) */
export function getSabtu(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Ambil Senin dari sembarang tanggal dalam minggu itu */
export function getSenin(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Tarif Upah ─────────────────────────────────────────────────────────────────

export const TARIF_POTONG = {
  pola: 50_000,
  sampel: 100_000,
};

/** Tarif finishing per pcs (tanpa QC — QC dipindah ke Tim QA) */
export const TARIF_FINISHING_PER_PCS = 2_500; // buang benang(300)+gosok(1100)+pasang pin(300)+lipat(600)+hangtag+kode(100)+seri(100)
export const TARIF_KANCING = 150;
export const TARIF_QA = 500; // QC per pcs

export const TARIF_KREATIF = {
  video: 50_000,
  foto_seri: 30_000,
  logo: 20_000,
};

// ── Kalkulasi ─────────────────────────────────────────────────────────────────

/**
 * Hitung total upah Tim Potong.
 * tarif_potongan: 4000–6000 per pcs (range slider)
 */
export function calcUpahPotong({ jumlah_pola = 0, jumlah_sampel = 0, qty_potongan = 0, tarif_potongan = 4000 }) {
  return jumlah_pola * TARIF_POTONG.pola
       + jumlah_sampel * TARIF_POTONG.sampel
       + qty_potongan * tarif_potongan;
}

/**
 * Hitung total upah Tim Finishing (simplified, no QC).
 * items: [{nama_produk, jumlah, kancing_qty}]
 */
export function calcUpahFinishing(items = []) {
  return items.reduce((sum, item) => {
    return sum
      + (Number(item.jumlah) || 0) * TARIF_FINISHING_PER_PCS
      + (Number(item.kancing_qty) || 0) * TARIF_KANCING;
  }, 0);
}

/**
 * Hitung total upah kreatif.
 * jumlah_video, jumlah_foto, jumlah_logo
 */
export function calcUpahKreatif({ jumlah_video = 0, jumlah_foto = 0, jumlah_logo = 0 }) {
  return (
    jumlah_video * TARIF_KREATIF.video +
    jumlah_foto * TARIF_KREATIF.foto_seri +
    jumlah_logo * TARIF_KREATIF.logo
  );
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

/** Load semua karyawan aktif, diurutkan per tim lalu nama */
export async function loadKaryawanAktif() {
  const { data, error } = await supabase
    .from("karyawan")
    .select("*")
    .eq("aktif", true)
    .order("tim")
    .order("nama");
  if (error) throw error;
  return data ?? [];
}

/** Load semua karyawan (aktif & non-aktif) */
export async function loadKaryawanAll() {
  const { data, error } = await supabase
    .from("karyawan")
    .select("*")
    .order("tim")
    .order("nama");
  if (error) throw error;
  return data ?? [];
}

/** Load periode gajian, urut terbaru dulu */
export async function loadGajianList() {
  const { data, error } = await supabase
    .from("gajian_minggu")
    .select("*")
    .order("tanggal_sabtu", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Load semua gaji entries untuk satu gajian_id */
export async function loadGajiByMinggu(gajianId) {
  const [potong, jahit, finishing, kreatif, cmt] = await Promise.all([
    supabase.from("gaji_potong").select("*, karyawan(*)").eq("gajian_id", gajianId),
    supabase.from("gaji_jahit").select("*, karyawan(*)").eq("gajian_id", gajianId),
    supabase.from("gaji_finishing").select("*, karyawan(*)").eq("gajian_id", gajianId),
    supabase.from("gaji_kreatif").select("*, karyawan(*)").eq("gajian_id", gajianId),
    supabase.from("gaji_cmt").select("*").eq("gajian_id", gajianId),
  ]);
  return {
    potong: potong.data ?? [],
    jahit: jahit.data ?? [],
    finishing: finishing.data ?? [],
    kreatif: kreatif.data ?? [],
    cmt: cmt.data ?? [],
  };
}

// ── Tim labels ────────────────────────────────────────────────────────────────

export const TIM_OPTIONS = [
  { value: "potong",    label: "Tim Potong"    },
  { value: "jahit",     label: "Tim Jahit"     },
  { value: "finishing", label: "Tim Finishing" },
  { value: "kreatif",   label: "Tim Kreatif"   },
  { value: "lainnya",   label: "Lainnya"       },
];

export function timLabel(value) {
  return TIM_OPTIONS.find((t) => t.value === value)?.label ?? value ?? "—";
}

// ── CSS class helpers (konsisten dengan admin) ────────────────────────────────

export const inputCls =
  "w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2.5 font-editorial text-sm rounded-none outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4";

export const labelCls =
  "font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3";

export const sectionTitleCls =
  "font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3";
