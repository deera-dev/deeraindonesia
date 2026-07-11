/**
 * features/produksi-laporan/hooks.js
 * PUBLIC SURFACE — komponen import HANYA dari sini (atau index.js).
 */
import { useProduksiBatchesQuery, useTagihanJatuhTempoQuery, useProduksiBatchesTotalQuery } from "./queries";

// Pass-through murni — enrichment per batch, ringkasan (SUM/COUNT/AVG),
// dan pemakaian bahan (GROUP BY) sudah dihitung sepenuhnya di RPC Postgres
// `get_laporan_produksi` (lihat api.js). Hook ini TIDAK BOLEH lagi
// melakukan reduce/business logic apa pun, sesuai target arsitektur:
// PostgreSQL = business logic, frontend = presentation layer.
export function useProduksiBatches({ fromDate, toDate }) {
  const { data, isLoading } = useProduksiBatchesQuery({ fromDate, toDate });
  return {
    batches: data?.batches ?? [],
    ringkasan: data?.ringkasan ?? {},
    bahanUsage: data?.bahanUsage ?? [],
    loading: isLoading,
  };
}

export function useTagihanJatuhTempo({ fromDate, toDate }) {
  const { data, isLoading } = useTagihanJatuhTempoQuery({ fromDate, toDate });
  return { tagihan: data ?? [], loading: isLoading };
}

// Pass-through murni — SUM/COUNT/fallback HPP (effective_hpp) sudah
// dihitung sepenuhnya di RPC Postgres `get_produksi_batches_total`
// (lihat api.js). Hook ini TIDAK BOLEH lagi melakukan reduce/business
// logic apa pun, sesuai target arsitektur: PostgreSQL = business logic,
// frontend = presentation layer.
export function useProduksiBatchesTotal() {
  const { data, isLoading } = useProduksiBatchesTotalQuery();
  return {
    totalBatch: data?.totalBatch ?? 0,
    totalBaju: data?.totalBaju ?? 0,
    totalModal: data?.totalModal ?? 0,
    loading: isLoading,
  };
}
