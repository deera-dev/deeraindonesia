import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TARGET_SERI } from "./utils";

interface TargetSeriState {
  targetByMarket: Record<string, number>;
  setTarget: (market: string, qty: number) => void;
}

// Target minimal pcs per warna di tiap pasar — admin bisa edit sendiri,
// tersimpan per device (bukan per sesi) karena jarang berubah.
export const useTargetSeriStore = create<TargetSeriState>()(
  persist(
    (set) => ({
      targetByMarket: { ...DEFAULT_TARGET_SERI },
      setTarget: (market, qty) =>
        set((s) => ({ targetByMarket: { ...s.targetByMarket, [market]: qty } })),
    }),
    { name: "pasar_restock_target_v1" },
  ),
);
