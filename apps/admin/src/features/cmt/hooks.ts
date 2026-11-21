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
  useUpdateHargaUpahKirimMutation,
} from "./queries";

export function useCmtJahitKirim() {
  const { data, isLoading } = useCmtJahitKirimQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useAvailablePotongan() {
  const { mutateAsync, isPending } = useAvailablePotonganMutation();
  return {
    fetchPotongan: (kode: string | null | undefined) => mutateAsync(kode),
    fetching: isPending,
  };
}

export function useCreateKirimCmtJahit() {
  const { mutateAsync, isPending } = useCreateKirimCmtJahitMutation();
  return {
    createKirim: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    creating: isPending,
  };
}

export function useSetorKirimCmtJahit() {
  const { mutateAsync, isPending } = useSetorKirimCmtJahitMutation();
  return {
    setorKirim: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    submitting: isPending,
  };
}

export function useBatalKirimCmtJahit() {
  const { mutateAsync } = useBatalKirimCmtJahitMutation();
  return (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params);
}

export function useUpdateHargaUpahKirim() {
  const { mutateAsync, isPending } = useUpdateHargaUpahKirimMutation();
  return {
    updateHargaUpah: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    saving: isPending,
  };
}

export function useCmtSetoranFull() {
  const { data, isLoading } = useCmtSetoranFullQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useCreateSetoranFull() {
  const { mutateAsync, isPending } = useCreateSetoranFullMutation();
  return {
    createSetoranFull: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    creating: isPending,
  };
}

export function useCmtFullKirim() {
  const { data, isLoading } = useCmtFullKirimQuery();
  return { rows: data ?? [], loading: isLoading };
}

export function useCreateCmtFullKirim() {
  const { mutateAsync, isPending } = useCreateCmtFullKirimMutation();
  return {
    createKirimBahan: (params: Parameters<typeof mutateAsync>[0]) => mutateAsync(params),
    creating: isPending,
  };
}

export function useDeleteCmtFullKirim() {
  const { mutateAsync } = useDeleteCmtFullKirimMutation();
  return (id: string) => mutateAsync(id);
}
