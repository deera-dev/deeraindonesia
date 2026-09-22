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

// ── Rekonsiliasi Stok Masuk dari Finishing (permintaan Denny 2026-09) ────────
// Saat entri Finishing (gaji_finishing) disimpan, kode+jumlah pcs yang
// dicatat di situ TIDAK punya breakdown size/warna (lihat FinishingForm.jsx)
// — padahal stok_warna butuh size+warna. Breakdown yang presisi diambil dari
// kartu Kanban Jahit (apps/admin/.../produksi-jahit) yang berstatus
// "ready_finishing" untuk kode yang sama: tabel `jahit_cards` dibaca
// LANGSUNG di sini (bukan lewat modul React admin — itu pelanggaran
// Dependency Inversion; ini murni baca tabel Supabase bersama, sama seperti
// fitur lain lintas-app baca `products`/`karyawan`).
//
// Kalau total qty kartu Jahit != jumlah yang dicatat Finance (atau belum ada
// kartu sama sekali utk kode itu), FinishingStockModal.jsx menandai kode itu
// "mismatch" dan membiarkan admin input/koreksi baris size/warna manual.

/**
 * loadFinishingReconciliation — untuk tiap item Finishing yang baru
 * disimpan, ambil kartu Ready Finishing + qty sudah terjual + stok saat ini
 * (semua lokasi) per kode, lalu hitung breakdown rekonsiliasi lewat
 * buildKodeReconciliation (utils.js, pure & testable terpisah dari I/O ini).
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

    // logRows HANYA perlu di-fetch kalau tidak ada kartu ready_finishing sama
    // sekali (kasus rekonsiliasi ULANG, lihat komentar buildKodeReconciliation
    // di utils.js) — hindari query stok_masuk_log yang tidak perlu di jalur
    // normal (pertama kali, kartu masih ada).
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

/**
 * fetchStokMasukLogByKode — riwayat rekonsiliasi stok Finishing utk satu
 * kode (tabel stok_masuk_log, lihat insert-nya di applyFinishingStockIntake
 * di bawah), terbaru dulu. Dipakai loadFinishingReconciliation HANYA saat
 * kode ini tidak punya kartu Jahit "ready_finishing" lagi (sudah "done" dari
 * rekonsiliasi sebelumnya) — supaya baris manual yang diseed masih py acuan
 * qty terakhir sbg placeholder (lihat buildManualRowsFromLog di utils.js),
 * bukan kosong total tanpa konteks.
 */
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
 * di FinishingStockModal.jsx. Untuk tiap baris dgn qtyDitambahkan > 0:
 *   1. increment_stok_gudang (RPC atomik, lihat migration 20260912) — stok
 *      Gudang bertambah, BUKAN menimpa (aman kalau dipanggil brg brsamaan).
 *   2. Kalau baris berasal dari kartu Jahit asli (cardId ada, bukan baris
 *      manual) — tandai kartu itu "done" (sinkron dgn arsip Selesai di
 *      admin, lihat produksi-jahit/api.js markCardDone — logika yg sama
 *      persis ditulis ulang di sini krn Finance tidak boleh import modul
 *      React admin, cuma tabel Supabase-nya yg dibagi).
 *   3. Catat ke stok_masuk_log (audit trail dedicated — LEBIH detail drpd
 *      product_history/logHistory generik, dan Finance sengaja tidak
 *      panggil logHistory admin krn itu juga modul React app lain).
 * Berurutan (bukan Promise.all) supaya gampang ditelusuri kalau salah satu
 * baris gagal di tengah jalan — baris sebelumnya yang sudah sukses TETAP
 * tersimpan (tidak di-rollback), sesuai upsert idempotent increment_stok_gudang.
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

// ── Sinkronisasi otomatis Kartu Jahit dari Finalisasi Gajian (permintaan
// Denny 2026-09) — lihat komentar panjang di utils.js
// (buildJahitContributionsByKode/buildJahitCardSync) utk konteks & aturan
// lengkap. Dipanggil dari useFinalizeGajian (hooks.js) SETELAH finalizeGajian
// sukses. `jahit_cards` dibaca/ditulis LANGSUNG di sini (bukan lewat modul
// React admin — pelanggaran Dependency Inversion; ini murni baca-tulis tabel
// Supabase bersama, sama seperti applyFinishingStockIntake di atas).

/**
 * syncJahitCardsFromGajian — untuk SATU periode gajian yang baru
 * difinalisasi: cari kode yang MUNCUL SEKALIGUS di gaji_jahit (periode ini)
 * DAN gaji_finishing (periode ini, jumlah > 0), lalu tandai kartu Jahit
 * kode itu "selesai" + isi nama penjahit sesuai angka gaji_jahit (lihat
 * buildJahitCardSync). Aman dipanggil berulang (idempotent) — kartu yang
 * sudah "done" tidak pernah diambil lagi (`neq("status","done")`), jadi
 * panggilan kedua kalinya utk kode yang sama tidak menimpa apa-apa lagi
 * kecuali ADA kartu baru yang belum tersentuh.
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

/**
 * Upah tukang jahit per kode produk — dibaca dari batch produksi TERBARU
 * (apps/admin, features/produksi-record) utk kode itu, supaya finance tidak
 * perlu input ulang upah/pcs saat pilih kode di form Tim Jahit. SENGAJA
 * terpisah dari hpp_template.upah_jahit (komponen kalkulasi HPP, beda
 * konsep — lihat komentar newEntry() di
 * apps/admin/src/features/produksi-record/utils.js).
 *
 * Satu kode_produk bisa punya banyak baris produksi_batch (tiap batch
 * produksi = 1 baris) — diurutkan tanggal_produksi & created_at terbaru
 * dulu, lalu ambil kemunculan PERTAMA per kode (= batch paling baru).
 */
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

/**
 * Upah tukang jahit per kode produk — dari upah AKTUAL yang benar-benar
 * dipakai/disimpan di riwayat gaji_jahit (kartu_items), bukan estimasi
 * dari batch produksi (lihat fetchUpahJahitByKode di atas). Dipakai
 * JahitForm sebagai prioritas UTAMA auto-isi "Upah/pcs" (permintaan Denny
 * 2026-08: "kalau kode sudah pernah dipilih dan disimpan harga upahnya,
 * set default upahnya langsung, jadi ketika berbeda karyawan dan
 * mengerjakan kode yang sama tidak lagi harus set harga upahnya") — supaya
 * karyawan BERBEDA yang mengerjakan kode yang SAMA otomatis dapat upah/pcs
 * yang konsisten dengan histori pembayaran nyata, bukan sekadar estimasi
 * produksi yang mungkin belum pernah dibayarkan.
 *
 * Satu kode bisa muncul di banyak baris gaji_jahit (kartu_items berbeda
 * periode/karyawan) — diurutkan created_at terbaru dulu, ambil kemunculan
 * PERTAMA per kode (= upah terakhir yang benar-benar dibayarkan). Upah 0
 * (belum sempat diisi) diabaikan supaya tidak menimpa fallback batch
 * produksi dengan nilai kosong.
 */
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

// ── Acuan pilih produk di form Finishing (permintaan Denny 2026-09) ─────────
// "kalau pilih produk, ada informasi juga berapa seharusnya total jumlah
// (pcs)-nya dan total kancing-nya — jumlah sesuai Produksi, kancing sesuai
// HPP". Dua map ini HANYA acuan/referensi (ditampilkan di FinishingForm),
// TIDAK otomatis mengisi field — jumlah pcs Finishing yang sebenarnya bisa
// saja lebih sedikit dari total produksi (belum semua selesai difinishing),
// jadi admin tetap yang isi angka aktualnya sendiri.

/**
 * fetchProduksiTotalByKode — total pcs yang PERNAH diproduksi per kode,
 * dijumlahkan dari SEMUA batch produksi_batch (cross-app read tabel Admin,
 * sama seperti fetchProducedByKode di apps/admin/src/features/produk/api.js
 * tapi di sini sengaja diringkas jadi satu angka per kode, bukan per size —
 * form Finishing cuma py satu field "Jumlah (pcs)" flat).
 */
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

/**
 * fetchKancingHppByKode — kancing per pcs sesuai Template HPP
 * (hpp_template.kancing_qty, cross-app read tabel Admin) per kode. Kode
 * yang belum py Template HPP TIDAK muncul di map (dibedakan dari "HPP-nya
 * memang 0 kancing" — lihat pemakaian di FinishingForm.jsx).
 */
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

// ── Sinkronisasi dua-arah Kancing HPP <-> Finishing (permintaan Denny 2026-09) ──
// "kalau di HPP kancingnya sudah tertulis, otomatis default value di Finishing
// (arah ini sudah ditangani lewat fetchKancingHppByKode + fallback placeholder
// di FinishingForm.jsx) — begitupun sebaliknya, kalau HPP kancingnya BELUM
// ada, lalu di Finishing diinput, otomatis HPP-nya ikut terisi."
//
// Fungsi ini menangani arah SEBALIKNYA (Finishing -> HPP): dipanggil setelah
// saveFinishing sukses (lihat useSaveFinishing di hooks.js). Untuk tiap item
// yang barusan disimpan dengan kancing_per_pcs > 0, cek Template HPP kode itu
// (cross-app read/write tabel hpp_template, sama seperti fetchKancingHppByKode
// di atas & syncJahitCardsFromGajian) — HANYA update kalau:
//   1. Template HPP kode itu SUDAH ADA (tidak membuat template baru dari sini
//      — Template HPP butuh banyak field lain yg tidak diketahui Finance,
//      auto-create-parsial akan menghasilkan template yg membingungkan), DAN
//   2. kancing_qty template itu masih KOSONG/0 (tidak pernah menimpa nilai
//      HPP yang sudah sengaja diisi admin Produksi — searah dgn "kalau belum
//      ada" di permintaan Denny).
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
