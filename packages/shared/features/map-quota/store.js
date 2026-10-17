import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAP_QUOTA_LIMITS = {
  geocoding: 250,
  directions: 800,
  placesSearch: 100,
  placeDetails: 25,
  routeMatrix: 250,
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const useMapQuotaStore = create(
  persist(
    (set, get) => ({
      date: todayStr(),
      counts: { geocoding: 0, directions: 0 },

      _resetIfNewDay: () => {
        const today = todayStr();
        if (get().date !== today) {
          set({ date: today, counts: { geocoding: 0, directions: 0 } });
        }
      },

      remaining: (kind) => {
        get()._resetIfNewDay();
        const limit = MAP_QUOTA_LIMITS[kind] ?? Infinity;
        return Math.max(0, limit - (get().counts[kind] ?? 0));
      },

      tryConsume: (kind, amount = 1) => {
        get()._resetIfNewDay();
        const limit = MAP_QUOTA_LIMITS[kind] ?? Infinity;
        const current = get().counts[kind] ?? 0;
        if (current + amount > limit) return false;
        set((s) => ({ counts: { ...s.counts, [kind]: current + amount } }));
        return true;
      },
    }),
    { name: "map_quota_v1" },
  ),
);
