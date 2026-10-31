import {
  useBaruKodesQuery,
  useLimitedStokKodesQuery,
  useSoldOutKodesQuery,
  useTerlarisKodesQuery,
} from "./queries";
import {
  useCatalogFilterStore,
  useCatalogScrollStore,
  useCatalogSearchStore,
  useGrosirInfoStore,
  useVisitUsModalStore,
} from "./store";
import { pickBestPeriode } from "./utils";

export { baruKeys, limitedStokKeys, soldOutKeys, terlarisKeys } from "./queries";

export function useSoldOutSet() {
  const { data } = useSoldOutKodesQuery();
  return new Set(data ?? []);
}

export function useLimitedStokSet() {
  const { data } = useLimitedStokKodesQuery();
  return new Set(data ?? []);
}

export function useBaruSet() {
  const { data } = useBaruKodesQuery();
  return new Set(data ?? []);
}

export function useTerlarisMap() {
  const { data } = useTerlarisKodesQuery();
  const map = new Map();
  for (const row of data ?? []) {
    const current = map.get(row.kode);
    map.set(row.kode, pickBestPeriode(current, row.periode));
  }
  return map;
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

export function useCatalogFilter() {
  const open = useCatalogFilterStore((s) => s.open);
  const bahan = useCatalogFilterStore((s) => s.bahan);
  const ukuran = useCatalogFilterStore((s) => s.ukuran);
  const show = useCatalogFilterStore((s) => s.show);
  const close = useCatalogFilterStore((s) => s.close);
  const setBahan = useCatalogFilterStore((s) => s.setBahan);
  const setUkuran = useCatalogFilterStore((s) => s.setUkuran);
  const reset = useCatalogFilterStore((s) => s.reset);
  return { open, bahan, ukuran, show, close, setBahan, setUkuran, reset };
}

export function useCatalogScrollPosition() {
  const lastActiveKode = useCatalogScrollStore((s) => s.lastActiveKode);
  const setLastActiveKode = useCatalogScrollStore((s) => s.setLastActiveKode);
  return { lastActiveKode, setLastActiveKode };
}

export function useGrosirInfo() {
  const open = useGrosirInfoStore((s) => s.open);
  const show = useGrosirInfoStore((s) => s.show);
  const close = useGrosirInfoStore((s) => s.close);
  return { open, show, close };
}
