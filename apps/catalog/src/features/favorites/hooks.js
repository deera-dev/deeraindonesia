import { useFavoritesStore } from "./store";

/**
 * useFavorites() — public surface fitur favorit. favoriteKodes dibuat baru
 * (new Set) tiap render dari array yang tersimpan — pola yang sama seperti
 * useSoldOutSet()/useLimitedStokSet() di product-catalog/hooks.js.
 */
export function useFavorites() {
  const kodes = useFavoritesStore((s) => s.kodes);
  const toggle = useFavoritesStore((s) => s.toggle);
  const clear = useFavoritesStore((s) => s.clear);
  const favoriteKodes = new Set(kodes);
  return { favoriteKodes, kodes, toggle, clear, count: kodes.length };
}
