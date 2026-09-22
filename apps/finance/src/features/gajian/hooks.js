/**
 * hooks.js — Permukaan publik fitur Gajian. Hanya file ini (atau index.js)
 * yang boleh diimport oleh komponen, termasuk konsumen lintas fitur.
 */
import { useMemo } from "react";
import { useApplyKasbonDeduction, useKasbonBelumLunasByKaryawanIds } from "../kasbon/hooks";
import { useFinanceConfig } from "../pengaturan/hooks";
import { usePettycashAll, useSavePettycash } from "../pettycash/hooks";
import {
  useApplyFinishingStockIntakeMutation,
  useCmtQuery,
  useCreateGajianPeriodeMutation,
  useDeleteCmtMutation,
  useDeleteFinishingMutation,
  useDeleteGajianPeriodeMutation,
  useDeleteJahitMutation,
  useDeleteKreatifMutation,
  useDeletePotongMutation,
  useDeleteQCMutation,
  useFinalizeGajianMutation,
  useFinishingQuery,
  useGajianDetailQuery,
  useGajianListQuery,
  useGajianTotalsQuery,
  useJahitForRincianQuery,
  useJahitQuery,
  useKaryawanIdsInGajianQuery,
  useKreatifForRincianQuery,
  useKreatifQuery,
  useLoadFinishingReconciliationMutation,
  usePotongForRincianQuery,
  usePotongQuery,
  useProduksiTotalMapQuery,
  useKancingHppMapQuery,
  useProdukListQuery,
  useQCForRincianQuery,
  useQCQuery,
  useSaveCmtMutation,
  useSaveFinishingMutation,
  useSaveGajianRequestMutation,
  useSaveJahitMutation,
  useSaveKreatifMutation,
  useSavePotongMutation,
  useSaveQCMutation,
  useSyncJahitCardsFromGajianMutation,
  useSyncKancingHppFromFinishingMutation,
  useUpahJahitMapQuery,
  useUpahJahitHistoryMapQuery,
} from "./queries";
import { buildPerKaryawanMap, pettycashTerpakaiFromSaldo } from "./utils";

// ── Periode ────────────────────────────────────────────────────────────────

export function useGajianList() {
  const { data, isLoading } = useGajianListQuery();
  return { gajianList: data ?? [], loading: isLoading };
}

export function useGajianDetail(id) {
  const { data, isLoading } = useGajianDetailQuery(id);
  return { gajian: data ?? null, loading: isLoading };
}

export function useCreateGajianPeriode() {
  const { mutateAsync } = useCreateGajianPeriodeMutation();
  return (tanggalSabtu) => mutateAsync(tanggalSabtu);
}

export function useDeleteGajianPeriode() {
  const { mutateAsync } = useDeleteGajianPeriodeMutation();
  return (id) => mutateAsync(id);
}

export function useSaveGajianRequest() {
  const { mutateAsync } = useSaveGajianRequestMutation();
  return (gajianId, payload) => mutateAsync({ gajianId, payload });
}

export function useGajianTotals(id) {
  const { data, isLoading } = useGajianTotalsQuery(id);
  return { totals: data ?? null, loading: isLoading };
}

/**
 * "Uang Denny & Wulan Terpakai" — bagian saldo Petty Cash yang minus (lihat
 * pettycashTerpakaiFromSaldo() di utils.js untuk definisi lengkap). Komposisi
 * lintas-fitur: mengimpor usePettycashAll() langsung dari ../pettycash/hooks
 * (public surface fitur itu, yang sudah menghitung `saldo`), sama seperti
 * useKasbonBelumLunasByKaryawanIds di atas. Dipakai TabRingkasan untuk
 * switch "Tambahkan Pettycash?" (default ON, 2026-08).
 */
export function usePettycashTerpakai() {
  const { saldo, loading } = usePettycashAll();
  const total = useMemo(() => pettycashTerpakaiFromSaldo(saldo), [saldo]);
  return { total, loading };
}

export function useKaryawanIdsInGajian(id) {
  const { data } = useKaryawanIdsInGajianQuery(id);
  return data ?? [];
}

/** Komposisi: karyawan_id yang muncul di periode ini → kasbon belum lunas mereka. */
export function useKasbonForGajian(gajianId) {
  const ids = useKaryawanIdsInGajian(gajianId);
  return useKasbonBelumLunasByKaryawanIds(ids);
}

/**
 * Finalisasi gajian: kunci status + simpan total_* per tim, lalu terapkan
 * setiap potongan kasbon sebagai cicilan via features/kasbon, LALU catat
 * otomatis isi-ulang Petty Cash sebesar "Uang Denny & Wulan Terpakai"
 * (permintaan Denny 2026-09) — dulu setelah reimburse ini dibayarkan lewat
 * gajian, harus ada langkah manual terpisah buka halaman Petty Cash & catat
 * "Isi Ulang" senilai yang sama supaya saldo Petty Cash kembali ke 0 (tidak
 * terus-menerus minus / dobel dihitung minggu berikutnya). Sekarang otomatis
 * begitu difinalisasi — aman dipanggil cuma SEKALI per periode krn tombol
 * "Finalisasi Gajian" hilang begitu `gajian.status === "final"` (lihat
 * TabRingkasan.jsx), persis pola yang sama dgn loop kasbon di bawah.
 *
 * TERAKHIR (permintaan Denny 2026-09): sinkronkan otomatis kartu Kanban
 * Jahit (apps/admin, PRODUKSI > JAHIT) utk kode yang sudah dijahit DAN
 * difinishing di periode ini — lihat komentar panjang di
 * api.js/syncJahitCardsFromGajian & utils.js/buildJahitCardSync utk aturan
 * lengkap. Ditaruh PALING TERAKHIR (setelah semua urusan uang: total, kasbon,
 * reimburse pettycash) supaya kalau langkah ini gagal, transaksi finansial
 * yang sudah pasti penting tetap sukses duluan — errornya tetap terlempar
 * (tidak di-catch diam-diam) supaya admin tahu kalau sinkronisasi kartu
 * gagal & papan Jahit mungkin perlu dicek manual.
 */
export function useFinalizeGajian() {
  const { mutateAsync: finalize } = useFinalizeGajianMutation();
  const applyKasbonDeduction = useApplyKasbonDeduction();
  const savePettycash = useSavePettycash();
  const { mutateAsync: syncJahitCards } = useSyncJahitCardsFromGajianMutation();

  return async (gajian, { totals, pettycash, tambahan, kasbon, kasbonDeductions, totalRequest }) => {
    await finalize({ gajianId: gajian.id, payload: { totals, pettycash, tambahan, kasbonDeductions, totalRequest } });
    for (const ded of kasbonDeductions) {
      const kb = kasbon.find((k) => k.id === ded.kasbon_id);
      if (!kb) continue;
      await applyKasbonDeduction(kb, {
        jumlah: ded.jumlah,
        tanggal: new Date().toISOString().slice(0, 10),
        keterangan: `Potongan gajian ${gajian.tanggal_sabtu}`,
      });
    }
    if (Number(pettycash) > 0) {
      await savePettycash(
        {
          tanggal: new Date().toISOString().slice(0, 10),
          jenis: "isi",
          kategori: "Lainnya",
          keterangan: `Reimburse Uang Denny & Wulan - Gajian ${gajian.tanggal_sabtu}`,
          jumlah: Number(pettycash),
        },
        null,
      );
    }
    await syncJahitCards(gajian.id);
  };
}

// ── Rincian per karyawan (Ringkasan / Share) ──────────────────────────────────

export function usePerKaryawanRincian(gajianId, { includeQC = false } = {}) {
  const { config: cfg } = useFinanceConfig();
  const { data: potong, isLoading: lp } = usePotongForRincianQuery(gajianId);
  const { data: jahit, isLoading: lj } = useJahitForRincianQuery(gajianId);
  const { data: qc, isLoading: lq } = useQCForRincianQuery(gajianId);
  const { data: kreatif, isLoading: lk } = useKreatifForRincianQuery(gajianId);

  const perKaryawan = useMemo(
    () =>
      buildPerKaryawanMap({
        potong: potong ?? [],
        jahit: jahit ?? [],
        qc: qc ?? [],
        kreatif: kreatif ?? [],
        cfg,
        includeQC,
      }),
    [potong, jahit, qc, kreatif, cfg, includeQC],
  );

  return { perKaryawan, loading: lp || lj || lq || lk };
}

// ── Tim Potong ───────────────────────────────────────────────────────────────

export function usePotong(gajianId) {
  const { data, isLoading } = usePotongQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSavePotong() {
  const { mutateAsync } = useSavePotongMutation();
  return (args) => mutateAsync(args);
}
export function useDeletePotong() {
  const { mutateAsync } = useDeletePotongMutation();
  return (id) => mutateAsync(id);
}

// ── Tim Jahit ─────────────────────────────────────────────────────────────────

export function useJahit(gajianId) {
  const { data, isLoading } = useJahitQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveJahit() {
  const { mutateAsync } = useSaveJahitMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteJahit() {
  const { mutateAsync } = useDeleteJahitMutation();
  return (id) => mutateAsync(id);
}

// ── Tim Finishing (satu record per periode) ───────────────────────────────────

export function useFinishing(gajianId) {
  const { data, isLoading } = useFinishingQuery(gajianId);
  return { record: data ?? null, loading: isLoading };
}

/**
 * Simpan Finishing, LALU sinkronkan Kancing HPP secara otomatis (permintaan
 * Denny 2026-09: "kalau produk HPP kancingnya belum ada, lalu di gajian
 * finishing diinput jumlah kancingnya, maka otomatis produk HPP jumlah
 * kancingnya juga terisi" — lihat syncKancingHppFromFinishing di api.js
 * untuk aturan lengkap arah Finishing -> HPP; arah sebaliknya HPP -> Finishing
 * ditangani via kancingHppByKode sebagai fallback placeholder di
 * FinishingForm.jsx).
 *
 * BEDA dengan useFinalizeGajian/syncJahitCards: kegagalan sinkron kancing di
 * sini SENGAJA DITELAN DIAM-DIAM (try/catch lokal), tidak dilempar ulang.
 * Penyimpanan Finishing sendiri adalah aksi utama & sudah pasti sukses saat
 * baris ini dijalankan — kalau errornya dilempar ke atas, FinishingForm.jsx
 * akan menampilkan toast "Gagal: ..." yang MENYESATKAN (seolah data
 * Finishing gagal tersimpan, padahal sudah tersimpan, cuma sinkronisasi HPP
 * pelengkapnya yang gagal). Beda dengan sinkron Kartu Jahit di finalisasi
 * gajian (dampak keuangan/produksi nyata, sengaja dibiarkan gagal-keras) —
 * sinkron kancing di sini murni kenyamanan pengisian form, jadi lebih aman
 * gagal senyap drpd bikin panik admin yang datanya sebenarnya sudah aman.
 */
export function useSaveFinishing() {
  const { mutateAsync } = useSaveFinishingMutation();
  const { mutateAsync: syncKancingHpp } = useSyncKancingHppFromFinishingMutation();
  return async (args) => {
    const id = await mutateAsync(args);
    try {
      await syncKancingHpp(args?.payload?.items ?? []);
    } catch (err) {
      console.warn("Sinkron Kancing HPP dari Finishing gagal (diabaikan):", err);
    }
    return id;
  };
}
export function useDeleteFinishing() {
  const { mutateAsync } = useDeleteFinishingMutation();
  return (id) => mutateAsync(id);
}

// ── Rekonsiliasi Stok Masuk dari Finishing (permintaan Denny 2026-09) ────────
export function useLoadFinishingReconciliation() {
  const { mutateAsync } = useLoadFinishingReconciliationMutation();
  return (items) => mutateAsync(items);
}
export function useApplyFinishingStockIntake() {
  const { mutateAsync, isPending } = useApplyFinishingStockIntakeMutation();
  return { apply: (params) => mutateAsync(params), applying: isPending };
}

// ── Tim QC ────────────────────────────────────────────────────────────────────

export function useQC(gajianId) {
  const { data, isLoading } = useQCQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveQC() {
  const { mutateAsync } = useSaveQCMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteQC() {
  const { mutateAsync } = useDeleteQCMutation();
  return (id) => mutateAsync(id);
}

// ── Tim Kreatif ──────────────────────────────────────────────────────────────

export function useKreatif(gajianId) {
  const { data, isLoading } = useKreatifQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveKreatif() {
  const { mutateAsync } = useSaveKreatifMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteKreatif() {
  const { mutateAsync } = useDeleteKreatifMutation();
  return (id) => mutateAsync(id);
}

// ── CMT Luar ──────────────────────────────────────────────────────────────────

export function useCmt(gajianId) {
  const { data, isLoading } = useCmtQuery(gajianId);
  return { rows: data ?? [], loading: isLoading };
}
export function useSaveCmt() {
  const { mutateAsync } = useSaveCmtMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteCmt() {
  const { mutateAsync } = useDeleteCmtMutation();
  return (id) => mutateAsync(id);
}

// ── Produk ─────────────────────────────────────────────────────────────────────

export function useProdukList() {
  const { data, isLoading } = useProdukListQuery();
  return { produkList: data ?? [], loading: isLoading };
}

// Upah tukang jahit per kode produk (dari batch produksi terbaru, lihat
// api.js fetchUpahJahitByKode) — dipakai JahitForm utk auto-isi "Upah/pcs"
// saat kode dipilih.
export function useUpahJahitMap() {
  const { data, isLoading } = useUpahJahitMapQuery();
  return { upahJahitByKode: data ?? {}, loading: isLoading };
}

// Upah tukang jahit per kode produk — dari upah AKTUAL terakhir yang
// disimpan di riwayat gaji_jahit (lihat api.js fetchUpahJahitHistoryByKode).
// Prioritas UTAMA auto-isi "Upah/pcs" di JahitForm, mengalahkan estimasi
// dari batch produksi (useUpahJahitMap) kalau kode ini sudah pernah dibayar
// sebelumnya — permintaan Denny 2026-08.
export function useUpahJahitHistoryMap() {
  const { data, isLoading } = useUpahJahitHistoryMapQuery();
  return { upahHistoryByKode: data ?? {}, loading: isLoading };
}

// ── Acuan pilih produk di Finishing (permintaan Denny 2026-09) ──────────────
// "jumlah bisa sesuai dengan produksi, sedangkan kancing bisa sesuai dengan
// hpp" — dua map referensi dipakai FinishingForm.jsx utk menampilkan info
// "Acuan: Produksi X pcs · HPP Kancing Y/pcs" saat admin pilih kode produk.
// TIDAK mengisi field otomatis, cuma info pembanding (lihat api.js).
export function useProduksiTotalMap() {
  const { data } = useProduksiTotalMapQuery();
  return { produksiTotalByKode: data ?? {} };
}

export function useKancingHppMap() {
  const { data } = useKancingHppMapQuery();
  return { kancingHppByKode: data ?? {} };
}
