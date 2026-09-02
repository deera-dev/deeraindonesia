/**
 * features/history/hooks.js
 * PUBLIC SURFACE fitur history — komponen HANYA boleh import dari sini.
 *
 * `logHistory` di re-export sebagai plain async function (BUKAN hook) karena
 * dipanggil dari handler/mutation di banyak fitur lain (produk, transfer,
 * stok-opname, dst) — bentuk & signature sama seperti versi lama supaya
 * call-site cukup ganti import path.
 */
import { useHistoryQuery, useHistoryByKodeQuery, useDeleteHistoryMutation } from "./queries";

export { logHistory } from "./api";

export function useHistory({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  const { data, isLoading, error, refetch } = useHistoryQuery({ dateFrom, dateTo, category });
  return { history: data ?? [], loading: isLoading, error, reload: refetch };
}

// Riwayat SATU kode (mis. nomor sampel Planning) — lihat fetchHistoryByKode
// di api.js. Dipakai timeline gabungan histori+komentar di Planning.
export function useHistoryByKode(kode) {
  const { data, isLoading } = useHistoryByKodeQuery(kode);
  return { history: data ?? [], loading: isLoading };
}

export function useDeleteHistory() {
  const { mutateAsync } = useDeleteHistoryMutation();
  return (id) => mutateAsync(id);
}
