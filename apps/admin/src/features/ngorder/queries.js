/**
 * features/ngorder/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTokoList,
  createToko,
  updateToko,
  deleteToko,
  fetchTokoItems,
  createKiriman,
  updateItemStatus,
  setTokoLocation,
} from "./api";

export const sampelKeys = {
  tokoList: ["ngorder", "toko-list"],
  tokoItems: (tokoId) => ["ngorder", "toko-items", tokoId],
};

export function useTokoListQuery() {
  return useQuery({ queryKey: sampelKeys.tokoList, queryFn: fetchTokoList });
}

export function useCreateTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createToko,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useUpdateTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateToko(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useDeleteTokoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteToko,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}

export function useTokoItemsQuery(tokoId) {
  return useQuery({
    queryKey: sampelKeys.tokoItems(tokoId),
    queryFn: () => fetchTokoItems(tokoId),
    enabled: !!tokoId,
  });
}

export function useCreateKirimanMutation(tokoId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createKiriman,
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoItems(tokoId) }),
  });
}

export function useUpdateItemStatusMutation(tokoId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }) => updateItemStatus(itemId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoItems(tokoId) }),
  });
}

export function useSetTokoLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lat, lng, source }) => setTokoLocation(id, { lat, lng, source }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sampelKeys.tokoList }),
  });
}
