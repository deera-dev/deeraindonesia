/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Gajian.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";

// ── Periode gajian (gajian_minggu) ────────────────────────────────────────────

export async function fetchGajianList() {
  const { data, error } = await supabase
    .from("gajian_minggu")
    .select("*")
    .order("tanggal_sabtu", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchGajianDetail(id) {
  const { data, error } = await supabase.from("gajian_minggu").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Buat periode baru — cek duplikat tanggal_sabtu dulu. */
export async function createGajianPeriode(tanggalSabtu) {
  const { data: existing } = await supabase
    .from("gajian_minggu")
    .select("id")
    .eq("tanggal_sabtu", tanggalSabtu)
    .maybeSingle();
  if (existing) {
    throw new Error("Periode dengan tanggal Sabtu ini sudah ada.");
  }
  const { data, error } = await supabase
    .from("gajian_minggu")
    .insert({ tanggal_sabtu: tanggalSabtu, status: "draft" })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Hapus periode gajian + semua entri tim terkait.
 * Daftar tabel (termasuk gaji_qa yang sudah tidak terisi tapi tetap dijaga di
 * cascade-delete ini, persis seperti Gajian.jsx lama) dipertahankan verbatim.
 */
export async function deleteGajianPeriode(id) {
  for (const table of ["gaji_potong", "gaji_jahit", "gaji_finishing", "gaji_qa", "gaji_qc", "gaji_kreatif", "gaji_cmt"]) {
    await supabase.from(table).delete().eq("gajian_id", id);
  }
  const { error } = await supabase.from("gajian_minggu").delete().eq("id", id);
  if (error) throw error;
}

/** Simpan pettycash/tambahan/potongan kasbon (draft request, status tetap draft). */
export async function saveGajianRequest(gajianId, { pettycash, tambahan, kasbonDeductions, totalRequest }) {
  const { error } = await supabase
    .from("gajian_minggu")
    .update({
      pettycash,
      tambahan,
      kasbon_deductions: kasbonDeductions,
      total_request: totalRequest,
    })
    .eq("id", gajianId);
  if (error) throw error;
}

/** Finalisasi gajian — kunci status + simpan total_* per tim. Potongan kasbon
 * sebagai cicilan DITERAPKAN terpisah oleh features/kasbon (applyKasbonDeductionFromGajian),
 * dipanggil oleh hooks.js setelah update ini berhasil. */
export async function finalizeGajian(gajianId, { totals, pettycash, tambahan, kasbonDeductions, totalRequest }) {
  const { error } = await supabase
    .from("gajian_minggu")
    .update({
      status: "final",
      total_potong: totals.potong,
      total_jahit: totals.jahit,
      total_finishing: totals.finishing,
      total_qa: totals.qa,
      total_kreatif: totals.kreatif,
      total_cmt: totals.cmt,
      total_gaji: totals.gaji,
      pettycash,
      tambahan,
      kasbon_deductions: kasbonDeductions,
      total_request: totalRequest,
    })
    .eq("id", gajianId);
  if (error) throw error;
}

// ── Totals & karyawan ids (Ringkasan) ─────────────────────────────────────────

/** Total upah per tim untuk satu periode (qa di sini = data dari gaji_qc, lihat catatan di app). */
export async function fetchGajianTotals(gajianId) {
  const [p, j, f, q, k, c] = await Promise.all([
    supabase.from("gaji_potong").select("total_upah").eq("gajian_id", gajianId),
    supabase.from("gaji_jahit").select("total_upah").eq("gajian_id", gajianId),
    supabase.from("gaji_finishing").select("total_upah").eq("gajian_id", gajianId),
    supabase.from("gaji_qc").select("total_upah").eq("gajian_id", gajianId),
    supabase.from("gaji_kreatif").select("total_upah").eq("gajian_id", gajianId),
    supabase.from("gaji_cmt").select("total_upah").eq("gajian_id", gajianId),
  ]);
  const sum = (res) => (res.data ?? []).reduce((s, r) => s + (r.total_upah || 0), 0);
  const t = {
    potong: sum(p),
    jahit: sum(j),
    finishing: sum(f),
    qa: sum(q),
    kreatif: sum(k),
    cmt: sum(c),
  };
  t.gaji = Object.values(t).reduce((s, v) => s + v, 0);
  return t;
}

/** karyawan_id unik yang muncul di periode gajian ini (potong/jahit/qc/kreatif). */
export async function fetchKaryawanIdsInGajian(gajianId) {
  const [p, j, q, k] = await Promise.all([
    supabase.from("gaji_potong").select("karyawan_id").eq("gajian_id", gajianId),
    supabase.from("gaji_jahit").select("karyawan_id").eq("gajian_id", gajianId),
    supabase.from("gaji_qc").select("karyawan_id").eq("gajian_id", gajianId),
    supabase.from("gaji_kreatif").select("karyawan_id").eq("gajian_id", gajianId),
  ]);
  return [
    ...new Set(
      [
        ...(p.data ?? []).map((r) => r.karyawan_id),
        ...(j.data ?? []).map((r) => r.karyawan_id),
        ...(q.data ?? []).map((r) => r.karyawan_id),
        ...(k.data ?? []).map((r) => r.karyawan_id),
      ].filter(Boolean),
    ),
  ];
}

// ── Rincian per karyawan (Ringkasan / Share) ──────────────────────────────────

export async function fetchPotongForRincian(gajianId) {
  const { data, error } = await supabase
    .from("gaji_potong")
    .select("karyawan(nama, no_rekening, nama_bank), total_upah, jumlah_pola, jumlah_sampel, qty_potongan, tarif_potongan")
    .eq("gajian_id", gajianId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchJahitForRincian(gajianId) {
  const { data, error } = await supabase
    .from("gaji_jahit")
    .select("karyawan(nama, no_rekening, nama_bank), total_upah, kartu_items, permak_items")
    .eq("gajian_id", gajianId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchQCForRincian(gajianId) {
  const { data, error } = await supabase
    .from("gaji_qc")
    .select("karyawan(nama, no_rekening, nama_bank), total_upah, jumlah_pcs")
    .eq("gajian_id", gajianId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchKreatifForRincian(gajianId) {
  const { data, error } = await supabase
    .from("gaji_kreatif")
    .select("karyawan(nama, no_rekening, nama_bank), total_upah, jumlah_video, jumlah_foto, jumlah_logo")
    .eq("gajian_id", gajianId);
  if (error) throw error;
  return data ?? [];
}

// ── Tim Potong (gaji_potong) ───────────────────────────────────────────────────

export async function fetchPotong(gajianId) {
  const { data, error } = await supabase
    .from("gaji_potong")
    .select("*, karyawan(nama)")
    .eq("gajian_id", gajianId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function savePotong({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_potong").update(payload).eq("id", editingId)
    : await supabase.from("gaji_potong").insert(payload);
  if (error) throw error;
}

export async function deletePotong(id) {
  const { error } = await supabase.from("gaji_potong").delete().eq("id", id);
  if (error) throw error;
}

// ── Tim Jahit (gaji_jahit) ─────────────────────────────────────────────────────

export async function fetchJahit(gajianId) {
  const { data, error } = await supabase
    .from("gaji_jahit")
    .select("*, karyawan(nama)")
    .eq("gajian_id", gajianId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveJahit({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_jahit").update(payload).eq("id", editingId)
    : await supabase.from("gaji_jahit").insert(payload);
  if (error) throw error;
}

export async function deleteJahit(id) {
  const { error } = await supabase.from("gaji_jahit").delete().eq("id", id);
  if (error) throw error;
}

// ── Tim Finishing (gaji_finishing) — satu record per periode ──────────────────

export async function fetchFinishing(gajianId) {
  const { data, error } = await supabase.from("gaji_finishing").select("*").eq("gajian_id", gajianId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveFinishing({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_finishing").update(payload).eq("id", editingId)
    : await supabase.from("gaji_finishing").insert(payload);
  if (error) throw error;
}

export async function deleteFinishing(id) {
  const { error } = await supabase.from("gaji_finishing").delete().eq("id", id);
  if (error) throw error;
}

// ── Tim QC (gaji_qc) ────────────────────────────────────────────────────────────

export async function fetchQC(gajianId) {
  const { data, error } = await supabase
    .from("gaji_qc")
    .select("*, karyawan(nama)")
    .eq("gajian_id", gajianId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveQC({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_qc").update(payload).eq("id", editingId)
    : await supabase.from("gaji_qc").insert(payload);
  if (error) throw error;
}

export async function deleteQC(id) {
  const { error } = await supabase.from("gaji_qc").delete().eq("id", id);
  if (error) throw error;
}

// ── Tim Kreatif (gaji_kreatif) ──────────────────────────────────────────────────

export async function fetchKreatif(gajianId) {
  const { data, error } = await supabase
    .from("gaji_kreatif")
    .select("*, karyawan(nama)")
    .eq("gajian_id", gajianId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveKreatif({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_kreatif").update(payload).eq("id", editingId)
    : await supabase.from("gaji_kreatif").insert(payload);
  if (error) throw error;
}

export async function deleteKreatif(id) {
  const { error } = await supabase.from("gaji_kreatif").delete().eq("id", id);
  if (error) throw error;
}

// ── CMT Luar (gaji_cmt) ─────────────────────────────────────────────────────────

export async function fetchCmt(gajianId) {
  const { data, error } = await supabase.from("gaji_cmt").select("*").eq("gajian_id", gajianId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function saveCmt({ payload, editingId }) {
  const { error } = editingId
    ? await supabase.from("gaji_cmt").update(payload).eq("id", editingId)
    : await supabase.from("gaji_cmt").insert(payload);
  if (error) throw error;
}

export async function deleteCmt(id) {
  const { error } = await supabase.from("gaji_cmt").delete().eq("id", id);
  if (error) throw error;
}

// ── Produk (dipakai dropdown kode produk di Jahit/Finishing/QC) ───────────────

export async function fetchProdukList() {
  const { data, error } = await supabase.from("products").select("kode, nama, variants, warna").order("kode");
  if (error) throw error;
  return data ?? [];
}
