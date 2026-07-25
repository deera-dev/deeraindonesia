import { useSoldOutKodesQuery, useLimitedStokKodesQuery } from "./queries";
import { useVisitUsModalStore, useCatalogSearchStore } from "./store";

export { soldOutKeys, limitedStokKeys } from "./queries";

export function useSoldOutSet() {
  const { data } = useSoldOutKodesQuery();
  return new Set(data ?? []);
}

export function useLimitedStokSet() {
  const { data } = useLimitedStokKodesQuery();
  return new Set(data ?? []);
}

export function useVisitUsModal() {
  const open = useVisitUsModalStore((s) => s.open);
  const initOpen = useVisitUsModalStore((s) => s.initOpen);
  const show = useVisitUsModalStore((s) => s.show);
  const close = useVisitUsModalStore((s) => s.close);
  return { open, initOpen, show, close };
}

export function useCatalogSearch() {
  const open = useCatalogSearchStore((s) => s.open);
  const query = useCatalogSearchStore((s) => s.query);
  const show = useCatalogSearchStore((s) => s.show);
  const close = useCatalogSearchStore((s) => s.close);
  const setQuery = useCatalogSearchStore((s) => s.setQuery);
  return { open, query, show, close, setQuery };
}
