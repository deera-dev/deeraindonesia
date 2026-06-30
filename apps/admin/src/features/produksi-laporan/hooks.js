/**
 * features/produksi-laporan/hooks.js
 * PUBLIC SURFACE — komponen import HANYA dari sini (atau index.js).
 */
import { useProduksiBatchesQuery, useTagihanJatuhTempoQuery } from "./queries";

export function useProduksiBatches({ fromDate, toDate }) {
  const { data, isLoading } = useProduksiBatchesQuery({ fromDate, toDate });
  return { batches: data ?? [], loading: isLoading };
}

export function useTagihanJatuhTempo({ fromDate, toDate }) {
  const { data, isLoading } = useTagihanJatuhTempoQuery({ fromDate, toDate });
  return { tagihan: data ?? [], loading: isLoading };
}
