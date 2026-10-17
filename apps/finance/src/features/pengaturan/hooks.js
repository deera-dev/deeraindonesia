import { useFinanceConfigQuery, useSaveFinanceConfigMutation } from "./queries";
import { DEFAULT_FINANCE_CONFIG } from "./utils";

export function useFinanceConfig() {
  const { data, isLoading } = useFinanceConfigQuery();
  return { config: data ?? DEFAULT_FINANCE_CONFIG, loading: isLoading };
}

export function useSaveFinanceConfig() {
  const { mutateAsync } = useSaveFinanceConfigMutation();
  return (key, nilai) => mutateAsync({ key, nilai });
}
