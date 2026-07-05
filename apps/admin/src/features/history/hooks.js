/**
 * features/history/hooks.js
 * PUBLIC SURFACE fitur history — komponen HANYA boleh import dari sini.
 *
 * `logHistory` di re-export sebagai plain async function (BUKAN hook) karena
 * dipanggil dari handler/mutation di banyak fitur lain (produk, transfer,
 * stok-opname, dst) — bentuk & signature sama seperti versi lama supaya
 * call-site cukup ganti import path.
 */
import { useHistoryQuery, useDeleteHistoryMutation } from "./queries";

export { logHistory } from "./api";

export function useHistory({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  const { data, isLoading, error, refetch } = useHistoryQuery({ dateFrom, dateTo, category });
  return { history: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useDeleteHistory() {
  const { mutateAsync } = useDeleteHistoryMutation();
  return (id) => mutateAsync(id);
}
