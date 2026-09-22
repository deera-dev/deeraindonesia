/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Gajian.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { buildJahitCardSync, buildJahitContributionsByKode, buildKodeReconciliation } from "./utils";

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

// Return id record (bukan cuma void) — dipakai FinishingStockModal.jsx
// sebagai `gajian_finishing_id` di audit trail stok_masuk_log (lihat
// applyFinishingStockIntake di bawah).
export async function saveFinishing({ payload, editingId }) {
  const { data, error } = editingId
    ? await supabase.from("gaji_finishing").update(payload).eq("id", editingId).select("id").single()
    : await supabase.from("gaji_finishing").insert(payload).select("id").single();
  if (error) throw error;
  return data?.id ?? editingId ?? null;
}

export async function deleteFinishing(id) {
  const { error } = await supabase.from("gaji_finishing").delete().eq("id", id);
  if (error) throw error;
}

// ── Rekonsiliasi Stok Masuk dari Finishing — lihat DECISIONS.md §1 ──────────

/**
 * loadFinishingReconciliation — per item Finishing yang baru disimpan, ambil
 * kartu Ready Finishing + qty terjual + stok saat ini per kode, lalu hitung
 * breakdown lewat buildKodeReconciliation (utils.js).
 * Return: { [kode_produk]: KodeReconciliation }.
 */
export async function loadFinishingReconciliation(items) {
  const results = {};
  for (const item of items ?? []) {
    const kode = item.kode_produk;
    const [cardsRes, soldRes, stokRes] = await Promise.all([
      supabase
        .from("jahit_cards")
        .select("*")
        .eq("kode_produk", kode)
        .eq("status", "ready_finishing")
        .order("created_at"),
      supabase.rpc("get_sold_qty_by_kode", { p_kode: kode }),
      supabase.from("stok_warna").select("*").eq("kode", kode),
    ]);
    if (cardsRes.error) throw cardsRes.error;
    if (soldRes.error) throw soldRes.error;
    if (stokRes.error) throw stokRes.error;

    // logRows cuma perlu di-fetch kalau tidak ada kartu ready_finishing (kasus
    // rekonsiliasi ULANG, lihat DECISIONS.md §1) — hindari query yang tidak
    // perlu di jalur normal.
    let logRows = [];
    if ((cardsRes.data ?? []).length === 0) {
      logRows = await fetchStokMasukLogByKode(kode);
    }

    results[kode] = buildKodeReconciliation({
      item,
      cards: cardsRes.data ?? [],
      soldRows: soldRes.data ?? [],
      stokRows: stokRes.data ?? [],
      logRows,
    });
  }
  return results;
}

/** Riwayat rekonsiliasi stok Finishing (stok_masuk_log) satu kode, terbaru dulu. Lihat DECISIONS.md §1. */
export async function fetchStokMasukLogByKode(kode) {
  const { data, error } = await supabase
    .from("stok_masuk_log")
    .select("size, warna, qty_kartu, created_at")
    .eq("kode", kode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * applyFinishingStockIntake — dijalankan setelah admin konfirmasi breakdown
 * di FinishingStockModal.jsx. Per baris (qtyDitambahkan > 0): increment stok
 * Gudang (RPC atomik) → tandai kartu Jahit asli "done" (kalau cardId ada) →
 * catat stok_masuk_log. Lihat DECISIONS.md §1 untuk alasan urutan berurutan
 * (bukan Promise.all) & kenapa idempotent-safe.
 */
export async function applyFinishingStockIntake({ rows, gajianFinishingId, userEmail, userName }) {
  for (const row of rows ?? []) {
    if (row.qtyDitambahkan <= 0) continue;

    const { error: incErr } = await supabase.rpc("increment_stok_gudang", {
      p_kode: row.kode,
      p_size: row.size,
      p_warna: row.warna,
      p_delta: row.qtyDitambahkan,
    });
    if (incErr) throw incErr;

    if (row.cardId) {
      const now = new Date().toISOString();
      const { error: cardErr } = await supabase
        .from("jahit_cards")
        .update({ status: "done", done_at: now, updated_at: now })
        .eq("id", row.cardId);
      if (cardErr) throw cardErr;
    }

    const { error: logErr } = await supabase.from("stok_masuk_log").insert({
      kode: row.kode,
      size: row.size,
      warna: row.warna,
      qty_kartu: row.qtyKartu,
      stok_sebelum: row.stokSaatIni,
      terjual_sebelum: row.terjualSaatIni,
      qty_ditambahkan: row.qtyDitambahkan,
      jahit_card_id: row.cardId ?? null,
      gajian_finishing_id: gajianFinishingId ?? null,
      created_by: userEmail ?? null,
      created_by_name: userName ?? null,
    });
    if (logErr) throw logErr;
  }
}

/**
 * syncJahitCardsFromGajian — untuk SATU periode gajian yang baru
 * difinalisasi: cari kode yang muncul sekaligus di gaji_jahit DAN
 * gaji_finishing (periode ini, jumlah > 0), lalu tandai kartu Jahit kode itu
 * "selesai" + isi nama penjahit sesuai angka gaji_jahit (buildJahitCardSync).
 * Idempotent — kartu "done" tidak pernah diambil lagi. Dipanggil dari
 * useFinalizeGajian setelah finalizeGajian sukses. Aturan lengkap &
 * rasional: DECISIONS.md §2.
 */
export async function syncJahitCardsFromGajian(gajianId) {
  const [jahitRes, finishingRes] = await Promise.all([
    supabase.from("gaji_jahit").select("karyawan_id, kartu_items, karyawan(nama)").eq("gajian_id", gajianId).order("created_at"),
    supabase.from("gaji_finishing").select("items").eq("gajian_id", gajianId).maybeSingle(),
  ]);
  if (jahitRes.error) throw jahitRes.error;
  if (finishingRes.error) throw finishingRes.error;

  const finishingKodes = new Set(
    (finishingRes.data?.items ?? []).filter((it) => Number(it.jumlah) > 0).map((it) => it.kode_produk),
  );
  if (finishingKodes.size === 0) return { updatedCards: 0, kodeSynced: [] };

  const contribByKode = buildJahitContributionsByKode(jahitRes.data ?? []);

  let updatedCards = 0;
  const kodeSynced = [];
  for (const kode of finishingKodes) {
    const contributions = contribByKode[kode];
    if (!contributions?.length) continue;

    const { data: cards, error: cardsErr } = await supabase
      .from("jahit_cards")
      .select("id, qty")
      .eq("kode_produk", kode)
      .neq("status", "done")
      .order("created_at", { ascending: true });
    if (cardsErr) throw cardsErr;
    if (!cards?.length) continue;

    const updates = buildJahitCardSync({ contributions, cards });
    if (updates.length === 0) continue;

    const now = new Date().toISOString();
    for (const u of updates) {
      const { error } = await supabase
        .from("jahit_cards")
        .update({
          status: "done",
          karyawan_id: u.karyawanId,
          karyawan_nama: u.karyawanNama,
          assigned_at: now,
          moved_to_progress_at: now,
          moved_to_finishing_at: now,
          done_at: now,
          updated_at: now,
        })
        .eq("id", u.cardId);
      if (error) throw error;
      updatedCards++;
    }
    kodeSynced.push(kode);
  }
  return { updatedCards, kodeSynced };
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

/** Upah jahit per kode — estimasi dari batch produksi TERBARU. Dua-sumber-upah: DECISIONS.md §7. */
export async function fetchUpahJahitByKode() {
  const { data, error } = await supabase
    .from("produksi_batch")
    .select("kode_produk, upah_jahit, tanggal_produksi, created_at")
    .order("tanggal_produksi", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    if (!row.kode_produk || map[row.kode_produk] !== undefined) continue;
    map[row.kode_produk] = Number(row.upah_jahit) || 0;
  }
  return map;
}

/** Upah jahit per kode — dari upah AKTUAL terakhir di riwayat gaji_jahit (prioritas utama). DECISIONS.md §7. */
export async function fetchUpahJahitHistoryByKode() {
  const { data, error } = await supabase
    .from("gaji_jahit")
    .select("kartu_items, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    for (const item of row.kartu_items ?? []) {
      if (!item?.kode || map[item.kode] !== undefined) continue;
      const upah = Number(item.upah) || 0;
      if (upah > 0) map[item.kode] = upah;
    }
  }
  return map;
}

// ── Acuan pilih produk di Finishing — lihat DECISIONS.md §8 ─────────────────

/** Total pcs yang pernah diproduksi per kode (jumlah semua produksi_batch), diringkas jadi satu angka. */
export async function fetchProduksiTotalByKode() {
  const { data, error } = await supabase.from("produksi_batch").select("kode_produk, sizes");
  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    if (!row.kode_produk) continue;
    const batchQty = (row.sizes ?? []).reduce(
      (s, sz) => s + (sz.warna ?? []).reduce((ss, w) => ss + (Number(w.qty) || 0), 0),
      0,
    );
    map[row.kode_produk] = (map[row.kode_produk] ?? 0) + batchQty;
  }
  return map;
}

/** Kancing per pcs sesuai Template HPP, per kode. Kode tanpa Template HPP tidak muncul di map (beda dari "0 kancing"). */
export async function fetchKancingHppByKode() {
  const { data, error } = await supabase.from("hpp_template").select("kode_produk, kancing_qty");
  if (error) throw error;

  const map = {};
  for (const row of data ?? []) {
    if (!row.kode_produk) continue;
    map[row.kode_produk] = Number(row.kancing_qty) || 0;
  }
  return map;
}

/**
 * syncKancingHppFromFinishing — arah Finishing → HPP dari sinkronisasi
 * dua-arah Kancing (arah sebaliknya: fetchKancingHppByKode + fallback di
 * FinishingForm). Dipanggil setelah saveFinishing sukses. Update Template
 * HPP HANYA kalau template-nya sudah ada dan kancing_qty masih kosong/0 —
 * tidak pernah auto-create atau menimpa. Rasional lengkap: DECISIONS.md §4.
 */
export async function syncKancingHppFromFinishing(items) {
  const candidates = (items ?? []).filter(
    (it) => it.kode_produk && Number(it.kancing_per_pcs) > 0,
  );
  if (candidates.length === 0) return { updated: [] };

  const kodes = [...new Set(candidates.map((it) => it.kode_produk))];
  const { data: templates, error } = await supabase
    .from("hpp_template")
    .select("kode_produk, kancing_qty")
    .in("kode_produk", kodes);
  if (error) throw error;

  const updated = [];
  for (const it of candidates) {
    if (updated.includes(it.kode_produk)) continue; // sudah diproses (duplikat kode dalam 1 entri Finishing)
    const tpl = (templates ?? []).find((t) => t.kode_produk === it.kode_produk);
    if (!tpl) continue; // belum ada Template HPP sama sekali — jangan auto-create
    if (Number(tpl.kancing_qty) > 0) continue; // sudah ada nilai — jangan menimpa

    const { error: updErr } = await supabase
      .from("hpp_template")
      .update({ kancing_qty: Number(it.kancing_per_pcs) })
      .eq("kode_produk", it.kode_produk);
    if (updErr) throw updErr;
    updated.push(it.kode_produk);
  }
  return { updated };
}
