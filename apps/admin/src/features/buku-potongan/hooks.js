/**
 * features/buku-potongan/hooks.js
 * PUBLIC SURFACE fitur buku-potongan — komponen HANYA boleh import dari sini.
 */
import { useBukuPotonganDataQuery, useUpsertExpectedStokMutation } from "./queries";

export function useBukuPotonganData() {
  const { data, isLoading, error, refetch } = useBukuPotonganDataQuery();
  return {
    stokRows: data?.stokRows ?? [],
    expectedRows: data?.expectedRows ?? [],
    tableError: data?.tableError ?? false,
    loading: isLoading,
    error,
    reload: refetch,
  };
}

export function useSaveExpectedStok() {
  const { mutateAsync, isPending } = useUpsertExpectedStokMutation();
  return { saveExpectedStok: (rows) => mutateAsync(rows), saving: isPending };
}
