import {
  useCreatePoseMutation,
  useDeletePoseMutation,
  usePosesQuery,
  useSetBackViewMutation,
  useUpdatePoseMutation,
} from "./queries";
import type { CreatePoseInput, UpdatePoseInput } from "./schema";

export function usePoses(modelId: string) {
  const { data, isLoading, error } = usePosesQuery(modelId);
  return { poses: data ?? [], loading: isLoading, error };
}

export function useCreatePose() {
  const { mutateAsync } = useCreatePoseMutation();
  return (input: CreatePoseInput) => mutateAsync(input);
}

export function useUpdatePose() {
  const { mutateAsync } = useUpdatePoseMutation();
  return (input: UpdatePoseInput) => mutateAsync(input);
}

export function useDeletePose() {
  const { mutateAsync } = useDeletePoseMutation();
  return (id: string) => mutateAsync(id);
}

export function useSetBackView() {
  const { mutateAsync } = useSetBackViewMutation();
  return (params: { id: string; model_id: string; value: boolean }) => mutateAsync(params);
}
