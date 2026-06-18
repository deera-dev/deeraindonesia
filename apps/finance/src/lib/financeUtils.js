/**
 * financeUtils.js — Helper & konstanta untuk apps/finance.
 */
import { supabase } from "@deera/shared/lib/supabase";

// ── Format ────────────────────────────────────────────────────────────────────

/** Format angka ke Rp xx.xxx */
export function fmtRp(value) {
  if (value === null || value === "") return "—";
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
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Tarif Upah (hardcoded defaults) ───────────────────────────────────────────

export const TARIF_POTONG = {
  pola: 50_000,
  sampel: 100_000,
};

/** Tarif finishing per pcs (tanpa QC — QC dipindah ke Tim QC) */
export const TARIF_FINISHING_PER_PCS = 2_500;
export const TARIF_KANCING = 150;
export const TARIF_QA = 500; // QC per pcs

export const TARIF_KREATIF = {
  video: 50_000,
  foto_seri: 30_000,
  logo: 20_000,
};

// ── Finance Config (editable tarif, stored in Supabase) ───────────────────────

/** Default values — dipakai jika tabel finance_config belum diisi */
export const DEFAULT_FINANCE_CONFIG = {
  tarif_pola: 50_000,
  tarif_sampel: 100_000,
  // Finishing — rincian per pcs (total default: 3.000)
  tarif_gosok: 1_300,
  tarif_lipat: 700,
  tarif_buang_benang: 300,
  tarif_pasang_pin: 300,
  tarif_hangtag: 200,
  tarif_seri: 200,
  tarif_kancing: 150,
  tarif_qc: 500,
  tarif_video: 50_000,
  tarif_foto: 30_000,
  tarif_logo: 20_000,
};

export const FINANCE_CONFIG_META = [
  { key: "tarif_pola", label: "Tarif Pola / lembar", group: "Potong" },
  { key: "tarif_sampel", label: "Tarif Sampel / lembar", group: "Potong" },
  { key: "tarif_gosok", label: "Gosok / pcs", group: "Finishing" },
  { key: "tarif_lipat", label: "Lipat / pcs", group: "Finishing" },
  { key: "tarif_buang_benang", label: "Buang Benang / pcs", group: "Finishing" },
  { key: "tarif_pasang_pin", label: "Pasang Pin / pcs", group: "Finishing" },
  { key: "tarif_hangtag", label: "Hangtag & Kode / pcs", group: "Finishing" },
  { key: "tarif_seri", label: "Seri / pcs", group: "Finishing" },
  { key: "tarif_kancing", label: "Kancing / buah", group: "Finishing" },
  { key: "tarif_qc", label: "QC / pcs", group: "QC" },
  { key: "tarif_video", label: "Video Kreatif / video", group: "Kreatif" },
  { key: "tarif_foto", label: "Foto Seri / seri", group: "Kreatif" },
  { key: "tarif_logo", label: "Logo / logo", group: "Kreatif" },
];

let _configCache = null;

export async function loadFinanceConfig() {
  const { data } = await supabase.from("finance_config").select("key, nilai");
  const config = { ...DEFAULT_FINANCE_CONFIG };
  for (const row of data ?? []) {
    if (row.key in config) config[row.key] = row.nilai;
  }
  return config;
}

/** Ambil config dengan module-level cache — hanya satu fetch per session */
export async function getFinanceConfig() {
  if (_configCache) return _configCache;
  _configCache = await loadFinanceConfig();
  return _configCache;
}

/** Hapus cache — dipanggil setelah Pengaturan menyimpan perubahan */
export function clearConfigCache() {
  _configCache = null;
}

export async function saveFinanceConfigKey(key, nilai) {
  const { error } = await supabase
    .from("finance_config")
    .upsert({ key, nilai, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ── Kalkulasi (menerima optional config, fallback ke DEFAULT) ─────────────────

/**
 * Hitung total upah Tim Potong.
 * tarif_potongan: 4000–6000 per pcs (range slider)
 */
export function calcUpahPotong(
  { jumlah_pola = 0, jumlah_sampel = 0, qty_potongan = 0, tarif_potongan = 4000 },
  cfg = DEFAULT_FINANCE_CONFIG,
) {
  return (
    jumlah_pola * cfg.tarif_pola + jumlah_sampel * cfg.tarif_sampel + qty_potongan * tarif_potongan
  );
}

/** Total tarif finishing per pcs (jumlah semua komponen) */
export function calcFinishingPerPcs(cfg = DEFAULT_FINANCE_CONFIG) {
  return (
    (cfg.tarif_gosok || 0) +
    (cfg.tarif_lipat || 0) +
    (cfg.tarif_buang_benang || 0) +
    (cfg.tarif_pasang_pin || 0) +
    (cfg.tarif_hangtag || 0) +
    (cfg.tarif_seri || 0)
  );
}

/**
 * Hitung total upah Tim Finishing.
 * items: [{nama_produk, jumlah, kancing_qty}]
 */
export function calcUpahFinishing(items = [], cfg = DEFAULT_FINANCE_CONFIG) {
  const tarifPcs = calcFinishingPerPcs(cfg);
  return items.reduce((sum, item) => {
    return (
      sum +
      (Number(item.jumlah) || 0) * tarifPcs +
      (Number(item.kancing_qty) || 0) * cfg.tarif_kancing
    );
  }, 0);
}

/**
 * Hitung total upah kreatif.
 */
export function calcUpahKreatif(
  { jumlah_video = 0, jumlah_foto = 0, jumlah_logo = 0 },
  cfg = DEFAULT_FINANCE_CONFIG,
) {
  return (
    jumlah_video * cfg.tarif_video + jumlah_foto * cfg.tarif_foto + jumlah_logo * cfg.tarif_logo
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
  const { data, error } = await supabase.from("karyawan").select("*").order("tim").order("nama");
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
  { value: "potong", label: "Tim Potong" },
  { value: "jahit", label: "Tim Jahit" },
  { value: "finishing", label: "Tim Finishing" },
  { value: "qc", label: "Tim QC" },
  { value: "kreatif", label: "Tim Kreatif" },
  { value: "lainnya", label: "Lainnya" },
];

export function timLabel(value) {
  return TIM_OPTIONS.find((t) => t.value === value)?.label ?? value ?? "—";
}

// ── Kategori Kas / Pettycash ──────────────────────────────────────────────────
// Kolom kategori di tabel kas & pettycash bersifat free-text (tidak ada CHECK
// constraint), jadi daftar ini hanya untuk memudahkan input lewat dropdown.

export const KAS_KATEGORI_OPTIONS = [
  "Operasional",
  "Bahan & Produksi",
  "Gaji & Upah",
  "Transport",
  "Sewa",
  "Marketing",
  "Lainnya",
];

export const PETTYCASH_KATEGORI_OPTIONS = [
  "Konsumsi",
  "Transport",
  "ATK & Perlengkapan",
  "Operasional",
  "Lainnya",
];

// ── CSS class helpers (konsisten dengan admin) ────────────────────────────────

export const inputCls =
  "w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2.5 font-editorial text-sm rounded-none outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4";

export const labelCls = "font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3";

export const sectionTitleCls =
  "font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3";
