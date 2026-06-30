/**
 * features/produksi-laporan/queries.js
 * Wrapper TanStack Query (useQuery) untuk laporan produksi bulanan.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchProduksiBatches, fetchTagihanJatuhTempo } from "./api";

export const produksiLaporanKeys = {
  all: ["produksi-laporan"],
  batches: (fromDate, toDate) => ["produksi-laporan", "batches", fromDate, toDate],
  tagihan: (fromDate, toDate) => ["produksi-laporan", "tagihan", fromDate, toDate],
};

export function useProduksiBatchesQuery({ fromDate, toDate }) {
  return useQuery({
    queryKey: produksiLaporanKeys.batches(fromDate, toDate),
    queryFn: () => fetchProduksiBatches({ fromDate, toDate }),
  });
}

export function useTagihanJatuhTempoQuery({ fromDate, toDate }) {
  return useQuery({
    queryKey: produksiLaporanKeys.tagihan(fromDate, toDate),
    queryFn: () => fetchTagihanJatuhTempo({ fromDate, toDate }),
  });
}
