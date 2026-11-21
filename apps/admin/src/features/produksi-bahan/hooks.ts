export { detectDupes } from "./api";

import { detectDupes } from "./api";
import {
  useBahanItemsQuery,
  useDeleteBahanMutation,
  useInvalidateStokBahan,
  useMergeDupesMutation,
  useSaveBahanMutation,
  useStokBahanQuery,
  useToggleLunasMutation,
} from "./queries";
import type { BahanItemRow, BahanTable, SaveBahanItemArgs } from "./schema";

export { useInvalidateStokBahan };

export function useBahanItems(table: BahanTable) {
  const { data, isLoading } = useBahanItemsQuery(table);
  return { items: data ?? [], loading: isLoading };
}

export function useStokBahan() {
  const { data, isLoading } = useStokBahanQuery();
  return { data: data ?? [], loading: isLoading };
}

export function useSaveBahan(table: BahanTable) {
  const { mutateAsync } = useSaveBahanMutation(table);
  return (
    payload: SaveBahanItemArgs["payload"],
    editing?: BahanItemRow | null,
    meta?: Record<string, unknown>,
    activeTab?: string,
  ) => mutateAsync({ payload, editing, meta, activeTab });
}

export function useToggleLunas(table: BahanTable) {
  const { mutateAsync } = useToggleLunasMutation(table);
  return (item: BahanItemRow) => mutateAsync(item);
}

export function useDeleteBahan(table: BahanTable) {
  const { mutateAsync } = useDeleteBahanMutation(table);
  return (item: BahanItemRow, activeTab?: string) => mutateAsync({ item, activeTab });
}

export function useMergeDupes(table: BahanTable) {
  const { mutateAsync } = useMergeDupesMutation(table);
  return (groups: Parameters<typeof mutateAsync>[0]) => mutateAsync(groups);
}

export async function lookupDupes(table: BahanTable) {
  return detectDupes(table);
}
