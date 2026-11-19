import {
  useCreateModelMutation,
  useDeleteModelMutation,
  useModelsQuery,
  useUpdateModelMutation,
} from "./queries";
import type { CreateModelInput, UpdateModelInput } from "./schema";

export function useModels(onlyActive = false) {
  const { data, isLoading, error } = useModelsQuery(onlyActive);
  return { models: data ?? [], loading: isLoading, error };
}

export function useCreateModel() {
  const { mutateAsync } = useCreateModelMutation();
  return (input: CreateModelInput) => mutateAsync(input);
}

export function useUpdateModel() {
  const { mutateAsync } = useUpdateModelMutation();
  return (input: UpdateModelInput) => mutateAsync(input);
}

export function useDeleteModel() {
  const { mutateAsync } = useDeleteModelMutation();
  return (id: string) => mutateAsync(id);
}
