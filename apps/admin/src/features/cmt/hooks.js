import {
  useBatalKirimCmtJahitMutation,
  useCmtJahitKirimQuery,
  useCmtSetoranFullQuery,
  useCreateKirimCmtJahitMutation,
  useCreateSetoranFullMutation,
  useSetorKirimCmtJahitMutation,
} from "./queries";

export function useCmtJahitKirim() {
  const { data, isLoading } = useCmtJahitKirimQuery();
  return { rows: data ?? [], loading: isLoading };
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
