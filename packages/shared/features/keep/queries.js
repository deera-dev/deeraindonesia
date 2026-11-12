import { useQuery } from "@tanstack/react-query";
import { fetchActiveKeepItems } from "./api";

export const keepItemsKeys = { aktif: ["keep-items", "aktif"] };

export function useActiveKeepItemsQuery() {
  return useQuery({ queryKey: keepItemsKeys.aktif, queryFn: fetchActiveKeepItems });
}
