import { usePasarRestockQuery } from "./queries";
import { useTargetSeriStore } from "./store";
import { DEFAULT_TARGET_SERI } from "./utils";

export { useCreateTransfer } from "@deera/shared/features/transfers/hooks";

export function usePasarRestock(market, target) {
  const { data, isLoading } = usePasarRestockQuery(market, target);
  return {
    restockList: data?.restock ?? [],
    tidakBergerakList: data?.tidak_bergerak ?? [],
    loading: isLoading,
  };
}

// Target minimal pcs per warna di pasar ini — default per DEFAULT_TARGET_SERI,
// tetap bisa diedit admin (lihat store.js, Zustand persist).
export function useTargetSeriQty(market) {
  const targetByMarket = useTargetSeriStore((s) => s.targetByMarket);
  const setTargetInStore = useTargetSeriStore((s) => s.setTarget);
  const target = targetByMarket[market] ?? DEFAULT_TARGET_SERI[market] ?? 3;
  return { target, setTarget: (qty) => setTargetInStore(market, qty) };
}
