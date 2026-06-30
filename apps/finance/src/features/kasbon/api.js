/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Kasbon.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";

export async function fetchKasbonAll() {
  const { data, error } = await supabase
    .from("kasbon")
    .select("*, karyawan(nama, no_rekening, nama_bank)")
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Kalau karyawan ini sudah punya kasbon "belum lunas", akumulasikan ke situ
 * alih-alih membuat baris baru.
 */
export async function createOrAccumulateKasbon({ karyawanId, tanggal, jumlah, keterangan, existingRows }) {
  const existingBelum = (existingRows ?? []).find(
    (r) => r.karyawan_id === karyawanId && r.status === "belum",
  );
  if (existingBelum) {
    const newJumlah = existingBelum.jumlah + jumlah;
    const newSisa = existingBelum.sisa + jumlah;
    const newTambahan = [
      ...(existingBelum.tambahan ?? []),
      { tanggal, jumlah, keterangan },
    ];
    const { error } = await supabase.from("kasbon").update({
      jumlah: newJumlah,
      sisa: newSisa,
      tambahan: newTambahan,
    }).eq("id", existingBelum.id);
    if (error) throw error;
    return { accumulated: true, karyawanNama: existingBelum.karyawan?.nama ?? "", newJumlah };
  }
  const { error } = await supabase.from("kasbon").insert({
    karyawan_id: karyawanId,
    tanggal,
    jumlah,
    sisa: jumlah,
    keterangan,
    status: "belum",
    cicilan: [],
    tambahan: [],
  });
  if (error) throw error;
  return { accumulated: false };
}

/**
 * Edit jumlah pinjam — sisa harus tetap mempertahankan jumlah yang sudah
 * dibayar lewat cicilan. Validasi "jumlah baru < totalDibayar" dilakukan di
 * komponen (KasbonForm) sebelum memanggil ini, karena pesan toast-nya
 * spesifik dan tidak melalui jalur error generik.
 */
export async function updateKasbonJumlah({ initial, jumlah, tanggal, keterangan }) {
  const totalDibayar = initial.jumlah - initial.sisa;
  const newSisa = jumlah - totalDibayar;
  const newStatus = newSisa <= 0 ? "lunas" : "belum";
  const { error } = await supabase.from("kasbon").update({
    jumlah,
    sisa: newSisa,
    status: newStatus,
    keterangan: keterangan ?? initial?.keterangan ?? null,
    tanggal,
  }).eq("id", initial.id);
  if (error) throw error;
  return { newSisa, newStatus };
}

export async function deleteKasbon(id) {
  const { error } = await supabase.from("kasbon").delete().eq("id", id);
  if (error) throw error;
}

export async function payCicilan({ kasbon, jumlah, tanggal, keterangan }) {
  const newCicilan = [
    ...(kasbon.cicilan ?? []),
    { tanggal, jumlah, keterangan },
  ];
  const newSisa = Math.max(0, kasbon.sisa - jumlah);
  const newStatus = newSisa <= 0 ? "lunas" : "belum";
  const { error } = await supabase.from("kasbon").update({
    cicilan: newCicilan,
    sisa: newSisa,
    status: newStatus,
  }).eq("id", kasbon.id);
  if (error) throw error;
  return { newSisa, newStatus };
}

// ── Fungsi cross-feature (dipakai oleh features/gajian) ─────────────────────

/**
 * Kasbon "belum lunas" milik sekumpulan karyawan (berdasarkan karyawan_id).
 * Dipakai GajianDetail/TabRingkasan untuk menampilkan potongan kasbon bagi
 * karyawan yang muncul di gajian minggu tersebut. Daftar `ids` dihitung oleh
 * pemanggil (features/gajian) dari baris gaji_potong/jahit/qc/kreatif minggu itu.
 */
export async function getKasbonBelumLunasByKaryawanIds(ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabase
    .from("kasbon")
    .select("id, karyawan_id, jumlah, sisa, cicilan, keterangan, karyawan(nama)")
    .in("karyawan_id", ids)
    .eq("status", "belum")
    .gt("sisa", 0)
    .order("tanggal");
  if (error) throw error;
  return data ?? [];
}

/**
 * Menerapkan potongan kasbon sebagai cicilan saat gajian difinalisasi.
 * Dipanggil oleh features/gajian (handleFinalize) satu kali per baris kasbon
 * yang dipotong.
 */
export async function applyKasbonDeductionFromGajian(kasbonRow, { jumlah, tanggal, keterangan }) {
  const newSisa = Math.max(0, kasbonRow.sisa - jumlah);
  const newCicilan = [...(kasbonRow.cicilan ?? []), { tanggal, jumlah, keterangan }];
  const { error } = await supabase.from("kasbon").update({
    sisa: newSisa,
    status: newSisa === 0 ? "lunas" : "belum",
    cicilan: newCicilan,
  }).eq("id", kasbonRow.id);
  if (error) throw error;
}
