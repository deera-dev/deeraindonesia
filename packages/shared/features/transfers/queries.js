/**
 * features/transfers/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import {
  fetchTransfers,
  fetchPendingTransferCount,
  createTransfer as createTransferApi,
  approveTransfer as approveTransferApi,
  rejectTransfer as rejectTransferApi,
  deleteTransfer as deleteTransferApi,
  updateTransfer as updateTransferApi,
} from "./api";

export const transferKeys = {
  all: ["transfers"],
  list: (status, from, to) => ["transfers", status, from, to],
  pendingCount: ["transfers", "pending-count"],
};

export function useTransfersQuery(statusFilter = "pending", dateFrom = null, dateTo = null) {
  return useQuery({
    queryKey: transferKeys.list(statusFilter, dateFrom, dateTo),
    queryFn: () => fetchTransfers(statusFilter, dateFrom, dateTo),
  });
}

// Dipakai AdminBottomNav untuk badge — query ringan, hanya count.
export function usePendingTransferCountQuery() {
  return useQuery({
    queryKey: transferKeys.pendingCount,
    queryFn: fetchPendingTransferCount,
    refetchInterval: 30_000,
  });
}

export function useCreateTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createTransferApi({ ...payload, user }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useApproveTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer) => approveTransferApi(transfer, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useRejectTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transfer, reason }) => rejectTransferApi(transfer, reason, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useDeleteTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer) => deleteTransferApi(transfer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useUpdateTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transfer, payload }) => updateTransferApi(transfer, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}
