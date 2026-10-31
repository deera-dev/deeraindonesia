import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyKasbonDeductionFromGajian,
  createOrAccumulateKasbon,
  deleteKasbon,
  fetchKasbonAll,
  getKasbonBelumLunasByKaryawanIds,
  payCicilan,
  updateKasbonJumlah,
} from "./api";

export const kasbonKeys = {
  all: ["kasbon", "all"],
  belumLunasByIds: (ids) => ["kasbon", "belum-lunas", [...(ids ?? [])].sort()],
};

export function useKasbonAllQuery() {
  return useQuery({
    queryKey: kasbonKeys.all,
    queryFn: fetchKasbonAll,
  });
}

export function useKasbonBelumLunasByKaryawanIdsQuery(ids) {
  return useQuery({
    queryKey: kasbonKeys.belumLunasByIds(ids),
    queryFn: () => getKasbonBelumLunasByKaryawanIds(ids),
    enabled: !!ids?.length,
  });
}

function invalidateKasbon(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["kasbon"] });
}

export function useCreateOrAccumulateKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => createOrAccumulateKasbon(args),
    onSuccess: () => invalidateKasbon(queryClient),
  });
}

export function useUpdateKasbonJumlahMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => updateKasbonJumlah(args),
    onSuccess: () => invalidateKasbon(queryClient),
  });
}

export function useDeleteKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteKasbon(id),
    onSuccess: () => invalidateKasbon(queryClient),
  });
}

export function usePayCicilanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => payCicilan(args),
    onSuccess: () => invalidateKasbon(queryClient),
  });
}

export function useApplyKasbonDeductionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kasbonRow, jumlah, tanggal, keterangan }) =>
      applyKasbonDeductionFromGajian(kasbonRow, { jumlah, tanggal, keterangan }),
    onSuccess: () => invalidateKasbon(queryClient),
  });
}
