import { useQuery } from "@tanstack/react-query";
import { fetchImageBlob, fetchProductPhotos, stampKodeOnImage } from "./api";

export const fotoCantikKeys = { photos: (kodes, sizes) => ["foto-cantik", kodes, sizes] };

export function useFotoCantikQuery(kodes, toUrl, sizes = {}) {
  return useQuery({
    queryKey: fotoCantikKeys.photos(kodes, sizes),
    enabled: kodes.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const products = await fetchProductPhotos(kodes);
      const byKode = new Map(products.map((p) => [p.kode, p]));
      return Promise.all(
        kodes.map(async (kode) => {
          const p = byKode.get(kode) ?? { kode };
          const url = toUrl(p);
          const raw = url ? await fetchImageBlob(url) : null;
          const blob = raw ? await stampKodeOnImage(raw, { kode, size: sizes[kode] ?? "" }) : null;
          return { kode, size: sizes[kode] ?? "", url, blob };
        }),
      );
    },
  });
}
