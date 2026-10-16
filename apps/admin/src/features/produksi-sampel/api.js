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
// entry: {nama, tanggal}, bahanFotoUrl: string|null (LEGACY — planning baru
// dari PlanningForm.jsx selalu kirim null, dipertahankan cuma supaya
// signature tidak berubah utk caller lain/test lama; foto per-bahan sekarang
// ada di bahanItems[].foto, permintaan Denny 2026-09), modelFotoUrls:
// string[] (maks 3), bahanItems: [{nama_bahan, kode_bahan, satuan, foto}]
// (dari list bahan yang sudah ada, lihat fetchBahanOptions — sekarang boleh
// LEBIH DARI SATU baris, tiap baris boleh punya foto sendiri), urutan:
// posisi di antrean planning (0 = paling atas/dikerjakan duluan) — dihitung
// caller dari daftar planning yang sudah ada (lihat utils.js
// nextPlanningUrutan()). Status awal "planning" — belum masuk antrean review
// approve/reject.
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
    // Planning Repeat (model ikut sampel yang sudah jadi) — lihat approveRepeat.
    ...(entry.repeat
      ? { is_repeat: true, repeat_dari_id: entry.repeat.id ?? null, repeat_dari_kode: entry.repeat.kode ?? null }
      : {}),
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

// ── Edit Planning (Denny 2026-10-14): ganti judul/tanggal/bahan/foto acuan ───
// Berlaku untuk status apa pun (bahan & foto acuan bisa perlu dikoreksi juga
// setelah sampel dibuat). Foto sampel (`foto`) dan status TIDAK disentuh.
export async function updatePlanning({ id, nomor, nama, tanggal, modelFotoUrls, bahanItems }) {
  const patch = {
    nama,
    tanggal,
    model_foto: modelFotoUrls ?? [],
    bahan_items: bahanItems ?? [],
    bahan_foto: null, // foto bahan sekarang per-item (bahan_items[].foto)
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("sampel").update(patch).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-planning-edit",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: patch,
  }).catch(() => {});
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

// ── Mundur ke step sebelumnya (Denny 2026-10-17) ─────────────────────────────
// Selesai → Work Order (hapus penanda selesai) · Work Order → Sampel (draft kalau ada
// foto sampel, kalau tidak "sedang dibuat") · Sampel → Rencana (hapus wo_sampel_at).
// Aturan transisi dihitung di sini (layer data), UI hanya memanggil.
export function previousStepPatch(sampel, now = new Date().toISOString()) {
  if (sampel.status === "approved" && sampel.wo_selesai_at) {
    return { step: "approved", patch: { wo_selesai_at: null } };
  }
  if (sampel.status === "approved") {
    const hasFoto = (sampel.foto ?? []).length > 0;
    const base = { approved_by: null, approved_at: null, perubahan: null, sesuai_sampel: null, wo_selesai_at: null };
    return hasFoto
      ? { step: "draft", patch: { ...base, status: "draft" } }
      : { step: "draft", patch: { ...base, status: "planning", wo_sampel_at: sampel.wo_sampel_at ?? now } };
  }
  if (sampel.status === "draft" || (sampel.status === "planning" && sampel.wo_sampel_at)) {
    return { step: "planning", patch: { status: "planning", wo_sampel_at: null } };
  }
  return null;
}

export async function mundurStepSampel(sampel) {
  const plan = previousStepPatch(sampel);
  if (!plan) return null;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sampel")
    .update({ ...plan.patch, updated_at: now })
    .eq("id", sampel.id);
  if (error) throw error;
  logHistory({
    action: "sampel-mundur-step",
    category: "produksi",
    kode: sampel.nomor,
    nama: sampel.nama,
    snapshot: { step: plan.step },
    before: { status: sampel.status },
  }).catch(() => {});
  return plan.step;
}

// ── Work Order selesai / kembalikan (tab "Selesai") ──────────────────────────
export async function setWoSelesai({ id, nomor, nama, selesai }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sampel")
    .update({ wo_selesai_at: selesai ? now : null, updated_at: now })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: selesai ? "sampel-wo-selesai" : "sampel-wo-batal-selesai",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { wo_selesai_at: selesai ? now : null },
  }).catch(() => {});
}

// ── Approve Repeat: planning repeat langsung disetujui TANPA sampel baru ─────
// Permintaan Denny 2026-10-08: repeat mengikuti PRODUK JADI (punya kode), jadi
// tidak perlu upload foto sampel baru. `foto` = foto produk jadi acuan (disalin
// supaya Work Order tetap punya "Foto Sampel Final"). `catatan` opsional.
// Kalau ternyata ada perubahan di repeatan -> pakai alur biasa (Tandai Sudah
// Dibuat + upload foto sampel ulang), bukan fungsi ini.
export async function approveRepeat({ id, nomor, nama, foto, catatan }, { userEmail }) {
  const now = new Date().toISOString();
  const payload = {
    status: "approved",
    foto: foto ?? [],
    sesuai_sampel: !catatan,
    perubahan: catatan || null,
    approved_by: userEmail,
    approved_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("sampel").update(payload).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-approve-repeat",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "approved", repeat: true, perubahan: catatan || null },
    before: { status: "planning" },
  }).catch(() => {});
}

// ── Lanjut ke Work Order (Denny 2026-10-15) ─────────────────────────────────
// Planning langsung dianggap disetujui TANPA upload foto sampel jadi ("lebih
// jelas lihat langsung daripada di foto"): status -> approved supaya Work
// Order potong bisa dibuat. Foto sampel (`foto`) tidak disentuh.
export async function lanjutKeWorkOrder({ id, nomor, nama }, { userEmail }) {
  const now = new Date().toISOString();
  const payload = {
    status: "approved",
    sesuai_sampel: true,
    approved_by: userEmail,
    approved_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("sampel").update(payload).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-lanjut-wo",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "approved", tanpa_foto_sampel: true },
    before: { status: "planning" },
  }).catch(() => {});

  return { approved_by: userEmail, approved_at: now };
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

// ── Read receipts Diskusi (permintaan Denny 2026-09: "ada notif kalau belum
// di read ... bulatan kecil kasih tau ada berapa chat yang belum terbaca" +
// "info untuk mengetahui siapa saja yang sudah membaca chat tersebut") ──────
// Satu baris per (sampel_id, user_email) — hanya menyimpan KAPAN TERAKHIR
// user itu buka tab Diskusi planning ini, lihat migration
// 20260904_sampel_reads.sql utk penjelasan lengkap.

// Unread diskusi dihitung di DATABASE (RPC get_unread_diskusi): {total, per_sampel:{[sampelId]: n}}
// — waktu server (bukan jam browser), tanpa perbandingan string di client.
export async function fetchUnreadDiskusi() {
  const { data, error } = await supabase.rpc("get_unread_diskusi");
  if (error) throw error;
  return data ?? { total: 0, per_sampel: {} };
}

// Semua baris last_read_at SATU sampel (semua user) — dipakai utk tampilkan
// "Dibaca oleh: ..." di CommentThread.jsx.
export async function fetchReadsBySampel(sampelId) {
  if (!sampelId) return [];
  const { data, error } = await supabase
    .from("sampel_reads")
    .select("user_email, user_name, last_read_at")
    .eq("sampel_id", sampelId);
  if (error) throw error;
  return data ?? [];
}

// Tandai user sudah baca diskusi sampel ini sampai SEKARANG (waktu server, lewat
// RPC mark_sampel_read — identitas user diambil dari sesi login di backend).
export async function markSampelRead({ sampelId, userName }) {
  if (!sampelId) return;
  const { error } = await supabase.rpc("mark_sampel_read", { p_sampel_id: sampelId, p_user_name: userName ?? null });
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
  // WO Sampel (dari planning) → tandai di backend; kartu pindah ke step Sampel.
  if (sampel.status === "planning" && !sampel.wo_sampel_at) {
    const { error } = await supabase
      .from("sampel")
      .update({ wo_sampel_at: new Date().toISOString() })
      .eq("id", sampel.id);
    if (error) throw error;
  }
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
