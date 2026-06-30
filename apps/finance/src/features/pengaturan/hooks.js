/**
 * hooks.js — PUBLIC SURFACE fitur Pengaturan.
 * Komponen (di fitur lain maupun di sini) HANYA boleh import dari sini
 * (atau index.js) — tidak pernah dari api.js/queries.js langsung.
 */
import { useFinanceConfigQuery, useSaveFinanceConfigMutation } from "./queries";
import { DEFAULT_FINANCE_CONFIG } from "./utils";

/** Config tarif upah (flat map {key: nilai}), dengan fallback default selagi loading. */
export function useFinanceConfig() {
  const { data, isLoading } = useFinanceConfigQuery();
  return { config: data ?? DEFAULT_FINANCE_CONFIG, loading: isLoading };
}

export function useSaveFinanceConfig() {
  const { mutateAsync } = useSaveFinanceConfigMutation();
  return (key, nilai) => mutateAsync({ key, nilai });
}
