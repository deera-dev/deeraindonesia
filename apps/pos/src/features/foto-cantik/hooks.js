import { useMemo } from "react";
import { useFotoCantikQuery } from "./queries";
import { uniqueKodes, sizesByKode, pickPhotoUrl, buildShareText, photoFileName } from "./utils";

export function useFotoCantik(sale) {
  const kodes = useMemo(() => uniqueKodes(sale), [sale]);
  const sizes = useMemo(() => sizesByKode(sale), [sale]);
  const q = useFotoCantikQuery(kodes, pickPhotoUrl, sizes);
  return { photos: q.data ?? [], loading: q.isLoading, error: q.error };
}

export async function sharePhotos(sale, selected) {
  const text = buildShareText(sale, selected);
  const files = selected.filter((p) => p.blob).map((p) => new File([p.blob], photoFileName(p.kode, p.blob), { type: p.blob.type || "image/jpeg" }));
  if (navigator.share) {
    try {
      if (files.length > 0 && navigator.canShare?.({ files })) {
        await navigator.share({ files, text });
        return { method: "share-file" };
      }
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "InvalidStateError") return { method: "aborted" };
    }
  }
  return { method: "unsupported" };
}
