/**
 * hooks.js — PUBLIC SURFACE fitur Petty Cash.
 * Komponen HANYA boleh import dari sini (atau index.js).
 */
import {
  useDeletePettycashMutation,
  usePettycashAllQuery,
  useSavePettycashMutation,
} from "./queries";

/**
 * Mengembalikan SEMUA baris (tidak difilter) plus saldo all-time.
 * Filter periode (bulan/jenis) untuk tampilan list dilakukan oleh pemanggil
 * (PettycashPage) — saldo HARUS tetap all-time terlepas dari filter UI tersebut.
 */
export function usePettycashAll() {
  const { data, isLoading, error } = usePettycashAllQuery();
  const rows = data ?? [];
  const saldoIsi = rows.filter((r) => r.jenis === "isi").reduce((s, r) => s + (r.jumlah || 0), 0);
  const saldoKeluar = rows.filter((r) => r.jenis === "keluar").reduce((s, r) => s + (r.jumlah || 0), 0);
  return {
    rows,
    saldo: saldoIsi - saldoKeluar,
    loading: isLoading,
    loadError: error?.message ?? null,
  };
}

export function useSavePettycash() {
  const { mutateAsync } = useSavePettycashMutation();
  return (payload, editing) => mutateAsync({ payload, editing });
}

export function useDeletePettycash() {
  const { mutateAsync } = useDeletePettycashMutation();
  return (id) => mutateAsync(id);
}
