/**
 * features/pelanggan/hooks.js
 * PUBLIC SURFACE fitur pelanggan — komponen HANYA boleh import dari sini.
 */
import { usePelangganListQuery, useSalesByPelangganQuery } from "./queries";

// Passthrough async (bukan TanStack Query) — dipanggil on-demand saat user
// mengetik di autocomplete `PengirimanForm`, sama seperti pola
// `generatePengirimanNo` di features/pengiriman/hooks.js.
export { searchPelanggan } from "./api";

export function usePelangganList() {
  const { data, isLoading, error } = usePelangganListQuery();
  return { pelanggan: data ?? [], loading: isLoading, error };
}

export function useSalesByPelanggan(pelangganId) {
  const { data, isLoading, error } = useSalesByPelangganQuery(pelangganId);
  return { sales: data ?? [], loading: isLoading, error };
}
