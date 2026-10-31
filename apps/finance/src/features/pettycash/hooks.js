import {
  useDeletePettycashMutation,
  usePettycashAllQuery,
  useSavePettycashMutation,
} from "./queries";

export function usePettycashAll() {
  const { data, isLoading, error } = usePettycashAllQuery();
  const rows = data ?? [];
  const saldoIsi = rows.filter((r) => r.jenis === "isi").reduce((s, r) => s + (r.jumlah || 0), 0);
  const saldoKeluar = rows
    .filter((r) => r.jenis === "keluar")
    .reduce((s, r) => s + (r.jumlah || 0), 0);
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
