/**
 * api.js — Lapisan akses data mentah (Supabase) fitur produksi-sampel.
 * Pure async, tidak ada React. JANGAN diimpor langsung oleh komponen —
 * gunakan hooks.js (Dependency Inversion ala React).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { buildNomor } from "./utils";

// Catatan: daftar bahan untuk dipilih di Planning (bahan_pembelian +
// bahan_pinjam) SENGAJA tidak di-fetch ulang di sini — pakai langsung
// `useBahanOptions` + `BahanPickerModal` yang sudah ada dari
// `../produksi-hpp` (index.js barrel fitur itu), lihat PlanningForm.jsx.
// Menduplikasi fetch di layer api.js fitur ini cuma akan bikin dua cache
// TanStack Query terpisah untuk data yang sama persis.

export async function fetchSampels() {
  const { data } = await supabase
    .from("sampel")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ── Edit sampel ──────────────────────────────────────────────────────────────
export async function updateSampel({ id, nomor, nama, tanggal, foto }) {
  const { error } = await supabase
    .from("sampel")
    .update({
      nama,
      tanggal,
      foto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-edit",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { nama, tanggal, foto },
  }).catch(() => {});
}

// ── Buat Planning (tahap sebelum sampel fisik dibuat) ─────────────────────────
// entry: {nama, tanggal}, bahanFotoUrl: string|null, modelFotoUrls: string[]
// (maks 3), bahanItems: [{nama_bahan, kode_bahan, satuan}] (dari list bahan
// yang sudah ada, lihat fetchBahanOptions), urutan: posisi di antrean
// planning (0 = paling atas/dikerjakan duluan) — dihitung caller dari daftar
// planning yang sudah ada (lihat utils.js nextPlanningUrutan()).
// Status awal "planning" — belum masuk antrean review approve/reject.
export async function createPlanning(
  entry,
  bahanFotoUrl,
  modelFotoUrls,
  bahanItems,
  urutan,
  { userEmail, userName },
) {
  const insert = {
    nama: entry.nama,
    tanggal: entry.tanggal,
    foto: [],
    bahan_foto: bahanFotoUrl || null,
    model_foto: modelFotoUrls ?? [],
    bahan_items: bahanItems ?? [],
    urutan: urutan ?? 0,
    nomor: buildNomor(),
    status: "planning",
    created_by: userEmail,
    created_by_name: userName,
  };
  const { data: inserted, error } = await supabase
    .from("sampel")
    .insert(insert)
    .select("nomor, nama")
    .single();
  if (error) throw error;

  logHistory({
    action: "sampel-planning-buat",
    category: "produksi",
    kode: inserted?.nomor ?? insert.nomor,
    nama: inserted?.nama ?? insert.nama,
    snapshot: insert,
  }).catch(() => {});

  return inserted ?? insert;
}

// ── Ubah urutan antrean Planning (drag & drop di UI) ──────────────────────────
// updates: [{id, urutan}] — ditulis satu-satu (bukan bulk upsert) karena
// jumlah item planning biasanya kecil (belasan) dan tiap baris hanya butuh
// update 1 kolom, pola sama seperti saveBatchDecisions() di atas. Tidak
// dicatat ke history — murni reorder UI, bukan perubahan data substansial.
export async function reorderPlanning(updates) {
  await Promise.all(
    (updates ?? []).map(({ id, urutan }) =>
      supabase.from("sampel").update({ urutan }).eq("id", id).throwOnError(),
    ),
  );
}

// ── Tandai sampel fisik sudah dibuat (planning → draft/Menunggu Review) ──────
// foto: string[] — foto sampel jadi yang sebenarnya (bukan bahan/model referensi).
export async function markSampelDibuat({ id, nomor, nama, foto }) {
  const { error } = await supabase
    .from("sampel")
    .update({
      status: "draft",
      foto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-tandai-dibuat",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "draft", foto },
    before: { status: "planning" },
  }).catch(() => {});
}

// ── Buat sampel (multi-entry) ─────────────────────────────────────────────────
// entries: [{nama, tanggal}], urlsArr: [string[], ...] — sejajar dengan entries.
export async function createSampels(entries, urlsArr, { userEmail, userName }) {
  // batch_id: optional — graceful fallback untuk browser lama / http
  let batchId = null;
  try {
    batchId = crypto.randomUUID();
  } catch {
    /* ok */
  }

  const inserts = entries.map((entry, i) => ({
    nama: entry.nama,
    tanggal: entry.tanggal,
    foto: urlsArr[i] ?? [],
    nomor: buildNomor(),
    status: "draft",
    ...(batchId ? { batch_id: batchId } : {}),
    created_by: userEmail,
    created_by_name: userName,
  }));
  const { data: inserted, error } = await supabase
    .from("sampel")
    .insert(inserts)
    .select("nomor, nama");
  if (error) throw error;

  (inserted ?? inserts).forEach((ins) => {
    logHistory({
      action: "sampel-buat",
      category: "produksi",
      kode: ins.nomor,
      nama: ins.nama,
      snapshot: ins,
    }).catch(() => {});
  });

  return inserted ?? inserts;
}

// ── Simpan keputusan batch (approve/reject) ──────────────────────────────────
// sampelMap: { [id]: sampel } — dipassing explicit dari caller untuk lookup
// nomor/nama saat logHistory (bukan lookup internal via queryClient).
export async function saveBatchDecisions(decisions, sampelMap, { userEmail }) {
  const toProcess = Object.entries(decisions).filter(([, d]) => d.choice !== null);
  const now = new Date().toISOString();

  await Promise.all(
    toProcess.map(async ([id, dec]) => {
      const payload =
        dec.choice === "approve"
          ? {
              status: "approved",
              sesuai_sampel: !dec.catatan,
              perubahan: dec.catatan || null,
              approved_by: userEmail,
              approved_at: now,
              updated_at: now,
            }
          : dec.choice === "ditahan"
          ? {
              status: "ditahan",
              ditahan_by: userEmail,
              ditahan_at: now,
              ditahan_note: dec.catatan || null,
              updated_at: now,
            }
          : {
              status: "rejected",
              rejected_by: userEmail,
              rejected_at: now,
              rejection_note: dec.alasan,
              updated_at: now,
            };
      const { error } = await supabase.from("sampel").update(payload).eq("id", id);
      if (error) throw error;
    }),
  );

  toProcess.forEach(([id, dec]) => {
    const sampel = sampelMap[id];
    if (!sampel) return;
    logHistory({
      action:
        dec.choice === "approve"
          ? "sampel-approve"
          : dec.choice === "ditahan"
          ? "sampel-tahan"
          : "sampel-reject",
      category: "produksi",
      kode: sampel.nomor,
      nama: sampel.nama,
      snapshot:
        dec.choice === "approve"
          ? { status: "approved", perubahan: dec.catatan || null }
          : dec.choice === "ditahan"
          ? { status: "ditahan", ditahan_note: dec.catatan || null }
          : { status: "rejected", rejection_note: dec.alasan },
      before: { status: sampel.status },
    }).catch(() => {});

    // Notif "status berubah" (permintaan Denny 2026-09) — target ke
    // pembuat planning (sampel.created_by), fire-and-forget best-effort.
    // Edge Function sendiri yang skip kalau created_by === userEmail (actor
    // approve/tahan/tolak planning-nya sendiri, tidak perlu notif diri
    // sendiri) — lihat supabase/functions/notify-sampel-status/index.ts.
    supabase.functions
      .invoke("notify-sampel-status", {
        body: {
          sampelId: id,
          sampelNomor: sampel.nomor,
          sampelNama: sampel.nama,
          newStatus:
            dec.choice === "approve" ? "approved" : dec.choice === "ditahan" ? "ditahan" : "rejected",
          creatorEmail: sampel.created_by,
          actorEmail: userEmail,
        },
      })
      .catch(() => {});
  });

  return toProcess;
}

// ── Pin planning penting (permintaan Denny 2026-09) ───────────────────────────
export async function togglePinned(id, pinned) {
  const { error } = await supabase.from("sampel").update({ pinned }).eq("id", id);
  if (error) throw error;
}

// ── Komentar / diskusi Planning (permintaan Denny 2026-09: "saya ingin ini
// beneran dipakai untuk planing ... bisa diskusi nambahin komen, ada notif
// kalau ada yang bikin komen, intinya bisa membantu untuk planing") ─────────
// Thread FLAT per sampel_id (tanpa reply-ke-komentar-lain berjenjang) — satu-
// satunya bentuk "reply" adalah nempel ke SATU foto tertentu lewat
// target_foto_url, lihat migration 20260901_sampel_comments_and_pinned.sql.

export async function fetchComments(sampelId) {
  if (!sampelId) return [];
  const { data, error } = await supabase
    .from("sampel_comments")
    .select("*")
    .eq("sampel_id", sampelId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * addComment — text dan/atau imageUrl (minimal salah satu, dijaga juga oleh
 * CHECK constraint di DB). mentions: array email user yang di-@mention di
 * komentar ini (dipilih user dari dropdown autocomplete, BUKAN hasil parsing
 * regex teks bebas — lihat CommentInput.jsx). targetFotoUrl: opsional, kalau
 * komentar ini reply ke SATU foto spesifik di sampel.foto/model_foto.
 *
 * Setelah insert sukses, trigger 2 notifikasi best-effort lewat Edge
 * Function (fire-and-forget — gagal kirim notif TIDAK BOLEH membuat
 * komentar gagal tersimpan): "ada komentar baru" ke semua org yang terlibat
 * di planning ini, dan "kena mention" khusus ke tiap email di `mentions`.
 */
export async function addComment({
  sampelId,
  sampelNomor,
  sampelNama,
  text,
  imageUrl,
  targetFotoUrl,
  mentions,
  userEmail,
  userName,
}) {
  const { data: inserted, error } = await supabase
    .from("sampel_comments")
    .insert({
      sampel_id: sampelId,
      text: text || null,
      image_url: imageUrl || null,
      target_foto_url: targetFotoUrl || null,
      mentions: mentions ?? [],
      user_email: userEmail,
      user_name: userName,
    })
    .select("*")
    .single();
  if (error) throw error;

  supabase.functions
    .invoke("notify-sampel-comment", {
      body: {
        sampelId,
        sampelNomor,
        sampelNama,
        commentText: text,
        actorEmail: userEmail,
        actorName: userName,
      },
    })
    .catch(() => {});

  if (mentions?.length) {
    supabase.functions
      .invoke("notify-sampel-mention", {
        body: {
          sampelId,
          sampelNomor,
          sampelNama,
          commentText: text,
          mentions,
          actorEmail: userEmail,
          actorName: userName,
        },
      })
      .catch(() => {});
  }

  return inserted;
}

export async function deleteComment(id) {
  const { error } = await supabase.from("sampel_comments").delete().eq("id", id);
  if (error) throw error;
}

// ── Work Order untuk tukang potong (permintaan Denny 2026-09: "ketika sudah
// selesai semua, sudah di approve ... kita langsung bisa membuat Work Order
// untuk tukang potongnya") ────────────────────────────────────────────────
// Dokumen WO sendiri (PNG) dibuat murni di client via html-to-image — TIDAK
// ada baris baru di tabel `sampel`/tabel lain untuk menyimpannya (sama
// seperti Surat Jalan/HPP Share, lihat WorkOrderModal.jsx). Fungsi ini
// HANYA mencatat jejak audit ke `product_history` supaya kelihatan di
// Riwayat/Timeline kapan & oleh siapa WO dibuat, dengan size apa saja yang
// dipilih untuk dipotong dan ringkasan catatan penting yang disertakan.
export async function logWorkOrder({ sampel, sizes, catatanPenting }) {
  await logHistory({
    action: "sampel-wo-buat",
    category: "produksi",
    kode: sampel.nomor,
    nama: sampel.nama,
    snapshot: { sizes: sizes ?? [], catatanPenting: catatanPenting || null },
  });
}

// ── Hapus ─────────────────────────────────────────────────────────────────────
export async function deleteSampel(id) {
  // Catatan: sebelumnya salah target tabel ("produksi_sampel", tidak pernah
  // ada) — bug lama yang membuat tombol Hapus di UI silently no-op karena
  // Supabase mengembalikan error yang tertelan di beberapa caller lama.
  // Tabel yang benar adalah "sampel" (lihat fetchSampels/createSampels di atas).
  const { error } = await supabase.from("sampel").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
