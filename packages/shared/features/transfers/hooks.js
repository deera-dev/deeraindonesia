import {
  useTransfersQuery,
  usePendingTransferCountQuery,
  useCreateTransferMutation,
  useApproveTransferMutation,
  useRejectTransferMutation,
  useDeleteTransferMutation,
  useUpdateTransferMutation,
} from "./queries";

export { generateTransferNo } from "./api";

export function useTransfers(statusFilter = "pending", dateFrom = null, dateTo = null) {
  const { data, isLoading, error, refetch } = useTransfersQuery(statusFilter, dateFrom, dateTo);
  return { transfers: data ?? [], loading: isLoading, error, reload: refetch };
}

export function usePendingTransferCount() {
  const { data } = usePendingTransferCountQuery();
  return data ?? 0;
}

export function useCreateTransfer() {
  const { mutateAsync } = useCreateTransferMutation();
  return ({ fromLocation, toLocation, items, notes }) =>
    mutateAsync({ fromLocation, toLocation, items, notes });
}

export function useApproveTransfer() {
  const { mutateAsync } = useApproveTransferMutation();
  return (transfer) => mutateAsync(transfer);
}

export function useRejectTransfer() {
  const { mutateAsync } = useRejectTransferMutation();
  return (transfer, reason = "") => mutateAsync({ transfer, reason });
}

export function useDeleteTransfer() {
  const { mutateAsync } = useDeleteTransferMutation();
  return (transfer) => mutateAsync(transfer);
}

export function useUpdateTransfer() {
  const { mutateAsync } = useUpdateTransferMutation();
  return (transfer, payload) => mutateAsync({ transfer, payload });
}
