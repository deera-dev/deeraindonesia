import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batalKirimCmtJahit,
  createCmtFullKirim,
  createKirimCmtJahit,
  createSetoranFull,
  deleteCmtFullKirim,
  fetchAvailablePotonganByKode,
  fetchCmtFullKirim,
  fetchCmtJahitKirim,
  fetchCmtSetoranFull,
  setorKirimCmtJahit,
  updateHargaUpahKirim,
} from "./api";

export const cmtJahitKirimKeys = { all: ["cmt-jahit-kirim"] };
export const cmtSetoranFullKeys = { all: ["cmt-setoran-full"] };
export const cmtFullKirimKeys = { all: ["cmt-full-kirim"] };

export function useCmtJahitKirimQuery() {
  return useQuery({ queryKey: cmtJahitKirimKeys.all, queryFn: fetchCmtJahitKirim });
}

export function useAvailablePotonganMutation() {
  return useMutation({ mutationFn: fetchAvailablePotonganByKode });
}

export function useCreateKirimCmtJahitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createKirimCmtJahit,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtJahitKirimKeys.all }),
  });
}

export function useSetorKirimCmtJahitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setorKirimCmtJahit,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtJahitKirimKeys.all }),
  });
}

export function useBatalKirimCmtJahitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: batalKirimCmtJahit,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtJahitKirimKeys.all }),
  });
}

export function useUpdateHargaUpahKirimMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateHargaUpahKirim,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtJahitKirimKeys.all }),
  });
}

export function useCmtSetoranFullQuery() {
  return useQuery({ queryKey: cmtSetoranFullKeys.all, queryFn: fetchCmtSetoranFull });
}

export function useCreateSetoranFullMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSetoranFull,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtSetoranFullKeys.all }),
  });
}

export function useCmtFullKirimQuery() {
  return useQuery({ queryKey: cmtFullKirimKeys.all, queryFn: fetchCmtFullKirim });
}

export function useCreateCmtFullKirimMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCmtFullKirim,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtFullKirimKeys.all }),
  });
}

export function useDeleteCmtFullKirimMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCmtFullKirim,
    onSuccess: () => qc.invalidateQueries({ queryKey: cmtFullKirimKeys.all }),
  });
}
