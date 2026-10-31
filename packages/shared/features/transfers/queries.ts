import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/hooks";
import {
  approveTransfer as approveTransferApi,
  createTransfer as createTransferApi,
  deleteTransfer as deleteTransferApi,
  fetchPendingTransferCount,
  fetchTransfers,
  rejectTransfer as rejectTransferApi,
  updateTransfer as updateTransferApi,
} from "./api";
import type { Transfer, TransferItem, TransferStatus } from "./schema";

export const transferKeys = {
  all: ["transfers"],
  list: (status: TransferStatus | "all" | null, from: string | null, to: string | null) => [
    "transfers",
    status,
    from,
    to,
  ],
  pendingCount: ["transfers", "pending-count"],
};

export function useTransfersQuery(
  statusFilter: TransferStatus | "all" | null = "pending",
  dateFrom: string | null = null,
  dateTo: string | null = null,
) {
  return useQuery({
    queryKey: transferKeys.list(statusFilter, dateFrom, dateTo),
    queryFn: () => fetchTransfers(statusFilter, dateFrom, dateTo),
  });
}

export function usePendingTransferCountQuery() {
  return useQuery({
    queryKey: transferKeys.pendingCount,
    queryFn: fetchPendingTransferCount,
    refetchInterval: 30_000,
  });
}

interface CreateTransferPayload {
  fromLocation: string;
  toLocation: string;
  items: TransferItem[];
  notes?: string | null;
}

export function useCreateTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransferPayload) => createTransferApi({ ...payload, user }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useApproveTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer: Transfer) => approveTransferApi(transfer, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useRejectTransferMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transfer, reason }: { transfer: Transfer; reason: string }) =>
      rejectTransferApi(transfer, reason, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

export function useDeleteTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer: Transfer) => deleteTransferApi(transfer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}

interface UpdateTransferPayload {
  fromLocation: string;
  toLocation: string;
  items: TransferItem[];
  notes?: string | null;
}

export function useUpdateTransferMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transfer, payload }: { transfer: Transfer; payload: UpdateTransferPayload }) =>
      updateTransferApi(transfer, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transferKeys.all }),
  });
}
