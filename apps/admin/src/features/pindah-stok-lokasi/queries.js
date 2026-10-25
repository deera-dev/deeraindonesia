import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveStokLokasi } from "./api";
import { stokOpnameKeys } from "../stok-opname/queries";

export function useMoveStokLokasiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveStokLokasi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stokOpnameKeys.all }),
  });
}
