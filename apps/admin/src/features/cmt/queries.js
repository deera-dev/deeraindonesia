import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batalKirimCmtJahit,
  createKirimCmtJahit,
  createSetoranFull,
  fetchCmtJahitKirim,
  fetchCmtSetoranFull,
  setorKirimCmtJahit,
} from "./api";

export const cmtJahitKirimKeys = { all: ["cmt-jahit-kirim"] };
export const cmtSetoranFullKeys = { all: ["cmt-setoran-full"] };

export function useCmtJahitKirimQuery() {
  return useQuery({ queryKey: cmtJahitKirimKeys.all, queryFn: fetchCmtJahitKirim });
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
