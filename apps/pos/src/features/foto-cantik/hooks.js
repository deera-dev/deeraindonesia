import { useMemo } from "react";
import { useFotoCantikQuery } from "./queries";
import { uniqueKodes, pickPhotoUrl, buildShareText, photoFileName } from "./utils";

/** Foto cantik untuk satu transaksi. */
export function useFotoCantik(sale) {
  const kodes = useMemo(() => uniqueKodes(sale), [sale]);
  const q = useFotoCantikQuery(kodes, pickPhotoUrl);
  return { photos: q.data ?? [], loading: q.isLoading, error: q.error };
}

/**
 * Bagikan foto terpilih lewat menu share bawaan perangkat (pengguna pilih WhatsApp sendiri). Blob sudah diunduh sebelumnya, jadi
 * navigator.share dipanggil langsung (masih dalam user activation).
 */
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
  // Tanpa Web Share API / gagal: jangan lari ke wa.me, biar pengguna memilih aplikasi lewat menu share.
  return { method: "unsupported" };
}
