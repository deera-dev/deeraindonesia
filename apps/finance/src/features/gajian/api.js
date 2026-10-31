import { supabase } from "@deera/shared/lib/supabase";
import {
  buildJahitCardSync,
  buildJahitContributionsByKode,
  buildKodeReconciliation,
  pickPendingCards,
} from "./utils";

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

export async function deleteGajianPeriode(id) {
  for (const table of [
    "gaji_potong",
    "gaji_jahit",
    "gaji_finishing",
    "gaji_qa",
    "gaji_qc",
    "gaji_kreatif",
    "gaji_cmt",
  ]) {
    await supabase.from(table).delete().eq("gajian_id", id);
  }
  const { error } = await supabase.from("gajian_minggu").delete().eq("id", id);
  if (error) throw error;
}

export async function saveGajianRequest(
  gajianId,
  { pettycash, tambahan, kasbonDeductions, totalRequest },
) {
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

export async function finalizeGajian(
  gajianId,
  { totals, pettycash, tambahan, kasbonDeductions, totalRequest },
) {
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

export async function fetchPotongForRincian(gajianId) {
  const { data, error } = await supabase
    .from("gaji_potong")
    .select(
      "karyawan(nama, no_rekening, nama_bank), total_upah, jumlah_pola, jumlah_sampel, qty_potongan, tarif_potongan",
    )
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
    .select(
      "karyawan(nama, no_rekening, nama_bank), total_upah, jumlah_video, jumlah_foto, jumlah_logo",
    )
    .eq("gajian_id", gajianId);
  if (error) throw error;
  return data ?? [];
}

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

export async function fetchJahit(gajianId) {
  const { data, error } = await supabase
    .from("gaji_jahit")
    .select("*, karyawan(nama)")
    .eq("gajian_id", gajianId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchJahitCardById(id) {
  const { data, error } = await supabase
    .from("jahit_cards")
    .select("*, produksi_batch(upah_jahit, tukang_potong_nama)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Kartu yang dipakai (jahit_card_id) di suatu entri gaji ditandai "done" +
// ditautkan (gajian_jahit_id) supaya tidak bisa ke-scan dobel tanpa sadar;
// kartu yang dilepas dari entri (dihapus/diedit) dikembalikan ke
// ready_finishing supaya bisa di-scan ulang. Lihat
// supabase/migrations/20261023_jahit_kartu_full_auto.sql.
async function syncScannedJahitCards({ gajianJahitId, prevCardIds = [], nextCardIds = [] }) {
  const toRelease = prevCardIds.filter((id) => !nextCardIds.includes(id));
  const toLink = nextCardIds.filter((id) => !prevCardIds.includes(id));
  const now = new Date().toISOString();

  if (toRelease.length) {
    await supabase
      .from("jahit_cards")
      .update({ status: "ready_finishing", done_at: null, gajian_jahit_id: null, updated_at: now })
      .in("id", toRelease);
  }
  if (toLink.length) {
    await supabase
      .from("jahit_cards")
      .update({ status: "done", done_at: now, gajian_jahit_id: gajianJahitId, updated_at: now })
      .in("id", toLink);
  }
}

function cardIdsOf(kartuItems) {
  return (kartuItems ?? []).map((it) => it.jahit_card_id).filter(Boolean);
}

export async function saveJahit({ payload, editingId }) {
  let prevCardIds = [];
  if (editingId) {
    const { data: prevRow } = await supabase
      .from("gaji_jahit")
      .select("kartu_items")
      .eq("id", editingId)
      .maybeSingle();
    prevCardIds = cardIdsOf(prevRow?.kartu_items);
  }

  const { data, error } = editingId
    ? await supabase.from("gaji_jahit").update(payload).eq("id", editingId).select("id").single()
    : await supabase.from("gaji_jahit").insert(payload).select("id").single();
  if (error) throw error;

  try {
    await syncScannedJahitCards({
      gajianJahitId: data.id,
      prevCardIds,
      nextCardIds: cardIdsOf(payload.kartu_items),
    });
  } catch (err) {
    console.warn("syncScannedJahitCards error:", err);
  }

  return data.id;
}

export async function deleteJahit(id) {
  const { data: row } = await supabase
    .from("gaji_jahit")
    .select("kartu_items")
    .eq("id", id)
    .maybeSingle();
  const cardIds = cardIdsOf(row?.kartu_items);
  if (cardIds.length) {
    try {
      await supabase
        .from("jahit_cards")
        .update({ status: "ready_finishing", done_at: null, gajian_jahit_id: null })
        .in("id", cardIds);
    } catch (err) {
      console.warn("release jahit_cards error:", err);
    }
  }

  const { error } = await supabase.from("gaji_jahit").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFinishing(gajianId) {
  const { data, error } = await supabase
    .from("gaji_finishing")
    .select("*")
    .eq("gajian_id", gajianId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveFinishing({ payload, editingId }) {
  const { data, error } = editingId
    ? await supabase
        .from("gaji_finishing")
        .update(payload)
        .eq("id", editingId)
        .select("id")
        .single()
    : await supabase.from("gaji_finishing").insert(payload).select("id").single();
  if (error) throw error;
  return data?.id ?? editingId ?? null;
}

export async function deleteFinishing(id) {
  const { error } = await supabase.from("gaji_finishing").delete().eq("id", id);
  if (error) throw error;
}

export async function loadFinishingReconciliation(items) {
  const results = {};
  for (const item of items ?? []) {
    const kode = item.kode_produk;
    const [cardsRes, soldRes, stokRes] = await Promise.all([
      supabase
        .from("jahit_cards")
        .select("*, stok_masuk_log(id)")
        .eq("kode_produk", kode)
        .order("created_at"),
      supabase.rpc("get_sold_qty_by_kode", { p_kode: kode }),
      supabase.from("stok_warna").select("*").eq("kode", kode),
    ]);
    if (cardsRes.error) throw cardsRes.error;
    if (soldRes.error) throw soldRes.error;
    if (stokRes.error) throw stokRes.error;

    const cards = pickPendingCards(cardsRes.data ?? [], item.jumlah);
    let logRows = [];
    if (cards.length === 0) {
      logRows = await fetchStokMasukLogByKode(kode);
    }

    results[kode] = buildKodeReconciliation({
      item,
      cards,
      soldRows: soldRes.data ?? [],
      stokRows: stokRes.data ?? [],
      logRows,
    });
  }
  return results;
}

export async function fetchStokMasukLogByKode(kode) {
  const { data, error } = await supabase
    .from("stok_masuk_log")
    .select("size, warna, qty_kartu, created_at")
    .eq("kode", kode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

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

export async function syncJahitCardsFromGajian(gajianId) {
  const [jahitRes, finishingRes] = await Promise.all([
    supabase
      .from("gaji_jahit")
      .select("karyawan_id, kartu_items, karyawan(nama)")
      .eq("gajian_id", gajianId)
      .order("created_at"),
    supabase.from("gaji_finishing").select("items").eq("gajian_id", gajianId).maybeSingle(),
  ]);
  if (jahitRes.error) throw jahitRes.error;
  if (finishingRes.error) throw finishingRes.error;

  const finishingKodes = new Set(
    (finishingRes.data?.items ?? [])
      .filter((it) => Number(it.jumlah) > 0)
      .map((it) => it.kode_produk),
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

export async function fetchCmt(gajianId) {
  const { data, error } = await supabase
    .from("gaji_cmt")
    .select("*")
    .eq("gajian_id", gajianId)
    .order("created_at");
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

export async function fetchProdukList() {
  const { data, error } = await supabase
    .from("products")
    .select("kode, nama, variants, warna")
    .order("kode");
  if (error) throw error;
  return data ?? [];
}

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

export async function syncKancingHppFromFinishing(items) {
  const candidates = (items ?? []).filter((it) => it.kode_produk && Number(it.kancing_per_pcs) > 0);
  if (candidates.length === 0) return { updated: [] };

  const kodes = [...new Set(candidates.map((it) => it.kode_produk))];
  const { data: templates, error } = await supabase
    .from("hpp_template")
    .select("kode_produk, kancing_qty")
    .in("kode_produk", kodes);
  if (error) throw error;

  const updated = [];
  for (const it of candidates) {
    if (updated.includes(it.kode_produk)) continue;
    const tpl = (templates ?? []).find((t) => t.kode_produk === it.kode_produk);
    if (!tpl) continue;
    if (Number(tpl.kancing_qty) > 0) continue;

    const { error: updErr } = await supabase
      .from("hpp_template")
      .update({ kancing_qty: Number(it.kancing_per_pcs) })
      .eq("kode_produk", it.kode_produk);
    if (updErr) throw updErr;
    updated.push(it.kode_produk);
  }
  return { updated };
}
