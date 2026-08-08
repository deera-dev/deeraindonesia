/**
 * queries.js — Query-key factory + useQuery/useMutation wrappers fitur Gajian.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGajianPeriode,
  deleteCmt,
  deleteFinishing,
  deleteGajianPeriode,
  deleteJahit,
  deleteKreatif,
  deletePotong,
  deleteQC,
  fetchCmt,
  fetchFinishing,
  fetchGajianDetail,
  fetchGajianList,
  fetchGajianTotals,
  fetchJahit,
  fetchJahitForRincian,
  fetchKaryawanIdsInGajian,
  fetchKreatif,
  fetchKreatifForRincian,
  fetchPotong,
  fetchPotongForRincian,
  fetchProdukList,
  fetchQC,
  fetchQCForRincian,
  fetchUpahJahitByKode,
  finalizeGajian,
  saveCmt,
  saveFinishing,
  saveGajianRequest,
  saveJahit,
  saveKreatif,
  savePotong,
  saveQC,
} from "./api";

export const gajianKeys = {
  all: ["gajian"],
  list: () => ["gajian", "list"],
  detail: (id) => ["gajian", "detail", id],
  totals: (id) => ["gajian", "totals", id],
  karyawanIds: (id) => ["gajian", "karyawan-ids", id],
  potong: (id) => ["gajian", "potong", id],
  jahit: (id) => ["gajian", "jahit", id],
  finishing: (id) => ["gajian", "finishing", id],
  qc: (id) => ["gajian", "qc", id],
  kreatif: (id) => ["gajian", "kreatif", id],
  cmt: (id) => ["gajian", "cmt", id],
  produk: () => ["gajian", "produk"],
  upahJahitByKode: () => ["gajian", "upah-jahit-by-kode"],
  rincianPotong: (id) => ["gajian", "rincian-potong", id],
  rincianJahit: (id) => ["gajian", "rincian-jahit", id],
  rincianQC: (id) => ["gajian", "rincian-qc", id],
  rincianKreatif: (id) => ["gajian", "rincian-kreatif", id],
};

function invalidateGajian(queryClient) {
  queryClient.invalidateQueries({ queryKey: gajianKeys.all });
}

// ── Periode ────────────────────────────────────────────────────────────────

export function useGajianListQuery() {
  return useQuery({ queryKey: gajianKeys.list(), queryFn: fetchGajianList });
}

export function useGajianDetailQuery(id) {
  return useQuery({ queryKey: gajianKeys.detail(id), queryFn: () => fetchGajianDetail(id), enabled: !!id });
}

export function useCreateGajianPeriodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tanggalSabtu) => createGajianPeriode(tanggalSabtu),
    onSuccess: () => invalidateGajian(queryClient),
  });
}

export function useDeleteGajianPeriodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteGajianPeriode(id),
    onSuccess: () => invalidateGajian(queryClient),
  });
}

export function useSaveGajianRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gajianId, payload }) => saveGajianRequest(gajianId, payload),
    onSuccess: () => invalidateGajian(queryClient),
  });
}

export function useFinalizeGajianMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gajianId, payload }) => finalizeGajian(gajianId, payload),
    onSuccess: () => invalidateGajian(queryClient),
  });
}

export function useGajianTotalsQuery(id) {
  return useQuery({ queryKey: gajianKeys.totals(id), queryFn: () => fetchGajianTotals(id), enabled: !!id });
}

export function useKaryawanIdsInGajianQuery(id) {
  return useQuery({ queryKey: gajianKeys.karyawanIds(id), queryFn: () => fetchKaryawanIdsInGajian(id), enabled: !!id });
}

// ── Rincian per karyawan (Ringkasan / Share) ──────────────────────────────────

export function usePotongForRincianQuery(id) {
  return useQuery({ queryKey: gajianKeys.rincianPotong(id), queryFn: () => fetchPotongForRincian(id), enabled: !!id });
}

export function useJahitForRincianQuery(id) {
  return useQuery({ queryKey: gajianKeys.rincianJahit(id), queryFn: () => fetchJahitForRincian(id), enabled: !!id });
}

export function useQCForRincianQuery(id) {
  return useQuery({ queryKey: gajianKeys.rincianQC(id), queryFn: () => fetchQCForRincian(id), enabled: !!id });
}

export function useKreatifForRincianQuery(id) {
  return useQuery({ queryKey: gajianKeys.rincianKreatif(id), queryFn: () => fetchKreatifForRincian(id), enabled: !!id });
}

// ── Tim Potong ───────────────────────────────────────────────────────────────

export function usePotongQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.potong(gajianId), queryFn: () => fetchPotong(gajianId), enabled: !!gajianId });
}
export function useSavePotongMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => savePotong(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeletePotongMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deletePotong(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── Tim Jahit ─────────────────────────────────────────────────────────────────

export function useJahitQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.jahit(gajianId), queryFn: () => fetchJahit(gajianId), enabled: !!gajianId });
}
export function useSaveJahitMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => saveJahit(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeleteJahitMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteJahit(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── Tim Finishing (satu record per periode) ───────────────────────────────────

export function useFinishingQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.finishing(gajianId), queryFn: () => fetchFinishing(gajianId), enabled: !!gajianId });
}
export function useSaveFinishingMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => saveFinishing(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeleteFinishingMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteFinishing(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── Tim QC ────────────────────────────────────────────────────────────────────

export function useQCQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.qc(gajianId), queryFn: () => fetchQC(gajianId), enabled: !!gajianId });
}
export function useSaveQCMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => saveQC(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeleteQCMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteQC(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── Tim Kreatif ──────────────────────────────────────────────────────────────

export function useKreatifQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.kreatif(gajianId), queryFn: () => fetchKreatif(gajianId), enabled: !!gajianId });
}
export function useSaveKreatifMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => saveKreatif(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeleteKreatifMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteKreatif(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── CMT Luar ──────────────────────────────────────────────────────────────────

export function useCmtQuery(gajianId) {
  return useQuery({ queryKey: gajianKeys.cmt(gajianId), queryFn: () => fetchCmt(gajianId), enabled: !!gajianId });
}
export function useSaveCmtMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (args) => saveCmt(args), onSuccess: () => invalidateGajian(queryClient) });
}
export function useDeleteCmtMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteCmt(id), onSuccess: () => invalidateGajian(queryClient) });
}

// ── Produk (dropdown kode produk di Jahit/Finishing/QC) ───────────────────────

export function useProdukListQuery() {
  return useQuery({ queryKey: gajianKeys.produk(), queryFn: fetchProdukList });
}

export function useUpahJahitMapQuery() {
  return useQuery({ queryKey: gajianKeys.upahJahitByKode(), queryFn: fetchUpahJahitByKode });
}
