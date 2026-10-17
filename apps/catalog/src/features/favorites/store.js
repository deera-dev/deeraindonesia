import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      kodes: [],
      toggle: (kode) =>
        set((s) => ({
          kodes: s.kodes.includes(kode)
            ? s.kodes.filter((k) => k !== kode)
            : [...s.kodes, kode],
        })),
      isFavorite: (kode) => get().kodes.includes(kode),
      clear: () => set({ kodes: [] }),
    }),
    { name: "deera-catalog-favorites" },
  ),
);
