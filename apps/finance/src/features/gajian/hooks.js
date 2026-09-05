/**
 * hooks.js — Permukaan publik fitur Gajian. Hanya file ini (atau index.js)
 * yang boleh diimport oleh komponen, termasuk konsumen lintas fitur.
 */
import { useMemo } from "react";
import { useApplyKasbonDeduction, useKasbonBelumLunasByKaryawanIds } from "../kasbon/hooks";
import { useFinanceConfig } from "../pengaturan/hooks";
import { usePettycashAll, useSavePettycash } from "../pettycash/hooks";
import {
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
  usePotongForRincianQuery,
  usePotongQuery,
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
 */
export function useFinalizeGajian() {
  const { mutateAsync: finalize } = useFinalizeGajianMutation();
  const applyKasbonDeduction = useApplyKasbonDeduction();
  const savePettycash = useSavePettycash();

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
export function useSaveFinishing() {
  const { mutateAsync } = useSaveFinishingMutation();
  return (args) => mutateAsync(args);
}
export function useDeleteFinishing() {
  const { mutateAsync } = useDeleteFinishingMutation();
  return (id) => mutateAsync(id);
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
