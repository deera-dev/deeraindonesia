import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createModel, deleteModel, fetchModels, updateModel } from "./api";

export const modelKeys = {
  all: ["models"] as const,
  list: (onlyActive: boolean) => ["models", "list", onlyActive] as const,
};

function invalidateModels(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: modelKeys.all });
}

export function useModelsQuery(onlyActive = false) {
  return useQuery({
    queryKey: modelKeys.list(onlyActive),
    queryFn: () => fetchModels(onlyActive),
  });
}

export function useCreateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createModel,
    onSuccess: () => invalidateModels(queryClient),
  });
}

export function useUpdateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateModel,
    onSuccess: () => invalidateModels(queryClient),
  });
}

export function useDeleteModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteModel,
    onSuccess: () => invalidateModels(queryClient),
  });
}
