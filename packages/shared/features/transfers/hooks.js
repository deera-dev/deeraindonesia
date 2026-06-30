/**
 * features/transfers/hooks.js
 * PUBLIC SURFACE fitur transfers — komponen HANYA boleh import dari sini.
 * Bentuk return & signature SAMA seperti versi lama (manual useState/useEffect)
 * agar semua consumer existing (Transfer.jsx, TransferForm.jsx) cukup ganti
 * import path, tanpa ubah call-site.
 */
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

// statusFilter : "pending" | "approved" | "rejected" | "all"
export function useTransfers(statusFilter = "pending", dateFrom = null, dateTo = null) {
  const { data, isLoading, error, refetch } = useTransfersQuery(statusFilter, dateFrom, dateTo);
  return { transfers: data ?? [], loading: isLoading, error, reload: refetch };
}

// Dipakai AdminBottomNav untuk badge jumlah transfer pending — menggantikan
// akses `supabase.from("transfers")` langsung di komponen (lihat CLAUDE.md §13 +
// ARCHITECTURE.md: komponen UI hanya boleh bergantung pada hooks.js fitur).
export function usePendingTransferCount() {
  const { data } = usePendingTransferCountQuery();
  return data ?? 0;
}

// Setiap hook di bawah mengembalikan ASYNC FUNCTION yang dipanggil di handler,
// pola sama seperti sebelumnya — pakai mutateAsync supaya error tetap di-throw
// (bukan diserap di state mutation), konsisten dengan try/catch existing.
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
