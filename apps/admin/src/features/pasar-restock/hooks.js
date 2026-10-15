/**
 * hooks.js — PUBLIC SURFACE fitur pasar-restock.
 * Komponen HANYA boleh import dari sini (atau index.js).
 */
import { useStokAllQuery, useSoldKodesQuery, useProduksiInfoQuery } from "./queries";

export function useStokAll() {
  const { data, isLoading } = useStokAllQuery();
  return { stok: data ?? [], loading: isLoading };
}

export function useSoldKodes(location, sinceDateStr) {
  const { data, isLoading } = useSoldKodesQuery(location, sinceDateStr);
  return { soldKodes: data ?? [], loading: isLoading };
}

export function useProduksiInfo() {
  const { data, isLoading } = useProduksiInfoQuery();
  return { produksiInfo: data ?? {}, loading: isLoading };
}
