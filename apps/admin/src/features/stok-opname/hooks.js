import { useMemo } from "react";
import {
  useBukuPotonganQuery,
  useCheckStokSemuaMutation,
  useJahitDikerjakanQuery,
  usePlanOpnameOverflowMutation,
  useSaveStokOpnameMutation,
  useStokWarnaAllQuery,
} from "./queries";
import { useStokOpnameSessionStore } from "./store";

export function useStokWarnaAll() {
  const { data, isLoading } = useStokWarnaAllQuery();
  return { stokRows: data ?? [], loading: isLoading };
}

export function useJahitDikerjakan() {
  const { data, isLoading } = useJahitDikerjakanQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useSaveStokOpname() {
  const { mutateAsync } = useSaveStokOpnameMutation();
  return (vars) => mutateAsync(vars);
}

export function usePlanOpnameOverflow() {
  const { mutateAsync } = usePlanOpnameOverflowMutation();
  return (vars) => mutateAsync(vars);
}

export function useCheckStokSemua() {
  const { mutateAsync } = useCheckStokSemuaMutation();
  return (vars) => mutateAsync(vars);
}

const EMPTY_BUKU = { rows: {}, sizes: {}, kodes: {} };
export function useBukuPotonganInfo() {
  const { data } = useBukuPotonganQuery();
  return data ?? EMPTY_BUKU;
}

export function useStokOpnameSession() {
  const loc = useStokOpnameSessionStore((s) => s.loc);
  const counted = useStokOpnameSessionStore((s) => s.counted);
  const guideDismissed = useStokOpnameSessionStore((s) => s.guideDismissed);
  const setLoc = useStokOpnameSessionStore((s) => s.setLoc);
  const markCounted = useStokOpnameSessionStore((s) => s.markCounted);
  const resetCounted = useStokOpnameSessionStore((s) => s.resetCounted);
  const dismissGuide = useStokOpnameSessionStore((s) => s.dismissGuide);
  const showGuide = useStokOpnameSessionStore((s) => s.showGuide);
  return {
    loc,
    counted,
    guideDismissed,
    setLoc,
    markCounted,
    resetCounted,
    dismissGuide,
    showGuide,
  };
}
