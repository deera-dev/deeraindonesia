import { QueryClient } from "@tanstack/react-query";

/**
 * Factory untuk QueryClient — dipanggil sekali per app di main.jsx.
 * Default options dipilih untuk konteks bisnis internal (trafik rendah,
 * koneksi kadang lambat di lokasi pasar): tidak perlu refetch agresif,
 * retry sekali cukup untuk transient network blip.
 *
 * Lihat ARCHITECTURE.md §11.4 untuk konvensi penuh.
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
