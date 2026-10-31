import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stokOpnameKeys } from "../stok-opname/queries";
import { moveStokLokasi } from "./api";

export function useMoveStokLokasiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveStokLokasi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stokOpnameKeys.all }),
  });
}
