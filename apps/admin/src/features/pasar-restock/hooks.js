import { usePasarRestockQuery } from "./queries";

export function usePasarRestock(market) {
  const { data, isLoading } = usePasarRestockQuery(market);
  return {
    restockList: data?.restock ?? [],
    tidakBergerakList: data?.tidak_bergerak ?? [],
    loading: isLoading,
  };
}
