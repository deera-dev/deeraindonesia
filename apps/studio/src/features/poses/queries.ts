import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPose, deletePose, fetchPoses, setBackView, updatePose } from "./api";

export const poseKeys = {
  all: ["poses"] as const,
  list: (modelId: string) => ["poses", "list", modelId] as const,
};

function invalidatePoses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: poseKeys.all });
}

export function usePosesQuery(modelId: string) {
  return useQuery({
    queryKey: poseKeys.list(modelId),
    queryFn: () => fetchPoses(modelId),
    enabled: !!modelId,
  });
}

export function useCreatePoseMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createPose, onSuccess: () => invalidatePoses(queryClient) });
}

export function useUpdatePoseMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: updatePose, onSuccess: () => invalidatePoses(queryClient) });
}

export function useDeletePoseMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deletePose, onSuccess: () => invalidatePoses(queryClient) });
}

export function useSetBackViewMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: setBackView, onSuccess: () => invalidatePoses(queryClient) });
}
