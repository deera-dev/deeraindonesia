import { cldUrl } from "@deera/shared/lib/cloudinary";

const CATALOG_BASE_URL = "https://catalog.deera.id";
const MAX_SHARE_PHOTOS = 6;

export function buildFavoritesShareText(products) {
  const lines = [`*DEERA Indonesia*`, ``, `Produk pilihan:`, ``];
  for (const p of products) {
    lines.push(`• *${p.kode}* — ${p.nama}`);
    lines.push(`  ${CATALOG_BASE_URL}/code/${p.kode}`);
  }
  return lines.join("\n");
}

export async function shareFavoritesViaWA(products) {
  const text = buildFavoritesShareText(products);
  const files = [];

  for (const p of products.slice(0, MAX_SHARE_PHOTOS)) {
    if (!p.image) continue;
    try {
      const imgUrl = cldUrl(p.image, { width: 1080 });
      const res = await fetch(imgUrl);
      if (res.ok) {
        const blob = await res.blob();
        const ext = blob.type.includes("webp") ? "webp" : "jpg";
        files.push(new File([blob], `${p.kode}.${ext}`, { type: blob.type }));
      }
    } catch {
    }
  }

  if (navigator.share && files.length > 0 && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text });
      return { method: "share-file" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: "share-text" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "aborted" };
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return { method: "wa-link" };
}
