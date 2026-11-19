import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStokWarna, fetchJahitDikerjakan, saveStokOpname, planOpnameOverflow, checkStokSemua, fetchBukuPotongan } from "./api";
import { produkKeys } from "../produk/queries";

export const stokOpnameKeys = {
  all: ["stok-opname", "stok-warna"],
  jahitDikerjakan: ["stok-opname", "jahit-dikerjakan"],
  bukuPotongan: ["stok-opname", "buku-potongan"],
};

export function useStokWarnaAllQuery() {
  return useQuery({
    queryKey: stokOpnameKeys.all,
    queryFn: fetchAllStokWarna,
  });
}

export function useJahitDikerjakanQuery() {
  return useQuery({
    queryKey: stokOpnameKeys.jahitDikerjakan,
    queryFn: fetchJahitDikerjakan,
  });
}

export function useBukuPotonganQuery() {
  return useQuery({ queryKey: stokOpnameKeys.bukuPotongan, queryFn: fetchBukuPotongan });
}

export function useSaveStokOpnameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => saveStokOpname(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stokOpnameKeys.all });
      // BUG FIX (November 2026) — laporan admin: "Stok & Penjualan" (angka
      // ringkasan per lokasi) di ProductDetailModal masih nampilin angka
      // LAMA setelah Stok Opname disimpan (mis. Gudang 22, padahal "Stok
      // per Warna" di bawahnya — hasil query lain, selalu fresh tiap modal
      // dibuka — sudah benar nunjukin Gudang cuma 1). Root cause: mutation
      // ini cuma invalidate cache fitur stok-opname sendiri
      // (stokOpnameKeys.all) — cache fitur produk (produkKeys.stokMap,
      // dipakai AdminPage & diteruskan sbg prop ke ProductCard/
      // ProductDetailModal) tidak pernah diberitahu, jadi tetap nunjukin
      // snapshot stok_warna dari SEBELUM opname sampai admin refresh
      // manual/navigasi ulang. stok_warna adalah tabel yang sama, jadi
      // kedua fitur perlu di-invalidate bareng.
      queryClient.invalidateQueries({ queryKey: produkKeys.stokMap });
      queryClient.invalidateQueries({ queryKey: ["produk", "stok-warna"] });
    },
  });
}

export function usePlanOpnameOverflowMutation() {
  return useMutation({ mutationFn: planOpnameOverflow });
}

export function useCheckStokSemuaMutation() {
  return useMutation({ mutationFn: checkStokSemua });
}
