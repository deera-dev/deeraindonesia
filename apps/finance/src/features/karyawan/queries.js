/**
 * queries.js — useQuery/useMutation wrappers fitur Karyawan.
 * Pemilik queryKey factory. Hanya diimport oleh hooks.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKaryawanAktif, fetchKaryawanAll, saveKaryawan, toggleKaryawanAktif } from "./api";

export const karyawanKeys = {
  all: ["karyawan", "all"],
  aktif: ["karyawan", "aktif"],
};

export function useKaryawanAllQuery() {
  return useQuery({ queryKey: karyawanKeys.all, queryFn: fetchKaryawanAll });
}

export function useKaryawanAktifQuery() {
  return useQuery({ queryKey: karyawanKeys.aktif, queryFn: fetchKaryawanAktif });
}

function invalidateKaryawan(queryClient) {
  queryClient.invalidateQueries({ queryKey: karyawanKeys.all });
  queryClient.invalidateQueries({ queryKey: karyawanKeys.aktif });
}

export function useSaveKaryawanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, editing }) => saveKaryawan({ payload, editing }),
    onSuccess: () => invalidateKaryawan(queryClient),
  });
}

export function useToggleKaryawanAktifMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (karyawan) => toggleKaryawanAktif(karyawan),
    onSuccess: () => invalidateKaryawan(queryClient),
  });
}
