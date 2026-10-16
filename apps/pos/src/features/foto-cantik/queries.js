import { useQuery } from "@tanstack/react-query";
import { fetchProductPhotos, fetchImageBlob } from "./api";

export const fotoCantikKeys = { photos: (kodes) => ["foto-cantik", kodes] };

/** Foto produk + blob yang sudah diunduh (siap dishare tanpa delay saat tombol ditekan). */
export function useFotoCantikQuery(kodes, toUrl) {
  return useQuery({
    queryKey: fotoCantikKeys.photos(kodes),
    enabled: kodes.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const products = await fetchProductPhotos(kodes);
      const byKode = new Map(products.map((p) => [p.kode, p]));
      return Promise.all(
        kodes.map(async (kode) => {
          const p = byKode.get(kode) ?? { kode };
          const url = toUrl(p);
          const blob = url ? await fetchImageBlob(url) : null;
          return { kode, nama: p.nama ?? "", url, blob };
        }),
      );
    },
  });
}
