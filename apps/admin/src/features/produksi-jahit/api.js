import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

const JAHIT_CARD_SELECT =
  "*, produksi_batch(tanggal_produksi, upah_jahit, tukang_potong_id, tukang_potong_nama)";

export async function fetchJahitCards() {
  const { data, error } = await supabase
    .from("jahit_cards")
    .select(JAHIT_CARD_SELECT)
    .neq("status", "done")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDoneJahitCards({ dateFrom = null, dateTo = null, search = "" } = {}) {
  let q = supabase
    .from("jahit_cards")
    .select(JAHIT_CARD_SELECT)
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

// Dipanggil dari PrintKartuModal kalau T.Potong batch belum pernah diisi —
// admin set langsung di situ saat mau cetak, supaya kartu berikutnya dari
// batch yang sama otomatis sudah terisi juga (tidak ditanya ulang tiap cetak).
export async function setTukangPotongForBatch({ batchId, tukangPotongId, tukangPotongNama }) {
  const { error } = await supabase
    .from("produksi_batch")
    .update({ tukang_potong_id: tukangPotongId, tukang_potong_nama: tukangPotongNama })
    .eq("id", batchId);
  if (error) throw error;
}

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

export async function renameJahitCardsForBatch({ batchId, kode, nama }) {
  if (!batchId) return;
  const { error } = await supabase
    .from("jahit_cards")
    .update({ kode_produk: kode, nama_produk: nama, updated_at: new Date().toISOString() })
    .eq("batch_id", batchId);
  if (error) throw error;
}

export async function fetchJahitCardById(id) {
  const { data, error } = await supabase
    .from("jahit_cards")
    .select(JAHIT_CARD_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Scan & Terima Setoran: satu aksi yang menggabungkan assign penjahit +
// pindah ke Ready Finishing sekaligus, dipicu begitu admin scan barcode
// kartu fisik yang disetor penjahit. Jumlah bisa dikoreksi di modal kalau
// hasil setoran kurang/lebih dari rencana — qty di kartu ditimpa dengan
// angka final ini (jadi acuan Finishing & Gajian setelahnya).
export async function receiveCard({ cardId, karyawanId, karyawanNama, qty, kode, nama }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jahit_cards")
    .update({
      karyawan_id: karyawanId,
      karyawan_nama: karyawanNama,
      qty,
      status: "ready_finishing",
      assigned_at: now,
      moved_to_progress_at: now,
      moved_to_finishing_at: now,
      updated_at: now,
    })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-terima-setoran",
    category: "produksi",
    kode,
    nama,
    snapshot: { karyawan: karyawanNama, qty, status: "ready_finishing" },
  }).catch(() => {});
}

// "Batalkan Terima": membalikkan kartu yang sudah di-receiveCard kembali
// ke Belum Diterima, kalau admin salah scan atau salah input.
export async function unassignCard({ cardId, kode, nama }) {
  const { error } = await supabase
    .from("jahit_cards")
    .update({
      status: "belum_assign",
      karyawan_id: null,
      karyawan_nama: null,
      assigned_at: null,
      moved_to_progress_at: null,
      moved_to_finishing_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId);
  if (error) throw error;

  logHistory({
    action: "jahit-batal-terima",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "belum_assign" },
  }).catch(() => {});
}

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

export async function markCardsDone({ cardIds, kode, nama }) {
  if (!cardIds?.length) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jahit_cards")
    .update({ status: "done", done_at: now, updated_at: now })
    .in("id", cardIds);
  if (error) throw error;

  logHistory({
    action: "jahit-tandai-selesai",
    category: "produksi",
    kode,
    nama,
    snapshot: { status: "done", kartu: cardIds.length },
  }).catch(() => {});
}
