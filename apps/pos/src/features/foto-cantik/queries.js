import { useQuery } from "@tanstack/react-query";
import { fetchProductPhotos, fetchImageBlob, fetchKolasePilihanByKode } from "./api";

export const fotoCantikKeys = { photos: (kodes, sizes) => ["foto-cantik", kodes, sizes] };

export function useFotoCantikQuery(kodes, toUrl, sizes = {}) {
  return useQuery({
    queryKey: fotoCantikKeys.photos(kodes, sizes),
    enabled: kodes.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [products, kolaseByKode] = await Promise.all([
        fetchProductPhotos(kodes),
        fetchKolasePilihanByKode(kodes),
      ]);
      const byKode = new Map(products.map((p) => [p.kode, p]));
      return Promise.all(
        kodes.map(async (kode) => {
          const p = byKode.get(kode) ?? { kode };
          // Kolase deerastudio (kalau sudah pernah dibuat utk produk ini)
          // diutamakan drpd foto utama/seri warna — lihat fetchKolasePilihanByKode.
          const url = kolaseByKode[kode] || toUrl(p);
          const blob = url ? await fetchImageBlob(url) : null;
          return { kode, size: sizes[kode] ?? "", url, blob };
        }),
      );
    },
  });
}
