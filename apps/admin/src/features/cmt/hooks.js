import {
  useAvailablePotonganMutation,
  useBatalKirimCmtJahitMutation,
  useCmtFullKirimQuery,
  useCmtJahitKirimQuery,
  useCmtSetoranFullQuery,
  useCreateCmtFullKirimMutation,
  useCreateKirimCmtJahitMutation,
  useCreateSetoranFullMutation,
  useDeleteCmtFullKirimMutation,
  useSetorKirimCmtJahitMutation,
} from "./queries";

export function useCmtJahitKirim() {
  const { data, isLoading } = useCmtJahitKirimQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useAvailablePotongan() {
  const { mutateAsync, isPending } = useAvailablePotonganMutation();
  return { fetchPotongan: (kode) => mutateAsync(kode), fetching: isPending };
}

export function useCreateKirimCmtJahit() {
  const { mutateAsync, isPending } = useCreateKirimCmtJahitMutation();
  return { createKirim: (params) => mutateAsync(params), creating: isPending };
}

export function useSetorKirimCmtJahit() {
  const { mutateAsync, isPending } = useSetorKirimCmtJahitMutation();
  return { setorKirim: (params) => mutateAsync(params), submitting: isPending };
}

export function useBatalKirimCmtJahit() {
  const { mutateAsync } = useBatalKirimCmtJahitMutation();
  return (params) => mutateAsync(params);
}

export function useCmtSetoranFull() {
  const { data, isLoading } = useCmtSetoranFullQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useCreateSetoranFull() {
  const { mutateAsync, isPending } = useCreateSetoranFullMutation();
  return { createSetoranFull: (params) => mutateAsync(params), creating: isPending };
}

export function useCmtFullKirim() {
  const { data, isLoading } = useCmtFullKirimQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useCreateCmtFullKirim() {
  const { mutateAsync, isPending } = useCreateCmtFullKirimMutation();
  return { createKirimBahan: (params) => mutateAsync(params), creating: isPending };
}

export function useDeleteCmtFullKirim() {
  const { mutateAsync } = useDeleteCmtFullKirimMutation();
  return (id) => mutateAsync(id);
}
