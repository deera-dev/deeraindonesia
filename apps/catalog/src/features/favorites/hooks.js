import { useFavoritesStore } from "./store";

export function useFavorites() {
  const kodes = useFavoritesStore((s) => s.kodes);
  const toggle = useFavoritesStore((s) => s.toggle);
  const clear = useFavoritesStore((s) => s.clear);
  const favoriteKodes = new Set(kodes);
  return { favoriteKodes, kodes, toggle, clear, count: kodes.length };
}
