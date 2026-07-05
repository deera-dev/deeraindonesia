/**
 * features/stok/hooks.js
 * PUBLIC SURFACE fitur stok. Bentuk return SAMA seperti useStokByLocation() lama
 * ({ items, loading }) agar consumer existing cukup ganti import path.
 */
import { useStokByLocationQuery } from "./queries";

export function useStokByLocation(location) {
  const { data, isLoading } = useStokByLocationQuery(location);
  return { items: data ?? [], loading: isLoading };
}
