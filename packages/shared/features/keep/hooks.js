import { useActiveKeepItemsQuery } from "./queries";
import { aggregateKeepQtyByKode, aggregateKeepQtyByKodeSizeWarna } from "./utils";

// { [kode]: qty } — total unit sedang di-Keep utk produk itu (semua
// size/warna/lokasi digabung). Dipakai utk badge ringkas di daftar produk.
export function useKeepQtyByKode() {
  const { data } = useActiveKeepItemsQuery();
  return aggregateKeepQtyByKode(data ?? []);
}

// { [kode]: { [size]: { [warna]: qty } } } — rincian per warna, dipakai
// di tempat yang butuh breakdown lebih detail (mis. kasir pilih warna).
export function useKeepQtyDetail() {
  const { data } = useActiveKeepItemsQuery();
  return aggregateKeepQtyByKodeSizeWarna(data ?? []);
}
