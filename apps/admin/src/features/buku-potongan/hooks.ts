import { useBukuPotonganDataQuery, useUpsertExpectedStokMutation } from "./queries";
import type { ExpectedStokRow } from "./schema";

export function useBukuPotonganData() {
  const { data, isLoading, error, refetch } = useBukuPotonganDataQuery();
  return {
    stokRows: data?.stokRows ?? [],
    expectedRows: data?.expectedRows ?? [],
    soldMap: data?.soldMap ?? {},
    dikirimMap: data?.dikirimMap ?? {},
    tableError: data?.tableError ?? false,
    loading: isLoading,
    error,
    reload: refetch,
  };
}

export function useSaveExpectedStok() {
  const { mutateAsync, isPending } = useUpsertExpectedStokMutation();
  return { saveExpectedStok: (rows: ExpectedStokRow[]) => mutateAsync(rows), saving: isPending };
}
