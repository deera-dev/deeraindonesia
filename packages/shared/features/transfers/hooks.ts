import {
  useApproveTransferMutation,
  useCreateTransferMutation,
  useDeleteTransferMutation,
  usePendingTransferCountQuery,
  useRejectTransferMutation,
  useTransfersQuery,
  useUpdateTransferMutation,
} from "./queries";
import type { Transfer, TransferItem, TransferStatus } from "./schema";

export { generateTransferNo } from "./api";

export function useTransfers(
  statusFilter: TransferStatus | "all" | null = "pending",
  dateFrom: string | null = null,
  dateTo: string | null = null,
) {
  const { data, isLoading, error, refetch } = useTransfersQuery(statusFilter, dateFrom, dateTo);
  return { transfers: data ?? [], loading: isLoading, error, reload: refetch };
}

export function usePendingTransferCount() {
  const { data } = usePendingTransferCountQuery();
  return data ?? 0;
}

interface CreateTransferArgs {
  fromLocation: string;
  toLocation: string;
  items: TransferItem[];
  notes?: string | null;
}

export function useCreateTransfer() {
  const { mutateAsync } = useCreateTransferMutation();
  return ({ fromLocation, toLocation, items, notes }: CreateTransferArgs) =>
    mutateAsync({ fromLocation, toLocation, items, notes });
}

export function useApproveTransfer() {
  const { mutateAsync } = useApproveTransferMutation();
  return (transfer: Transfer) => mutateAsync(transfer);
}

export function useRejectTransfer() {
  const { mutateAsync } = useRejectTransferMutation();
  return (transfer: Transfer, reason = "") => mutateAsync({ transfer, reason });
}

export function useDeleteTransfer() {
  const { mutateAsync } = useDeleteTransferMutation();
  return (transfer: Transfer) => mutateAsync(transfer);
}

interface UpdateTransferPayload {
  fromLocation: string;
  toLocation: string;
  items: TransferItem[];
  notes?: string | null;
}

export function useUpdateTransfer() {
  const { mutateAsync } = useUpdateTransferMutation();
  return (transfer: Transfer, payload: UpdateTransferPayload) => mutateAsync({ transfer, payload });
}
