import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchJahitCards() {
  const { data, error } = await supabase
    .from("jahit_cards")
    .select("*")
    .neq("status", "done")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

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
