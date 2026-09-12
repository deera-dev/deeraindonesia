/**
 * features/produksi-jahit/api.js
 * Panggilan Supabase MENTAH untuk kanban Kartu Jahit (tabel jahit_cards) —
 * pure async, tidak ada React di sini. logHistory diimport dari
 * ../history/api (layer api, bukan hooks — konsisten dengan precedent
 * fitur produksi lain, mis. produksi-record/api.js & produksi-sampel/api.js).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

// Board aktif (3 kolom) — TIDAK PERNAH termasuk kartu status "done" supaya
// query ini tetap ringan seiring waktu (produksi terus jalan, arsip
// "Selesai" akan terus bertambah — lihat fetchDoneJahitCards di bawah utk
// arsip itu, dgn filter tanggal & search wajib supaya tidak menarik semua
// riwayat sekaligus).
export async function fetchJahitCards() {
  const { data, error } = await supabase
    .from("jahit_cards")
    .select("*")
    .neq("status", "done")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * fetchDoneJahitCards — arsip kartu yang sudah ditandai Selesai. Selalu
 * dibatasi (limit 200) + urut done_at terbaru dulu; dateFrom/dateTo & search
 * disaring di level query (bukan ditarik semua lalu difilter di client)
 * supaya tetap ringan walau arsipnya sudah sangat banyak.
 */
export async function fetchDoneJahitCards({ dateFrom = null, dateTo = null, search = "" } = {}) {
  let q = supabase
    .from("jahit_cards")
    .select("*")
    .eq("status", "done")
    .order("done_at", { ascending: false })
    .limit(200);
  if (dateFrom) q = q.gte("done_at", `${dateFrom}T00:00:00`);
  if (dateTo) q = q.lte("done_at", `${dateTo}T23:59:59`);
  if (search?.trim()) q = q.ilike("kode_produk", `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Daftar penjahit untuk dropdown assign — query LANGSUNG ke tabel `karyawan`
// (tabel yang sama dipakai apps/finance/src/features/karyawan). Ini BUKAN
// pelanggaran Dependency Inversion: yang dilarang adalah komponen mengimpor
// api.js/store.js/queries.js fitur lain, sedangkan ini cuma api.js fitur ini
// membaca tabel Supabase bersama (sama seperti fitur lain baca `products`
// atau `stok_warna` lintas app tanpa import modul React app lain).
export async function fetchKaryawanJahit() {
  const { data, error } = await supabase
    .from("karyawan")
    .select("id, nama")
    .eq("tim", "jahit")
    .eq("aktif", true)
    .order("nama");
  if (error) throw error;
  return data ?? [];
}

/**
 * createJahitCardsForBatch — sinkron kartu Jahit dari rincian ukuran×warna
 * satu batch produksi. Dipanggil dari features/produksi-record/api.js
 * setelah INSERT maupun UPDATE produksi_batch (permintaan Denny 2026-09:
 * "ketika Produksi dibuat ... cardnya langsung kebuat").
 *
 * Idempotent & AMAN dipanggil berulang (pola sama seperti resyncBahanDipakai
 * di produksi-record/api.js): hanya MENAMBAH kartu untuk kombinasi
 * size×warna yang BELUM punya kartu untuk batch ini, TIDAK PERNAH menimpa
 * kartu yang sudah ada — supaya progres (status/assignment) yang sudah
 * berjalan tidak pernah ke-reset cuma karena batch-nya diedit ulang (mis.
 * user menambah warna baru ke batch yang sebagian kartunya sudah
 * on_progress/ready_finishing).
 *
 * @param {object} opts
 * @param {string} opts.batchId
 * @param {string} opts.kode   — kode_produk
 * @param {string} opts.nama   — nama_produk
 * @param {array}  opts.sizes  — [{size, warna: [{warna, qty}]}]
 */
export async function createJahitCardsForBatch({ batchId, kode, nama, sizes }) {
  if (!batchId || !sizes?.length) return [];

  const { data: existing, error: fetchErr } = await supabase
    .from("jahit_cards")
    .select("size, warna")
    .eq("batch_id", batchId);
  if (fetchErr) throw fetchErr;

  const have = new Set((existing ?? []).map((r) => `${r.size}__${r.warna}`));
  const rows = [];
  for (const sz of sizes) {
    for (const w of sz.warna ?? []) {
      const key = `${sz.size}__${w.warna}`;
      if (have.has(key)) continue;
      rows.push({
        batch_id: batchId,
        kode_produk: kode,
        nama_produk: nama,
        size: sz.size,
        warna: w.warna,
        qty: Number(w.qty) || 0,
      });
    }
  }
  if (rows.length === 0) return [];

  const { data: inserted, error } = await supabase.from("jahit_cards").insert(rows).select("*");
  if (error) throw error;
  return inserted ?? rows;
}

/**
 * assignKaryawan — assign kartu ke penjahit, LANGSUNG pindah ke kolom
 * On Progress (konfirmasi Denny 2026-09: assign & pindah kolom digabung
 * jadi satu aksi, bukan dua langkah terpisah).
 */
export async function assignKaryawan({ cardId, karyawanId, karyawanNama, kode, nama }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jahit_cards")
    .update({
      karyawan_id: karyawanId,
      karyawan_nama: karyawanNama,
      status: "on_progress",
      assigned_at: now,
      moved_to_progress_at: now,
      updated_at: now,
    })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-assign",
    category: "produksi",
    kode,
    nama,
    snapshot: { karyawan: karyawanNama, status: "on_progress" },
  }).catch(() => {});
}

/** moveToReadyFinishing — kartu sudah disetor tukang jahit, siap finishing. */
export async function moveToReadyFinishing({ cardId, kode, nama }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jahit_cards")
    .update({ status: "ready_finishing", moved_to_finishing_at: now, updated_at: now })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-selesai",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "ready_finishing" },
  }).catch(() => {});
}

/**
 * unassignCard — batalkan assign, kembalikan kartu ke kolom Belum Assign.
 * Jaring pengaman kalau admin salah pilih penjahit / salah geser kartu.
 */
export async function unassignCard({ cardId, kode, nama }) {
  const { error } = await supabase
    .from("jahit_cards")
    .update({
      status: "belum_assign",
      karyawan_id: null,
      karyawan_nama: null,
      assigned_at: null,
      moved_to_progress_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-batal-assign",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "belum_assign" },
  }).catch(() => {});
}

/**
 * markCardDone — arsipkan kartu (manual, dari tombol "Tandai Selesai" di
 * kartu Ready Finishing). Ini TERPISAH dari alur otomatis lewat rekonsiliasi
 * stok Finishing di Finance (lihat apps/finance/.../applyFinishingStockIntake)
 * — dua jalan berbeda bisa sama-sama berujung ke status "done", tidak saling
 * mengganggu (kartu yang sudah "done" tidak akan muncul lagi sbg kandidat di
 * kedua jalur tsb).
 */
export async function markCardDone({ cardId, kode, nama }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jahit_cards")
    .update({ status: "done", done_at: now, updated_at: now })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-tandai-selesai",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "done" },
  }).catch(() => {});
}

/**
 * moveBackToProgress — undo dari Ready Finishing balik ke On Progress
 * (mis. admin salah geser, ternyata belum benar-benar disetor).
 */
export async function moveBackToProgress({ cardId, kode, nama }) {
  const { error } = await supabase
    .from("jahit_cards")
    .update({
      status: "on_progress",
      moved_to_finishing_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-kembali-progress",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "on_progress" },
  }).catch(() => {});
}
