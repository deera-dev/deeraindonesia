import { useSoldOutKodesQuery } from "./queries";
import { useVisitUsModalStore } from "./store";

export { soldOutKeys } from "./queries";

export function useSoldOutSet() {
  const { data } = useSoldOutKodesQuery();
  return new Set(data ?? []);
}

export function useVisitUsModal() {
  const open = useVisitUsModalStore((s) => s.open);
  const initOpen = useVisitUsModalStore((s) => s.initOpen);
  const show = useVisitUsModalStore((s) => s.show);
  const close = useVisitUsModalStore((s) => s.close);
  return { open, initOpen, show, close };
}
