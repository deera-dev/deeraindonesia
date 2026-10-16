/**
 * features/stok-opname/hooks.js
 * PUBLIC SURFACE fitur stok-opname — komponen HANYA boleh import dari sini.
 */
import { useJahitDikerjakanQuery, useStokWarnaAllQuery, useSaveStokOpnameMutation, usePlanOpnameOverflowMutation, useCheckStokSemuaMutation, useBukuPotonganQuery } from "./queries";
import { useMemo } from "react";
import { useStokOpnameSessionStore } from "./store";

export function useStokWarnaAll() {
  const { data, isLoading } = useStokWarnaAllQuery();
  return { stokRows: data ?? [], loading: isLoading };
}

// Agregat all-time "sudah dikerjakan" Tim Jahit per kode+size+warna — info
// pembanding di Stok Opname, lihat api.js fetchJahitDikerjakan().
export function useJahitDikerjakan() {
  const { data, isLoading } = useJahitDikerjakanQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useSaveStokOpname() {
  const { mutateAsync } = useSaveStokOpnameMutation();
  return (vars) => mutateAsync(vars);
}

// Rencana pengambilan dari gudang saat penambahan stok di pasar melebihi produksi (backend).
export function usePlanOpnameOverflow() {
  const { mutateAsync } = usePlanOpnameOverflowMutation();
  return (vars) => mutateAsync(vars);
}

// Cek (backend) apakah stok baru + terjual melebihi produksi — mode "Semua lokasi".
export function useCheckStokSemua() {
  const { mutateAsync } = useCheckStokSemuaMutation();
  return (vars) => mutateAsync(vars);
}

// Info Buku Potongan (dipotong, terjual, seharusnya ada) — dihitung backend (RPC get_buku_potongan).
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
  return { loc, counted, guideDismissed, setLoc, markCounted, resetCounted, dismissGuide, showGuide };
}
